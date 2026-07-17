import "server-only"
import { db } from "@/lib/db"
import { nextLeadAction, scoreLead, summarizeLead } from "@/lib/ops/rules"

export type LeadInput = {
  name: string
  email: string
  source?: string
  company?: string
  notes?: string
}

export { nextLeadAction, scoreLead, summarizeLead }

export async function findDuplicateContact(workspaceId: string, email: string) {
  return db.contact.findUnique({
    where: {
      workspaceId_email: {
        workspaceId,
        email: email.toLowerCase().trim(),
      },
    },
  })
}

export async function createLead(workspaceId: string, input: LeadInput) {
  const email = input.email.toLowerCase().trim()
  const score = scoreLead({ ...input, email })
  const domain = email.split("@")[1]

  return db.$transaction(async (tx) => {
    const company = input.company
      ? (await tx.company.findFirst({
          where: { workspaceId, name: input.company },
        })) ??
        (await tx.company.create({
          data: { name: input.company, domain, workspaceId },
        }))
      : null

    const contact = await tx.contact.upsert({
      where: {
        workspaceId_email: {
          workspaceId,
          email,
        },
      },
      update: {
        name: input.name,
        companyId: company?.id,
      },
      create: {
        name: input.name,
        email,
        companyId: company?.id,
        workspaceId,
      },
    })

    const lead = await tx.lead.create({
      data: {
        name: input.name,
        email,
        source: input.source ?? "Website",
        score,
        summary: summarizeLead(input, score),
        nextAction: nextLeadAction(score),
        contactId: contact.id,
        companyId: company?.id,
        workspaceId,
      },
    })

    await tx.activityLog.create({
      data: {
        type: "lead.created",
        message: `Created lead ${lead.name} with score ${lead.score}`,
        metadata: { leadId: lead.id },
        workspaceId,
      },
    })

    return lead
  })
}

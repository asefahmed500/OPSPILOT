import "server-only"
import { db } from "@/lib/db"
import { nextLeadAction, scoreLead, summarizeLead } from "@/lib/ops/rules"
import { AppError } from "@/lib/errors"
import { emitAutomationEvent } from "@/lib/ops/events"

export type LeadInput = {
  name: string
  email: string
  source?: string
  company?: string
  notes?: string
  suppressEvents?: boolean
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

  const lead = await db.$transaction(async (tx) => {
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

  if (!input.suppressEvents) {
    await emitAutomationEvent({
      type: "lead.created",
      workspaceId,
      sourceId: lead.id,
      customerEmail: lead.email,
      customerName: lead.name,
      company: input.company,
      summary: `Lead event: ${lead.name} was created from ${lead.source}`,
      metadata: { leadId: lead.id, score: lead.score },
    })
  }

  return lead
}

export async function deleteLead(workspaceId: string, leadId: string) {
  const lead = await db.lead.findFirst({
    where: { id: leadId, workspaceId },
    select: { id: true, name: true },
  })

  if (!lead) {
    throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND")
  }

  await db.$transaction(async (tx) => {
    await tx.lead.delete({
      where: { id: lead.id },
    })

    await tx.activityLog.create({
      data: {
        type: "lead.deleted",
        message: `Deleted lead "${lead.name}"`,
        metadata: { leadId: lead.id },
        workspaceId,
      },
    })
  })

  return { deleted: true }
}

export async function bulkDeleteLeads(workspaceId: string, leadIds: string[]) {
  const leads = await db.lead.findMany({
    where: { workspaceId, id: { in: leadIds } },
    select: { id: true },
  })

  if (!leads.length) {
    return { deleted: 0 }
  }

  await db.$transaction(async (tx) => {
    await tx.lead.deleteMany({
      where: { workspaceId, id: { in: leads.map((lead) => lead.id) } },
    })

    await tx.activityLog.create({
      data: {
        type: "lead.bulk_deleted",
        message: `Deleted ${leads.length} lead${leads.length === 1 ? "" : "s"}`,
        metadata: { leadIds: leads.map((lead) => lead.id) },
        workspaceId,
      },
    })
  })

  return { deleted: leads.length }
}

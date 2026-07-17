import "server-only"
import { db } from "@/lib/db"
import { classifyTicket, draftTicketResponse, shouldEscalateTicket } from "@/lib/ops/rules"

export { classifyTicket, draftTicketResponse, shouldEscalateTicket }

export async function createTicket(
  workspaceId: string,
  input: {
    subject: string
    customerEmail: string
    body: string
    channel?: "WEBSITE_CHAT" | "EMAIL" | "WHATSAPP" | "SLACK" | "DISCORD"
  }
) {
  const text = `${input.subject} ${input.body}`
  const category = classifyTicket(text)
  const escalated = shouldEscalateTicket(text)

  return db.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        subject: input.subject,
        customerEmail: input.customerEmail.toLowerCase().trim(),
        category,
        channel: input.channel ?? "WEBSITE_CHAT",
        priority: escalated ? "HIGH" : "MEDIUM",
        escalated,
        status: escalated ? "ESCALATED" : "OPEN",
        aiDraft: draftTicketResponse(input.subject, input.body),
        workspaceId,
        messages: {
          create: {
            body: input.body,
            fromAgent: false,
          },
        },
      },
    })

    await tx.activityLog.create({
      data: {
        type: "ticket.created",
        message: `Classified ticket "${ticket.subject}" as ${category.toLowerCase()}`,
        metadata: { ticketId: ticket.id },
        workspaceId,
      },
    })

    return ticket
  })
}

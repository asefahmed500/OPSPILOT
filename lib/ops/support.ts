import "server-only"
import { db } from "@/lib/db"
import { classifyTicket, draftTicketResponse, shouldEscalateTicket } from "@/lib/ops/rules"
import { AppError } from "@/lib/errors"
import { sendCustomerEmail } from "@/lib/email"

export { classifyTicket, draftTicketResponse, shouldEscalateTicket }

export async function createTicket(
  workspaceId: string,
  input: {
    subject: string
    customerEmail: string
    body: string
    customerName?: string
    channel?: "WEBSITE_CHAT" | "EMAIL" | "WHATSAPP" | "SLACK" | "DISCORD"
  }
) {
  const text = `${input.subject} ${input.body}`
  const category = classifyTicket(text)
  const escalated = shouldEscalateTicket(text)
  const customerEmail = input.customerEmail.toLowerCase().trim()
  const customerName =
    input.customerName?.trim() ||
    customerEmail
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())

  return db.$transaction(async (tx) => {
    const contact = await tx.contact.upsert({
      where: {
        workspaceId_email: {
          workspaceId,
          email: customerEmail,
        },
      },
      update: {
        name: customerName,
      },
      create: {
        name: customerName,
        email: customerEmail,
        workspaceId,
      },
    })

    const ticket = await tx.ticket.create({
      data: {
        subject: input.subject,
        customerEmail,
        category,
        channel: input.channel ?? "WEBSITE_CHAT",
        priority: escalated ? "HIGH" : "MEDIUM",
        escalated,
        status: escalated ? "ESCALATED" : "OPEN",
        aiDraft: draftTicketResponse(input.subject, input.body),
        contactId: contact.id,
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

async function draftCustomerReply(ticket: {
  subject: string
  customerEmail: string
  aiDraft: string | null
}, customerReply: string) {
  const fallback = [
    "Thanks for the update.",
    "I reviewed your reply and updated the support ticket in OpsPilot.",
    "The team now has a follow-up task attached, and we will keep the next step moving.",
  ].join(" ")

  const { generateAiText } = await import("@/lib/ai")
  const generated = await generateAiText(
    [
      "You are OpsPilot's customer support assistant.",
      "Write a concise, helpful email reply.",
      "Do not promise unsupported external integrations.",
      "Mention that the ticket and follow-up task were updated.",
    ].join(" "),
    [
      `Ticket subject: ${ticket.subject}`,
      `Customer email: ${ticket.customerEmail}`,
      `Previous draft: ${ticket.aiDraft ?? "None"}`,
      `Customer reply: ${customerReply}`,
    ].join("\n")
  ).catch(() => null)

  return generated?.trim() || fallback
}

export async function handleCustomerReply(
  workspaceId: string,
  ticketId: string,
  body: string
) {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, workspaceId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  if (!ticket) {
    throw new AppError("Ticket not found", 404, "TICKET_NOT_FOUND")
  }

  const reply = await draftCustomerReply(ticket, body)

  const result = await db.$transaction(async (tx) => {
    const customerMessage = await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        body,
        fromAgent: false,
      },
    })

    const agentMessage = await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        body: reply,
        fromAgent: true,
      },
    })

    const updatedTicket = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        aiDraft: reply,
        status: ticket.escalated ? "ESCALATED" : "PENDING",
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })

    const task = await tx.task.create({
      data: {
        title: `Follow up support reply: ${ticket.subject}`,
        description: body,
        priority: ticket.priority,
        ticketId: ticket.id,
        workspaceId,
      },
    })

    await tx.activityLog.create({
      data: {
        type: "ticket.reply.auto_sent",
        message: `Auto-replied to ${ticket.customerEmail} and created follow-up task "${task.title}"`,
        metadata: {
          ticketId: ticket.id,
          customerMessageId: customerMessage.id,
          agentMessageId: agentMessage.id,
          taskId: task.id,
        },
        workspaceId,
      },
    })

    return { ticket: updatedTicket, task, reply }
  })

  try {
    await sendCustomerEmail({
      to: ticket.customerEmail,
      subject: `Re: ${ticket.subject}`,
      body: reply,
    })
  } catch (error) {
    await db.activityLog.create({
      data: {
        type: "ticket.reply.email_failed",
        message: `Auto-reply email failed for ${ticket.customerEmail}`,
        metadata: {
          ticketId: ticket.id,
          error: error instanceof Error ? error.message : "Unknown email error",
        },
        workspaceId,
      },
    })

    throw new AppError("Ticket updated, but the customer email failed", 502, "TICKET_REPLY_EMAIL_FAILED")
  }

  return result
}

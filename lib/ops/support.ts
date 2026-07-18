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

  const normalizedBody = body.trim()
  const duplicateMessage = ticket.messages.some((message) => !message.fromAgent && message.body.trim() === normalizedBody)

  if (duplicateMessage) {
    return {
      ticket,
      task: null,
      reply: ticket.aiDraft ?? "",
      needsConfirmation: Boolean(ticket.aiDraft),
      duplicate: true,
    }
  }

  const reply = await draftCustomerReply(ticket, normalizedBody)

  return db.$transaction(async (tx) => {
    const customerMessage = await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        body: normalizedBody,
        fromAgent: false,
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
        description: normalizedBody,
        priority: ticket.priority,
        ticketId: ticket.id,
        workspaceId,
      },
    })

    await tx.activityLog.create({
      data: {
        type: "ticket.reply.auto_sent",
        message: `Drafted a support reply for ${ticket.customerEmail} and created follow-up task "${task.title}"`,
        metadata: {
          ticketId: ticket.id,
          customerMessageId: customerMessage.id,
          taskId: task.id,
        },
        workspaceId,
      },
    })

    return { ticket: updatedTicket, task, reply, needsConfirmation: true }
  })
}

export async function sendConfirmedTicketDraft(
  workspaceId: string,
  ticketId: string,
  body: string
) {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, workspaceId },
  })

  if (!ticket) {
    throw new AppError("Ticket not found", 404, "TICKET_NOT_FOUND")
  }

  if (!ticket.customerEmail) {
    throw new AppError("Ticket does not have a customer email", 400, "TICKET_CUSTOMER_EMAIL_REQUIRED")
  }

  try {
    await sendCustomerEmail({
      to: ticket.customerEmail,
      subject: `Re: ${ticket.subject}`,
      body,
    })
  } catch (error) {
    await db.activityLog.create({
      data: {
        type: "ticket.draft.email_failed",
        message: `Confirmed draft email failed for ${ticket.customerEmail}`,
        metadata: {
          ticketId: ticket.id,
          error: error instanceof Error ? error.message : "Unknown email error",
        },
        workspaceId,
      },
    })

    throw new AppError("Draft was not sent because the email failed", 502, "TICKET_DRAFT_EMAIL_FAILED")
  }

  return db.$transaction(async (tx) => {
    const agentMessage = await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        body,
        fromAgent: true,
      },
    })

    const updatedTicket = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        aiDraft: body,
        status: ticket.escalated ? "ESCALATED" : "PENDING",
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })

    await tx.activityLog.create({
      data: {
        type: "ticket.draft.sent",
        message: `Sent confirmed support reply to ${ticket.customerEmail}`,
        metadata: {
          ticketId: ticket.id,
          agentMessageId: agentMessage.id,
        },
        workspaceId,
      },
    })

    return { ticket: updatedTicket, sent: true }
  })
}

function normalizeSubject(subject: string) {
  return subject.toLowerCase().replace(/^(re|fw|fwd):\s*/i, "").trim()
}

export async function ingestInboundEmail(
  workspaceId: string,
  input: {
    from: string
    subject: string
    body: string
  }
) {
  const from = input.from.toLowerCase().trim()
  const subject = input.subject.trim()
  const body = input.body.trim()
  const normalizedSubject = normalizeSubject(subject)
  const tickets = await db.ticket.findMany({
    where: {
      workspaceId,
      customerEmail: from,
      status: { not: "RESOLVED" },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  const existingTicket =
    tickets.find((ticket) => normalizeSubject(ticket.subject) === normalizedSubject) ??
    tickets[0]

  if (existingTicket) {
    const result = await handleCustomerReply(workspaceId, existingTicket.id, body)

    await db.activityLog.create({
      data: {
        type: "inbound_email.ticket_updated",
        message: `Ingested email reply from ${from} into "${existingTicket.subject}"`,
        metadata: { ticketId: existingTicket.id },
        workspaceId,
      },
    })

    return { ...result, created: false }
  }

  const ticket = await createTicket(workspaceId, {
    subject,
    customerEmail: from,
    body,
    channel: "EMAIL",
  })
  const reply = await draftCustomerReply(ticket, body)
  const result = await db.$transaction(async (tx) => {
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
        title: `Review inbound email: ${ticket.subject}`,
        description: body,
        priority: ticket.priority,
        ticketId: ticket.id,
        workspaceId,
      },
    })

    return { ticket: updatedTicket, task, reply, needsConfirmation: true }
  })

  await db.activityLog.create({
    data: {
      type: "inbound_email.ticket_created",
      message: `Created support ticket from inbound email by ${from}`,
      metadata: { ticketId: ticket.id },
      workspaceId,
    },
  })

  return { ...result, created: true }
}

import "server-only"
import { db } from "@/lib/db"
import { classifyTicket, draftTicketResponse, shouldEscalateTicket } from "@/lib/ops/rules"
import { AppError } from "@/lib/errors"
import { sendCustomerEmail } from "@/lib/email"
import { emitAutomationEvent } from "@/lib/ops/events"

export { classifyTicket, draftTicketResponse, shouldEscalateTicket }

export async function createTicket(
  workspaceId: string,
  input: {
    subject: string
    customerEmail: string
    body: string
    customerName?: string
    channel?: "WEBSITE_CHAT" | "EMAIL" | "WHATSAPP" | "SLACK" | "DISCORD"
    suppressEvents?: boolean
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

  const ticket = await db.$transaction(async (tx) => {
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

  if (!input.suppressEvents) {
    await emitAutomationEvent({
      type: "ticket.created",
      workspaceId,
      sourceId: ticket.id,
      customerEmail: ticket.customerEmail,
      customerName,
      summary: `Ticket event: "${ticket.subject}" was created`,
      metadata: {
        ticketId: ticket.id,
        category: ticket.category,
        priority: ticket.priority,
        escalated: ticket.escalated,
      },
    })
  }

  return ticket
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
  body: string,
  options?: { suppressEvents?: boolean }
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

  const result = await db.$transaction(async (tx) => {
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

  if (!options?.suppressEvents) {
    await emitAutomationEvent({
      type: "customer.reply.received",
      workspaceId,
      sourceId: ticket.id,
      customerEmail: ticket.customerEmail,
      summary: `Customer reply event: ${ticket.customerEmail} replied to "${ticket.subject}"`,
      metadata: {
        ticketId: ticket.id,
        taskId: result.task.id,
      },
    })
  }

  return result
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

export async function deleteTicket(workspaceId: string, ticketId: string) {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, workspaceId },
    select: { id: true, subject: true },
  })

  if (!ticket) {
    throw new AppError("Ticket not found", 404, "TICKET_NOT_FOUND")
  }

  await db.$transaction(async (tx) => {
    await tx.ticket.delete({
      where: { id: ticket.id },
    })

    await tx.activityLog.create({
      data: {
        type: "ticket.deleted",
        message: `Deleted ticket "${ticket.subject}"`,
        metadata: { ticketId: ticket.id },
        workspaceId,
      },
    })
  })

  return { deleted: true }
}

export async function bulkDeleteTickets(workspaceId: string, ticketIds: string[]) {
  const tickets = await db.ticket.findMany({
    where: { workspaceId, id: { in: ticketIds } },
    select: { id: true },
  })

  if (!tickets.length) {
    return { deleted: 0 }
  }

  await db.$transaction(async (tx) => {
    await tx.ticket.deleteMany({
      where: { workspaceId, id: { in: tickets.map((ticket) => ticket.id) } },
    })

    await tx.activityLog.create({
      data: {
        type: "ticket.bulk_deleted",
        message: `Deleted ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`,
        metadata: { ticketIds: tickets.map((ticket) => ticket.id) },
        workspaceId,
      },
    })
  })

  return { deleted: tickets.length }
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

function isSystemTicket(ticket: {
  subject: string
  customerEmail: string
  messages: { body: string; fromAgent: boolean }[]
}) {
  const sender = ticket.customerEmail.toLowerCase()
  const subject = ticket.subject.toLowerCase()
  const customerText = ticket.messages
    .filter((message) => !message.fromAgent)
    .map((message) => message.body.toLowerCase())
    .join("\n")

  return (
    sender.includes("mailer-daemon@") ||
    sender.includes("postmaster@") ||
    sender.includes("no-reply@") ||
    sender.includes("noreply@") ||
    sender.includes("notifications@") ||
    subject.includes("delivery status notification") ||
    subject.includes("password reset") ||
    subject.includes("reset your password") ||
    customerText.includes("reporting-mta:") ||
    customerText.includes("final-recipient:") ||
    customerText.includes("this is a system-generated email") ||
    customerText.includes("replies to this email address are not monitored")
  )
}

export async function cleanupSystemSupportTickets(workspaceId: string) {
  const tickets = await db.ticket.findMany({
    where: { workspaceId },
    include: { messages: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  const junkTickets = tickets.filter(isSystemTicket)

  if (!junkTickets.length) {
    return { deleted: 0 }
  }

  await db.$transaction(async (tx) => {
    await tx.ticket.deleteMany({
      where: {
        workspaceId,
        id: { in: junkTickets.map((ticket) => ticket.id) },
      },
    })

    await tx.activityLog.create({
      data: {
        type: "ticket.cleanup.system_email",
        message: `Removed ${junkTickets.length} system email ticket${junkTickets.length === 1 ? "" : "s"}`,
        metadata: { ticketIds: junkTickets.map((ticket) => ticket.id) },
        workspaceId,
      },
    })
  })

  return { deleted: junkTickets.length }
}

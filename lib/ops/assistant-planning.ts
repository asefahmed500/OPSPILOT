import { z } from "zod"

export const assistantActionSchema = z.object({
  type: z.enum(["create_lead", "create_task", "create_ticket", "create_report", "create_workflow", "send_email"]),
  title: z.string().optional(),
  description: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  company: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  period: z.enum(["daily", "weekly"]).optional(),
  prompt: z.string().optional(),
  runNow: z.boolean().optional(),
})

export const assistantPlanSchema = z.object({
  actions: z.array(assistantActionSchema).min(1).max(8),
  reply: z.string().min(1).max(900),
})

export type AssistantPlan = z.infer<typeof assistantPlanSchema>

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

export function extractEmails(text: string) {
  return Array.from(new Set((text.match(emailPattern) ?? []).map((email) => email.toLowerCase())))
}

export function extractEmail(text: string) {
  return extractEmails(text)[0]
}

export function titleCaseFromEmail(email: string | undefined) {
  if (!email) {
    return undefined
  }

  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function cleanPromptTopic(message: string) {
  return message
    .replace(/^\/(email|mail|workflow|agent)\s*/i, "")
    .replace(emailPattern, "")
    .replace(/\b(send|sent|email|mail|meil|emsil)\b/gi, " ")
    .replace(/\b(to|for)\s*$/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function inferName(message: string, email: string | undefined) {
  const explicitName = message.match(/\b(?:to|for|customer|client|person|lead)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b/)?.[1]

  return explicitName ?? titleCaseFromEmail(email)
}

function inferAssistantIntent(message: string) {
  const lower = message.toLowerCase()
  const wantsWorkflow = hasAny(lower, ["workflow", "automation", "trigger", "/workflow", "when customer replies", "when client replies", "if customer replies", "if client replies"])
  const wantsEmail = hasAny(lower, ["email", "e-mail", "mail", "meil", "emsil", "send to", "send it to", "send this to", "send it", "marketing", "markering", "makeketing", "campaign"])
  const wantsMarketing = hasAny(lower, ["marketing", "markering", "makeketing", "campaign", "promo", "promotion", "launch", "announce", "announcement", "new tool", "coming"])
  const wantsCrm = hasAny(lower, ["lead", "crm", "customer", "client", "contact"])
  const wantsTask = hasAny(lower, ["task", "taks", "todo", "to-do", "follow up", "follow-up", "followup"])
  const wantsTicket = hasAny(lower, ["ticket", "tiker", "ticker", "support", "reply", "replied", "responded", "complaint", "issue"])
  const wantsReport = hasAny(lower, ["report", "summary", "analytics", "dashboard"])
  const wantsBroadUpdate = hasAny(lower, ["update all", "all system", "all features", "all others", "alothers", "everything", "all files", "crm task support report"])
  const wantsRunNow = hasAny(lower, ["run now", "send now", "execute now", "right now", "do it now"])

  return {
    wantsWorkflow,
    wantsEmail,
    wantsMarketing,
    wantsCrm,
    wantsTask,
    wantsTicket,
    wantsReport,
    wantsBroadUpdate,
    wantsRunNow,
  }
}

export function fallbackAssistantPlan(message: string): AssistantPlan {
  const lower = message.toLowerCase()
  const email = extractEmail(message)
  const name = inferName(message, email)
  const topic = cleanPromptTopic(message) || message
  const intent = inferAssistantIntent(message)
  const shouldCreateLead = intent.wantsCrm || (intent.wantsEmail && Boolean(email))
  const shouldCreateTask = intent.wantsTask || intent.wantsBroadUpdate || intent.wantsEmail
  const shouldCreateTicket = intent.wantsTicket && !intent.wantsMarketing
  const shouldCreateReport = intent.wantsReport || (intent.wantsBroadUpdate && !intent.wantsMarketing)

  if (intent.wantsWorkflow && !intent.wantsEmail) {
    return {
      actions: [
        {
          type: "create_workflow",
          title: "Assistant automation",
          prompt: message.replace(/^\/workflow\s*/i, "").trim() || message,
          email,
          name,
          runNow: intent.wantsRunNow,
        },
      ],
      reply: "I will create an OpsPilot workflow from this natural-language command.",
    }
  }

  if (intent.wantsEmail) {
    return {
      actions: [
        {
          type: "send_email",
          email,
          name,
          subject: intent.wantsMarketing ? "New from OpsPilot" : "A quick update from OpsPilot",
          body: topic,
        },
        ...(shouldCreateLead
          ? [{ type: "create_lead" as const, name: name ?? "Email recipient", email, description: message }]
          : []),
        ...(shouldCreateTask
          ? [{ type: "create_task" as const, title: email ? `Follow up with ${email}` : "Follow up with customer", description: message }]
          : []),
        ...(shouldCreateTicket
          ? [{ type: "create_ticket" as const, subject: "Customer reply follow-up", email, body: message }]
          : []),
        ...(shouldCreateReport
          ? [{ type: "create_report" as const, period: lower.includes("daily") ? ("daily" as const) : ("weekly" as const) }]
          : []),
      ],
      reply: "I will generate a polished customer-facing email, send it to the recipient, and update the requested OpsPilot records.",
    }
  }

  if ([intent.wantsCrm, intent.wantsTask, intent.wantsTicket, intent.wantsReport].filter(Boolean).length > 1) {
    return {
      actions: [
        ...(intent.wantsCrm ? [{ type: "create_lead" as const, name: name ?? "Assistant customer", email, description: message }] : []),
        ...(intent.wantsTicket ? [{ type: "create_ticket" as const, subject: "Assistant-created support ticket", email, body: message }] : []),
        ...(intent.wantsTask ? [{ type: "create_task" as const, title: email ? `Follow up with ${email}` : "Follow up with customer", description: message }] : []),
        ...(intent.wantsReport ? [{ type: "create_report" as const, period: lower.includes("daily") ? ("daily" as const) : ("weekly" as const) }] : []),
      ],
      reply: "I will execute the requested internal actions across OpsPilot.",
    }
  }

  if (intent.wantsCrm) {
    return {
      actions: [{ type: "create_lead", name: name ?? "New inbound lead", email, description: message }],
      reply: "I will create a CRM lead and attach this request as context.",
    }
  }

  if (intent.wantsTicket) {
    return {
      actions: [{ type: "create_ticket", subject: "Assistant-created support ticket", email, body: message }],
      reply: "I will create and classify a support ticket.",
    }
  }

  if (intent.wantsReport) {
    return {
      actions: [{ type: "create_report", period: lower.includes("daily") ? "daily" : "weekly" }],
      reply: "I will generate an operations report.",
    }
  }

  return {
    actions: [{ type: "create_task", title: topic.slice(0, 120) || "Assistant task", description: message }],
    reply: "I will create a task from this request.",
  }
}

import "server-only"
import { createHash } from "node:crypto"
import OpenAI from "openai"
import { z } from "zod"
import { env } from "@/lib/env"
import { createLead } from "@/lib/ops/lead"
import { createTask, taskFromPrompt } from "@/lib/ops/tasks"
import { createTicket } from "@/lib/ops/support"
import { createReport } from "@/lib/ops/reports"
import type { WorkflowAction } from "@/lib/ops/rules"

const aiApiKey = env.AI_API_KEY ?? env.HCNSEC_API_KEY ?? env.OPENAI_API_KEY
const aiModel = env.AI_MODEL ?? env.OPENAI_MODEL ?? "DeepSeek-V4-Flash"
const client = aiApiKey
  ? new OpenAI({
      apiKey: aiApiKey,
      baseURL: env.AI_API_BASE_URL,
    })
  : null

const assistantActionSchema = z.object({
  type: z.enum(["create_lead", "create_task", "create_ticket", "create_report"]),
  title: z.string().optional(),
  description: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  period: z.enum(["daily", "weekly"]).optional(),
})

const assistantPlanSchema = z.object({
  actions: z.array(assistantActionSchema).min(1).max(4),
  reply: z.string().min(1).max(600),
})

const workflowPlanSchema = z.object({
  actions: z
    .array(
      z.object({
        type: z.enum(["create_crm_record", "assign_owner", "send_email", "create_task", "create_ticket", "notify_team"]),
        label: z.string().min(1).max(120),
        email: z.string().email().optional(),
        name: z.string().optional(),
        company: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .min(1)
    .max(6),
})

const marketingEmailSchema = z.object({
  subject: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
})

function extractJsonObject(text: string) {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return text.slice(start, end + 1)
}

function fallbackAssistantPlan(message: string): z.infer<typeof assistantPlanSchema> {
  const lower = message.toLowerCase()

  if (lower.includes("lead") || lower.includes("crm")) {
    return {
      actions: [{ type: "create_lead", name: "New inbound lead", email: undefined, description: message }],
      reply: "I will create a CRM lead and attach this request as context.",
    }
  }

  if (lower.includes("ticket") || lower.includes("support")) {
    return {
      actions: [{ type: "create_ticket", subject: "Assistant-created support ticket", body: message }],
      reply: "I will create and classify a support ticket.",
    }
  }

  if (lower.includes("report")) {
    return {
      actions: [{ type: "create_report", period: lower.includes("daily") ? "daily" : "weekly" }],
      reply: "I will generate an operations report.",
    }
  }

  return {
    actions: [{ type: "create_task", title: taskFromPrompt(message).title, description: message }],
    reply: "I will create a task from this request.",
  }
}

export async function generateAiText(system: string, prompt: string) {
  if (!client) {
    return null
  }

  const response = await client.chat.completions.create({
    model: aiModel,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  })

  return response.choices[0]?.message?.content ?? null
}

async function generateAssistantPlan(message: string) {
  const text = await generateAiText(
    [
      "You are OpsPilot's safe internal automation planner.",
      "Return only JSON. Do not include markdown.",
      "Allowed action types: create_lead, create_task, create_ticket, create_report.",
      "Do not invent external integrations. Keep missing emails empty.",
      "Schema: {\"actions\":[{\"type\":\"create_task\",\"title\":\"...\",\"description\":\"...\"}],\"reply\":\"...\"}",
    ].join(" "),
    message
  )

  if (!text) {
    return fallbackAssistantPlan(message)
  }

  const json = extractJsonObject(text)

  if (!json) {
    return fallbackAssistantPlan(message)
  }

  try {
    const parsed = assistantPlanSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : fallbackAssistantPlan(message)
  } catch {
    return fallbackAssistantPlan(message)
  }
}

export async function generateWorkflowActions(prompt: string): Promise<WorkflowAction[] | null> {
  const text = await generateAiText(
    [
      "You convert workflow requests into safe OpsPilot action JSON.",
      "Return only JSON. Do not include markdown.",
      "Allowed action types: create_crm_record, assign_owner, send_email, create_task, create_ticket, notify_team.",
      "Extract customer emails, names, company, task titles, email subject/body when present.",
      "Email actions must include the customer recipient email when the prompt contains one.",
      "Schema: {\"actions\":[{\"type\":\"send_email\",\"label\":\"Send email\",\"email\":\"customer@example.com\",\"subject\":\"...\",\"body\":\"...\"}]}",
    ].join(" "),
    prompt
  )

  if (!text) {
    return null
  }

  const json = extractJsonObject(text)

  if (!json) {
    return null
  }

  try {
    const parsed = workflowPlanSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data.actions : null
  } catch {
    return null
  }
}

export async function generateWorkflowMarketingEmail({
  workflowName,
  prompt,
  customerName,
  company,
}: {
  workflowName: string
  prompt: string
  customerName?: string
  company?: string
}) {
  const fallbackSubject = workflowName.toLowerCase().includes("follow")
    ? workflowName
    : `A quick update from OpsPilot`
  const fallbackBody = [
    customerName ? `Hi ${customerName},` : "Hi,",
    "",
    "I wanted to share a quick update from OpsPilot.",
    "OpsPilot helps teams automate CRM follow-up, support handoffs, task creation, and everyday operational workflows so work moves faster with less manual tracking.",
    "",
    "If this is useful for your team, I would be happy to share the next steps.",
    "",
    "Best,",
    "The OpsPilot team",
  ].join("\n")

  const text = await generateAiText(
    [
      "You write customer-facing marketing and follow-up emails for OpsPilot.",
      "Return only JSON. Do not include markdown.",
      "The customer must not see internal workflow actions, database updates, ticket IDs, task IDs, or automation logs.",
      "Write concise, professional email copy based on the user's workflow prompt.",
      "Keep it helpful and specific, not spammy. Do not invent pricing or unsupported integrations.",
      "Schema: {\"subject\":\"...\",\"body\":\"...\"}",
    ].join(" "),
    [
      `Workflow name: ${workflowName}`,
      `Customer name: ${customerName ?? "Unknown"}`,
      `Customer company: ${company ?? "Unknown"}`,
      `Marketing/follow-up request: ${prompt}`,
    ].join("\n")
  )

  if (!text) {
    return { subject: fallbackSubject, body: fallbackBody }
  }

  const json = extractJsonObject(text)

  if (!json) {
    return { subject: fallbackSubject, body: fallbackBody }
  }

  try {
    const parsed = marketingEmailSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : { subject: fallbackSubject, body: fallbackBody }
  } catch {
    return { subject: fallbackSubject, body: fallbackBody }
  }
}

export async function executeAssistantRequest(workspaceId: string, message: string) {
  const messageHash = createHash("sha1").update(`${workspaceId}:${message}:${Date.now()}`).digest("hex").slice(0, 10)
  const plan = await generateAssistantPlan(message)
  const completed: string[] = []

  for (const action of plan.actions) {
    if (action.type === "create_lead") {
      const lead = await createLead(workspaceId, {
        name: action.name ?? action.title ?? "New inbound lead",
        email: action.email ?? `lead-${messageHash}@example.com`,
        source: "AI Assistant",
        notes: action.description ?? message,
      })

      completed.push(`created CRM lead "${lead.name}"`)
      continue
    }

    if (action.type === "create_ticket") {
      const ticket = await createTicket(workspaceId, {
        subject: action.subject ?? action.title ?? "Assistant-created support ticket",
        customerEmail: action.email ?? `customer-${messageHash}@example.com`,
        body: action.body ?? action.description ?? message,
      })

      completed.push(`created support ticket "${ticket.subject}"`)
      continue
    }

    if (action.type === "create_report") {
      const report = await createReport(workspaceId, action.period ?? "weekly")

      completed.push(`generated ${report.title}`)
      continue
    }

    const task = await createTask(workspaceId, {
      title: action.title ?? taskFromPrompt(message).title,
      description: action.description ?? message,
      priority: "MEDIUM",
    })

    completed.push(`created task "${task.title}"`)
  }

  return {
    action: "assistant.executed",
    content: `${plan.reply} Completed: ${completed.join(", ")}.`,
  }
}

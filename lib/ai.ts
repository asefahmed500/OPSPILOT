import "server-only"
import OpenAI from "openai"
import { z } from "zod"
import { env } from "@/lib/env"
import { assistantPlanSchema, fallbackAssistantPlan } from "@/lib/ops/assistant-planning"
import { executeAssistantPlan } from "@/lib/ops/assistant-agent"
import type { WorkflowAction } from "@/lib/ops/rules"

const aiApiKey = env.AI_API_KEY ?? env.HCNSEC_API_KEY ?? env.OPENAI_API_KEY
const aiModel = env.AI_MODEL ?? env.OPENAI_MODEL ?? "DeepSeek-V4-Flash"
const client = aiApiKey
  ? new OpenAI({
      apiKey: aiApiKey,
      baseURL: env.AI_API_BASE_URL,
      timeout: 20_000,
    })
  : null

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

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms)
      }),
    ])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

export async function generateAiText(system: string, prompt: string) {
  if (!client) {
    return null
  }

  const response = await withTimeout(
    client.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
    20_000
  )

  return response.choices[0]?.message?.content ?? null
}

async function generateAssistantPlan(message: string) {
  const text = await generateAiText(
    [
      "You are OpsPilot's safe internal automation planner.",
      "Return only JSON. Do not include markdown.",
      "Allowed action types: create_lead, create_task, create_ticket, create_report, create_workflow, send_email.",
      "Understand slash commands like /workflow and /email, but normal natural language should work too.",
      "Be typo tolerant: users may write meil, emsil, tsk, taks, tiker, makeketing, markering, or allothers.",
      "For workflow commands and reply triggers, create a create_workflow action. Use runNow true only if the user asks to run/execute/send now.",
      "For email requests, use send_email and include recipient email. Put the user's topic/request in body; the app will generate polished customer-facing copy.",
      "For persona, tone, audience, and CTA instructions, preserve them on the action as persona, tone, audience, and callToAction.",
      "If an email command asks to update CRM/tasks/support/reports or says update all/everything, add the matching internal actions after send_email.",
      "For multiple recipient emails, create one send_email action for each recipient. Add CRM/ticket records for real recipient emails when requested.",
      "For customer reply/client reply triggers, prefer create_workflow with a support-ticket style trigger prompt.",
      "Never delete records. Do not invent external integrations. Never invent placeholder customer emails; use only emails present in the user message and keep missing emails empty.",
      "Schema: {\"actions\":[{\"type\":\"send_email\",\"email\":\"customer@example.com\",\"name\":\"Customer Name\",\"company\":\"Company\",\"subject\":\"New from OpsPilot\",\"body\":\"topic to write about\",\"persona\":\"founder\",\"tone\":\"friendly\",\"audience\":\"startup founders\",\"callToAction\":\"book a demo\"}],\"reply\":\"...\"}",
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
      "Never invent placeholder customer emails. Schema: {\"actions\":[{\"type\":\"send_email\",\"label\":\"Send email\",\"subject\":\"...\",\"body\":\"...\"}]}",
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
  persona,
  tone,
  audience,
  callToAction,
}: {
  workflowName: string
  prompt: string
  customerName?: string
  company?: string
  persona?: string
  tone?: string
  audience?: string
  callToAction?: string
}) {
  const fallbackSubject = workflowName.toLowerCase().includes("follow")
    ? workflowName
    : `A quick update from OpsPilot`
  const fallbackBody = [
    customerName ? `Hi ${customerName},` : "Hi,",
    "",
    "I wanted to share a quick update from OpsPilot.",
    `${prompt || "OpsPilot helps teams automate CRM follow-up, support handoffs, task creation, and everyday operational workflows so work moves faster with less manual tracking."}`,
    audience ? `This is especially useful for ${audience}.` : "",
    "",
    callToAction ? `${callToAction[0]?.toUpperCase()}${callToAction.slice(1)}.` : "If this is useful for your team, I would be happy to share the next steps.",
    "",
    "Best,",
    persona ? `The OpsPilot ${persona}` : "The OpsPilot team",
  ].filter(Boolean).join("\n")

  const text = await generateAiText(
    [
      "You write customer-facing marketing and follow-up emails for OpsPilot.",
      "Return only JSON. Do not include markdown.",
      "The customer must not see internal workflow actions, database updates, ticket IDs, task IDs, or automation logs.",
      "Write concise, professional email copy based on the user's workflow prompt.",
      "Respect persona, tone, audience, and CTA instructions when present.",
      "Keep it helpful and specific, not spammy. Do not invent pricing or unsupported integrations.",
      "Schema: {\"subject\":\"...\",\"body\":\"...\"}",
    ].join(" "),
    [
      `Workflow name: ${workflowName}`,
      `Customer name: ${customerName ?? "Unknown"}`,
      `Customer company: ${company ?? "Unknown"}`,
      `Persona/from voice: ${persona ?? "OpsPilot team"}`,
      `Tone: ${tone ?? "professional"}`,
      `Audience: ${audience ?? "customer"}`,
      `Call to action: ${callToAction ?? "share next steps"}`,
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
  const plan = await generateAssistantPlan(message)
  return executeAssistantPlan({
    workspaceId,
    message,
    plan,
    generateMarketingEmail: generateWorkflowMarketingEmail,
  })
}

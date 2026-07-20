import "server-only"
import { ToolLoopAgent, generateText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { z } from "zod"
import { env } from "@/lib/env"
import { opsPilotAgentTeam } from "@/lib/agents/agent-team"
import { assistantPlanSchema } from "@/lib/ops/assistant-planning"
import type { WorkflowAction } from "@/lib/ops/rules"

const hcnsec = createOpenAICompatible({
  name: "hcnsec",
  apiKey: env.HCNSEC_API_KEY,
  baseURL: env.AI_API_BASE_URL,
})

export const opsPilotAgentModel = env.AI_MODEL
export const opsPilotAgentsConfigured = Boolean(env.HCNSEC_API_KEY)
export const opsPilotAgentFallbackEnabled = env.AI_AGENT_FALLBACK_ENABLED
const opsPilotLanguageModel = hcnsec(opsPilotAgentModel)

function extractJsonObject(text: string) {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return text.slice(start, end + 1)
}

async function generateStructuredJson<T>({
  instructions,
  prompt,
  schema,
  schemaDescription,
  temperature = 0.2,
}: {
  instructions: string
  prompt: string
  schema: z.ZodType<T>
  schemaDescription: string
  temperature?: number
}) {
  let previousOutput = ""

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await generateText({
      model: opsPilotLanguageModel,
      instructions: [
        instructions,
        "Return only valid JSON. Do not include markdown, prose, comments, or code fences.",
        "Omit optional fields when unknown. Never invent placeholder emails.",
        schemaDescription,
      ].join("\n"),
      prompt:
        attempt === 0
          ? prompt
          : [
              prompt,
              "",
              "The previous output was invalid JSON for this schema.",
              `Previous output: ${previousOutput}`,
              "Return the corrected JSON object only.",
            ].join("\n"),
      temperature,
    })
    previousOutput = response.text
    const json = extractJsonObject(response.text)

    if (!json) {
      continue
    }

    try {
      const parsed = schema.safeParse(JSON.parse(json))

      if (parsed.success) {
        return parsed.data
      }
    } catch {
      continue
    }
  }

  throw new Error("AI agent did not return valid structured JSON.")
}

export const workflowActionPlanSchema = z.object({
  actions: z
    .array(
      z.object({
        type: z.enum(["create_crm_record", "assign_owner", "send_email", "create_task", "create_ticket", "notify_team"]),
        label: z.string().min(1).max(120).describe("Short operator-facing action label."),
        email: z.string().email().optional().describe("Real recipient or customer email from the user message."),
        name: z.string().optional().describe("Customer or lead name when present."),
        company: z.string().optional().describe("Customer company when present."),
        subject: z.string().optional().describe("Email subject when present."),
        body: z.string().optional().describe("Email body or source topic when present."),
        title: z.string().optional().describe("Task or ticket title when present."),
        description: z.string().optional().describe("Internal task, ticket, or notification detail."),
      })
    )
    .min(1)
    .max(6),
})

export const emailTemplateSchema = z.object({
  subject: z.string().min(1).max(120).describe("Clean customer-facing subject line."),
  previewText: z.string().min(1).max(180).describe("Inbox preview text that supports the subject."),
  greeting: z.string().min(1).max(120).describe("Personalized email greeting."),
  body: z.string().min(1).max(2000).describe("Complete plain-text email body, including greeting and signoff."),
  toneNotes: z.array(z.string()).min(1).max(4).describe("Brief notes about how the requested tone was applied."),
})

export const emailBriefSchema = z.object({
  recipientEmail: z.string().email().optional().describe("Real recipient email from the operator command, if present."),
  customerName: z.string().optional().describe("Customer name if present or inferable from context."),
  company: z.string().optional().describe("Customer company if present."),
  subjectIntent: z.string().min(1).max(180).describe("What the email subject should communicate."),
  bodyContext: z.array(z.string().min(1).max(220)).min(1).max(8).describe("Specific facts, topics, and context that must appear in the body."),
  tone: z.string().min(1).max(80).describe("Requested tone or the best tone for this email."),
  persona: z.string().min(1).max(80).describe("Sender voice or role."),
  audience: z.string().min(1).max(140).describe("Who the email is written for."),
  callToAction: z.string().min(1).max(180).describe("The action the recipient should take."),
  bodySections: z.array(z.string().min(1).max(120)).min(2).max(6).describe("Planned body sections in reading order."),
  missingFields: z.array(z.string()).max(6).describe("Important fields missing from the command."),
})

export const opsPilotAgentRegistry = opsPilotAgentTeam

const commandPlannerInstructions = [
  "You are OpsPilot's command-planner agent.",
  "Convert natural language into safe workspace actions.",
  "Allowed action types: create_lead, create_task, create_ticket, create_report, create_workflow, send_email.",
  "Understand slash commands like /workflow, /agent, and /email, but normal language must work too.",
  "Be typo tolerant. Map common misspellings to their intent:",
  "email -> meil, emsil, emial, e-mail, mail, send to, reach out;",
  "task -> tsk, taks, tak, to-do, todo, reminder, follow up, followup;",
  "ticket -> tiker, tiket, ticet, support, issue, complaint, bug;",
  "workflow -> wrkflow, wrk, workflw, automation, automate, aumaotn, automatc, auto;",
  "report -> repot, repor, summary, recap, digest, weekly, daily;",
  "lead -> led, contact, prospect, customer, client;",
  "marketing -> makeketing, markering, marketng, promo, campaign;",
  "all pages -> allpaegs, allover, everywhere, sidebar, all sections.",
  "Email field extraction rules:",
  "- email = only a real recipient address found verbatim in the message (never invent one);",
  "- subject = the topic of the email, derived from what the user wants to say;",
  "- body = the raw message body / topic the user described;",
  "- persona = who the email is from (e.g. founder, sales, support) when stated;",
  "- tone = the requested voice (e.g. warm, formal, friendly, urgent) when stated;",
  "- audience = who the email is for when stated;",
  "- callToAction = the next step the recipient should take when stated.",
  "For email requests, use send_email and include only real recipient emails found in the message.",
  "Preserve topic, persona, tone, audience, and call-to-action instructions for the email-template-writer.",
  "If an email command asks to update CRM, tasks, support, reports, workflow, sidebar, all pages, or everything, add matching internal actions after send_email.",
  "For customer reply/client reply triggers, prefer create_workflow with a support-ticket style trigger prompt.",
  "Use runNow only when the user asks to run, execute, send, or automate now.",
  "Never delete records. Never invent placeholder customer emails. Keep the reply concise and clear.",
  "Examples:",
  'Input: "send a warm welcome email to jane@acme.com as founder CTA book a demo" -> {"actions":[{"type":"send_email","email":"jane@acme.com","subject":"Welcome to OpsPilot","body":"welcome message about OpsPilot","persona":"founder","tone":"warm","callToAction":"book a demo"}],"reply":"I will send a warm welcome email to jane@acme.com."}',
  'Input: "create a task to follow up with acme next week and add a lead for bob@acme.com" -> {"actions":[{"type":"create_lead","email":"bob@acme.com","name":"bob","company":"acme"},{"type":"create_task","title":"Follow up with Acme","description":"Follow up with Acme next week"}],"reply":"Created an Acme lead and a follow-up task."}',
].join(" ")

export const commandPlannerAgent = new ToolLoopAgent({
  model: opsPilotLanguageModel,
  instructions: commandPlannerInstructions,
})

export async function planOpsPilotCommand(message: string) {
  return generateStructuredJson({
    instructions: commandPlannerInstructions,
    prompt: message,
    schema: assistantPlanSchema,
    schemaDescription:
      'Shape: {"actions":[{"type":"send_email|create_lead|create_task|create_ticket|create_report|create_workflow","email":"real@example.com","name":"optional","company":"optional","subject":"optional","body":"optional","persona":"optional","tone":"optional","audience":"optional","callToAction":"optional","title":"optional","description":"optional","period":"daily|weekly","prompt":"optional","runNow":false}],"reply":"short operator-facing reply"}',
  })
}

export async function planWorkflowActions(prompt: string): Promise<WorkflowAction[]> {
  const result = await generateStructuredJson({
    instructions: [
      "You are OpsPilot's workflow-architect agent.",
      "Convert workflow requests into safe OpsPilot action JSON.",
      "Allowed action types: create_crm_record, assign_owner, send_email, create_task, create_ticket, notify_team.",
      "Extract real customer emails, names, company, task titles, email subject/body, and notification text when present.",
      "Email actions must include a customer recipient email when the prompt contains one.",
      "Never invent placeholder customer emails.",
    ].join(" "),
    prompt,
    schema: workflowActionPlanSchema,
    schemaDescription:
      'Shape: {"actions":[{"type":"create_crm_record|assign_owner|send_email|create_task|create_ticket|notify_team","label":"short label","email":"optional real email","name":"optional","company":"optional","subject":"optional","body":"optional","title":"optional","description":"optional"}]}',
  })

  return result.actions
}

export async function understandEmailRequest(prompt: string) {
  return generateStructuredJson({
    instructions: [
      "You are OpsPilot's email-context-agent.",
      "Read rough natural language and create a structured brief for the email-template-writer.",
      "Field extraction rules:",
      "- recipientEmail: copy a real email address verbatim from the message; omit if none.",
      "- customerName / company: infer only from explicit mentions (name before an email, company in domain or text); omit if unknown.",
      "- subjectIntent: one sentence describing what the subject line must communicate.",
      "- bodyContext: 1-8 concrete facts, topics, or promises that must appear in the body (never invent facts).",
      "- tone: the requested voice, or the best voice for the audience if unstated (e.g. warm, professional, urgent).",
      "- persona: the sender's role or voice (e.g. founder, sales team, support).",
      "- audience: who the email addresses (e.g. new SaaS operators, existing customers).",
      "- callToAction: the single next step the recipient should take.",
      "- bodySections: 2-6 ordered section labels (e.g. greeting, hook, value, CTA, signoff).",
      "- missingFields: anything important the user did not specify (recipient, topic, CTA, etc.); never invent to fill gaps.",
      "Separate customer-facing body context from internal actions like CRM updates, task creation, workflow runs, and audit logs — those do NOT go in the brief.",
      "Never invent placeholder emails, names, or companies.",
    ].join(" "),
    prompt,
    schema: emailBriefSchema,
    schemaDescription:
      'Shape: {"recipientEmail":"optional real email","customerName":"optional","company":"optional","subjectIntent":"what subject should say","bodyContext":["facts to include"],"tone":"professional","persona":"sender role","audience":"recipient audience","callToAction":"desired next step","bodySections":["greeting","message","cta","signoff"],"missingFields":[]}',
  })
}

export async function writeEmailTemplate(prompt: string) {
  const brief = await understandEmailRequest(prompt)
  return generateStructuredJson({
    temperature: 0.4,
    instructions: [
      "You are OpsPilot's email-template-writer agent.",
      "Write clean customer-facing marketing, sales, support, and follow-up emails for OpsPilot.",
      "Use the email-context-agent brief as the source of truth for subject intent and body context.",
      "Required structure for the body field:",
      "1. Greeting using customerName when known (e.g. \"Hi Jane,\") or \"Hi there,\" when unknown.",
      "2. One opening line that references the recipient's situation or the topic — never a generic pleasantry.",
      "3. One or two short paragraphs that weave in every bodyContext item naturally.",
      "4. A single clear call-to-action line matching brief.callToAction.",
      "5. A human signoff using the persona (e.g. \"Best,\\nThe OpsPilot founder\").",
      "Hard rules:",
      "- The customer must not see internal workflow actions, database updates, ticket IDs, task IDs, or automation logs.",
      "- Never invent pricing, customer facts, metrics, testimonials, dates, or unsupported integrations.",
      "- No clichéd openers (\"I hope this email finds you well\", \"Just checking in\", \"To whom it may concern\").",
      "- No marketing spam words (\"revolutionary\", \"game-changing\", \"synergy\", \"one-stop shop\").",
      "- Subject line must be 4-8 words, specific, and match subjectIntent. No clickbait.",
      "- previewText is the 60-120 char inbox preview that complements (not repeats) the subject.",
      "- Keep the full body under 2000 chars. Prefer short sentences and plain language.",
      "- Match the requested tone precisely and explain how in toneNotes.",
    ].join(" "),
    prompt: [
      `Original request:\n${prompt}`,
      "",
      `Email brief:\n${JSON.stringify(brief, null, 2)}`,
      "",
      "Write the final email now. The subject must match subjectIntent. The body must include the bodyContext items naturally.",
      'Golden example of expected output quality: {"subject":"Less manual follow-up for your ops team","previewText":"A quick note on automating CRM, support, and tasks in one place.","greeting":"Hi Sarah,","body":"Hi Sarah,\\n\\nNoticing follow-up work piling up across CRM, support, and tasks is the moment most ops teams reach for OpsPilot. It captures every inbound lead, drafts support replies, and turns repetitive requests into tasks that run themselves.\\n\\nIf you want, I can set up a 15-minute demo using a workspace shaped like yours.\\n\\nBest,\\nThe OpsPilot founder","toneNotes":["Used a warm, peer-to-peer voice.","Kept paragraphs to two short blocks.","CTA is a single low-pressure demo offer."]}',
    ].join("\n"),
    schema: emailTemplateSchema,
    schemaDescription:
      'Shape: {"subject":"customer-facing subject","previewText":"short inbox preview","greeting":"Hi Name,","body":"complete plain-text email with greeting and signoff","toneNotes":["how tone was applied"]}',
  })
}

export async function writeSupportReply(system: string, prompt: string) {
  const response = await generateText({
    model: opsPilotLanguageModel,
    instructions: [
      "You are OpsPilot's support-reply-writer agent.",
      "Write concise, helpful support copy.",
      "Do not expose internal automation logs, database IDs, or private implementation details.",
      system,
    ].join(" "),
    prompt,
    temperature: 0.2,
  })

  return response.text
}

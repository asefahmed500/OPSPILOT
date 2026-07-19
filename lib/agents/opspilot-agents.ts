import "server-only"
import { Output, ToolLoopAgent, gateway, generateText } from "ai"
import { z } from "zod"
import { env } from "@/lib/env"
import { opsPilotAgentTeam } from "@/lib/agents/agent-team"
import { assistantPlanSchema } from "@/lib/ops/assistant-planning"
import type { WorkflowAction } from "@/lib/ops/rules"

const aiGatewayApiKey = env.AI_GATEWAY_API_KEY ?? env.AI_API_KEY

if (aiGatewayApiKey && !process.env.AI_GATEWAY_API_KEY) {
  process.env.AI_GATEWAY_API_KEY = aiGatewayApiKey
}

export const opsPilotAgentModel = env.AI_GATEWAY_MODEL ?? (env.AI_MODEL.includes("/") ? env.AI_MODEL : env.OPENAI_MODEL) ?? "openai/gpt-5.4-mini"
export const opsPilotAgentsConfigured = Boolean(aiGatewayApiKey || process.env.VERCEL)

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

export const commandPlannerAgent = new ToolLoopAgent({
  model: gateway(opsPilotAgentModel),
  instructions: [
    "You are OpsPilot's command-planner agent.",
    "Convert natural language into safe workspace actions.",
    "Allowed action types: create_lead, create_task, create_ticket, create_report, create_workflow, send_email.",
    "Understand slash commands like /workflow, /agent, and /email, but normal language must work too.",
    "Be typo tolerant: users may write meil, emsil, tsk, taks, tiker, aumaotn, makeketing, markering, allpaegs, or allothers.",
    "For email requests, use send_email and include only real recipient emails found in the message.",
    "Preserve topic, persona, tone, audience, and call-to-action instructions for the email-template-writer.",
    "If an email command asks to update CRM, tasks, support, reports, workflow, sidebar, all pages, or everything, add matching internal actions after send_email.",
    "For customer reply/client reply triggers, prefer create_workflow with a support-ticket style trigger prompt.",
    "Use runNow only when the user asks to run, execute, send, or automate now.",
    "Never delete records. Never invent placeholder customer emails. Keep the reply concise and clear.",
  ].join(" "),
  output: Output.object({
    name: "OpsPilotAssistantPlan",
    description: "A safe plan of internal OpsPilot actions to execute from one operator command.",
    schema: assistantPlanSchema,
  }),
})

export async function planOpsPilotCommand(message: string) {
  const result = await commandPlannerAgent.generate({ prompt: message })
  return result.output
}

export async function planWorkflowActions(prompt: string): Promise<WorkflowAction[]> {
  const result = await generateText({
    model: gateway(opsPilotAgentModel),
    instructions: [
      "You are OpsPilot's workflow-architect agent.",
      "Convert workflow requests into safe OpsPilot action JSON.",
      "Allowed action types: create_crm_record, assign_owner, send_email, create_task, create_ticket, notify_team.",
      "Extract real customer emails, names, company, task titles, email subject/body, and notification text when present.",
      "Email actions must include a customer recipient email when the prompt contains one.",
      "Never invent placeholder customer emails.",
    ].join(" "),
    output: Output.object({
      name: "WorkflowActions",
      description: "Automation actions extracted from a workflow prompt.",
      schema: workflowActionPlanSchema,
    }),
    prompt,
  })

  return result.output.actions
}

export async function understandEmailRequest(prompt: string) {
  const result = await generateText({
    model: gateway(opsPilotAgentModel),
    instructions: [
      "You are OpsPilot's email-context-agent.",
      "Read rough natural language and create a structured brief for the email-template-writer.",
      "Understand what the subject should communicate and what context belongs in the email body.",
      "Separate customer-facing body context from internal actions like CRM updates, task creation, workflow runs, and audit logs.",
      "Keep only real recipient emails from the request. Never invent placeholder emails.",
      "If details are missing, list them in missingFields instead of inventing them.",
    ].join(" "),
    output: Output.object({
      name: "OpsPilotEmailBrief",
      description: "A structured email creation brief with subject intent and body context.",
      schema: emailBriefSchema,
    }),
    prompt,
  })

  return result.output
}

export async function writeEmailTemplate(prompt: string) {
  const brief = await understandEmailRequest(prompt)
  const result = await generateText({
    model: gateway(opsPilotAgentModel),
    instructions: [
      "You are OpsPilot's email-template-writer agent.",
      "Write clean customer-facing marketing, sales, support, and follow-up emails for OpsPilot.",
      "Use the email-context-agent brief as the source of truth for subject intent and body context.",
      "The customer must not see internal workflow actions, database updates, ticket IDs, task IDs, or automation logs.",
      "Write concise plain-text email copy with a natural greeting, useful middle, clear CTA, and human signoff.",
      "Respect persona, tone, audience, and CTA instructions.",
      "Keep it helpful and specific, not spammy. Do not invent pricing, customer facts, or unsupported integrations.",
    ].join(" "),
    output: Output.object({
      name: "OpsPilotEmailTemplate",
      description: "A polished customer-facing email generated from a topic and workflow context.",
      schema: emailTemplateSchema,
    }),
    prompt: [
      `Original request:\n${prompt}`,
      "",
      `Email brief:\n${JSON.stringify(brief, null, 2)}`,
      "",
      "Write the final email now. The subject must match subjectIntent. The body must include the bodyContext items naturally.",
    ].join("\n"),
  })

  return result.output
}

export async function writeSupportReply(system: string, prompt: string) {
  const response = await generateText({
    model: gateway(opsPilotAgentModel),
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

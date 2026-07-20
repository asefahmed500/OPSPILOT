import "server-only"
import { fallbackAssistantPlan } from "@/lib/ops/assistant-planning"
import {
  opsPilotAgentFallbackEnabled,
  opsPilotAgentsConfigured,
  planOpsPilotCommand,
  planWorkflowActions,
  writeEmailTemplate,
  writeSupportReply,
} from "@/lib/agents/opspilot-agents"
import { executeAssistantPlan } from "@/lib/ops/assistant-agent"
import type { WorkflowAction } from "@/lib/ops/rules"

function aiRequiredPlan(message: string) {
  return {
    actions: [
      {
        type: "create_task" as const,
        title: "Configure AI agent key",
        description: `OpsPilot needs HCNSEC_API_KEY before token-powered agents can run this request: ${message}`,
      },
    ],
    reply: "Token-powered AI agents are required for this workspace. Add HCNSEC_API_KEY to enable the specialized agents.",
  }
}

function summarizeError(error: unknown) {
  if (!error) {
    return "unknown error"
  }

  if (error instanceof Error) {
    return error.message || error.name || "unknown error"
  }

  if (typeof error === "string") {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function aiFailurePlan(message: string, error: unknown) {
  const detail = summarizeError(error)

  return {
    actions: [
      {
        type: "create_task" as const,
        title: "AI agent call failed",
        description: `OpsPilot has HCNSEC_API_KEY set but the agent call failed. Request: ${message}. Error: ${detail}`,
      },
    ],
    reply: `The AI agent is configured but the request failed (${detail}). Check that the HCNSEC API is reachable from the deployment region and that AI_MODEL is valid, or enable AI_AGENT_FALLBACK_ENABLED.`,
  }
}

function cleanCustomerName(name: string | undefined) {
  return name?.replace(/^customer\s+name\s+/i, "").trim()
}

function sentenceCase(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return trimmed
  }

  return `${trimmed[0]?.toUpperCase()}${trimmed.slice(1)}`
}

function fallbackSubject(prompt: string, workflowName: string) {
  const lower = prompt.toLowerCase()

  if ((lower.includes("congrat") || lower.includes("congrats")) && (lower.includes("hard work") || lower.includes("working hard"))) {
    return "Congratulations on Your Hard Work"
  }

  if (lower.includes("congrat") || lower.includes("congrats")) {
    return "Congratulations"
  }

  if (workflowName && !["a quick update from opspilot", "new from opspilot", "opspilot assistant email"].includes(workflowName.toLowerCase())) {
    return workflowName
  }

  return "A Professional Note from OpsPilot"
}

function cleanFallbackTopic(prompt: string) {
  const explicitTopic = prompt.match(/\b(?:topics?|body|message)\s+(?:will be|is|should be|should|:)\s+(.+?)(?=\s+with\s+(?:a\s+)?(?:professional|professonal|friendly|warm|formal|casual|polished|direct|persuasive)\s+tone|[.!?]|$)/i)?.[1]
  const topic = explicitTopic ?? prompt

  return topic
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
    .replace(/\b(?:send|sent|mail|email|meil|emsil)\b/gi, "")
    .replace(/\b(?:him|her|them)\b/gi, "")
    .replace(/\b(?:to|for)\s+customer\s+name\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}\b/g, "")
    .replace(/\b(?:mail|email)\s+is\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
}

function fallbackEmail({
  workflowName,
  prompt,
  customerName,
  persona,
  tone,
  audience,
  callToAction,
}: {
  workflowName: string
  prompt: string
  customerName?: string
  persona?: string
  tone?: string
  audience?: string
  callToAction?: string
}) {
  const name = cleanCustomerName(customerName)
  const subject = fallbackSubject(prompt, workflowName)
  const topic = cleanFallbackTopic(prompt)
  const lower = prompt.toLowerCase()
  const isCongratulations = lower.includes("congrat") || lower.includes("congrats") || topic.toLowerCase().includes("congrat")
  const body = isCongratulations
    ? [
        name ? `Hi ${name},` : "Hi,",
        "",
        "Congratulations on the hard work and dedication you have been showing.",
        "Your consistency, focus, and effort deserve real recognition. It is not always easy to keep pushing forward, but the progress you are making reflects the care and commitment you bring to your work.",
        "I hope you take a moment to appreciate how far your effort has brought you. Keep going with the same discipline and confidence.",
        callToAction ? "" : undefined,
        callToAction ? sentenceCase(callToAction) : undefined,
        "",
        "Best,",
        persona ? `The OpsPilot ${persona}` : "The OpsPilot team",
      ]
        .filter((line) => line !== undefined)
        .join("\n")
    : [
        name ? `Hi ${name},` : "Hi,",
        "",
        topic ? sentenceCase(topic) : "I wanted to share a quick professional note from OpsPilot.",
        audience ? `This is especially relevant for ${audience}.` : undefined,
        tone ? `I kept the message ${tone}, clear, and direct.` : undefined,
        callToAction ? "" : undefined,
        callToAction ? sentenceCase(callToAction) : undefined,
        "",
        "Best,",
        persona ? `The OpsPilot ${persona}` : "The OpsPilot team",
      ]
        .filter((line) => line !== undefined)
        .join("\n")

  return {
    subject,
    body,
    previewText: "A practical update from OpsPilot.",
    greeting: customerName ? `Hi ${customerName},` : "Hi,",
    toneNotes: [tone ? `Used a ${tone} voice.` : "Used a concise professional voice."],
  }
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
  if (!opsPilotAgentsConfigured) {
    return null
  }

  return withTimeout(writeSupportReply(system, prompt), 20_000)
}

async function generateAssistantPlan(message: string) {
  if (!opsPilotAgentsConfigured) {
    return opsPilotAgentFallbackEnabled ? fallbackAssistantPlan(message) : aiRequiredPlan(message)
  }

  try {
    return await withTimeout(planOpsPilotCommand(message), 20_000)
  } catch (error) {
    if (opsPilotAgentFallbackEnabled) {
      return fallbackAssistantPlan(message)
    }

    return aiFailurePlan(message, error)
  }
}

export async function generateWorkflowActions(prompt: string): Promise<WorkflowAction[] | null> {
  if (!opsPilotAgentsConfigured && !opsPilotAgentFallbackEnabled) {
    return null
  }

  try {
    return await withTimeout(planWorkflowActions(prompt), 20_000)
  } catch (error) {
    console.error("[opspilot] planWorkflowActions failed:", summarizeError(error))
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
  const fallback = fallbackEmail({ workflowName, prompt, customerName, persona, tone, audience, callToAction })

  if (!opsPilotAgentsConfigured) {
    if (opsPilotAgentFallbackEnabled) {
      return fallback
    }

    throw new Error("HCNSEC_API_KEY is required for token-powered email agents.")
  }

  try {
    const result = await withTimeout(
      writeEmailTemplate([
        `Workflow name: ${workflowName}`,
        `Customer name: ${customerName ?? "Unknown"}`,
        `Customer company: ${company ?? "Unknown"}`,
        `Persona/from voice: ${persona ?? "OpsPilot team"}`,
        `Tone: ${tone ?? "professional"}`,
        `Audience: ${audience ?? "customer"}`,
        `Call to action: ${callToAction ?? "share next steps"}`,
        `Topic/request: ${prompt}`,
      ].join("\n")),
      30_000
    )

    return {
      subject: result.subject,
      body: result.body,
    }
  } catch (error) {
    if (opsPilotAgentFallbackEnabled) {
      return fallback
    }

    throw new Error(`Token-powered email agent failed and deterministic fallback is disabled (${summarizeError(error)}).`)
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

import "server-only"
import { createHash } from "node:crypto"
import OpenAI from "openai"
import { env } from "@/lib/env"
import { createLead } from "@/lib/ops/lead"
import { createTask, taskFromPrompt } from "@/lib/ops/tasks"
import { createTicket } from "@/lib/ops/support"
import { createReport } from "@/lib/ops/reports"

const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null

export async function generateAiText(system: string, prompt: string) {
  if (!client) {
    return null
  }

  const response = await client.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  })

  return response.output_text
}

export async function executeAssistantRequest(workspaceId: string, message: string) {
  const lower = message.toLowerCase()
  const messageHash = createHash("sha1").update(`${workspaceId}:${message}:${Date.now()}`).digest("hex").slice(0, 10)

  if (lower.includes("lead")) {
    const lead = await createLead(workspaceId, {
      name: "New inbound lead",
      email: `lead-${messageHash}@example.com`,
      source: "AI Assistant",
      notes: message,
    })

    return {
      action: "lead.created",
      content: `Created a CRM lead for ${lead.name}, scored it ${lead.score}, and set the next action: ${lead.nextAction}`,
    }
  }

  if (lower.includes("ticket") || lower.includes("support")) {
    const ticket = await createTicket(workspaceId, {
      subject: "Assistant-created support ticket",
      customerEmail: `customer-${messageHash}@example.com`,
      body: message,
    })

    return {
      action: "ticket.created",
      content: `Created and classified a support ticket as ${ticket.category.toLowerCase()}. Draft response is ready.`,
    }
  }

  if (lower.includes("report")) {
    const report = await createReport(workspaceId, "weekly")

    return {
      action: "report.created",
      content: `Generated ${report.title}.`,
    }
  }

  const taskInput = taskFromPrompt(message)
  const task = await createTask(workspaceId, taskInput)

  return {
    action: "task.created",
    content: `Created task "${task.title}" with ${task.priority.toLowerCase()} priority.`,
  }
}

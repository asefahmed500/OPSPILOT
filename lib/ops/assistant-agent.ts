import "server-only"
import { createHash } from "node:crypto"
import { db } from "@/lib/db"
import { sendWorkflowEmail } from "@/lib/email"
import { createLead } from "@/lib/ops/lead"
import { createReport } from "@/lib/ops/reports"
import { createTicket } from "@/lib/ops/support"
import { createTask, taskFromPrompt } from "@/lib/ops/tasks"
import type { AssistantPlan } from "@/lib/ops/assistant-planning"

type MarketingEmailGenerator = (input: {
  workflowName: string
  prompt: string
  customerName?: string
  company?: string
}) => Promise<{ subject: string; body: string }>

type AgentStep = {
  tool: string
  status: "completed" | "skipped" | "needs_attention"
  summary: string
}

function formatAgentResponse(reply: string, steps: AgentStep[]) {
  const completed = steps.filter((step) => step.status === "completed")
  const skipped = steps.filter((step) => step.status === "skipped")
  const needsAttention = steps.filter((step) => step.status === "needs_attention")
  const lines = [
    reply,
    "",
    "Agent run:",
    ...steps.map((step) => `- ${step.status.replace("_", " ")}: ${step.summary}`),
  ]

  if (completed.length === 0 && (skipped.length || needsAttention.length)) {
    lines.push("", "Nothing was executed yet because the command needs more information.")
  }

  return lines.join("\n")
}

export async function executeAssistantPlan({
  workspaceId,
  message,
  plan,
  generateMarketingEmail,
}: {
  workspaceId: string
  message: string
  plan: AssistantPlan
  generateMarketingEmail: MarketingEmailGenerator
}) {
  const messageHash = createHash("sha1").update(`${workspaceId}:${message}:${Date.now()}`).digest("hex").slice(0, 10)
  const steps: AgentStep[] = []

  for (const action of plan.actions) {
    if (action.type === "create_lead") {
      const lead = await createLead(workspaceId, {
        name: action.name ?? action.title ?? "New inbound lead",
        email: action.email ?? `lead-${messageHash}@example.com`,
        company: action.company,
        source: "AI Assistant",
        notes: action.description ?? message,
      })

      steps.push({ tool: "crm.createLead", status: "completed", summary: `Created CRM lead "${lead.name}".` })
      continue
    }

    if (action.type === "send_email") {
      if (!action.email) {
        steps.push({ tool: "email.send", status: "skipped", summary: "Email was not sent because no recipient email was provided." })
        continue
      }

      const generatedEmail = await generateMarketingEmail({
        workflowName: action.subject ?? "OpsPilot assistant email",
        prompt: action.body ?? action.description ?? action.prompt ?? message,
        customerName: action.name,
        company: action.company,
      })

      await sendWorkflowEmail({
        to: action.email,
        workflowName: action.subject ?? "OpsPilot assistant email",
        subject: action.subject ?? generatedEmail.subject,
        body: generatedEmail.body,
      })

      steps.push({ tool: "email.send", status: "completed", summary: `Sent customer email to ${action.email}.` })
      continue
    }

    if (action.type === "create_workflow") {
      const { createWorkflow, runWorkflow } = await import("@/lib/ops/workflows")
      const workflowPrompt = action.prompt ?? action.description ?? message
      const workflow = await createWorkflow(workspaceId, workflowPrompt, action.title ?? "Assistant workflow", {
        customerEmail: action.email,
        customerName: action.name,
        company: action.company,
      })

      if (!action.runNow) {
        steps.push({ tool: "workflow.create", status: "completed", summary: `Created workflow "${workflow.name}".` })
        continue
      }

      try {
        await runWorkflow(workspaceId, workflow.id)
        steps.push({ tool: "workflow.run", status: "completed", summary: `Created and ran workflow "${workflow.name}".` })
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown run error"
        steps.push({ tool: "workflow.run", status: "needs_attention", summary: `Created workflow "${workflow.name}", but the run needs attention: ${reason}.` })
      }

      continue
    }

    if (action.type === "create_ticket") {
      const ticket = await createTicket(workspaceId, {
        subject: action.subject ?? action.title ?? "Assistant-created support ticket",
        customerEmail: action.email ?? `customer-${messageHash}@example.com`,
        body: action.body ?? action.description ?? message,
      })

      steps.push({ tool: "support.createTicket", status: "completed", summary: `Created support ticket "${ticket.subject}".` })
      continue
    }

    if (action.type === "create_report") {
      const report = await createReport(workspaceId, action.period ?? "weekly")

      steps.push({ tool: "reports.create", status: "completed", summary: `Generated ${report.title}.` })
      continue
    }

    const task = await createTask(workspaceId, {
      title: action.title ?? taskFromPrompt(message).title,
      description: action.description ?? message,
      priority: "MEDIUM",
    })

    steps.push({ tool: "tasks.create", status: "completed", summary: `Created task "${task.title}".` })
  }

  await db.activityLog.create({
    data: {
      type: "assistant.agent.run",
      message: `Assistant agent executed ${steps.filter((step) => step.status === "completed").length} action${steps.filter((step) => step.status === "completed").length === 1 ? "" : "s"}`,
      metadata: {
        actionTypes: plan.actions.map((action) => action.type),
        steps: steps.map((step) => ({ tool: step.tool, status: step.status })),
      },
      workspaceId,
    },
  })

  return {
    action: "assistant.agent.run",
    steps,
    content: formatAgentResponse(plan.reply, steps),
  }
}

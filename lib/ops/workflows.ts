import "server-only"
import { db } from "@/lib/db"
import { normalizeWorkflowActions, parseWorkflowPrompt, type WorkflowAction } from "@/lib/ops/rules"
import { AppError } from "@/lib/errors"
import { sendWorkflowEmail } from "@/lib/email"

export { parseWorkflowPrompt, type WorkflowAction }

export async function createWorkflow(workspaceId: string, prompt: string, name?: string) {
  const parsed = parseWorkflowPrompt(prompt)
  return db.$transaction(async (tx) => {
    const workflow = await tx.workflow.create({
      data: {
        name: name ?? "New OpsPilot workflow",
        prompt,
        trigger: parsed.trigger,
        actions: parsed.actions,
        workspaceId,
      },
    })

    await tx.activityLog.create({
      data: {
        type: "workflow.created",
        message: `Created workflow "${workflow.name}"`,
        metadata: { workflowId: workflow.id },
        workspaceId,
      },
    })

    return workflow
  })
}

export async function runWorkflow(workspaceId: string, workflowId: string) {
  const workflow = await db.workflow.findFirst({
    where: { id: workflowId, workspaceId },
  })

  if (!workflow) {
    throw new AppError("Workflow not found", 404, "WORKFLOW_NOT_FOUND")
  }

  const actions = normalizeWorkflowActions(workflow.actions)
  const executableActions: WorkflowAction[] = actions.length ? actions : [{ type: "create_task", label: "Create review task" }]
  const shouldSendEmail = executableActions.some((action) => action.type === "send_email")
  const emailRecipient = shouldSendEmail
    ? await db.membership.findFirst({
        where: { workspaceId },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      })
    : null

  if (shouldSendEmail && !emailRecipient?.user.email) {
    throw new AppError("Workflow email action needs a workspace user email", 400, "WORKFLOW_EMAIL_RECIPIENT_REQUIRED")
  }

  const run = await db.$transaction(async (tx) => {
    if (executableActions.some((action) => action.type === "create_task")) {
      const task = await tx.task.create({
        data: {
          title: `Run workflow: ${workflow.name}`,
          description: workflow.prompt,
          workspaceId,
        },
      })

      await tx.activityLog.create({
        data: {
          type: "task.created",
          message: `Created task "${task.title}"`,
          metadata: { taskId: task.id },
          workspaceId,
        },
      })
    }

    const workflowRun = await tx.workflowRun.create({
      data: {
        workflowId: workflow.id,
        workspaceId,
        status: "SUCCESS",
        output: {
          actions: executableActions,
          message: shouldSendEmail ? "Internal actions executed; email action queued." : "Internal actions executed successfully.",
        },
      },
    })

    await tx.activityLog.create({
      data: {
        type: "workflow.run",
        message: `Ran workflow "${workflow.name}"`,
        metadata: { workflowId: workflow.id, runId: workflowRun.id },
        workspaceId,
      },
    })

    return workflowRun
  })

  if (!shouldSendEmail) {
    return run
  }

  const recipientEmail = emailRecipient?.user.email

  if (!recipientEmail) {
    throw new AppError("Workflow email action needs a workspace user email", 400, "WORKFLOW_EMAIL_RECIPIENT_REQUIRED")
  }

  try {
    await sendWorkflowEmail({
      to: recipientEmail,
      workflowName: workflow.name,
      prompt: workflow.prompt,
      actions: executableActions.map((action) => action.label),
    })

    await db.activityLog.create({
      data: {
        type: "workflow.email.sent",
        message: `Sent workflow email for "${workflow.name}" to ${recipientEmail}`,
        metadata: { workflowId: workflow.id, runId: run.id },
        workspaceId,
      },
    })

    return run
  } catch (error) {
    await db.workflowRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        output: {
          actions: executableActions,
          message: "Workflow email action failed.",
          error: error instanceof Error ? error.message : "Unknown email error",
        },
      },
    })

    throw new AppError("Workflow ran, but the email action failed", 502, "WORKFLOW_EMAIL_FAILED")
  }
}

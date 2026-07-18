import "server-only"
import { db } from "@/lib/db"
import { mergeWorkflowActions, normalizeWorkflowActions, parseWorkflowPrompt, type WorkflowAction } from "@/lib/ops/rules"
import { AppError } from "@/lib/errors"
import { sendWorkflowEmail } from "@/lib/email"
import { generateWorkflowActions } from "@/lib/ai"
import { createLead } from "@/lib/ops/lead"
import { createTask } from "@/lib/ops/tasks"
import { createTicket } from "@/lib/ops/support"

export { parseWorkflowPrompt, type WorkflowAction }

export async function createWorkflow(workspaceId: string, prompt: string, name?: string) {
  const parsed = parseWorkflowPrompt(prompt)
  const aiActions = await generateWorkflowActions(prompt).catch(() => null)
  const actions = aiActions?.length ? mergeWorkflowActions(parsed.actions, aiActions) : parsed.actions

  return db.$transaction(async (tx) => {
    const workflow = await tx.workflow.create({
      data: {
        name: name ?? "New OpsPilot workflow",
        prompt,
        trigger: parsed.trigger,
        actions,
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
  const executableActions: WorkflowAction[] = mergeWorkflowActions(actions, parseWorkflowPrompt(workflow.prompt).actions)
  const emailAction = executableActions.find((action) => action.type === "send_email")
  const shouldSendEmail = Boolean(emailAction)
  const customerAction = executableActions.find((action) => action.email || action.name || action.company)
  const customerEmail = customerAction?.email ?? emailAction?.email
  const customerName = customerAction?.name ?? customerEmail ?? "Workflow lead"

  if (shouldSendEmail && !emailAction?.email) {
    throw new AppError("Workflow email action needs a customer email in the workflow prompt", 400, "WORKFLOW_EMAIL_RECIPIENT_REQUIRED")
  }

  const createdLead = executableActions.some((action) => action.type === "create_crm_record")
    ? await createLead(workspaceId, {
        name: customerName,
        email: customerEmail ?? `workflow-${workflow.id}@example.com`,
        company: customerAction?.company,
        source: "Workflow",
        notes: workflow.prompt,
      })
    : null

  const ticketAction = executableActions.find((action) => action.type === "create_ticket")
  const createdTicket = ticketAction
    ? await createTicket(workspaceId, {
        subject: ticketAction.subject ?? `Workflow ticket: ${workflow.name}`,
        customerEmail: ticketAction.email ?? customerEmail ?? `workflow-${workflow.id}@example.com`,
        customerName,
        body: ticketAction.body ?? ticketAction.description ?? workflow.prompt,
      })
    : null

  const taskAction = executableActions.find((action) => action.type === "create_task")
  const createdTask = taskAction
    ? await createTask(workspaceId, {
        title: taskAction.title ?? `Follow up with ${customerEmail ?? customerName}`,
        description: taskAction.description ?? workflow.prompt,
        priority: "MEDIUM",
        leadId: createdLead?.id,
        ticketId: createdTicket?.id,
      })
    : null

  const runOutput = {
    actions: executableActions,
    leadId: createdLead?.id,
    leadName: createdLead?.name,
    leadEmail: createdLead?.email,
    taskId: createdTask?.id,
    taskTitle: createdTask?.title,
    ticketId: createdTicket?.id,
    ticketSubject: createdTicket?.subject,
    customerEmail,
  }

  const run = await db.$transaction(async (tx) => {
    const workflowRun = await tx.workflowRun.create({
      data: {
        workflowId: workflow.id,
        workspaceId,
        status: "SUCCESS",
        output: {
          ...runOutput,
          message: shouldSendEmail ? "Internal actions executed; customer email queued." : "Internal actions executed successfully.",
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

  const recipientEmail = emailAction?.email

  if (!recipientEmail) {
    throw new AppError("Workflow email action needs a customer email in the workflow prompt", 400, "WORKFLOW_EMAIL_RECIPIENT_REQUIRED")
  }

  try {
    await sendWorkflowEmail({
      to: recipientEmail,
      workflowName: workflow.name,
      prompt: workflow.prompt,
      actions: executableActions.map((action) => action.label),
      subject: emailAction.subject,
      body: emailAction.body,
    })

    await db.activityLog.create({
      data: {
        type: "workflow.email.sent",
        message: `Sent customer workflow email for "${workflow.name}" to ${recipientEmail}`,
        metadata: { workflowId: workflow.id, runId: run.id },
        workspaceId,
      },
    })

    const updatedRun = await db.workflowRun.update({
      where: { id: run.id },
      data: {
        output: {
          ...runOutput,
          message: "Internal actions executed; workflow email sent.",
        },
      },
    })

    return updatedRun
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

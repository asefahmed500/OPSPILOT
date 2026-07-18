import "server-only"
import { db } from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"
import { mergeWorkflowActions, normalizeWorkflowActions, parseWorkflowPrompt, type WorkflowAction } from "@/lib/ops/rules"
import { AppError } from "@/lib/errors"
import { sendWorkflowEmail } from "@/lib/email"
import { generateWorkflowActions, generateWorkflowMarketingEmail } from "@/lib/ai"
import { createLead } from "@/lib/ops/lead"
import { createTask } from "@/lib/ops/tasks"
import { createTicket } from "@/lib/ops/support"

export { parseWorkflowPrompt, type WorkflowAction }

type WorkflowCustomerFields = {
  customerEmail?: string
  customerName?: string
  company?: string
}

type WorkflowStepRecord = {
  tool: string
  status: "SUCCESS" | "FAILED" | "SKIPPED"
  summary: string
  metadata?: Prisma.InputJsonObject
}

function stepData(step: WorkflowStepRecord, workflowRunId: string, workspaceId: string) {
  return {
    tool: step.tool,
    status: step.status,
    summary: step.summary,
    ...(step.metadata ? { metadata: step.metadata } : {}),
    workflowRunId,
    workspaceId,
  }
}

async function createAutomationStep(step: WorkflowStepRecord, workflowRunId: string, workspaceId: string) {
  const client = db as unknown as {
    automationRunStep?: {
      create: (args: { data: ReturnType<typeof stepData> }) => Promise<unknown>
    }
  }

  if (!client.automationRunStep) {
    return
  }

  await client.automationRunStep.create({ data: stepData(step, workflowRunId, workspaceId) }).catch(() => undefined)
}

async function createAutomationSteps(steps: WorkflowStepRecord[], workflowRunId: string, workspaceId: string) {
  await Promise.all(steps.map((step) => createAutomationStep(step, workflowRunId, workspaceId)))
}

function withWorkflowCustomerFields(actions: WorkflowAction[], fields?: WorkflowCustomerFields) {
  const customerEmail = fields?.customerEmail?.toLowerCase().trim()
  const customerName = fields?.customerName?.trim()
  const company = fields?.company?.trim()

  if (!customerEmail && !customerName && !company) {
    return actions
  }

  return actions.map((action) => {
    if (!["create_crm_record", "send_email", "create_task", "create_ticket"].includes(action.type)) {
      return action
    }

    return {
      ...action,
      email: action.email ?? customerEmail,
      name: action.name ?? customerName,
      company: action.company ?? company,
      title: action.title ?? (action.type === "create_task" && customerEmail ? `Follow up with ${customerEmail}` : action.title),
      subject: action.subject ?? (action.type === "send_email" ? "Following up from OpsPilot" : action.subject),
    }
  })
}

export async function createWorkflow(workspaceId: string, prompt: string, name?: string, fields?: WorkflowCustomerFields) {
  const parsed = parseWorkflowPrompt(prompt)
  const aiActions = await generateWorkflowActions(prompt).catch(() => null)
  const actions = withWorkflowCustomerFields(aiActions?.length ? mergeWorkflowActions(parsed.actions, aiActions) : parsed.actions, fields)

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

export async function deleteWorkflow(workspaceId: string, workflowId: string) {
  const workflow = await db.workflow.findFirst({
    where: { id: workflowId, workspaceId },
    select: { id: true, name: true },
  })

  if (!workflow) {
    throw new AppError("Workflow not found", 404, "WORKFLOW_NOT_FOUND")
  }

  await db.$transaction(async (tx) => {
    await tx.workflow.delete({
      where: { id: workflow.id },
    })

    await tx.activityLog.create({
      data: {
        type: "workflow.deleted",
        message: `Deleted workflow "${workflow.name}"`,
        metadata: { workflowId: workflow.id },
        workspaceId,
      },
    })
  })
}

export async function bulkDeleteWorkflows(workspaceId: string, workflowIds: string[]) {
  const workflows = await db.workflow.findMany({
    where: { workspaceId, id: { in: workflowIds } },
    select: { id: true },
  })

  if (!workflows.length) {
    return { deleted: 0 }
  }

  await db.$transaction(async (tx) => {
    await tx.workflow.deleteMany({
      where: { workspaceId, id: { in: workflows.map((workflow) => workflow.id) } },
    })

    await tx.activityLog.create({
      data: {
        type: "workflow.bulk_deleted",
        message: `Deleted ${workflows.length} workflow${workflows.length === 1 ? "" : "s"}`,
        metadata: { workflowIds: workflows.map((workflow) => workflow.id) },
        workspaceId,
      },
    })
  })

  return { deleted: workflows.length }
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
  const steps: WorkflowStepRecord[] = []

  if (shouldSendEmail && !emailAction?.email) {
    const skippedRun = await db.workflowRun.create({
      data: {
        workflowId: workflow.id,
        workspaceId,
        status: "SKIPPED",
        output: {
          actions: executableActions,
          message: "Workflow needs a customer email before it can send an email.",
        },
      },
    })
    await createAutomationStep({
      tool: "email.validateRecipient",
      status: "SKIPPED",
      summary: "Email action skipped because the workflow prompt has no customer email.",
    }, skippedRun.id, workspaceId)

    await db.activityLog.create({
      data: {
        type: "workflow.skipped",
        message: `Skipped workflow "${workflow.name}" because an email recipient is missing`,
        metadata: { workflowId: workflow.id, runId: skippedRun.id },
        workspaceId,
      },
    })

    return skippedRun
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
  if (createdLead) {
    steps.push({
      tool: "crm.createLead",
      status: "SUCCESS",
      summary: `Created CRM lead "${createdLead.name}".`,
      metadata: { leadId: createdLead.id },
    })
  }

  const ticketAction = executableActions.find((action) => action.type === "create_ticket")
  const createdTicket = ticketAction
    ? await createTicket(workspaceId, {
        subject: ticketAction.subject ?? `Workflow ticket: ${workflow.name}`,
        customerEmail: ticketAction.email ?? customerEmail ?? `workflow-${workflow.id}@example.com`,
        customerName,
        body: ticketAction.body ?? ticketAction.description ?? workflow.prompt,
      })
    : null
  if (createdTicket) {
    steps.push({
      tool: "support.createTicket",
      status: "SUCCESS",
      summary: `Created support ticket "${createdTicket.subject}".`,
      metadata: { ticketId: createdTicket.id },
    })
  }

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
  if (createdTask) {
    steps.push({
      tool: "tasks.create",
      status: "SUCCESS",
      summary: `Created task "${createdTask.title}".`,
      metadata: { taskId: createdTask.id },
    })
  }

  const runOutput = {
    actions: executableActions,
    steps: steps.map((step) => ({ tool: step.tool, status: step.status, summary: step.summary })),
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

  if (steps.length) {
    await createAutomationSteps(steps, run.id, workspaceId)
  }

  if (!shouldSendEmail) {
    return run
  }

  const recipientEmail = emailAction?.email

  if (!recipientEmail) {
    throw new AppError("Workflow email action needs a customer email in the workflow prompt", 400, "WORKFLOW_EMAIL_RECIPIENT_REQUIRED")
  }

  try {
    const marketingEmail = await generateWorkflowMarketingEmail({
      workflowName: workflow.name,
      prompt: workflow.prompt,
      customerName: customerName === customerEmail ? undefined : customerName,
      company: customerAction?.company,
    })

    await sendWorkflowEmail({
      to: recipientEmail,
      workflowName: workflow.name,
      subject: marketingEmail.subject || emailAction.subject,
      body: marketingEmail.body || emailAction.body,
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
          steps: [
            ...steps.map((step) => ({ tool: step.tool, status: step.status, summary: step.summary })),
            { tool: "email.send", status: "SUCCESS", summary: `Sent customer email to ${recipientEmail}.` },
          ],
          message: "Internal actions executed; workflow email sent.",
        },
      },
    })
    await createAutomationStep({
      tool: "email.send",
      status: "SUCCESS",
      summary: `Sent customer email to ${recipientEmail}.`,
      metadata: { recipientEmail },
    }, run.id, workspaceId)

    return updatedRun
  } catch (error) {
    const failedRun = await db.workflowRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        output: {
          actions: executableActions,
          steps: [
            ...steps.map((step) => ({ tool: step.tool, status: step.status, summary: step.summary })),
            { tool: "email.send", status: "FAILED", summary: "Workflow email action failed." },
          ],
          message: "Workflow email action failed.",
          error: error instanceof Error ? error.message : "Unknown email error",
        },
      },
    })
    await createAutomationStep({
      tool: "email.send",
      status: "FAILED",
      summary: "Workflow email action failed.",
      metadata: { error: error instanceof Error ? error.message : "Unknown email error" },
    }, run.id, workspaceId)

    return failedRun
  }
}

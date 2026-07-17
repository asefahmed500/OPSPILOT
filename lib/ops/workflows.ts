import "server-only"
import { db } from "@/lib/db"
import { normalizeWorkflowActions, parseWorkflowPrompt, type WorkflowAction } from "@/lib/ops/rules"
import { AppError } from "@/lib/errors"

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

  return db.$transaction(async (tx) => {
    const actions = normalizeWorkflowActions(workflow.actions)
    const executableActions: WorkflowAction[] = actions.length ? actions : [{ type: "create_task", label: "Create review task" }]

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

    const run = await tx.workflowRun.create({
      data: {
        workflowId: workflow.id,
        workspaceId,
        status: "SUCCESS",
        output: {
          actions: executableActions,
          message: "Mock adapters executed successfully.",
        },
      },
    })

    await tx.activityLog.create({
      data: {
        type: "workflow.run",
        message: `Ran workflow "${workflow.name}"`,
        metadata: { workflowId: workflow.id, runId: run.id },
        workspaceId,
      },
    })

    return run
  })
}

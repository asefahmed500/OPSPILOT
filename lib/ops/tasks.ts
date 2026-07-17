import "server-only"
import { db } from "@/lib/db"
import { taskFromPrompt } from "@/lib/ops/rules"

export { taskFromPrompt }

export async function createTask(
  workspaceId: string,
  input: {
    title: string
    description?: string
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    status?: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED"
    dueAt?: string | Date
    leadId?: string
    ticketId?: string
  }
) {
  return db.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority ?? "MEDIUM",
        status: input.status ?? "TODO",
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        leadId: input.leadId,
        ticketId: input.ticketId,
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

    return task
  })
}

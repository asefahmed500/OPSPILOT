import "server-only"
import { db } from "@/lib/db"
import type { WorkflowTrigger } from "@/generated/prisma/enums"

export type AutomationEventType =
  | "lead.created"
  | "ticket.created"
  | "customer.reply.received"
  | "task.created"
  | "report.generated"
  | "customer.email.sent"

export type AutomationEvent = {
  type: AutomationEventType
  workspaceId: string
  sourceId?: string
  customerEmail?: string
  customerName?: string
  company?: string
  summary: string
  metadata?: Record<string, string | number | boolean | null | undefined>
}

function triggerForEvent(type: AutomationEventType): WorkflowTrigger | null {
  if (type === "lead.created") {
    return "NEW_LEAD"
  }

  if (type === "ticket.created" || type === "customer.reply.received") {
    return "NEW_SUPPORT_TICKET"
  }

  return null
}

export async function emitAutomationEvent(event: AutomationEvent) {
  const trigger = triggerForEvent(event.type)

  await db.activityLog.create({
    data: {
      type: `event.${event.type}`,
      message: event.summary,
      metadata: {
        sourceId: event.sourceId,
        customerEmail: event.customerEmail,
        customerName: event.customerName,
        company: event.company,
        ...event.metadata,
      },
      workspaceId: event.workspaceId,
    },
  })

  if (!trigger) {
    return { matched: 0, runs: 0 }
  }

  const workflows = await db.workflow.findMany({
    where: {
      workspaceId: event.workspaceId,
      enabled: true,
      trigger,
    },
    select: { id: true, name: true },
    take: 5,
  })

  if (!workflows.length) {
    return { matched: 0, runs: 0 }
  }

  const { runWorkflow } = await import("@/lib/ops/workflows")
  let runs = 0

  for (const workflow of workflows) {
    await db.activityLog.create({
      data: {
        type: "workflow.event.matched",
        message: `Event ${event.type} matched workflow "${workflow.name}"`,
        metadata: {
          eventType: event.type,
          workflowId: workflow.id,
          sourceId: event.sourceId,
        },
        workspaceId: event.workspaceId,
      },
    })

    await runWorkflow(event.workspaceId, workflow.id, { event }).catch(async (error) => {
      await db.activityLog.create({
        data: {
          type: "workflow.event.failed",
          message: `Workflow "${workflow.name}" failed after event ${event.type}`,
          metadata: {
            eventType: event.type,
            workflowId: workflow.id,
            error: error instanceof Error ? error.message : "Unknown workflow error",
          },
          workspaceId: event.workspaceId,
        },
      })
    })
    runs += 1
  }

  return { matched: workflows.length, runs }
}

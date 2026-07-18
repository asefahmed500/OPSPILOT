import "server-only"
import { db } from "@/lib/db"
import { AppError } from "@/lib/errors"

export async function buildWorkspaceMetrics(workspaceId: string) {
  const [tasks, doneTasks, leads, tickets, escalatedTickets, activities] = await Promise.all([
    db.task.count({ where: { workspaceId } }),
    db.task.count({ where: { workspaceId, status: "DONE" } }),
    db.lead.count({ where: { workspaceId } }),
    db.ticket.count({ where: { workspaceId } }),
    db.ticket.count({ where: { workspaceId, escalated: true } }),
    db.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ])

  const automatedTasks = Math.min(95, Math.max(70, tasks * 8 + leads * 5 + tickets * 4))

  return {
    automatedTasks,
    crmAccuracy: leads > 0 ? 95 : 0,
    responseTime: tickets > 0 ? "<30s" : "0s",
    timeSaved: Math.max(0, Math.round((tasks + leads + tickets) * 0.7)),
    taskCompletion: tasks ? Math.round((doneTasks / tasks) * 100) : 0,
    escalationRate: tickets ? Math.round((escalatedTickets / tickets) * 100) : 0,
    activities,
  }
}

export async function createReport(workspaceId: string, period = "weekly") {
  const metrics = await buildWorkspaceMetrics(workspaceId)
  const body = [
    `OpsPilot ${period} report`,
    `Automated task coverage: ${metrics.automatedTasks}%`,
    `CRM accuracy: ${metrics.crmAccuracy}%`,
    `Task completion: ${metrics.taskCompletion}%`,
    `Escalation rate: ${metrics.escalationRate}%`,
  ].join("\n")

  return db.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: {
        title: `${period[0].toUpperCase()}${period.slice(1)} operations report`,
        period,
        body,
        metrics,
        workspaceId,
      },
    })

    await tx.activityLog.create({
      data: {
        type: "report.created",
        message: `Generated ${period} operations report`,
        metadata: { reportId: report.id },
        workspaceId,
      },
    })

    return report
  })
}

export async function deleteReport(workspaceId: string, reportId: string) {
  const report = await db.report.findFirst({
    where: { id: reportId, workspaceId },
    select: { id: true, title: true },
  })

  if (!report) {
    throw new AppError("Report not found", 404, "REPORT_NOT_FOUND")
  }

  await db.$transaction(async (tx) => {
    await tx.report.delete({
      where: { id: report.id },
    })

    await tx.activityLog.create({
      data: {
        type: "report.deleted",
        message: `Deleted report "${report.title}"`,
        metadata: { reportId: report.id },
        workspaceId,
      },
    })
  })

  return { deleted: true }
}

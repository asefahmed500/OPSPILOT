import "server-only"
import { db } from "@/lib/db"
import { AppError } from "@/lib/errors"

export async function buildWorkspaceMetrics(workspaceId: string) {
  const [tasks, doneTasks, leads, contacts, tickets, escalatedTickets, workflows, workflowRuns, successfulWorkflowRuns, emailSentActivities, activities] = await Promise.all([
    db.task.count({ where: { workspaceId } }),
    db.task.count({ where: { workspaceId, status: "DONE" } }),
    db.lead.count({ where: { workspaceId } }),
    db.contact.count({ where: { workspaceId } }),
    db.ticket.count({ where: { workspaceId } }),
    db.ticket.count({ where: { workspaceId, escalated: true } }),
    db.workflow.count({ where: { workspaceId } }),
    db.workflowRun.count({ where: { workspaceId } }),
    db.workflowRun.count({ where: { workspaceId, status: "SUCCESS" } }),
    db.activityLog.count({ where: { workspaceId, type: { in: ["workflow.email.sent", "ticket.draft.sent"] } } }),
    db.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ])

  return {
    tasks,
    doneTasks,
    leads,
    contacts,
    tickets,
    escalatedTickets,
    workflows,
    workflowRuns,
    successfulWorkflowRuns,
    emailSentActivities,
    taskCompletion: tasks ? Math.round((doneTasks / tasks) * 100) : 0,
    escalationRate: tickets ? Math.round((escalatedTickets / tickets) * 100) : 0,
    workflowSuccessRate: workflowRuns ? Math.round((successfulWorkflowRuns / workflowRuns) * 100) : 0,
    activities,
  }
}

export async function createReport(workspaceId: string, period = "weekly") {
  const metrics = await buildWorkspaceMetrics(workspaceId)
  const recentRuns = await db.workflowRun.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      workflow: { select: { name: true, trigger: true } },
      steps: { orderBy: { createdAt: "asc" } },
    },
  })
  const body = [
    `OpsPilot ${period} report`,
    `CRM leads: ${metrics.leads}`,
    `Contacts: ${metrics.contacts}`,
    `Tasks: ${metrics.tasks}`,
    `Task completion: ${metrics.taskCompletion}%`,
    `Support tickets: ${metrics.tickets}`,
    `Escalation rate: ${metrics.escalationRate}%`,
    `Workflows: ${metrics.workflows}`,
    `Workflow runs: ${metrics.workflowRuns}`,
    `Workflow success rate: ${metrics.workflowSuccessRate}%`,
    `Customer emails sent: ${metrics.emailSentActivities}`,
    "",
    "Recent system audit:",
    ...(metrics.activities.length
      ? metrics.activities.map((activity) => `- ${activity.createdAt.toISOString()} | ${activity.type}: ${activity.message}`)
      : ["- No recent activity recorded."]),
    "",
    "Recent automation runs:",
    ...(recentRuns.length
      ? recentRuns.map((run) => {
          const stepSummary = run.steps.length
            ? run.steps.map((step) => `${step.tool}=${step.status}`).join(", ")
            : "No step records"

          return `- ${run.createdAt.toISOString()} | ${run.workflow.name} | ${run.status} | ${stepSummary}`
        })
      : ["- No workflow runs recorded."]),
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

export async function bulkDeleteReports(workspaceId: string, reportIds: string[]) {
  const reports = await db.report.findMany({
    where: { workspaceId, id: { in: reportIds } },
    select: { id: true },
  })

  if (!reports.length) {
    return { deleted: 0 }
  }

  await db.$transaction(async (tx) => {
    await tx.report.deleteMany({
      where: { workspaceId, id: { in: reports.map((report) => report.id) } },
    })

    await tx.activityLog.create({
      data: {
        type: "report.bulk_deleted",
        message: `Deleted ${reports.length} report${reports.length === 1 ? "" : "s"}`,
        metadata: { reportIds: reports.map((report) => report.id) },
        workspaceId,
      },
    })
  })

  return { deleted: reports.length }
}

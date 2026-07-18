import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { buildWorkspaceMetrics } from "@/lib/ops/reports"
import { db } from "@/lib/db"

export default async function DashboardPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const metrics = await buildWorkspaceMetrics(workspace.id)
  const [leads, tickets, tasks] = await Promise.all([
    db.lead.count({ where: { workspaceId: workspace.id } }),
    db.ticket.count({ where: { workspaceId: workspace.id } }),
    db.task.count({ where: { workspaceId: workspace.id } }),
  ])

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">Operations overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your real-time command center for CRM, support, tasks, workflows, and reports.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["CRM Leads", metrics.leads],
          ["Open Tasks", metrics.tasks - metrics.doneTasks],
          ["Support Tickets", metrics.tickets],
          ["Workflow Runs", metrics.workflowRuns],
        ].map(([label, value]) => (
          <div key={label} className="op-panel p-5">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="op-panel p-5">
          <h2 className="font-semibold tracking-tight">Recent activity</h2>
          <div className="mt-4 space-y-3">
            {metrics.activities.length ? metrics.activities.map((activity) => (
              <div key={activity.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium">{activity.message}</p>
                <p className="mt-1 text-xs text-slate-500">{activity.type}</p>
              </div>
            )) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No activity yet. Create a lead, ticket, or task to start the feed.</p>}
          </div>
        </div>
        <div className="rounded-lg bg-slate-950 p-5 text-white shadow-sm">
          <h2 className="font-semibold tracking-tight">Workspace data</h2>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <p>{leads} CRM leads</p>
            <p>{tasks} tasks tracked</p>
            <p>{tickets} support tickets classified</p>
            <p>{metrics.taskCompletion}% task completion</p>
            <p>{metrics.workflowSuccessRate}% workflow success rate</p>
          </div>
        </div>
      </div>
    </div>
  )
}

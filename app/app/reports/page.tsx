import { ActionForm } from "@/components/app/action-form"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"
import { DeleteResourceButton } from "@/components/app/delete-resource-button"
import { BulkDeleteCheckbox, BulkDeleteProvider, BulkDeleteToolbar } from "@/components/app/bulk-delete"

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function statusClass(status: string) {
  if (status === "SUCCESS" || status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900"
  }

  if (status === "FAILED" || status === "needs_attention") {
    return "border-red-200 bg-red-50 text-red-900"
  }

  return "border-amber-200 bg-amber-50 text-amber-900"
}

function readOutputValue(output: unknown, key: string) {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null
  }

  const value = (output as Record<string, unknown>)[key]
  return typeof value === "string" ? value : null
}

function outputActions(output: unknown) {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return []
  }

  const actions = (output as Record<string, unknown>).actions

  if (!Array.isArray(actions)) {
    return []
  }

  return actions
    .filter((action): action is Record<string, unknown> => Boolean(action) && typeof action === "object" && !Array.isArray(action))
    .map((action, index) => ({
      key: `${String(action.type ?? "action")}-${index}`,
      type: typeof action.type === "string" ? action.type : "action",
      label: typeof action.label === "string" ? action.label : typeof action.type === "string" ? action.type.replace(/_/g, " ") : "Action",
      email: typeof action.email === "string" ? action.email : null,
      subject: typeof action.subject === "string" ? action.subject : null,
      title: typeof action.title === "string" ? action.title : null,
      name: typeof action.name === "string" ? action.name : null,
    }))
}

function outputParameters(output: unknown) {
  return [
    ["Customer", readOutputValue(output, "leadName")],
    ["Email", readOutputValue(output, "customerEmail") ?? readOutputValue(output, "leadEmail")],
    ["Task", readOutputValue(output, "taskTitle")],
    ["Ticket", readOutputValue(output, "ticketSubject")],
  ].filter((parameter): parameter is [string, string] => Boolean(parameter[1]))
}

export default async function ReportsPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const [reports, activities, workflowRuns, automationStepCounts] = await Promise.all([
    db.report.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" } }),
    db.activityLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.workflowRun.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        workflow: { select: { name: true, trigger: true } },
        steps: { orderBy: { createdAt: "asc" } },
      },
    }),
    Promise.all([
      db.automationRunStep.count({ where: { workspaceId: workspace.id, status: "SUCCESS" } }),
      db.automationRunStep.count({ where: { workspaceId: workspace.id, status: "FAILED" } }),
      db.automationRunStep.count({ where: { workspaceId: workspace.id, status: "SKIPPED" } }),
    ]),
  ])
  const [successfulSteps, failedSteps, skippedSteps] = automationStepCounts
  const totalSteps = successfulSteps + failedSteps + skippedSteps
  const successRate = totalSteps ? Math.round((successfulSteps / totalSteps) * 100) : 0

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="mt-2 text-slate-600">Generate reports and inspect the live automation audit trail.</p>
        <div>
          <ActionForm kind="report" endpoint="/api/reports" submitLabel="Generate report" successLabel="Report generated" />
        </div>
        <div className="op-panel p-5">
          <h2 className="font-semibold tracking-tight">Automation health</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              <p className="text-xl font-semibold">{successfulSteps}</p>
              <p className="text-xs">Succeeded</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">
              <p className="text-xl font-semibold">{failedSteps}</p>
              <p className="text-xs">Failed</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-xl font-semibold">{skippedSteps}</p>
              <p className="text-xs">Skipped</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold">{successRate}% action success rate</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${successRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="op-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold tracking-tight">Action audit diagram</h2>
              <p className="mt-1 text-sm text-slate-500">Recent workflow runs, tool steps, parameters, and outcomes.</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {workflowRuns.map((run) => {
              const actions = outputActions(run.output)
              const parameters = outputParameters(run.output)

              return (
                <div key={run.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{run.workflow.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{run.workflow.trigger} · {formatDate(run.createdAt)}</p>
                    </div>
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass(run.status)}`}>{run.status}</span>
                  </div>

                  {actions.length ? (
                    <div className="mt-4 overflow-x-auto pb-1">
                      <div className="flex min-w-max items-stretch gap-2">
                        {actions.map((action, index) => (
                          <div key={action.key} className="flex items-center gap-2">
                            <div className="w-48 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                              <p className="text-xs font-semibold uppercase text-slate-500">{action.type.replace(/_/g, " ")}</p>
                              <p className="mt-1 text-sm font-medium text-slate-950">{action.label}</p>
                              {[action.email, action.name, action.subject, action.title].filter(Boolean).map((value) => (
                                <p key={value} className="mt-1 truncate text-xs text-slate-500">{value}</p>
                              ))}
                            </div>
                            {index < actions.length - 1 ? <span className="text-slate-300">→</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {parameters.length ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {parameters.map(([label, value]) => (
                        <div key={`${run.id}-${label}`} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                          <p className="mt-1 truncate text-sm text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {run.steps.length ? run.steps.map((step) => (
                      <div key={step.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-slate-950">{step.tool}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{step.summary}</p>
                        </div>
                        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusClass(step.status)}`}>{step.status}</span>
                      </div>
                    )) : (
                      <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">No step audit records for this run.</p>
                    )}
                  </div>
                </div>
              )
            })}
            {!workflowRuns.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No workflow runs yet.</p> : null}
          </div>
        </div>

        <div className="op-panel p-5">
          <h2 className="font-semibold tracking-tight">System audit feed</h2>
          <div className="mt-4 space-y-2">
            {activities.map((activity) => (
              <div key={activity.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-950">{activity.message}</p>
                  <p className="text-xs text-slate-500">{formatDate(activity.createdAt)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">{activity.type}</p>
              </div>
            ))}
            {!activities.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No audit activity yet.</p> : null}
          </div>
        </div>

        <div className="op-panel p-5">
          <h2 className="font-semibold tracking-tight">Generated reports</h2>
        <BulkDeleteProvider endpoint="/api/reports/bulk" label="reports">
          <BulkDeleteToolbar />
          <div className="mt-4 space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <BulkDeleteCheckbox id={report.id} label="report" />
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(report.createdAt)} · {report.period}</p>
                    </div>
                  </div>
                  <DeleteResourceButton endpoint={`/api/reports/${report.id}`} label="report" />
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">{report.body}</pre>
              </div>
            ))}
            {!reports.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No reports yet.</p> : null}
          </div>
          </BulkDeleteProvider>
        </div>
      </div>
    </div>
  )
}

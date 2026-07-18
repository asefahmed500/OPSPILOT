import { ActionForm } from "@/components/app/action-form"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"
import { RunWorkflowButton } from "@/components/app/run-workflow-button"
import Link from "next/link"
import { DeleteResourceButton } from "@/components/app/delete-resource-button"

function workflowOutputValue(
  output: unknown,
  key: "message" | "leadId" | "leadName" | "leadEmail" | "taskId" | "taskTitle" | "ticketId" | "ticketSubject"
) {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null
  }

  const value = (output as Record<string, unknown>)[key]
  return typeof value === "string" ? value : null
}

function workflowActionLabels(actions: unknown) {
  if (!Array.isArray(actions)) {
    return []
  }

  return actions
    .filter((action): action is { type: string; label: string; email?: string } => Boolean(action) && typeof action === "object" && typeof (action as { type?: unknown }).type === "string" && typeof (action as { label?: unknown }).label === "string")
    .map((action) => `${action.label}${action.email ? ` -> ${action.email}` : ""}`)
}

export default async function WorkflowsPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const workflows = await db.workflow.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } } })

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div>
        <h1 className="text-3xl font-semibold">Workflows</h1>
        <p className="mt-2 text-slate-600">Describe an automation and OpsPilot converts it into trigger/actions.</p>
        <div className="mt-6">
          <ActionForm kind="workflow" endpoint="/api/workflows" submitLabel="Create workflow" successLabel="Workflow created" />
        </div>
      </div>
      <div className="op-panel p-5">
        <h2 className="font-semibold tracking-tight">Automation library</h2>
        <div className="mt-4 space-y-3">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{workflow.name}</p>
                  <p className="text-sm text-slate-500">{workflow.trigger}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <RunWorkflowButton workflowId={workflow.id} />
                  <DeleteResourceButton endpoint={`/api/workflows/${workflow.id}`} label="workflow" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{workflow.prompt}</p>
              <p className="mt-2 text-xs text-slate-500">Last run: {workflow.runs[0]?.status ?? "never"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {workflowActionLabels(workflow.actions).map((label) => (
                  <span key={label} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                    {label}
                  </span>
                ))}
              </div>
              {workflow.runs[0]?.output ? (
                <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                  <p className="font-semibold text-slate-900">{workflowOutputValue(workflow.runs[0].output, "message") ?? "Workflow run completed."}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {workflowOutputValue(workflow.runs[0].output, "leadId") ? (
                      <Link href="/app/crm" className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-blue-900 transition hover:border-blue-200 hover:bg-blue-100">
                        <span className="block font-semibold">CRM updated</span>
                        <span className="block truncate">{workflowOutputValue(workflow.runs[0].output, "leadName") ?? workflowOutputValue(workflow.runs[0].output, "leadEmail")}</span>
                      </Link>
                    ) : null}
                    {workflowOutputValue(workflow.runs[0].output, "taskId") ? (
                      <Link href="/app/tasks" className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-900 transition hover:border-emerald-200 hover:bg-emerald-100">
                        <span className="block font-semibold">Task added</span>
                        <span className="block truncate">{workflowOutputValue(workflow.runs[0].output, "taskTitle")}</span>
                      </Link>
                    ) : null}
                    {workflowOutputValue(workflow.runs[0].output, "ticketId") ? (
                      <Link href="/app/support" className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-amber-900 transition hover:border-amber-200 hover:bg-amber-100">
                        <span className="block font-semibold">Support updated</span>
                        <span className="block truncate">{workflowOutputValue(workflow.runs[0].output, "ticketSubject")}</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {!workflows.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No workflows yet.</p> : null}
        </div>
      </div>
    </div>
  )
}

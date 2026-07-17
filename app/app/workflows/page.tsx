import { ActionForm } from "@/components/app/action-form"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"
import { RunWorkflowButton } from "@/components/app/run-workflow-button"

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
                <RunWorkflowButton workflowId={workflow.id} />
              </div>
              <p className="mt-3 text-sm text-slate-600">{workflow.prompt}</p>
              <p className="mt-2 text-xs text-slate-500">Last run: {workflow.runs[0]?.status ?? "never"}</p>
            </div>
          ))}
          {!workflows.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No workflows yet.</p> : null}
        </div>
      </div>
    </div>
  )
}

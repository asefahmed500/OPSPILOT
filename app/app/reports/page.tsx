import { ActionForm } from "@/components/app/action-form"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"
import { DeleteResourceButton } from "@/components/app/delete-resource-button"
import { BulkDeleteCheckbox, BulkDeleteProvider, BulkDeleteToolbar } from "@/components/app/bulk-delete"

export default async function ReportsPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const reports = await db.report.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" } })

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div>
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="mt-2 text-slate-600">Generate daily and weekly operational summaries.</p>
        <div className="mt-6">
          <ActionForm kind="report" endpoint="/api/reports" submitLabel="Generate report" successLabel="Report generated" />
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
                  <p className="font-medium">{report.title}</p>
                </div>
                <DeleteResourceButton endpoint={`/api/reports/${report.id}`} label="report" />
              </div>
              <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{report.body}</pre>
            </div>
          ))}
          {!reports.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No reports yet.</p> : null}
        </div>
        </BulkDeleteProvider>
      </div>
    </div>
  )
}

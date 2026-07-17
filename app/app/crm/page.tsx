import { ActionForm } from "@/components/app/action-form"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"

export default async function CrmPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const leads = await db.lead.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, include: { company: true } })

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <h1 className="text-3xl font-semibold">CRM</h1>
        <p className="mt-2 text-slate-600">Create leads with automatic scoring, summaries, and next actions.</p>
        <div className="mt-6">
          <ActionForm kind="lead" endpoint="/api/crm/leads" submitLabel="Create lead" successLabel="Lead created" />
        </div>
      </div>
      <div className="op-panel p-5">
        <h2 className="font-semibold tracking-tight">Leads</h2>
        <div className="mt-4 space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-sm text-slate-500">{lead.email} {lead.company ? `- ${lead.company.name}` : ""}</p>
                </div>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium">Score {lead.score}</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{lead.summary}</p>
              <p className="mt-2 text-sm font-medium">{lead.nextAction}</p>
            </div>
          ))}
          {!leads.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No leads yet.</p> : null}
        </div>
      </div>
    </div>
  )
}

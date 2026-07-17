import { ActionForm } from "@/components/app/action-form"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"

export default async function SupportPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const tickets = await db.ticket.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, include: { messages: true } })

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <h1 className="text-3xl font-semibold">Support</h1>
        <p className="mt-2 text-slate-600">Classify tickets, draft responses, and flag escalations.</p>
        <div className="mt-6">
          <ActionForm kind="ticket" endpoint="/api/support/tickets" submitLabel="Create ticket" successLabel="Ticket created" />
        </div>
      </div>
      <div className="op-panel p-5">
        <h2 className="font-semibold tracking-tight">Ticket inbox</h2>
        <div className="mt-4 space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="text-sm text-slate-500">{ticket.customerEmail}</p>
                </div>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium">{ticket.category}</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{ticket.aiDraft}</p>
              <p className="mt-2 text-xs text-slate-500">{ticket.status}{ticket.escalated ? " - escalated" : ""}</p>
            </div>
          ))}
          {!tickets.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No support tickets yet.</p> : null}
        </div>
      </div>
    </div>
  )
}

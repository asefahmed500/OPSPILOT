import { ActionForm } from "@/components/app/action-form"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"
import { CustomerReplyForm } from "@/components/app/customer-reply-form"
import { InboundEmailForm } from "@/components/app/inbound-email-form"
import { SendTicketDraftForm } from "@/components/app/send-ticket-draft-form"
import { SyncSupportInboxButton } from "@/components/app/sync-support-inbox-button"
import { CleanupSupportButton } from "@/components/app/cleanup-support-button"
import { DeleteResourceButton } from "@/components/app/delete-resource-button"
import { BulkDeleteCheckbox, BulkDeleteProvider, BulkDeleteToolbar } from "@/components/app/bulk-delete"

export default async function SupportPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const tickets = await db.ticket.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <h1 className="text-3xl font-semibold">Support</h1>
        <p className="mt-2 text-slate-600">Sync Gmail replies, classify tickets, draft responses, and flag escalations.</p>
        <div className="mt-6">
          <ActionForm kind="ticket" endpoint="/api/support/tickets" submitLabel="Create ticket" successLabel="Ticket created" />
        </div>
        <SyncSupportInboxButton />
        <CleanupSupportButton />
        <InboundEmailForm />
      </div>
      <div className="op-panel p-5">
        <h2 className="font-semibold tracking-tight">Ticket inbox</h2>
        <BulkDeleteProvider endpoint="/api/support/tickets/bulk" label="tickets">
          <BulkDeleteToolbar />
        <div className="mt-4 space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <BulkDeleteCheckbox id={ticket.id} label="ticket" />
                  <div>
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="text-sm text-slate-500">{ticket.customerEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium">{ticket.category}</span>
                  <DeleteResourceButton endpoint={`/api/support/tickets/${ticket.id}`} label="ticket" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{ticket.aiDraft}</p>
              <p className="mt-2 text-xs text-slate-500">{ticket.status}{ticket.escalated ? " - escalated" : ""}</p>
              <div className="mt-4 space-y-2">
                {ticket.messages.slice(-3).map((message) => (
                  <div key={message.id} className={`rounded-md border px-3 py-2 text-xs leading-5 ${message.fromAgent ? "border-blue-100 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-600"}`}>
                    <p className="mb-1 font-semibold">{message.fromAgent ? "OpsPilot reply" : "Customer"}</p>
                    {message.body}
                  </div>
                ))}
              </div>
              {ticket.aiDraft && !ticket.messages.some((message) => message.fromAgent && message.body === ticket.aiDraft) ? (
                <SendTicketDraftForm ticketId={ticket.id} initialDraft={ticket.aiDraft} />
              ) : null}
              <CustomerReplyForm ticketId={ticket.id} />
            </div>
          ))}
          {!tickets.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No support tickets yet.</p> : null}
        </div>
        </BulkDeleteProvider>
      </div>
    </div>
  )
}

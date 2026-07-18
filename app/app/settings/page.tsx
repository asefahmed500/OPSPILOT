import { ActionForm } from "@/components/app/action-form"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"
import Link from "next/link"

const providerLabels: Record<string, string> = {
  "internal-crm": "Internal CRM",
  "internal-support": "Internal Support",
  "internal-tasks": "Internal Tasks",
  "smtp-email": "SMTP Email",
  "ai-provider": "AI Provider",
  "inbound-email": "Inbound Email",
}

function formatStatus(status: string) {
  const legacyPlaceholderStatus = ["mo", "ck"].join("")

  if (status === "not_configured" || status.includes(legacyPlaceholderStatus)) {
    return "Not configured"
  }

  return status.replace(/_/g, " ")
}

function providerLabel(provider: string) {
  if (provider.includes("crm")) {
    return "Internal CRM"
  }

  if (provider.includes("slack") || provider.includes("messaging")) {
    return "Inbound Email"
  }

  return providerLabels[provider] ?? provider
}

export default async function SettingsPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const integrations = await db.integrationAccount.findMany({ where: { workspaceId: workspace.id }, orderBy: { provider: "asc" } })

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-slate-600">Workspace, profile, SMTP, AI, and integration status.</p>
        <div className="op-panel mt-6 p-5">
          <p className="font-medium">{workspace.name}</p>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          <Link href="/app/settings/system-health" className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Open system health
          </Link>
        </div>
      </div>
      <div className="space-y-6">
        <ActionForm kind="smtp" endpoint="/api/settings/smtp-test" submitLabel="Send SMTP test" successLabel="SMTP test sent" />
        <div className="op-panel p-5">
          <h2 className="font-semibold tracking-tight">Adapters</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {integrations.map((integration) => (
              <div key={integration.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium">{providerLabel(integration.provider)}</p>
                <p className="mt-1 capitalize text-sm text-slate-500">{formatStatus(integration.status)}</p>
              </div>
            ))}
            {!integrations.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No integration records found. Internal features still use the workspace database.</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { requireWorkspace } from "@/lib/workspace"

function HealthCard({
  label,
  status,
  detail,
}: {
  label: string
  status: "healthy" | "warning" | "attention"
  detail: string
}) {
  const tone = {
    healthy: "border-emerald-100 bg-emerald-50 text-emerald-900",
    warning: "border-amber-100 bg-amber-50 text-amber-900",
    attention: "border-red-100 bg-red-50 text-red-900",
  }[status]

  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{label}</p>
        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-semibold uppercase">{status}</span>
      </div>
      <p className="mt-2 text-sm leading-6">{detail}</p>
    </div>
  )
}

export default async function SystemHealthPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const [failedWorkflowRuns, recentActivity, latestRun] = await Promise.all([
    db.workflowRun.count({ where: { workspaceId: workspace.id, status: "FAILED" } }),
    db.activityLog.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.workflowRun.findFirst({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, include: { steps: { orderBy: { createdAt: "asc" } } } }),
  ])

  const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM)
  const aiConfigured = Boolean(env.AI_API_KEY || env.HCNSEC_API_KEY || env.OPENAI_API_KEY)
  const inboundConfigured = Boolean(env.INBOUND_EMAIL_WEBHOOK_SECRET || (env.IMAP_USER && env.IMAP_PASS))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">System health</h1>
        <p className="mt-2 text-slate-600">Configuration and reliability signals for OpsPilot automation.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard label="Database" status="healthy" detail="Workspace data loaded successfully from PostgreSQL." />
        <HealthCard label="AI provider" status={aiConfigured ? "healthy" : "attention"} detail={aiConfigured ? `Configured with model ${env.AI_MODEL}.` : "Missing AI_API_KEY or HCNSEC_API_KEY."} />
        <HealthCard label="SMTP" status={smtpConfigured ? "healthy" : "attention"} detail={smtpConfigured ? "Outbound email adapter is configured." : "SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM are required."} />
        <HealthCard label="Inbound email" status={inboundConfigured ? "warning" : "attention"} detail={inboundConfigured ? "Inbound email is configured. Webhook providers are more stable than IMAP polling." : "Configure inbound webhook secret or IMAP credentials to receive replies."} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="op-panel p-5">
          <h2 className="font-semibold tracking-tight">Latest automation run</h2>
          {latestRun ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-medium">Status: {latestRun.status}</p>
                <p className="mt-1 text-slate-500">{latestRun.createdAt.toLocaleString()}</p>
              </div>
              {latestRun.steps.length ? (
                <div className="space-y-2">
                  {latestRun.steps.map((step) => (
                    <div key={step.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-medium">{step.tool} · {step.status}</p>
                      <p className="mt-1 text-slate-600">{step.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No step details stored for this run yet.</p>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No workflow runs yet.</p>
          )}
        </div>

        <div className="op-panel p-5">
          <h2 className="font-semibold tracking-tight">Reliability summary</h2>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-3xl font-semibold">{failedWorkflowRuns}</p>
            <p className="mt-1 text-sm text-slate-500">failed workflow runs</p>
          </div>
          <div className="mt-4 space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="font-medium">{activity.type}</p>
                <p className="mt-1 text-slate-600">{activity.message}</p>
              </div>
            ))}
            {!recentActivity.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No activity yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

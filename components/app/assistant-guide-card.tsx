"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2, Mail, MousePointerClick, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const guideSteps = [
  {
    icon: Sparkles,
    title: "Write one natural command",
    body: "Tell OpsPilot the persona, tone, topic, customer email, and what systems to update.",
    example: "/agent as founder write a friendly email for SaaS owners about OpsPilot, send to customer@example.com, create CRM, task, ticket, and report",
  },
  {
    icon: MousePointerClick,
    title: "OpsPilot plans tool calls",
    body: "The agent converts the message into safe actions like send_email, create_lead, create_task, create_ticket, create_workflow, and create_report.",
    example: "Planner -> validation -> internal tools -> audit log",
  },
  {
    icon: Mail,
    title: "Email and records update",
    body: "Customer-facing email is generated separately from internal notes, then CRM, Tasks, Support, and Reports are updated.",
    example: "Customer sees the email. Your workspace sees the operational trail.",
  },
  {
    icon: CheckCircle2,
    title: "Verify the audit trail",
    body: "Open Reports to see what ran, which parameters were used, and whether each action succeeded, skipped, or failed.",
    example: "Reports -> Action audit diagram -> System audit feed",
  },
]

export function AssistantGuideCard() {
  const [step, setStep] = useState(0)
  const current = guideSteps[step]
  const Icon = current.icon

  return (
    <section className="op-panel overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">How the AI agent works</p>
            <p className="mt-1 text-xs text-slate-500">Step {step + 1} of {guideSteps.length}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {guideSteps.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setStep(index)}
              className={`size-2 rounded-full transition ${index === step ? "bg-slate-950" : "bg-slate-300 hover:bg-slate-400"}`}
              aria-label={`Show ${item.title}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-lg font-semibold text-slate-950">{current.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{current.body}</p>
        <p className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">{current.example}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>
          Back
        </Button>
        <Button type="button" size="sm" onClick={() => setStep((value) => (value + 1) % guideSteps.length)}>
          {step === guideSteps.length - 1 ? "Restart" : "Next"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  )
}

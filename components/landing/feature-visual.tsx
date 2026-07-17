"use client"

import { GlassPanel } from "@/components/landing/landing-motion"
import type { LandingFeature } from "@/components/landing/landing-data"

export function FeatureVisual({ type }: { type: LandingFeature["visual"] }) {
  const title = type === "crm" ? "Lead Pipeline" : type === "support" ? "Support Triage" : type === "workflow" ? "Workflow Plan" : "OpsPilot Action"
  const rows = type === "crm" ? ["Acme Labs - score 92", "Northstar Co. - score 76", "BrightPath - score 68"] : type === "support" ? ["Classified: Billing", "Draft response ready", "Escalation: No"] : type === "workflow" ? ["Trigger: New Lead", "Action: Create CRM Record", "Action: Create Task"] : ["Understand request", "Plan workflow", "Execute safe action"]

  return (
    <GlassPanel className="p-4 sm:p-5">
      <div className="rounded-md border border-slate-200 bg-white/85 p-4">
        <h4 className="font-semibold text-[#1a1a1a]">{title}</h4>
        <div className="mt-4 grid gap-3">
          {rows.map((row, index) => (
            <div key={row} className="flex items-center gap-3 rounded-md border border-slate-100 bg-[#fbfaf6] p-3 text-sm text-[#5a5a5a]">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#2c67f2] text-xs font-semibold text-white">{index + 1}</span>
              {row}
            </div>
          ))}
        </div>
      </div>
    </GlassPanel>
  )
}

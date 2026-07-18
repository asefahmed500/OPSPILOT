"use client"

import { GlassPanel } from "@/components/landing/landing-motion"

export function DashboardNoteSection() {
  return (
    <section id="dashboard" className="landing-section mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <GlassPanel className="p-6 text-center sm:p-8">
        <p className="text-sm font-medium uppercase text-[#5a5a5a]">Mock Dashboard UI</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-[clamp(2rem,6vw,2.5rem)] font-bold leading-tight">One product dashboard preview, reused as the hero proof point.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#5a5a5a] sm:text-lg sm:leading-8">The page avoids duplicate product previews and points users back to the single detailed cockpit above.</p>
      </GlassPanel>
    </section>
  )
}

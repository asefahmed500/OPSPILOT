"use client"

import { motion } from "framer-motion"
import { Users } from "lucide-react"
import { fadeInLeft, fadeInRight, fadeInUp, GlassPanel } from "@/components/landing/landing-motion"
import { paperworkItems, problemItems } from "@/components/landing/landing-data"

export function ProblemSection() {
  return (
    <section className="landing-section mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-10">
      <motion.div {...fadeInLeft()}>
        <p className="text-sm font-medium uppercase text-[#5a5a5a]">Problem</p>
        <h2 className="mt-3 text-[clamp(2rem,6vw,2.5rem)] font-bold leading-tight">Small Teams, Big Operational Burdens</h2>
        <div className="mt-8 grid gap-4">
          {problemItems.map(([text, Icon], index) => (
            <motion.div key={text} {...fadeInUp(index * 0.08)} className="flex items-start gap-4 rounded-lg border border-black/10 bg-white/70 p-4 backdrop-blur">
              <Icon className="mt-1 size-5 shrink-0 text-[#d97706]" />
              <p className="text-[#5a5a5a]">{text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <motion.div {...fadeInRight()}>
        <GlassPanel className="relative min-h-[320px] overflow-hidden p-5 sm:min-h-[360px] sm:p-6">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(44,103,242,0.08),rgba(255,255,255,0.5))]" />
          <div className="relative mx-auto flex max-w-sm flex-col items-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-full border border-white/60 bg-white/80 shadow-lg">
              <Users className="size-9 text-[#2c67f2]" />
            </div>
            {paperworkItems.map((item, index) => (
              <motion.div key={item} {...fadeInUp(index * 0.06)} className="mb-3 w-full rounded-md border border-slate-200 bg-white/90 p-4 shadow-sm">
                <span className="text-sm font-medium text-[#5a5a5a]">{item}</span>
              </motion.div>
            ))}
          </div>
        </GlassPanel>
      </motion.div>
    </section>
  )
}

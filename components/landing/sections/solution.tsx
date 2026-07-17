"use client"

import { motion } from "framer-motion"
import { fadeInUp, GlassPanel } from "@/components/landing/landing-motion"
import { solutionCards } from "@/components/landing/landing-data"

export function SolutionSection() {
  return (
    <section id="solution" className="landing-section border-y border-black/5 bg-white/60 py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <motion.div {...fadeInUp()} className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase text-[#5a5a5a]">Solution</p>
          <h2 className="mt-3 text-[clamp(2rem,6vw,2.5rem)] font-bold leading-tight">An AI agent that does the repetitive work.</h2>
        </motion.div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {solutionCards.map(([title, body, Icon], index) => (
            <GlassPanel key={title} className="p-5 sm:p-6">
              <motion.div {...fadeInUp(index * 0.08)}>
                <Icon className="mb-5 size-7 text-[#2c67f2]" />
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5a5a5a]">{body}</p>
              </motion.div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </section>
  )
}

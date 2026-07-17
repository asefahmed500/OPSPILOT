"use client"

import { motion } from "framer-motion"
import { fadeInUp } from "@/components/landing/landing-motion"
import { journey } from "@/components/landing/landing-data"

export function JourneySection() {
  return (
    <section id="how-it-works" className="landing-section border-y border-black/5 bg-[#f7f5ee] py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <motion.div {...fadeInUp()} className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase text-[#5a5a5a]">How It Works</p>
          <h2 className="mt-3 text-[clamp(2rem,6vw,2.5rem)] font-bold leading-tight">Lead follow-up automation in eight clear steps.</h2>
        </motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {journey.map(([label, Icon], index) => (
            <motion.div key={label} {...fadeInUp(index * 0.05)} className="relative rounded-lg border border-white/60 bg-white/70 p-5 text-center shadow-sm backdrop-blur">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#2c67f2] text-white">
                <Icon className="size-5" />
              </div>
              <p className="text-xs font-medium uppercase text-[#5a5a5a]">Step {index + 1}</p>
              <p className="mt-2 font-semibold">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

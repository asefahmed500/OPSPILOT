"use client"

import { motion } from "framer-motion"
import { fadeInUp } from "@/components/landing/landing-motion"
import { architectureNodes } from "@/components/landing/landing-data"

export function ArchitectureSection() {
  return (
    <section className="landing-section bg-[#1a1a1a] py-16 text-white sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 text-center sm:px-6">
        <p className="text-sm font-medium uppercase text-white/50">AI Architecture</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-[clamp(2rem,6vw,2.5rem)] font-bold leading-tight">A clear flow from request to execution.</h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 md:grid-cols-3">
          {architectureNodes.map((node, index) => (
            <motion.div key={node} {...fadeInUp(index * 0.06)} className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <p className="font-semibold">{node}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

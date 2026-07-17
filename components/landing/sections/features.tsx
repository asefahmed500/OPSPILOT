"use client"

import { motion } from "framer-motion"
import { fadeInLeft, fadeInRight, fadeInUp } from "@/components/landing/landing-motion"
import { features } from "@/components/landing/landing-data"
import { FeatureVisual } from "@/components/landing/feature-visual"

export function FeaturesSection() {
  return (
    <section id="features" className="landing-section mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <motion.div {...fadeInUp()} className="max-w-3xl">
        <p className="text-sm font-medium uppercase text-[#5a5a5a]">Core Features</p>
        <h2 className="mt-3 text-[clamp(2rem,6vw,2.5rem)] font-bold leading-tight">Six product workflows, each mapped to real app functionality.</h2>
      </motion.div>
      <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-10">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div key={feature.title} className="grid items-center gap-6 rounded-lg border border-white/60 bg-white/40 p-4 backdrop-blur md:grid-cols-[0.9fr_1.1fr] sm:p-5">
              <motion.div {...(index % 2 === 0 ? fadeInLeft() : fadeInRight())}>
                <Icon className="mb-4 size-7 text-[#2c67f2]" />
                <h3 className="text-2xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#5a5a5a]">{feature.description}</p>
              </motion.div>
              <motion.div {...(index % 2 === 0 ? fadeInRight() : fadeInLeft())}>
                <FeatureVisual type={feature.visual} />
              </motion.div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

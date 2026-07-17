"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { fadeInUp } from "@/components/landing/landing-motion"
import { storyPanels } from "@/components/landing/landing-data"

export function ScrollStoryStrip() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] })
  const x = useTransform(scrollYProgress, [0, 1], ["3%", "-18%"])

  return (
    <section ref={sectionRef} className="landing-section overflow-hidden border-y border-black/5 bg-white/55 py-16 backdrop-blur sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <motion.div {...fadeInUp()} className="max-w-3xl">
          <p className="text-sm font-medium uppercase text-[#5a5a5a]">Interactive Flow</p>
          <h2 className="mt-3 text-[clamp(2rem,6vw,2.5rem)] font-bold leading-tight">A scroll-driven operations loop, from intake to review.</h2>
          <p className="mt-4 text-base leading-7 text-[#5a5a5a] sm:text-lg sm:leading-8">Motion guides the user through what the product actually does.</p>
        </motion.div>
        <div className="mt-8 overflow-visible py-4 sm:mt-10">
          <motion.div style={{ x }} className="flex w-max gap-4 pr-10">
            {storyPanels.map(([title, body, Icon], index) => (
              <motion.div key={title} whileHover={{ y: -8 }} className="w-[82vw] max-w-[360px] rounded-lg border border-white/70 bg-white/65 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:w-[360px]">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-md bg-[#1a1a1a] text-white"><Icon className="size-4" /></div>
                  <span className="text-sm font-semibold text-[#2c67f2]">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-2xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5a5a5a]">{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

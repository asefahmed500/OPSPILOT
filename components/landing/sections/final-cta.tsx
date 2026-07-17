"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { fadeInUp, Magnetic } from "@/components/landing/landing-motion"

export function FinalCtaSection() {
  return (
    <section className="landing-section mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <motion.div {...fadeInUp()} className="relative overflow-hidden rounded-lg bg-[linear-gradient(135deg,#2c67f2,#1d50d6)] p-6 text-white shadow-2xl shadow-[#2c67f2]/20 sm:p-8 md:p-12">
        <div className="relative max-w-2xl">
          <h2 className="text-[clamp(2rem,6vw,2.5rem)] font-bold leading-tight">Ready to Automate Your Operations?</h2>
          <p className="mt-4 text-base leading-7 text-white/75 sm:text-lg sm:leading-8">Create a workspace, add a lead, ask OpsPilot for a follow-up task, and generate your first report.</p>
          <Magnetic className="mt-8 inline-flex">
            <Button asChild size="lg" variant="secondary"><Link href="/register">Get Started Free</Link></Button>
          </Magnetic>
        </div>
      </motion.div>
    </section>
  )
}

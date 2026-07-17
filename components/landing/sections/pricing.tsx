"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Check, CircleDollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fadeInUp } from "@/components/landing/landing-motion"
import { pricingPlans } from "@/components/landing/landing-data"

export function PricingSection() {
  return (
    <section id="pricing" className="landing-section border-y border-black/5 bg-white/60 py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <motion.div {...fadeInUp()} className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase text-[#5a5a5a]">Pricing</p>
          <h2 className="mt-3 text-[clamp(2rem,6vw,2.5rem)] font-bold leading-tight">Start simple, scale into real operations.</h2>
        </motion.div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {pricingPlans.map(([tier, price, description, items], index) => (
            <motion.div key={tier} whileHover={{ y: -6, scale: 1.01 }} className={`rounded-lg border p-6 shadow-xl ${index === 1 ? "border-[#2c67f2] bg-[#2c67f2] text-white shadow-[#2c67f2]/20" : index === 2 ? "border-[#1a1a1a] bg-[#1a1a1a] text-white" : "border-white/70 bg-white/70 backdrop-blur"}`}>
              <CircleDollarSign className="mb-5 size-7" />
              <h3 className="text-2xl font-bold">{tier}</h3>
              <p className="mt-4 text-4xl font-bold">{price}</p>
              <p className={`mt-3 text-sm leading-6 ${index === 0 ? "text-[#5a5a5a]" : "text-white/70"}`}>{description}</p>
              <div className="mt-6 space-y-3">
                {items.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm"><Check className="size-4" />{item}</div>
                ))}
              </div>
              <Button asChild className="mt-8 w-full" variant={index === 0 ? "default" : "secondary"}><Link href="/register">Get Started</Link></Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

"use client"

import Link from "next/link"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, CheckCircle2, ClipboardList, Database, Headphones, Sparkles, Workflow, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CursorTarget, fadeInUp, GlassPanel, Magnetic } from "@/components/landing/landing-motion"
import { ProductDashboardPreview } from "@/components/landing/product-dashboard-preview"

const floatingCards = [
  { title: "CRM lead", body: "Score 92 - ready for outreach", icon: Database, className: "left-0 top-16 hidden -rotate-6 lg:block" },
  { title: "Support draft", body: "Billing reply prepared", icon: Headphones, className: "right-0 top-20 hidden rotate-6 lg:block" },
  { title: "Task created", body: "Follow up today", icon: ClipboardList, className: "bottom-24 left-10 hidden rotate-3 xl:block" },
  { title: "Workflow run", body: "4 actions completed", icon: Workflow, className: "bottom-28 right-12 hidden -rotate-3 xl:block" },
] satisfies { title: string; body: string; icon: LucideIcon; className: string }[]

function FloatingProductCard({
  title,
  body,
  icon: Icon,
  className,
  delay,
}: {
  title: string
  body: string
  icon: LucideIcon
  className: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.55, ease: "easeOut" }}
      className={`absolute z-10 w-56 ${className}`}
    >
      <GlassPanel className="p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#1a1a1a] text-white">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#1a1a1a]">{title}</p>
            <p className="mt-1 text-xs text-[#5a5a5a]">{body}</p>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  )
}

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 0.28], shouldReduceMotion ? [0, 0] : [0, -72])
  const opacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.72])

  return (
    <section className="landing-section relative overflow-hidden border-b border-black/5 bg-[linear-gradient(180deg,#fbfaf6_0%,#f7f5ee_100%)] px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
      <motion.div style={{ y, opacity }} className="relative mx-auto w-full max-w-7xl text-center">
        {floatingCards.map((card, index) => (
          <FloatingProductCard key={card.title} {...card} delay={0.45 + index * 0.1} />
        ))}

        <div className="relative z-20 mx-auto max-w-4xl">
          <motion.div {...fadeInUp(0.1)} className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-sm text-[#5a5a5a] backdrop-blur sm:mb-5">
            <Sparkles className="size-4 text-[#2c67f2]" />
            No-code AI operations teammate
          </motion.div>
          <motion.h1 {...fadeInUp(0.2)} className="mx-auto text-[clamp(2.65rem,10vw,4.6rem)] font-bold leading-[0.92] text-[#1a1a1a]">
            <CursorTarget mode="text">Automate operations from one <span className="text-[#2c67f2]">AI cockpit</span></CursorTarget>
          </motion.h1>
          <motion.p {...fadeInUp(0.4)} className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#5a5a5a] sm:mt-6 sm:text-lg sm:leading-8">
            OpsPilot turns CRM, support, tasks, workflows, and reports into one calm command surface for small teams.
          </motion.p>
          <motion.div {...fadeInUp(0.6)} className="mt-7 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row">
            <Magnetic>
              <Button asChild size="lg" className="w-full bg-[#2c67f2] text-white hover:bg-[#1d50d6] sm:w-auto">
                <Link href="/register">Start Free Trial <ArrowRight className="size-4" /></Link>
              </Button>
            </Magnetic>
            <Magnetic>
              <Button asChild size="lg" variant="outline" className="w-full bg-white/70 sm:w-auto">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </Magnetic>
          </motion.div>
          <motion.div {...fadeInUp(0.75)} className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-medium text-[#5a5a5a]">
            {["Safe internal actions", "Configured integrations", "Human review"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/60 px-3 py-1 backdrop-blur">
                <CheckCircle2 className="size-3.5 text-[#16a34a]" />
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-36 z-0 hidden size-[560px] -translate-x-1/2 rounded-full border border-[#2c67f2]/10 bg-[#2c67f2]/5 blur-3xl lg:block" />
        <ProductDashboardPreview />
      </motion.div>
    </section>
  )
}

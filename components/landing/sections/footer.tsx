"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowUpRight, Bot, Sparkles } from "lucide-react"
import { CursorTarget, fadeInUp, Magnetic } from "@/components/landing/landing-motion"

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "#dashboard" },
      { label: "AI Assistant", href: "#features" },
      { label: "Workflows", href: "#journey" },
      { label: "Reports", href: "#playbook" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Pricing", href: "#pricing" },
      { label: "Playbook", href: "#playbook" },
      { label: "Architecture", href: "#architecture" },
      { label: "Contact", href: "mailto:hello@opspilot.ai" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
      { label: "Forgot password", href: "/forgot-password" },
      { label: "Open app", href: "/app" },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer className="landing-section landing-section-scroll relative overflow-hidden border-t border-black/10 bg-[#f4f1e8] px-4 py-12 sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-10 h-72 w-[min(54rem,90vw)] -translate-x-1/2 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute bottom-10 right-[8%] h-44 w-44 rounded-full bg-[#2c67f2]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10">
        <motion.div
          {...fadeInUp()}
          className="grid gap-5 rounded-lg border border-white/70 bg-white/45 p-5 shadow-2xl shadow-slate-900/5 backdrop-blur-xl sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-[#1a1a1a] text-white shadow-lg shadow-black/10">
              <Bot className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#1a1a1a]">OpsPilot AI</p>
              <p className="text-sm text-[#5a5a5a]">The operating layer for lean teams.</p>
            </div>
          </div>

          <Magnetic className="w-full sm:w-auto">
            <Link
              href="/register"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#1a1a1a] px-4 text-sm font-semibold text-white transition hover:bg-[#0a0a0a] sm:w-auto"
            >
              Start free
              <ArrowUpRight className="size-4" />
            </Link>
          </Magnetic>
        </motion.div>

        <motion.div {...fadeInUp(0.08)} className="relative py-4 text-center">
          <p className="mx-auto max-w-3xl text-sm font-medium uppercase tracking-[0.22em] text-[#8a8a8a]">
            CRM, support, tasks, workflows, reports
          </p>
          <h2 className="mt-4 select-none text-[clamp(4rem,18vw,14rem)] font-black leading-[0.78] text-[#1a1a1a]">
            OpsPilot
          </h2>
          <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/55 px-4 py-2 text-sm font-medium text-[#5a5a5a] shadow-lg shadow-slate-900/5 backdrop-blur-xl">
            <Sparkles className="size-4 text-[#2c67f2]" />
            Built for the messy middle of operations
          </div>
        </motion.div>

        <motion.div {...fadeInUp(0.14)} className="grid gap-6 border-y border-black/10 py-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title} className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a8a8a]">{group.title}</h3>
              <ul className="mt-4 grid gap-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <CursorTarget>
                      <Link href={link.href} className="group inline-flex items-center gap-2 text-sm font-medium text-[#1a1a1a] transition hover:text-[#2c67f2]">
                        {link.label}
                        <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                      </Link>
                    </CursorTarget>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>

        <motion.div {...fadeInUp(0.2)} className="flex flex-col gap-4 text-xs text-[#8a8a8a] sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 OpsPilot AI. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/login" className="transition hover:text-[#1a1a1a]">
              Security
            </Link>
            <Link href="/register" className="transition hover:text-[#1a1a1a]">
              Terms
            </Link>
            <Link href="/forgot-password" className="transition hover:text-[#1a1a1a]">
              Privacy
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}

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
      { label: "Workflows", href: "#how-it-works" },
      { label: "Reports", href: "#features" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Pricing", href: "#pricing" },
      { label: "Playbook", href: "#how-it-works" },
      { label: "Architecture", href: "#solution" },
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
    <footer className="landing-section landing-section-scroll relative overflow-hidden border-t border-black/10 bg-[#f4f1e8] px-4 pt-20 pb-10 sm:px-6 sm:pt-28 sm:pb-12">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/3 h-[28rem] w-[min(64rem,96vw)] -translate-x-1/2 rounded-full bg-[#2c67f2]/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[min(42rem,82vw)] -translate-x-1/2 rounded-full bg-white/45 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center">
        {/* Centerpiece: logo mark + HUGE wordmark */}
        <motion.div {...fadeInUp()} className="flex flex-col items-center text-center">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -2 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="flex size-16 items-center justify-center rounded-2xl bg-[#1a1a1a] text-white shadow-2xl shadow-black/25 sm:size-20"
          >
            <Bot className="size-8 sm:size-10" />
          </motion.div>

          <h2 className="mt-8 select-none text-[clamp(4.5rem,21vw,17rem)] font-black leading-[0.78] tracking-tight text-[#1a1a1a] sm:mt-10">
            OpsPilot
          </h2>

          <div className="mt-8 flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-5 py-2 text-sm font-medium text-[#5a5a5a] shadow-lg shadow-slate-900/5 backdrop-blur-xl">
            <Sparkles className="size-4 text-[#2c67f2]" />
            The operating layer for lean teams
          </div>
        </motion.div>

        {/* CTA pill */}
        <motion.div {...fadeInUp(0.08)} className="mt-10">
          <Magnetic>
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1a1a1a] px-7 text-sm font-semibold text-white shadow-xl shadow-black/15 transition hover:bg-[#0a0a0a]"
            >
              Start free
              <ArrowUpRight className="size-4" />
            </Link>
          </Magnetic>
        </motion.div>

        {/* Supporting links arranged below the wordmark */}
        <motion.div
          {...fadeInUp(0.14)}
          className="mt-16 grid w-full gap-8 rounded-2xl border border-white/70 bg-white/40 p-8 shadow-2xl shadow-slate-900/5 backdrop-blur-xl sm:p-10 md:grid-cols-3"
        >
          {footerGroups.map((group) => (
            <div key={group.title} className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8a8a]">{group.title}</h3>
              <ul className="mt-5 grid gap-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <CursorTarget>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-2 text-sm font-medium text-[#1a1a1a] transition hover:text-[#2c67f2]"
                      >
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

        {/* Bottom bar */}
        <motion.div
          {...fadeInUp(0.2)}
          className="mt-10 flex w-full flex-col gap-4 border-t border-black/10 pt-6 text-xs text-[#8a8a8a] sm:flex-row sm:items-center sm:justify-between"
        >
          <p>&copy; 2026 OpsPilot AI. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
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

"use client"

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion"
import { Bot, ClipboardList, Database, Headphones, Home, LineChart, Search, Send, Settings, Sparkles, UserRound, Workflow } from "lucide-react"

const navItems = [
  ["Dashboard", Home],
  ["AI Assistant", Bot],
  ["CRM", Database],
  ["Tasks", ClipboardList],
  ["Support", Headphones],
  ["Workflows", Workflow],
  ["Reports", LineChart],
  ["Settings", Settings],
]

const metrics = [
  ["Automated Tasks", "70%", "w-[70%]"],
  ["CRM Accuracy", "95%", "w-[95%]"],
  ["Response Time", "<30s", "w-[82%]"],
  ["Time Saved", "10+ hrs", "w-[74%]"],
]

const activities = [
  "Lead assigned to Maya Chen",
  "Task created: Follow-up with Acme",
  "CRM updated: 5 records enriched",
  "Support draft prepared",
]

export function MockDashboard() {
  const shouldReduceMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rotateX = useTransform(pointerY, [-180, 180], shouldReduceMotion ? [0, 0] : [4, -4])
  const rotateY = useTransform(pointerX, [-180, 180], shouldReduceMotion ? [0, 0] : [-5, 5])
  const springRotateX = useSpring(rotateX, { stiffness: 180, damping: 22 })
  const springRotateY = useSpring(rotateY, { stiffness: 180, damping: 22 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.85, duration: 0.7, ease: "easeOut" }}
      className="relative z-20 mx-auto mt-8 max-w-6xl rounded-lg border border-white/70 bg-white/55 p-2 shadow-2xl shadow-slate-900/15 backdrop-blur-xl sm:mt-12 sm:p-3"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        pointerX.set(event.clientX - rect.left - rect.width / 2)
        pointerY.set(event.clientY - rect.top - rect.height / 2)
      }}
      onMouseLeave={() => {
        pointerX.set(0)
        pointerY.set(0)
      }}
      style={{ rotateX: springRotateX, rotateY: springRotateY, transformPerspective: 1200 }}
    >
      <div className="op-loading-sheen pointer-events-none absolute left-0 top-0 h-px w-1/2" aria-hidden="true" />
      <div className="grid min-h-[320px] overflow-hidden rounded-md border border-slate-200 bg-[#fbfbf8] md:grid-cols-[210px_1fr] lg:min-h-[430px]">
        <aside className="hidden border-r border-slate-200 bg-[#1a1a1a] p-4 text-sm text-white md:block">
          <div className="mb-7 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-white text-[#1a1a1a]">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="font-semibold">OpsPilot AI</p>
              <p className="text-xs text-white/45">Workspace</p>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map(([label, Icon], index) => (
              <div key={label as string} className={`flex min-h-9 items-center gap-3 rounded-md px-3 text-sm ${index === 0 ? "bg-white text-[#1a1a1a]" : "text-white/62"}`}>
                <Icon className="size-4" />
                {label as string}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-3 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1a1a1a] text-white md:hidden">
                <Sparkles className="size-4" />
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-[#1a1a1a]">Operations dashboard</p>
                <p className="text-xs text-[#8a8a8a]">AI automation cockpit</p>
              </div>
            </div>
            <div className="hidden h-9 w-72 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-[#5a5a5a] lg:flex">
              <Search className="size-4" />
              Search leads, tasks, tickets
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#16a34a]" />
              <div className="flex size-8 items-center justify-center rounded-md bg-slate-100">
                <UserRound className="size-4 text-slate-600" />
              </div>
            </div>
          </header>

          <main className="grid flex-1 gap-3 p-3 text-left sm:gap-4 sm:p-4 lg:grid-cols-[1fr_310px]">
            <div className="min-w-0 space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(([label, value, width]) => (
                  <div key={label} className="rounded-lg border border-white/60 bg-white/75 p-3 backdrop-blur sm:p-4">
                    <p className="text-xs text-[#5a5a5a]">{label}</p>
                    <p className="mt-2 text-xl font-bold text-[#1a1a1a] sm:text-2xl">{value}</p>
                    <div className="mt-3 h-2 rounded-full bg-slate-200">
                      <div className={`h-2 rounded-full bg-[#2c67f2] ${width}`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white/82 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-[#1a1a1a]">Recent activity</h3>
                  <span className="rounded-md bg-[#16a34a]/10 px-2 py-1 text-xs font-medium text-[#16a34a]">Live</span>
                </div>
                {activities.map((item, index) => (
                  <motion.div key={item} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.05 + index * 0.1 }} className="mb-3 flex items-center gap-3 text-sm text-[#5a5a5a] last:mb-0">
                    <span className="size-2 rounded-full bg-[#2c67f2]" />
                    {item}
                  </motion.div>
                ))}
              </div>
            </div>

            <aside className="hidden space-y-4 lg:block">
              <div className="rounded-lg border border-slate-200 bg-white/82 p-4">
                <h3 className="text-sm font-semibold text-[#1a1a1a]">Quick actions</h3>
                <div className="mt-3 grid gap-2">
                  {["Generate Report", "Add Task", "Sync CRM"].map((label) => (
                    <button key={label} className="rounded-md border border-slate-200 bg-[#fbfaf6] px-3 py-2 text-left text-sm text-[#5a5a5a] transition hover:border-[#2c67f2] hover:text-[#1d50d6]">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/60 bg-[#1a1a1a] p-4 text-white shadow-xl">
                <p className="text-sm font-medium">OpsPilot AI</p>
                <p className="mt-2 text-xs leading-5 text-white/65">How can I help you today?</p>
                <div className="mt-3 rounded-md border border-white/15 bg-white/10 p-3 text-xs text-white/80">Create follow-up tasks for inactive customers.</div>
                <div className="mt-3 flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/45">
                  Ask me...
                  <Send className="ml-auto size-3" />
                </div>
              </div>
            </aside>
          </main>
        </div>
      </div>
    </motion.div>
  )
}

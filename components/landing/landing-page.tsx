"use client"

import { useRef } from "react"
import Link from "next/link"
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion"
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Database,
  FileText,
  Headphones,
  Inbox,
  LineChart,
  Mail,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const fadeInUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { delay, duration: 0.55 },
})

const fadeInLeft = (delay = 0) => ({
  initial: { opacity: 0, x: -28 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { delay, duration: 0.55 },
})

const fadeInRight = (delay = 0) => ({
  initial: { opacity: 0, x: 28 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { delay, duration: 0.55 },
})

type Feature = {
  title: string
  description: string
  icon: LucideIcon
  visual: "assistant" | "crm" | "support" | "tasks" | "team" | "workflow"
}

const solutionCards: [string, string, LucideIcon][] = [
  ["AI Operations Assistant", "Issue natural-language commands and let OpsPilot plan the operational steps.", Bot],
  ["CRM Automation", "Create, score, summarize, and assign leads without manual spreadsheet work.", Database],
  ["Customer Support Agent", "Classify tickets, draft answers, and escalate sensitive conversations.", Headphones],
]

const deepFeatures: Feature[] = [
  {
    title: "AI Operations Assistant",
    description: "Ask OpsPilot to update CRM records, create follow-up tasks, surface pending tickets, or generate a weekly operations report.",
    icon: Bot,
    visual: "assistant",
  },
  {
    title: "CRM Automation",
    description: "Capture inbound leads, detect matching contacts, score urgency, summarize context, and recommend the next best action.",
    icon: Database,
    visual: "crm",
  },
  {
    title: "Customer Support Agent",
    description: "Turn website chat or email into categorized tickets with AI draft replies and human escalation flags.",
    icon: Headphones,
    visual: "support",
  },
  {
    title: "Task Automation",
    description: "Convert customer requests, emails, and assistant commands into prioritized tasks that teams can execute immediately.",
    icon: ClipboardList,
    visual: "tasks",
  },
  {
    title: "Team Communication Assistant",
    description: "Summarize team activity, generate standup updates, and prepare Slack-style notifications through adapter-ready workflows.",
    icon: MessageSquare,
    visual: "team",
  },
  {
    title: "Workflow Builder",
    description: "Describe an automation in plain English and OpsPilot converts it into triggers and structured actions.",
    icon: Workflow,
    visual: "workflow",
  },
]

const journey = [
  ["Lead submits form", Inbox],
  ["AI extracts context", Bot],
  ["CRM record created", Database],
  ["Lead score generated", BarChart3],
  ["Owner assigned", UserRound],
  ["Welcome email queued", Mail],
  ["Follow-up task created", ClipboardList],
  ["Team notified", Bell],
] satisfies [string, LucideIcon][]

const metrics = [
  ["Automated Tasks", "70%", "w-[70%]"],
  ["CRM Accuracy", "95%", "w-[95%]"],
  ["Response Time", "<30s", "w-[82%]"],
  ["Time Saved", "10+ hrs", "w-[74%]"],
]

const storyPanels = [
  ["Capture", "Lead, ticket, or command arrives from any channel.", Inbox],
  ["Reason", "OpsPilot classifies intent and chooses safe internal tools.", Bot],
  ["Execute", "CRM, tasks, support, workflows, and reports update in sequence.", Workflow],
  ["Review", "Every action lands in activity history for human oversight.", ShieldCheck],
] satisfies [string, string, LucideIcon][]

function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 })

  return (
    <motion.div
      aria-hidden="true"
      className="fixed left-0 top-0 z-50 h-0.5 w-full origin-left bg-[#2c67f2]"
      style={{ scaleX }}
    />
  )
}

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`rounded-lg border border-white/55 bg-white/55 shadow-xl shadow-slate-900/5 backdrop-blur-md ${className}`}
    >
      {children}
    </motion.div>
  )
}

function HeroDashboard() {
  const shouldReduceMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rotateX = useTransform(pointerY, [-180, 180], shouldReduceMotion ? [0, 0] : [5, -5])
  const rotateY = useTransform(pointerX, [-180, 180], shouldReduceMotion ? [0, 0] : [-6, 6])
  const springRotateX = useSpring(rotateX, { stiffness: 180, damping: 22 })
  const springRotateY = useSpring(rotateY, { stiffness: 180, damping: 22 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
      className="mx-auto mt-12 max-w-6xl rounded-lg border border-white/70 bg-white/55 p-3 shadow-2xl shadow-slate-900/15 backdrop-blur-xl"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        pointerX.set(event.clientX - rect.left - rect.width / 2)
        pointerY.set(event.clientY - rect.top - rect.height / 2)
      }}
      onMouseLeave={() => {
        pointerX.set(0)
        pointerY.set(0)
      }}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformPerspective: 1200,
      }}
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-[#fbfbf8]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-[#1a1a1a] text-white">
              <Sparkles className="size-4" />
            </div>
            <span className="text-sm font-semibold text-[#1a1a1a]">OpsPilot AI</span>
          </div>
          <div className="hidden h-9 w-72 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-[#5a5a5a] md:flex">
            <Search className="size-4" />
            Search leads, tasks, tickets
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#10B981]" />
            <div className="flex size-8 items-center justify-center rounded-md bg-slate-100">
              <UserRound className="size-4 text-slate-600" />
            </div>
          </div>
        </div>
        <div className="grid min-h-[390px] md:grid-cols-[190px_1fr]">
          <aside className="hidden border-r border-slate-200 bg-[#1a1a1a] p-4 text-sm text-white md:block">
            {[
              ["Dashboard", BarChart3],
              ["Analytics", LineChart],
              ["AI Assistant", Bot],
              ["Tasks", ClipboardList],
              ["Support", Headphones],
              ["Settings", ShieldCheck],
            ].map(([label, Icon], index) => (
              <div key={label as string} className={`mb-2 flex items-center gap-3 rounded-md px-3 py-2 ${index === 0 ? "bg-white/12 text-white" : "text-white/65"}`}>
                <Icon className="size-4" />
                {label as string}
              </div>
            ))}
          </aside>
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(([label, value, width]) => (
                  <div key={label} className="rounded-lg border border-white/60 bg-white/70 p-4 backdrop-blur">
                    <p className="text-xs text-[#5a5a5a]">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-[#1a1a1a]">{value}</p>
                    <div className="mt-3 h-2 rounded-full bg-slate-200">
                      <div className={`h-2 rounded-full bg-[#2c67f2] ${width}`} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/80 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-[#1a1a1a]">Recent Activity</h3>
                  <span className="rounded-md bg-[#10B981]/10 px-2 py-1 text-xs font-medium text-[#047857]">Live</span>
                </div>
                {[
                  "Lead assigned to Maya Chen",
                  "Task created: Follow-up with Acme",
                  "CRM updated: 5 records enriched",
                  "Support draft prepared for billing ticket",
                ].map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.12 }}
                    className="mb-3 flex items-center gap-3 text-sm text-[#4B5563]"
                  >
                    <span className="size-2 rounded-full bg-[#2c67f2]" />
                    {item}
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white/80 p-4">
                <h3 className="text-sm font-semibold text-[#1a1a1a]">Quick Actions</h3>
                <div className="mt-3 grid gap-2">
                  {["Generate Report", "Add Task", "Sync CRM"].map((label) => (
                    <button key={label} className="rounded-md border border-slate-200 bg-[#fbfaf6] px-3 py-2 text-left text-sm text-[#5a5a5a] transition hover:border-[#2c67f2] hover:text-[#1d50d6]">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/60 bg-[#1a1a1a] p-4 text-white shadow-xl">
                <div className="mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#10B981]" />
                  <p className="text-sm font-medium">OpsPilot AI</p>
                </div>
                <p className="text-xs leading-5 text-white/65">How can I help you today?</p>
                <div className="mt-3 rounded-md border border-white/15 bg-white/10 p-3 text-xs text-white/80">
                  Create follow-up tasks for inactive customers.
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/45">
                  Ask me...
                  <Send className="ml-auto size-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ScrollStoryStrip() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const x = useTransform(scrollYProgress, [0, 1], ["5%", "-18%"])

  return (
    <section ref={sectionRef} className="overflow-hidden border-y border-black/5 bg-white/55 py-20 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div {...fadeInUp()} className="max-w-3xl">
          <p className="text-sm font-medium uppercase text-[#5a5a5a]">Interactive Flow</p>
          <h2 className="mt-3 text-4xl font-bold">A scroll-driven operations loop, from intake to review.</h2>
          <p className="mt-4 text-lg leading-8 text-[#5a5a5a]">
            The landing page now mirrors the product: motion guides the eye through a practical workflow instead of decorating the page.
          </p>
        </motion.div>
        <div className="mt-10 overflow-visible py-4">
          <motion.div style={{ x }} className="flex w-max gap-4 pr-10">
            {storyPanels.map(([title, body, Icon], index) => (
              <motion.div
                key={title}
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="w-[78vw] max-w-[360px] rounded-lg border border-white/70 bg-white/65 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl md:w-[360px]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-md bg-[#1a1a1a] text-white">
                    <Icon className="size-4" />
                  </div>
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

function PaperworkIllustration() {
  return (
    <GlassPanel className="relative min-h-[360px] overflow-hidden p-6">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(44,103,242,0.08),rgba(255,255,255,0.5))]" />
      <div className="relative mx-auto flex max-w-sm flex-col items-center">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full border border-white/60 bg-white/80 shadow-lg">
          <Users className="size-9 text-[#2c67f2]" />
        </div>
        <div className="grid w-full gap-3">
          {["CRM updates", "Support replies", "Task assignment", "Lead follow-up", "Team reports"].map((item, index) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, rotate: index % 2 ? 2 : -2, y: 20 }}
              whileInView={{ opacity: 1, rotate: index % 2 ? 1 : -1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-md border border-slate-200 bg-white/90 p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Clock3 className="size-4 text-[#F59E0B]" />
                <span className="text-sm font-medium text-[#5a5a5a]">{item}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </GlassPanel>
  )
}

function FeatureVisual({ type }: { type: Feature["visual"] }) {
  if (type === "crm") {
    return (
      <GlassPanel className="p-5">
        <div className="rounded-md border border-slate-200 bg-white/85 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-semibold text-[#1a1a1a]">Lead Pipeline</h4>
            <span className="rounded bg-[#10B981]/10 px-2 py-1 text-xs text-[#047857]">95% match</span>
          </div>
          {[
            ["Acme Labs", "Qualified", "Score 92"],
            ["Northstar Co.", "Contacted", "Score 76"],
            ["BrightPath", "New", "Score 68"],
          ].map(([name, status, score]) => (
            <div key={name} className="mb-3 rounded-md border border-slate-100 bg-[#fbfaf6] p-3">
              <div className="flex justify-between gap-3">
                <p className="font-medium text-[#1a1a1a]">{name}</p>
                <span className="text-sm text-[#2c67f2]">{score}</span>
              </div>
              <p className="mt-1 text-xs text-[#5a5a5a]">{status} - follow-up scheduled</p>
            </div>
          ))}
        </div>
      </GlassPanel>
    )
  }

  if (type === "support") {
    return (
      <GlassPanel className="p-5">
        <div className="space-y-3 rounded-md bg-[#1a1a1a] p-4 text-white">
          <div className="rounded-md bg-white/10 p-3 text-sm">My invoice looks wrong. Can someone help?</div>
          <div className="ml-8 rounded-md bg-[#2c67f2] p-3 text-sm">Classified as Billing. Draft response ready.</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="rounded bg-white/10 px-2 py-2">Category: Billing</span>
            <span className="rounded bg-white/10 px-2 py-2">Escalation: No</span>
          </div>
        </div>
      </GlassPanel>
    )
  }

  if (type === "tasks") {
    return (
      <GlassPanel className="p-5">
        <div className="grid gap-3">
          {[
            ["Follow up with Acme", "High", "Today"],
            ["Prepare weekly report", "Medium", "Friday"],
            ["Review support escalation", "Urgent", "Now"],
          ].map(([task, priority, due]) => (
            <div key={task} className="rounded-md border border-slate-200 bg-white/85 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-[#1a1a1a]">{task}</p>
                <span className="rounded bg-[#F59E0B]/10 px-2 py-1 text-xs text-[#B45309]">{priority}</span>
              </div>
              <p className="mt-2 text-xs text-[#5a5a5a]">Due {due}</p>
            </div>
          ))}
        </div>
      </GlassPanel>
    )
  }

  if (type === "team") {
    return (
      <GlassPanel className="p-5">
        <div className="rounded-md border border-slate-200 bg-white/85 p-4">
          <p className="mb-4 text-sm font-semibold text-[#1a1a1a]">Team update</p>
          {["4 leads assigned", "7 tasks completed", "2 support drafts ready"].map((item) => (
            <div key={item} className="mb-3 flex items-center gap-3 text-sm text-[#4B5563]">
              <CheckCircle2 className="size-4 text-[#10B981]" />
              {item}
            </div>
          ))}
          <div className="mt-4 rounded-md bg-[#2c67f2]/10 p-3 text-sm text-[#1d50d6]">Prepared for #sales-ops</div>
        </div>
      </GlassPanel>
    )
  }

  if (type === "workflow") {
    return (
      <GlassPanel className="p-5">
        <div className="rounded-md bg-[#1a1a1a] p-4 text-sm text-white">
          <p className="text-white/50">User prompt</p>
          <p className="mt-2">When a new lead arrives, create CRM record, send email, create task.</p>
          <div className="my-4 h-px bg-white/10" />
          {["Trigger: New Lead", "Action: Create CRM Record", "Action: Send Email", "Action: Create Task"].map((item) => (
            <div key={item} className="mb-2 rounded border border-white/10 bg-white/10 px-3 py-2">
              {item}
            </div>
          ))}
        </div>
      </GlassPanel>
    )
  }

  return (
    <GlassPanel className="p-5">
      <div className="rounded-md border border-slate-200 bg-white/85 p-4">
        {["Understand request", "Plan workflow", "Execute safe action", "Log activity"].map((step, index) => (
          <div key={step} className="flex items-center gap-3 pb-4 last:pb-0">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#2c67f2] text-sm font-semibold text-white">{index + 1}</div>
            <span className="text-sm font-medium text-[#5a5a5a]">{step}</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}

function ArchitectureFlow() {
  const nodes = ["Frontend", "API Gateway", "Agent Orchestrator", "GPT Model", "Tool Execution", "Monitoring"]

  return (
    <section className="bg-[#1a1a1a] py-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div {...fadeInUp()} className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase  text-white/50">AI Architecture</p>
          <h2 className="mt-3 text-4xl font-bold">A clear flow from request to execution.</h2>
          <p className="mt-4 text-white/65">OpsPilot keeps the user experience simple while separating reasoning, tools, adapters, and logging.</p>
        </motion.div>
        <div className="relative mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
          {nodes.map((node, index) => (
            <motion.div
              key={node}
              {...fadeInUp(index * 0.08)}
              className="relative rounded-lg border border-white/15 bg-white/10 p-5 text-center backdrop-blur-md"
            >
              <p className="font-semibold">{node}</p>
              {index < nodes.length - 1 ? (
                <ChevronRight className="absolute -right-5 top-1/2 hidden size-5 -translate-y-1/2 text-white/40 md:block" />
              ) : null}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function  LandingPage() {
  const shouldReduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.28], shouldReduceMotion ? [0, 0] : [0, -72])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.72])

  return (
    <main className="min-h-screen bg-[#fbfaf6] text-[#1a1a1a]">
      <ScrollProgress />
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#fbfaf6]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-[#1a1a1a] text-white">
              <Bot className="size-4" />
            </span>
            OpsPilot AI
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#5a5a5a] md:flex">
            <a href="#solution">Solution</a>
            <a href="#features">Features</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-black/5 bg-[linear-gradient(180deg,#fbfaf6_0%,#f7f5ee_100%)] px-6 pb-16 pt-16">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="mx-auto max-w-7xl text-center">
          <motion.div {...fadeInUp(0.1)} className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-sm text-[#5a5a5a] backdrop-blur">
            <Sparkles className="size-4 text-[#2c67f2]" />
            No-code AI operations teammate
          </motion.div>
          <motion.h1 {...fadeInUp(0.2)} className="mx-auto max-w-4xl text-5xl font-bold leading-[0.98] tracking-normal text-[#1a1a1a] md:text-[3.5rem]">
            Automate Your Business Operations with <span className="text-[#2c67f2]">AI</span>
          </motion.h1>
          <motion.p {...fadeInUp(0.4)} className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#5a5a5a]">
            OpsPilot AI acts as your intelligent operations teammate, automating CRM, support, tasks, reports, and workflow execution.
          </motion.p>
          <motion.div {...fadeInUp(0.6)} className="mt-8 flex flex-wrap justify-center gap-3">
            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button asChild size="lg" className="bg-[#2c67f2] text-white hover:bg-[#1d50d6]">
                <Link href="/register">
                  Start Free Trial <ArrowRight className="size-4" />
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button asChild size="lg" variant="outline">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </motion.div>
          </motion.div>
          <HeroDashboard />
        </motion.div>
      </section>

      <ScrollStoryStrip />

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
        <motion.div {...fadeInLeft()}>
          <p className="text-sm font-medium uppercase  text-[#5a5a5a]">Problem</p>
          <h2 className="mt-3 text-4xl font-bold">Small Teams, Big Operational Burdens</h2>
          <div className="mt-8 grid gap-4">
            {[
              ["Manual CRM updates slow every handoff", Database],
              ["Repetitive customer questions interrupt focus", Headphones],
              ["Task creation and ownership fall through gaps", ClipboardList],
              ["Reports and team updates take hours each week", FileText],
            ].map(([text, Icon], index) => (
              <motion.div key={text as string} {...fadeInUp(index * 0.08)} className="flex items-start gap-4 rounded-lg border border-black/10 bg-white/70 p-4 backdrop-blur">
                <Icon className="mt-1 size-5 text-[#F59E0B]" />
                <p className="text-[#4B5563]">{text as string}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <motion.div {...fadeInRight()}>
          <PaperworkIllustration />
        </motion.div>
      </section>

      <section id="solution" className="border-y border-black/5 bg-white/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div {...fadeInUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium uppercase  text-[#5a5a5a]">Solution</p>
            <h2 className="mt-3 text-4xl font-bold">An AI agent that does the repetitive work.</h2>
          </motion.div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {solutionCards.map(([title, body, Icon], index) => (
              <GlassPanel key={title} className="p-6">
                <motion.div {...fadeInUp(index * 0.08)}>
                  <Icon className="mb-5 size-7 text-[#2c67f2]" />
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5a5a5a]">{body}</p>
                </motion.div>
              </GlassPanel>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <motion.div {...fadeInUp()} className="max-w-3xl">
          <p className="text-sm font-medium uppercase  text-[#5a5a5a]">Core Features</p>
          <h2 className="mt-3 text-4xl font-bold">Six deep workflows from the PRD, built into the product story.</h2>
        </motion.div>
        <div className="mt-12 space-y-16">
          {deepFeatures.map((feature, index) => {
            const Icon = feature.icon
            const visual = <FeatureVisual type={feature.visual} />
            const copy = (
              <motion.div {...(index % 2 === 0 ? fadeInLeft() : fadeInRight())}>
                <Icon className="mb-5 size-8 text-[#2c67f2]" />
                <h3 className="text-3xl font-bold">{feature.title}</h3>
                <p className="mt-4 text-lg leading-8 text-[#5a5a5a]">{feature.description}</p>
                <Button asChild className="mt-6 bg-[#2c67f2] text-white hover:bg-[#1d50d6]">
                  <Link href="/register">
                    Try this workflow <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </motion.div>
            )

            return (
              <div key={feature.title} className="grid items-center gap-8 lg:grid-cols-2">
                {index % 2 === 0 ? (
                  <>
                    {copy}
                    <motion.div {...fadeInRight()}>{visual}</motion.div>
                  </>
                ) : (
                  <>
                    <motion.div {...fadeInLeft()} className="lg:order-1">{visual}</motion.div>
                    <div className="lg:order-2">{copy}</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-black/5 bg-[#f7f5ee] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div {...fadeInUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium uppercase  text-[#5a5a5a]">How It Works</p>
            <h2 className="mt-3 text-4xl font-bold">Lead follow-up automation in eight clear steps.</h2>
          </motion.div>
          <div className="relative mt-12">
            <div className="absolute left-6 right-6 top-6 hidden h-0.5 bg-[linear-gradient(90deg,#2c67f2,#1d50d6)] lg:block" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {journey.map(([label, Icon], index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, scale: 0.9, y: 16 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 24 }}
                  className="relative rounded-lg border border-white/60 bg-white/70 p-5 text-center shadow-sm backdrop-blur"
                >
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-white/70 bg-[#2c67f2] text-white shadow-lg">
                    <Icon className="size-5" />
                  </div>
                  <p className="text-xs font-medium uppercase  text-[#5a5a5a]">Step {index + 1}</p>
                  <p className="mt-2 font-semibold">{label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard" className="mx-auto max-w-7xl px-6 py-20">
        <motion.div {...fadeInUp()} className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase  text-[#5a5a5a]">Mock Dashboard UI</p>
          <h2 className="mt-3 text-4xl font-bold">A realistic preview of the operations cockpit.</h2>
        </motion.div>
        <HeroDashboard />
      </section>

      <ArchitectureFlow />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div {...fadeInUp()} className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase  text-[#5a5a5a]">Testimonials</p>
          <h2 className="mt-3 text-4xl font-bold">Teams feel the hours come back.</h2>
        </motion.div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ["OpsPilot AI saved us 15 hours a week.", "Jane Doe", "Startup Founder"],
            ["Our support inbox finally has structure.", "Marcus Lee", "Operations Manager"],
            ["The workflow builder made automation feel natural.", "Priya Shah", "Agency Lead"],
          ].map(([quote, name, role], index) => (
            <GlassPanel key={name} className="p-6">
              <div className="flex gap-1 text-[#F59E0B]">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star key={starIndex} className="size-4 fill-current" />
                ))}
              </div>
              <p className="mt-5 text-lg font-semibold leading-7">&ldquo;{quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#2c67f2]/10 text-[#2c67f2]">{index + 1}</div>
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-sm text-[#5a5a5a]">{role}</p>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-y border-black/5 bg-white/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div {...fadeInUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium uppercase  text-[#5a5a5a]">Pricing</p>
            <h2 className="mt-3 text-4xl font-bold">Start simple, scale into real operations.</h2>
          </motion.div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ["Free", "$0", "Explore assistant, CRM, and task basics.", ["AI assistant", "CRM demo", "Task tracking"]],
              ["Pro", "$49", "Run the complete MVP operating loop.", ["Support triage", "Workflow builder", "Reports dashboard"]],
              ["Enterprise", "Custom", "Connect real systems and advanced governance.", ["Custom adapters", "Audit controls", "Priority support"]],
            ].map(([tier, price, description, items], index) => (
              <motion.div
                key={tier as string}
                whileHover={{ y: -6, scale: 1.01 }}
                className={`rounded-lg border p-6 shadow-xl ${index === 1 ? "border-[#2c67f2] bg-[#2c67f2] text-white shadow-[#2c67f2]/20" : index === 2 ? "border-[#1a1a1a] bg-[#1a1a1a] text-white" : "border-white/70 bg-white/70 backdrop-blur"}`}
              >
                <CircleDollarSign className="mb-5 size-7" />
                <h3 className="text-2xl font-bold">{tier as string}</h3>
                <p className="mt-4 text-4xl font-bold">{price as string}</p>
                <p className={`mt-3 text-sm leading-6 ${index === 0 ? "text-[#5a5a5a]" : "text-white/70"}`}>{description as string}</p>
                <div className="mt-6 space-y-3">
                  {(items as string[]).map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm">
                      <Check className="size-4" />
                      {item}
                    </div>
                  ))}
                </div>
                <Button asChild className="mt-8 w-full" variant={index === 0 ? "default" : "secondary"}>
                  <Link href="/register">Get Started</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div
          {...fadeInUp()}
          className="relative overflow-hidden rounded-lg bg-[linear-gradient(135deg,#2c67f2,#1d50d6)] p-8 text-white shadow-2xl shadow-[#2c67f2]/20 md:p-12"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-8 top-8 hidden w-80 opacity-20 md:block"
          >
            <HeroDashboard />
          </motion.div>
          <div className="relative max-w-2xl">
            <h2 className="text-4xl font-bold">Ready to Automate Your Operations?</h2>
            <p className="mt-4 text-lg leading-8 text-white/75">
              Create a workspace, add a lead, ask OpsPilot for a follow-up task, and generate your first report.
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="mt-8">
              <Button asChild size="lg" variant="secondary">
                <Link href="/register">Get Started Free</Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </main>
  )
}

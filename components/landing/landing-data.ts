import {
  BarChart3,
  Bell,
  Bot,
  ClipboardList,
  Database,
  FileText,
  Headphones,
  Inbox,
  Mail,
  MessageSquare,
  ShieldCheck,
  UserRound,
  Workflow,
  type LucideIcon,
} from "lucide-react"

export type LandingFeature = {
  title: string
  description: string
  icon: LucideIcon
  visual: "assistant" | "crm" | "support" | "tasks" | "team" | "workflow"
}

export const navItems = [
  ["#solution", "Solution"],
  ["#features", "Features"],
  ["#dashboard", "Dashboard"],
  ["#pricing", "Pricing"],
] as const

export const features: LandingFeature[] = [
  { title: "AI Operations Assistant", description: "Ask OpsPilot to update CRM records, create follow-up tasks, surface pending tickets, or generate a weekly operations report.", icon: Bot, visual: "assistant" },
  { title: "CRM Automation", description: "Capture inbound leads, detect matching contacts, score urgency, summarize context, and recommend the next best action.", icon: Database, visual: "crm" },
  { title: "Customer Support Agent", description: "Turn website chat or email into categorized tickets with AI draft replies and human escalation flags.", icon: Headphones, visual: "support" },
  { title: "Task Automation", description: "Convert customer requests, emails, and assistant commands into prioritized tasks that teams can execute immediately.", icon: ClipboardList, visual: "tasks" },
  { title: "Team Communication Assistant", description: "Summarize team activity, generate standup updates, and prepare Slack-style notifications through adapter-ready workflows.", icon: MessageSquare, visual: "team" },
  { title: "Workflow Builder", description: "Describe an automation in plain English and OpsPilot converts it into triggers and structured actions.", icon: Workflow, visual: "workflow" },
]

export const journey = [
  ["Lead submits form", Inbox],
  ["AI extracts context", Bot],
  ["CRM record created", Database],
  ["Lead score generated", BarChart3],
  ["Owner assigned", UserRound],
  ["Welcome email queued", Mail],
  ["Follow-up task created", ClipboardList],
  ["Team notified", Bell],
] satisfies [string, LucideIcon][]

export const storyPanels = [
  ["Capture", "Lead, ticket, or command arrives from any channel.", Inbox],
  ["Reason", "OpsPilot classifies intent and chooses safe internal tools.", Bot],
  ["Execute", "CRM, tasks, support, workflows, and reports update in sequence.", Workflow],
  ["Review", "Every action lands in activity history for human oversight.", ShieldCheck],
] satisfies [string, string, LucideIcon][]

export const problemItems = [
  ["Manual CRM updates slow every handoff", Database],
  ["Repetitive customer questions interrupt focus", Headphones],
  ["Task ownership falls through gaps", ClipboardList],
  ["Reports take hours each week", FileText],
] satisfies [string, LucideIcon][]

export const paperworkItems = ["CRM updates", "Support replies", "Task assignment", "Lead follow-up", "Team reports"]

export const solutionCards = [
  ["AI Operations Assistant", "Issue natural-language commands and let OpsPilot plan the operational steps.", Bot],
  ["CRM Automation", "Create, score, summarize, and assign leads without manual spreadsheet work.", Database],
  ["Customer Support Agent", "Classify tickets, draft answers, and escalate sensitive conversations.", Headphones],
] satisfies [string, string, LucideIcon][]

export const architectureNodes = ["Frontend", "API Gateway", "Agent Orchestrator", "GPT Model", "Tool Execution", "Monitoring"]

export const pricingPlans = [
  ["Free", "$0", "Explore assistant, CRM, and task basics.", ["AI assistant", "CRM demo", "Task tracking"]],
  ["Pro", "$49", "Run the complete MVP operating loop.", ["Support triage", "Workflow builder", "Reports dashboard"]],
  ["Enterprise", "Custom", "Connect real systems and governance.", ["Custom adapters", "Audit controls", "Priority support"]],
] satisfies [string, string, string, string[]][]

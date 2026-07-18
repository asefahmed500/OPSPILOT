export type LeadRuleInput = {
  name: string
  email: string
  source?: string
  company?: string
  notes?: string
}

export function scoreLead(input: LeadRuleInput) {
  let score = 45
  const email = input.email.toLowerCase()
  const notes = input.notes?.toLowerCase() ?? ""

  if (!email.endsWith("@gmail.com") && !email.endsWith("@yahoo.com")) {
    score += 20
  }

  if (notes.includes("demo") || notes.includes("pricing")) {
    score += 20
  }

  if (notes.includes("urgent") || notes.includes("this week")) {
    score += 10
  }

  if (input.company) {
    score += 5
  }

  return Math.max(0, Math.min(100, score))
}

export function summarizeLead(input: LeadRuleInput, score: number) {
  const company = input.company ? ` from ${input.company}` : ""
  const note = input.notes ? ` Notes: ${input.notes}` : ""
  return `${input.name}${company} came from ${input.source ?? "Website"} with a lead score of ${score}.${note}`
}

export function nextLeadAction(score: number) {
  if (score >= 80) {
    return "Assign an owner and schedule a demo within 24 hours."
  }

  if (score >= 60) {
    return "Send a personalized follow-up and qualify budget/timeline."
  }

  return "Add to nurture sequence and monitor engagement."
}

export function classifyTicket(text: string) {
  const body = text.toLowerCase()

  if (body.includes("invoice") || body.includes("billing") || body.includes("refund")) {
    return "BILLING"
  }

  if (body.includes("bug") || body.includes("error") || body.includes("broken")) {
    return "TECHNICAL"
  }

  if (body.includes("feature") || body.includes("request") || body.includes("integration")) {
    return "FEATURE_REQUEST"
  }

  return "GENERAL"
}

export function shouldEscalateTicket(text: string) {
  const body = text.toLowerCase()
  return body.includes("angry") || body.includes("cancel") || body.includes("lawsuit") || body.length > 900
}

export function draftTicketResponse(subject: string, body: string) {
  const category = classifyTicket(`${subject} ${body}`).toLowerCase().replace("_", " ")
  return `Thanks for reaching out. I reviewed your ${category} request and pulled it into OpsPilot for the team. We will confirm the next step shortly.`
}

export function taskFromPrompt(prompt: string) {
  const lower = prompt.toLowerCase()
  const priority: "HIGH" | "MEDIUM" = lower.includes("urgent") || lower.includes("today") ? "HIGH" : "MEDIUM"
  const title = lower.includes("follow")
    ? "Follow up with customer"
    : lower.includes("report")
      ? "Generate operations report"
      : "Review OpsPilot request"

  return {
    title,
    description: prompt,
    priority,
  }
}

export type WorkflowAction = {
  type: "create_crm_record" | "assign_owner" | "send_email" | "create_task" | "create_ticket" | "notify_team"
  label: string
  email?: string
  name?: string
  company?: string
  subject?: string
  body?: string
  title?: string
  description?: string
}

const workflowActionTypes = new Set<WorkflowAction["type"]>([
  "create_crm_record",
  "assign_owner",
  "send_email",
  "create_task",
  "create_ticket",
  "notify_team",
])

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase()
}

function nameFromEmail(email: string | undefined) {
  if (!email) {
    return undefined
  }

  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function extractName(text: string) {
  const match = text.match(/\b(?:named|name is|customer name is|lead named|lead for|customer for)\s+([A-Z][A-Z\s.'-]{1,80}?)(?=\s+(?:with|at|email|and|then|,|$))/i)
  const name = match?.[1]?.trim()

  return name || undefined
}

export function normalizeWorkflowActions(actions: unknown): WorkflowAction[] {
  if (!Array.isArray(actions)) {
    return []
  }

  return actions.filter((action): action is WorkflowAction => {
    if (!action || typeof action !== "object") {
      return false
    }

    const candidate = action as {
      type?: unknown
      label?: unknown
      email?: unknown
      name?: unknown
      company?: unknown
      subject?: unknown
      body?: unknown
      title?: unknown
      description?: unknown
    }

    if (typeof candidate.type !== "string" || !workflowActionTypes.has(candidate.type as WorkflowAction["type"]) || typeof candidate.label !== "string") {
      return false
    }

    return [candidate.email, candidate.name, candidate.company, candidate.subject, candidate.body, candidate.title, candidate.description].every((value) => value === undefined || typeof value === "string")
  })
}

export function parseWorkflowPrompt(prompt: string): {
  trigger: "NEW_SUPPORT_TICKET" | "NEW_LEAD" | "MANUAL"
  actions: WorkflowAction[]
} {
  const lower = prompt.toLowerCase()
  const email = extractEmail(prompt)
  const name = extractName(prompt) ?? nameFromEmail(email)
  const mentionsTicket = hasAny(lower, ["support", "ticket", "tiker", "ticker"])
  const trigger: "NEW_SUPPORT_TICKET" | "NEW_LEAD" | "MANUAL" = mentionsTicket ? "NEW_SUPPORT_TICKET" : lower.includes("new lead") ? "NEW_LEAD" : "MANUAL"
  const actions: WorkflowAction[] = []

  if (hasAny(lower, ["crm", "record", "lead"])) {
    actions.push({
      type: "create_crm_record",
      label: "Create CRM record",
      email,
      name: name ?? "Workflow lead",
      description: prompt,
    })
  }

  if (lower.includes("assign")) {
    actions.push({ type: "assign_owner", label: "Assign owner" })
  }

  if (hasAny(lower, ["email", "mail", "gmail"]) || (lower.includes("send") && lower.includes("customer"))) {
    actions.push({
      type: "send_email",
      label: "Send email",
      email,
      subject: "Following up from OpsPilot",
      body: "Thanks for your interest. I am following up with the next steps and will keep your CRM record updated.",
    })
  }

  if (hasAny(lower, ["task", "taks", "follow", "todo", "to-do"])) {
    actions.push({
      type: "create_task",
      label: "Create follow-up task",
      title: email ? `Follow up with ${email}` : "Follow up with customer",
      description: prompt,
      email,
    })
  }

  if (hasAny(lower, ["ticket", "tiker", "ticker", "support handoff", "support handoffs", "support issue", "support request"])) {
    actions.push({
      type: "create_ticket",
      label: "Create support ticket",
      email,
      subject: email ? `Support follow-up for ${email}` : "Workflow support ticket",
      body: prompt,
    })
  }

  if (lower.includes("notify") || lower.includes("slack") || lower.includes("team")) {
    actions.push({ type: "notify_team", label: "Notify team" })
  }

  return {
    trigger,
    actions: actions.length ? actions : [{ type: "create_task", label: "Create review task" }],
  }
}

export function mergeWorkflowActions(storedActions: WorkflowAction[], promptActions: WorkflowAction[]): WorkflowAction[] {
  const meaningfulPromptActions = storedActions.length
    ? promptActions.filter((action) => !(action.type === "create_task" && action.label === "Create review task"))
    : promptActions
  const merged = [...storedActions]

  for (const action of meaningfulPromptActions) {
    const existingIndex = merged.findIndex((storedAction) => storedAction.type === action.type)

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...Object.fromEntries(Object.entries(action).filter(([, value]) => value !== undefined && value !== "")),
      }
    } else {
      merged.push(action)
    }
  }

  return merged.length ? merged : [{ type: "create_task", label: "Create review task" }]
}

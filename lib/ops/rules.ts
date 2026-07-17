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
  type: "create_crm_record" | "assign_owner" | "send_email" | "create_task" | "notify_team"
  label: string
}

const workflowActionTypes = new Set<WorkflowAction["type"]>([
  "create_crm_record",
  "assign_owner",
  "send_email",
  "create_task",
  "notify_team",
])

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

export function normalizeWorkflowActions(actions: unknown): WorkflowAction[] {
  if (!Array.isArray(actions)) {
    return []
  }

  return actions.filter((action): action is WorkflowAction => {
    if (!action || typeof action !== "object") {
      return false
    }

    const candidate = action as { type?: unknown; label?: unknown }
    return typeof candidate.type === "string" && workflowActionTypes.has(candidate.type as WorkflowAction["type"]) && typeof candidate.label === "string"
  })
}

export function parseWorkflowPrompt(prompt: string): {
  trigger: "NEW_SUPPORT_TICKET" | "NEW_LEAD" | "MANUAL"
  actions: WorkflowAction[]
} {
  const lower = prompt.toLowerCase()
  const trigger: "NEW_SUPPORT_TICKET" | "NEW_LEAD" | "MANUAL" = lower.includes("support") || lower.includes("ticket") ? "NEW_SUPPORT_TICKET" : lower.includes("new lead") ? "NEW_LEAD" : "MANUAL"
  const actions: WorkflowAction[] = []

  if (hasAny(lower, ["crm", "record", "lead"])) {
    actions.push({ type: "create_crm_record", label: "Create CRM record" })
  }

  if (lower.includes("assign")) {
    actions.push({ type: "assign_owner", label: "Assign owner" })
  }

  if (hasAny(lower, ["email", "mail", "gmail"]) || (lower.includes("send") && lower.includes("customer"))) {
    actions.push({ type: "send_email", label: "Send email" })
  }

  if (hasAny(lower, ["task", "taks", "follow", "todo", "to-do"])) {
    actions.push({ type: "create_task", label: "Create follow-up task" })
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
  const seen = new Set(merged.map((action) => action.type))

  for (const action of meaningfulPromptActions) {
    if (!seen.has(action.type)) {
      merged.push(action)
      seen.add(action.type)
    }
  }

  return merged.length ? merged : [{ type: "create_task", label: "Create review task" }]
}

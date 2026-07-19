export const opsPilotAgentTeam = [
  {
    id: "email-context-agent",
    label: "Email Context Agent",
    responsibility: "Understands the email topic, subject intent, body context, recipient, tone, and CTA before copy is written.",
    safeTools: "Email brief and template plan",
    prompt:
      "/email understand this email: topic is OpsPilot automation for SaaS operators, subject should mention less manual follow-up, body should explain CRM support tasks workflows and reports, send to customer@example.com, tone warm, CTA book a demo",
  },
  {
    id: "email-agent",
    label: "Email Agent",
    responsibility: "Writes clean customer-facing email with persona, tone, audience, topic, and CTA.",
    safeTools: "Email draft and send",
    prompt:
      "/email as founder write a warm concise email for SaaS operators about OpsPilot automation, send to customer@example.com, CTA book a demo",
  },
  {
    id: "crm-agent",
    label: "CRM Agent",
    responsibility: "Creates leads from real customer emails and records next action.",
    safeTools: "CRM lead and follow-up task",
    prompt:
      "/agent create CRM lead for customer@example.com, summarize their interest in OpsPilot automation, create follow-up task",
  },
  {
    id: "support-agent",
    label: "Support Agent",
    responsibility: "Creates tickets and drafts human-reviewed replies.",
    safeTools: "Support ticket and task",
    prompt:
      "/agent as support agent write a helpful reply to customer@example.com about their workflow issue, create support ticket and follow-up task",
  },
  {
    id: "workflow-agent",
    label: "Workflow Agent",
    responsibility: "Builds reusable automations from trigger/action language.",
    safeTools: "Workflow design and run",
    prompt:
      "/workflow when a customer replies about OpsPilot, create support ticket, update CRM, create follow-up task, and generate weekly report",
  },
  {
    id: "report-agent",
    label: "Ops Report Agent",
    responsibility: "Generates daily or weekly reports from workspace activity.",
    safeTools: "Reports and audit summary",
    prompt:
      "/agent generate a weekly operations report, summarize CRM leads, support tickets, tasks, workflow runs, and create follow-up tasks for unresolved work",
  },
] as const

export function assistantPromptHref(prompt: string) {
  return `/app/assistant?prompt=${encodeURIComponent(prompt)}`
}

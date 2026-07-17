import { describe, expect, it } from "vitest"
import {
  classifyTicket,
  normalizeWorkflowActions,
  parseWorkflowPrompt,
  scoreLead,
  shouldEscalateTicket,
  taskFromPrompt,
} from "@/lib/ops/rules"

describe("OpsPilot rules", () => {
  it("scores high-intent business leads", () => {
    const score = scoreLead({
      name: "Ava",
      email: "ava@acme.com",
      company: "Acme",
      notes: "Urgent pricing demo this week",
    })

    expect(score).toBe(100)
  })

  it("classifies support tickets", () => {
    expect(classifyTicket("Invoice refund request")).toBe("BILLING")
    expect(classifyTicket("The dashboard has a broken error state")).toBe("TECHNICAL")
    expect(classifyTicket("Please add a Salesforce integration feature")).toBe("FEATURE_REQUEST")
    expect(classifyTicket("How do I change my name?")).toBe("GENERAL")
  })

  it("flags escalation-worthy ticket language", () => {
    expect(shouldEscalateTicket("I am angry and want to cancel")).toBe(true)
    expect(shouldEscalateTicket("I need help with settings")).toBe(false)
  })

  it("generates tasks from prompts", () => {
    expect(taskFromPrompt("Urgent follow up with this customer today")).toMatchObject({
      title: "Follow up with customer",
      priority: "HIGH",
    })
  })

  it("parses natural-language workflows", () => {
    const workflow = parseWorkflowPrompt(
      "When a new lead arrives, create CRM record, assign sales rep, send welcome email, create follow-up task, notify team."
    )

    expect(workflow.trigger).toBe("NEW_LEAD")
    expect(workflow.actions.map((action) => action.type)).toEqual([
      "create_crm_record",
      "assign_owner",
      "send_email",
      "create_task",
      "notify_team",
    ])
  })

  it("normalizes stored workflow action JSON before execution", () => {
    expect(
      normalizeWorkflowActions([
        { type: "create_task", label: "Create task" },
        { type: "delete_everything", label: "Nope" },
        null,
      ])
    ).toEqual([{ type: "create_task", label: "Create task" }])
  })
})

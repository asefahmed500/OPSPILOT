import { describe, expect, it } from "vitest"
import {
  classifyTicket,
  mergeWorkflowActions,
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

  it("infers email and task actions from looser workflow language", () => {
    const workflow = parseWorkflowPrompt(
      "Do write a new lead for asefahmed500@gmail.com then send it to existing customer then update it to CRM and add the taks"
    )

    expect(workflow.actions.map((action) => action.type)).toEqual([
      "create_crm_record",
      "send_email",
      "create_task",
    ])
    expect(workflow.actions.find((action) => action.type === "send_email")).toMatchObject({
      email: "asefahmed500@gmail.com",
    })
  })

  it("extracts a named customer for workflow CRM actions", () => {
    const workflow = parseWorkflowPrompt(
      "Create a CRM lead for Asef Ahmed with email asefahmed500@gmail.com then send email and create task"
    )

    expect(workflow.actions.find((action) => action.type === "create_crm_record")).toMatchObject({
      email: "asefahmed500@gmail.com",
      name: "Asef Ahmed",
    })
  })

  it("treats common ticket typos as support workflow actions", () => {
    const workflow = parseWorkflowPrompt(
      "Create CRM lead for Asef Ahmed with email asefahmed500@gmail.com, add task, then update the tiker"
    )

    expect(workflow.trigger).toBe("NEW_SUPPORT_TICKET")
    expect(workflow.actions.map((action) => action.type)).toEqual([
      "create_crm_record",
      "send_email",
      "create_task",
      "create_ticket",
    ])
    expect(workflow.actions.find((action) => action.type === "create_ticket")).toMatchObject({
      email: "asefahmed500@gmail.com",
    })
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

  it("merges newly inferred prompt actions into older stored workflows", () => {
    expect(
      mergeWorkflowActions(
        [{ type: "create_crm_record", label: "Create CRM record" }],
        [
          { type: "create_crm_record", label: "Create CRM record", email: "asefahmed500@gmail.com" },
          { type: "send_email", label: "Send email", email: "asefahmed500@gmail.com" },
          { type: "create_task", label: "Create follow-up task" },
        ]
      )
    ).toEqual([
      { type: "create_crm_record", label: "Create CRM record", email: "asefahmed500@gmail.com" },
      { type: "send_email", label: "Send email", email: "asefahmed500@gmail.com" },
      { type: "create_task", label: "Create follow-up task" },
    ])
  })
})

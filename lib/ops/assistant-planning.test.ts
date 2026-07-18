import { describe, expect, it } from "vitest"
import { fallbackAssistantPlan } from "@/lib/ops/assistant-planning"

describe("assistant natural-language fallback planner", () => {
  it("plans a polished marketing email plus CRM and task updates from rough language", () => {
    const plan = fallbackAssistantPlan(
      "gnerea a makeketing meil about OpsPilot automating workflows send it to jane@example.com and update allothers"
    )

    expect(plan.actions.map((action) => action.type)).toEqual(["send_email", "create_lead", "create_task"])
    expect(plan.actions[0]).toMatchObject({
      type: "send_email",
      email: "jane@example.com",
      subject: "New from OpsPilot",
    })
    expect(plan.actions[1]).toMatchObject({
      type: "create_lead",
      email: "jane@example.com",
    })
    expect(plan.actions[2]).toMatchObject({
      type: "create_task",
      title: "Follow up with jane@example.com",
    })
  })

  it("uses a workflow for customer reply triggers instead of sending immediately", () => {
    const plan = fallbackAssistantPlan(
      "when customer replies create support ticket update crm and create follow up task"
    )

    expect(plan.actions).toHaveLength(1)
    expect(plan.actions[0]).toMatchObject({
      type: "create_workflow",
      runNow: false,
    })
  })

  it("preserves persona, tone, audience, company, and CTA instructions for email generation", () => {
    const plan = fallbackAssistantPlan(
      "as founder write friendly email for saas owners company Acme about automating support send to buyer@example.com ask them to book a demo and update crm task ticket report"
    )

    expect(plan.actions.map((action) => action.type)).toEqual([
      "send_email",
      "create_lead",
      "create_task",
      "create_ticket",
      "create_report",
    ])
    expect(plan.actions[0]).toMatchObject({
      type: "send_email",
      email: "buyer@example.com",
      company: "Acme",
      persona: "founder",
      tone: "friendly",
      audience: "saas owners",
      callToAction: "book a demo",
    })
  })

  it("creates one send action per real recipient without inventing emails", () => {
    const plan = fallbackAssistantPlan(
      "send a professional email about OpsPilot to jane@example.com and bob@example.com then update crm"
    )

    expect(plan.actions.filter((action) => action.type === "send_email")).toHaveLength(2)
    expect(plan.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "send_email", email: "jane@example.com" }),
        expect.objectContaining({ type: "send_email", email: "bob@example.com" }),
        expect.objectContaining({ type: "create_lead", email: "jane@example.com" }),
        expect.objectContaining({ type: "create_lead", email: "bob@example.com" }),
      ])
    )
  })
})

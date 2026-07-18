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
})

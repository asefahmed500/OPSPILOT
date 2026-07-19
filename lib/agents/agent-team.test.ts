import { describe, expect, it } from "vitest"
import { assistantPromptHref, opsPilotAgentTeam } from "@/lib/agents/agent-team"

describe("OpsPilot agent team registry", () => {
  it("defines specialized agent launchers for every core workspace surface", () => {
    expect(opsPilotAgentTeam.map((agent) => agent.label)).toEqual([
      "Email Context Agent",
      "Email Agent",
      "CRM Agent",
      "Support Agent",
      "Workflow Agent",
      "Ops Report Agent",
    ])
    expect(opsPilotAgentTeam.every((agent) => agent.prompt.includes("/agent") || agent.prompt.includes("/email") || agent.prompt.includes("/workflow"))).toBe(true)
  })

  it("builds assistant prefill links from agent prompts", () => {
    const href = assistantPromptHref("/agent create CRM lead for jane@example.com")

    expect(href).toBe("/app/assistant?prompt=%2Fagent%20create%20CRM%20lead%20for%20jane%40example.com")
  })

  it("documents the email context agent as the subject and body planning specialist", () => {
    const emailContextAgent = opsPilotAgentTeam.find((agent) => agent.id === "email-context-agent")

    expect(emailContextAgent).toMatchObject({
      label: "Email Context Agent",
      safeTools: "Email brief and template plan",
    })
    expect(emailContextAgent?.responsibility).toContain("subject intent")
    expect(emailContextAgent?.responsibility).toContain("body context")
  })
})

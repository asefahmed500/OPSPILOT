import { beforeAll, describe, expect, it, vi } from "vitest"

describe("fallback email generation", () => {
  beforeAll(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/opspilot")
    vi.stubEnv("AUTH_JWT_SECRET", "test-secret-that-is-long-enough")
  })

  it("creates a professional congratulations subject and body from a rough email command", async () => {
    const { generateWorkflowMarketingEmail } = await import("@/lib/ai")
    const email = await generateWorkflowMarketingEmail({
      workflowName: "A quick update from OpsPilot",
      prompt:
        "send a mail to Customer Name Asef Ahmed mail is asefahmed500@gmail.com . The topics will be send him congratulations for working hard with professonal tone",
      customerName: "Asef Ahmed",
      tone: "professional",
    })

    expect(email.subject).toBe("Congratulations on Your Hard Work")
    expect(email.body).toContain("Hi Asef Ahmed,")
    expect(email.body).toContain("Congratulations on the hard work and dedication")
    expect(email.body).not.toContain("The topics will be")
    expect(email.body).not.toContain("mail is")
    expect(email.body).not.toContain("asefahmed500@gmail.com")
  })
})

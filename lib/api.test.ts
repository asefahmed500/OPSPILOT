import { beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}))

vi.mock("@/lib/workspace", () => ({
  requireWorkspace: vi.fn(),
}))

beforeAll(() => {
  process.env.DATABASE_URL ??=
    "postgresql://user:password@localhost:5432/opspilot"
  process.env.AUTH_JWT_SECRET ??= "test-secret-that-is-long-enough"
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com"
})

describe("API request origin protection", () => {
  it("accepts configured app origin", async () => {
    const { requireSameOrigin } = await import("@/lib/api")

    expect(() =>
      requireSameOrigin(
        new Request("https://internal.example.com/api/tasks", {
          method: "POST",
          headers: { origin: "https://app.example.com" },
        })
      )
    ).not.toThrow()
  })

  it("rejects missing origin and referer headers", async () => {
    const { requireSameOrigin } = await import("@/lib/api")

    expect(() =>
      requireSameOrigin(
        new Request("https://app.example.com/api/tasks", {
          method: "POST",
        })
      )
    ).toThrow("Missing request origin")
  })

  it("rejects cross-site origins", async () => {
    const { requireSameOrigin } = await import("@/lib/api")

    expect(() =>
      requireSameOrigin(
        new Request("https://app.example.com/api/tasks", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        })
      )
    ).toThrow("Invalid request origin")
  })
})

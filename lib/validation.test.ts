import { describe, expect, it } from "vitest"
import {
  assistantSchema,
  forgotPasswordSchema,
  leadSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation"

describe("validation schemas", () => {
  it("normalizes emails and trims user-controlled text", () => {
    const parsed = registerSchema.parse({
      name: "  Asefa  ",
      email: "  ASEFA@example.COM ",
      password: "password123",
      workspaceName: "  OpsPilot  ",
    })

    expect(parsed).toMatchObject({
      name: "Asefa",
      email: "asefa@example.com",
      workspaceName: "OpsPilot",
    })
  })

  it("rejects oversized assistant prompts", () => {
    expect(() => assistantSchema.parse({ message: "x".repeat(2001) })).toThrow()
  })

  it("caps lead notes to prevent unbounded payloads", () => {
    expect(() =>
      leadSchema.parse({
        name: "Ava",
        email: "ava@example.com",
        notes: "x".repeat(1001),
      })
    ).toThrow()
  })

  it("validates password reset inputs", () => {
    expect(forgotPasswordSchema.parse({ email: " RESET@Example.com " })).toEqual({
      email: "reset@example.com",
    })
    expect(() => resetPasswordSchema.parse({ token: "short", password: "password123" })).toThrow()
    expect(() => resetPasswordSchema.parse({ token: "a".repeat(64), password: "short" })).toThrow()
  })
})

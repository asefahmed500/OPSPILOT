import "server-only"
import { z } from "zod"

const envBoolean = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value
  }

  if (["true", "1", "yes", "on"].includes(value.toLowerCase())) {
    return true
  }

  if (["false", "0", "no", "off"].includes(value.toLowerCase())) {
    return false
  }

  return value
}, z.boolean())

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_JWT_SECRET: z.string().min(24),
  NEXTAUTH_SECRET: z.string().min(24).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: envBoolean.optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  AI_API_BASE_URL: z.string().url().default("https://api.hcnsec.cn/v1"),
  AI_API_KEY: z.string().optional(),
  HCNSEC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("DeepSeek-V4-Flash"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  INBOUND_EMAIL_WEBHOOK_SECRET: z.string().min(16).optional(),
})

export const env = envSchema.parse(process.env)

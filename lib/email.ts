import "server-only"
import nodemailer from "nodemailer"
import { env } from "@/lib/env"

export async function sendTestEmail(to: string) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error("SMTP is not configured")
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    disableFileAccess: true,
    disableUrlAccess: true,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })

  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "OpsPilot SMTP test",
    text: "Your OpsPilot SMTP adapter is connected.",
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error("SMTP is not configured")
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    disableFileAccess: true,
    disableUrlAccess: true,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })

  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "Reset your OpsPilot password",
    text: [
      "We received a request to reset your OpsPilot password.",
      "",
      `Open this secure link to choose a new password: ${resetUrl}`,
      "",
      "This link expires in 30 minutes. If you did not request it, you can ignore this email.",
    ].join("\n"),
  })
}

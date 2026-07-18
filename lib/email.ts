import "server-only"
import nodemailer from "nodemailer"
import { env } from "@/lib/env"

function createSmtpTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error("SMTP is not configured")
  }

  return nodemailer.createTransport({
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
}

export async function sendTestEmail(to: string) {
  const transporter = createSmtpTransporter()

  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "OpsPilot SMTP test",
    text: "Your OpsPilot SMTP adapter is connected.",
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const transporter = createSmtpTransporter()

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

export async function sendWorkflowEmail({
  to,
  workflowName,
  subject,
  body,
}: {
  to: string
  workflowName: string
  subject?: string
  body?: string
}) {
  const transporter = createSmtpTransporter()
  const emailSubject = subject ?? `OpsPilot follow-up: ${workflowName}`
  const emailBody = body ?? [
    "Hi,",
    "",
    "I wanted to share a quick update from OpsPilot.",
    "OpsPilot helps automate CRM follow-up, support handoffs, task creation, and daily workflow operations.",
    "",
    "Best,",
    "The OpsPilot team",
  ].join("\n")

  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: emailSubject,
    text: emailBody,
  })
}

export async function sendCustomerEmail({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}) {
  const transporter = createSmtpTransporter()

  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text: body,
  })
}

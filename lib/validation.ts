import { z } from "zod"

const text = (message: string, max = 255) => z.string().trim().min(1, message).max(max)
const optionalText = (max = 255) => z.string().trim().max(max).optional()

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
})

export const registerSchema = loginSchema.extend({
  name: text("Name is required", 120),
  workspaceName: text("Workspace name is required", 120),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
})

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32, "Reset link is invalid").max(256),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
})

export const leadSchema = z.object({
  name: text("Lead name is required", 120),
  email: z.string().trim().toLowerCase().email("Enter a valid lead email"),
  source: optionalText(80),
  company: optionalText(120),
  notes: optionalText(1000),
})

export const contactSchema = z.object({
  name: text("Contact name is required", 120),
  email: z.string().trim().toLowerCase().email("Enter a valid contact email"),
  phone: optionalText(40),
  title: optionalText(120),
})

export const taskSchema = z.object({
  title: text("Task title is required", 160),
  description: optionalText(1000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
})

export const ticketSchema = z.object({
  subject: text("Subject is required", 160),
  customerEmail: z.string().trim().toLowerCase().email("Enter a valid customer email"),
  body: text("Message is required", 2000),
  channel: z.enum(["WEBSITE_CHAT", "EMAIL", "WHATSAPP", "SLACK", "DISCORD"]),
})

export const workflowSchema = z.object({
  name: optionalText(120),
  prompt: text("Describe the workflow", 2000),
})

export const reportSchema = z.object({
  period: z.enum(["daily", "weekly"]),
})

export const smtpTestSchema = z.object({
  to: z.string().trim().toLowerCase().email("Enter a valid email"),
})

export const assistantSchema = z.object({
  message: text("Ask OpsPilot something", 2000),
})

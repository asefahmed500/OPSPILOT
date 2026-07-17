"use client"

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { type Resolver, useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  leadSchema,
  reportSchema,
  smtpTestSchema,
  taskSchema,
  ticketSchema,
  workflowSchema,
} from "@/lib/validation"

type FormKind = "lead" | "task" | "ticket" | "workflow" | "report" | "smtp"
type ActionFormValues = Record<string, string>

type Field = {
  name: string
  label: string
  placeholder?: string
  type?: "text" | "email" | "textarea" | "select"
  options?: { value: string; label: string }[]
}

const schemas = {
  lead: leadSchema,
  task: taskSchema,
  ticket: ticketSchema,
  workflow: workflowSchema,
  report: reportSchema,
  smtp: smtpTestSchema,
}

const fields: Record<FormKind, Field[]> = {
  lead: [
    { name: "name", label: "Lead name", placeholder: "Lead name" },
    { name: "email", label: "Email", type: "email", placeholder: "lead@company.com" },
    { name: "company", label: "Company", placeholder: "Company" },
    { name: "source", label: "Source", placeholder: "Website" },
    { name: "notes", label: "Notes", type: "textarea", placeholder: "Notes" },
  ],
  task: [
    { name: "title", label: "Task title", placeholder: "Task title" },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "LOW", label: "Low" },
        { value: "MEDIUM", label: "Medium" },
        { value: "HIGH", label: "High" },
        { value: "URGENT", label: "Urgent" },
      ],
    },
    { name: "description", label: "Description", type: "textarea", placeholder: "Description" },
  ],
  ticket: [
    { name: "subject", label: "Subject", placeholder: "Subject" },
    { name: "customerEmail", label: "Customer email", type: "email", placeholder: "customer@example.com" },
    {
      name: "channel",
      label: "Channel",
      type: "select",
      options: [
        { value: "WEBSITE_CHAT", label: "Website chat" },
        { value: "EMAIL", label: "Email" },
        { value: "SLACK", label: "Slack" },
        { value: "DISCORD", label: "Discord" },
      ],
    },
    { name: "body", label: "Message", type: "textarea", placeholder: "Customer message" },
  ],
  workflow: [
    { name: "name", label: "Workflow name", placeholder: "Workflow name" },
    {
      name: "prompt",
      label: "Workflow prompt",
      type: "textarea",
      placeholder: "When a new lead arrives, create CRM record, assign sales rep, send welcome email, create follow-up task.",
    },
  ],
  report: [
    {
      name: "period",
      label: "Period",
      type: "select",
      options: [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
      ],
    },
  ],
  smtp: [
    { name: "to", label: "Send test to", type: "email", placeholder: "name@example.com" },
  ],
}

const defaults: Record<FormKind, Record<string, string>> = {
  lead: { source: "Website" },
  task: { priority: "MEDIUM" },
  ticket: { channel: "WEBSITE_CHAT" },
  workflow: {},
  report: { period: "weekly" },
  smtp: {},
}

export function ActionForm({
  kind,
  endpoint,
  submitLabel,
  successLabel = "Saved",
}: {
  kind: FormKind
  endpoint: string
  submitLabel: string
  successLabel?: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState("")
  const schema = schemas[kind]
  const formFields = useMemo(() => fields[kind], [kind])
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActionFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<ActionFormValues>,
    defaultValues: defaults[kind],
  })

  async function submit(values: ActionFormValues) {
    setStatus("")
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setStatus(body?.error ?? "Something went wrong")
      return
    }

    reset(defaults[kind])
    setStatus(successLabel)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="op-panel p-5">
      <div className="grid gap-4">
        {formFields.map((field) => {
          const error = errors[field.name]?.message?.toString()

          return (
            <label key={field.name} className="op-label">
              {field.label}
              {field.type === "textarea" ? (
                <textarea
                  {...register(field.name)}
                  placeholder={field.placeholder}
                  className="op-field min-h-28 resize-y py-3 leading-6"
                />
              ) : field.type === "select" ? (
                <select
                  {...register(field.name)}
                  className="op-field"
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...register(field.name)}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  className="op-field"
                />
              )}
              {error ? <span className="text-xs font-normal text-red-600" role="alert">{error}</span> : null}
            </label>
          )
        })}
      </div>
      {status ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700" role="status">{status}</p> : null}
      <Button type="submit" className="mt-5 w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? "Working..." : submitLabel}
      </Button>
    </form>
  )
}

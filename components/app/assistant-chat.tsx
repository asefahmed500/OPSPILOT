"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { assistantSchema } from "@/lib/validation"

const commandExamples = [
  "Write a friendly founder email for SaaS owners about OpsPilot automating workflows, send it to customer@example.com, create CRM lead, task, support ticket, and weekly report",
  "/workflow when a client replies, update CRM, create a support ticket, create a follow-up task, and generate a weekly report",
  "/email write a polished launch update as an account manager, invite them to book a demo, send to customer@example.com and create CRM plus task",
]

const slashCommands = [
  ["/email", "Generate and send a customer email"],
  ["/workflow", "Save reusable automation"],
  ["/agent", "Run many tools from one request"],
]

const promptRecipes = [
  "/email as founder write a friendly email for SaaS owners about [topic], send to customer@example.com, ask them to book a demo, create CRM lead and follow-up task",
  "/agent as account manager write a professional renewal email for [company] about [offer], send to buyer@example.com, create CRM, task, ticket, and weekly report",
  "/workflow when a customer replies about [topic], create support ticket, update CRM, create follow-up task, and generate weekly report",
]

const promptParts = {
  personas: ["founder", "account manager", "sales rep", "support agent", "consultant", "product manager"],
  tones: ["friendly", "professional", "direct", "persuasive", "warm", "short"],
  actions: ["send email", "create CRM lead", "create task", "create support ticket", "create workflow", "generate report"],
}

type Message = {
  role: string
  content: string
  action?: string | null
}

export function AssistantChat({
  initialConversationId,
  initialMessages,
}: {
  initialConversationId?: string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState(initialMessages)
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof assistantSchema>>({
    resolver: zodResolver(assistantSchema),
  })

  function fillPrompt(prompt: string) {
    setValue("message", prompt, { shouldDirty: true, shouldValidate: true })
  }

  async function onSubmit(values: z.input<typeof assistantSchema>) {
    const message = values.message

    setMessages((current) => [...current, { role: "user", content: message }])
    setLoading(true)

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      })
      const body = await response.json().catch(() => null)

      if (response.ok) {
        setConversationId(body.conversationId)
        setMessages((current) => [...current, body.message])
        reset()
      } else {
        setMessages((current) => [...current, { role: "assistant", content: body?.error ?? "Assistant failed" }])
      }
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "Network error. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="op-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3">
        <div>
          <p className="text-sm font-semibold">OpsPilot command chat</p>
          <p className="text-xs text-slate-500">Runs safe CRM, task, support, report, email, and workflow actions from natural language.</p>
        </div>
      </div>
      <div className="h-[min(58dvh,520px)] min-h-[360px] space-y-3 overflow-y-auto p-5">
        {messages.length ? (
          messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "ml-auto max-w-[86%] bg-slate-950 text-white" : "mr-auto max-w-[86%] border border-slate-200 bg-slate-50 text-slate-800"}`}>
              {message.action ? <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{message.action}</p> : null}
              <span className="whitespace-pre-line">{message.content}</span>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Try an operations command or use one of the quick prompts below.
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="border-t border-slate-200 p-4">
        <div className="mb-4 rounded-lg border border-slate-200 bg-white/80 p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Command format</p>
              <p className="mt-1 text-xs text-slate-500">Pick a slash command, add voice, topic, recipient, CTA, then choose the tools to update.</p>
            </div>
            <code className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">/[command] as [persona] write [tone] email for [audience] about [topic]</code>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {slashCommands.map(([command, description]) => (
              <button
                key={command}
                type="button"
                onClick={() => fillPrompt(`${command} as founder write a friendly email for SaaS owners about OpsPilot, send to customer@example.com, ask them to book a demo, create CRM lead and task`)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-white"
              >
                <span className="block text-sm font-semibold text-slate-950">{command}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {Object.entries(promptParts).map(([label, values]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {values.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => fillPrompt(`/email as ${label === "personas" ? value : "founder"} write a ${label === "tones" ? value : "professional"} email for SaaS owners about OpsPilot automation, send to customer@example.com, ask them to book a demo, create CRM lead and task`)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {promptRecipes.map((recipe) => (
              <button
                key={recipe}
                type="button"
                onClick={() => fillPrompt(recipe)}
                className="block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs leading-5 text-slate-600 transition hover:border-slate-300 hover:bg-white"
              >
                {recipe}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {commandExamples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => fillPrompt(example)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {example}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input {...register("message")} className="op-field min-w-0 flex-1" placeholder="Ask OpsPilot..." />
          <Button type="submit" disabled={loading}>{loading ? "Sending" : "Send"}</Button>
        </div>
        {errors.message?.message ? <p className="mt-2 text-xs text-red-600" role="alert">{errors.message.message}</p> : null}
      </form>
    </div>
  )
}

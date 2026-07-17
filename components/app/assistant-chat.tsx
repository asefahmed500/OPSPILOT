"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { assistantSchema } from "@/lib/validation"

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
    formState: { errors },
  } = useForm<z.input<typeof assistantSchema>>({
    resolver: zodResolver(assistantSchema),
  })

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
          <p className="text-xs text-slate-500">Creates safe internal actions from natural language.</p>
        </div>
      </div>
      <div className="h-[min(58dvh,520px)] min-h-[360px] space-y-3 overflow-y-auto p-5">
        {messages.length ? (
          messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "ml-auto max-w-[86%] bg-slate-950 text-white" : "mr-auto max-w-[86%] border border-slate-200 bg-slate-50 text-slate-800"}`}>
              {message.action ? <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{message.action}</p> : null}
              {message.content}
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Try creating follow-up tasks for inactive customers or generate a weekly operations report.
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="border-t border-slate-200 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input {...register("message")} className="op-field min-w-0 flex-1" placeholder="Ask OpsPilot..." />
          <Button type="submit" disabled={loading}>{loading ? "Sending" : "Send"}</Button>
        </div>
        {errors.message?.message ? <p className="mt-2 text-xs text-red-600" role="alert">{errors.message.message}</p> : null}
      </form>
    </div>
  )
}

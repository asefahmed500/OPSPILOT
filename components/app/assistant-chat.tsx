"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { MessageSquare, Plus, Trash2 } from "lucide-react"
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

type ConversationPreview = {
  id: string
  title: string
  updatedAt: string
  messages: Message[]
}

export function AssistantChat({
  initialConversationId,
  initialMessages,
  initialConversations,
}: {
  initialConversationId?: string
  initialMessages: Message[]
  initialConversations: ConversationPreview[]
}) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const [conversations, setConversations] = useState(initialConversations)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
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

  function startNewChat() {
    setConversationId(undefined)
    setMessages([])
    reset()
    setHistoryOpen(false)
  }

  function openConversation(conversation: ConversationPreview) {
    setConversationId(conversation.id)
    setMessages(conversation.messages)
    reset()
    setHistoryOpen(false)
  }

  async function deleteConversation(id: string) {
    setDeletingId(id)

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      })

      if (!response.ok) {
        return
      }

      setConversations((current) => current.filter((conversation) => conversation.id !== id))

      if (conversationId === id) {
        startNewChat()
      }

      router.refresh()
    } finally {
      setDeletingId(null)
    }
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
        setConversations((current) => {
          const nextMessages = [...messages, { role: "user", content: message }, body.message]
          const existing = current.find((conversation) => conversation.id === body.conversationId)
          const updated: ConversationPreview = {
            id: body.conversationId,
            title: existing?.title ?? message.slice(0, 48),
            updatedAt: new Date().toISOString(),
            messages: nextMessages,
          }

          return [updated, ...current.filter((conversation) => conversation.id !== body.conversationId)]
        })
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

  const activeTitle = conversations.find((conversation) => conversation.id === conversationId)?.title ?? "New chat"

  return (
    <div className="op-panel overflow-hidden">
      <div className="grid min-h-[760px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={`${historyOpen ? "block" : "hidden"} border-b border-slate-200 bg-white/70 p-3 lg:block lg:border-b-0 lg:border-r`}>
          <Button type="button" className="w-full justify-start" onClick={startNewChat}>
            <Plus className="size-4" />
            New chat
          </Button>

          <div className="mt-4">
            <p className="px-2 text-xs font-semibold uppercase text-slate-500">History</p>
            <div className="mt-2 space-y-1">
              {conversations.map((conversation) => (
                <div key={conversation.id} className={`group flex items-center gap-1 rounded-lg border px-2 py-1.5 transition ${conversation.id === conversationId ? "border-slate-300 bg-slate-100" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}>
                  <button type="button" onClick={() => openConversation(conversation)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <MessageSquare className="size-4 shrink-0 text-slate-400" />
                    <span className="truncate text-sm text-slate-700">{conversation.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConversation(conversation.id)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-100 transition hover:bg-white hover:text-red-600 lg:opacity-0 lg:group-hover:opacity-100"
                    aria-label={`Delete ${conversation.title}`}
                    disabled={deletingId === conversation.id}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              {!conversations.length ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  No chats yet. Start with a slash command or one of the recipes.
                </p>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{activeTitle}</p>
              <p className="text-xs text-slate-500">Runs safe CRM, task, support, report, email, and workflow actions from natural language.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setHistoryOpen((value) => !value)} className="lg:hidden">
                History
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={startNewChat}>
                <Plus className="size-4" />
                New
              </Button>
            </div>
          </div>

          <div className="h-[min(58dvh,520px)] min-h-[360px] flex-1 space-y-3 overflow-y-auto p-5">
            {messages.length ? (
              messages.map((item, index) => (
                <div key={`${item.role}-${index}`} className={`rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${item.role === "user" ? "ml-auto max-w-[86%] bg-slate-950 text-white" : "mr-auto max-w-[86%] border border-slate-200 bg-slate-50 text-slate-800"}`}>
                  {item.action ? <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{item.action}</p> : null}
                  <span className="whitespace-pre-line">{item.content}</span>
                </div>
              ))
            ) : (
              <div className="grid min-h-full place-items-center">
                <div className="max-w-xl rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm leading-6 text-slate-600">
                  <p className="text-base font-semibold text-slate-950">Start a new OpsPilot agent chat</p>
                  <p className="mt-2">Use slash commands, persona chips, or recipes below to generate emails and update CRM, Tasks, Support, Workflows, and Reports.</p>
                </div>
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
      </div>
    </div>
  )
}

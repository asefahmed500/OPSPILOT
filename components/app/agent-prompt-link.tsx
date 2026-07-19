import Link from "next/link"
import { Sparkles } from "lucide-react"
import { assistantPromptHref } from "@/lib/agents/agent-team"

export function AgentPromptLink({
  label,
  prompt,
}: {
  label: string
  prompt: string
}) {
  return (
    <Link
      href={assistantPromptHref(prompt)}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20"
    >
      <Sparkles className="size-4" aria-hidden="true" />
      {label}
    </Link>
  )
}

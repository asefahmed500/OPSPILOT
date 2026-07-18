"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function CustomerReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("")
    setLoading(true)

    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setStatus(payload?.error ?? "Could not process customer reply")
        return
      }

      setBody("")
      setStatus("AI draft generated. Review and confirm before sending.")
      router.refresh()
    } catch {
      setStatus("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
      <label className="grid gap-2 text-xs font-medium text-slate-600">
        Customer replied
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Paste the customer reply here. OpsPilot will update the ticket, create a task, and draft a reply for your approval."
          className="min-h-24 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-950"
          required
        />
      </label>
      {status ? <p className="mt-2 text-xs text-slate-600" role="status">{status}</p> : null}
      <Button type="submit" size="sm" className="mt-3" disabled={loading || !body.trim()}>
        {loading ? "Drafting..." : "Draft reply + update"}
      </Button>
    </form>
  )
}

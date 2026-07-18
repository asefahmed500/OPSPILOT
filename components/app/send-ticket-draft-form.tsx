"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function SendTicketDraftForm({
  ticketId,
  initialDraft,
}: {
  ticketId: string
  initialDraft: string
}) {
  const router = useRouter()
  const [body, setBody] = useState(initialDraft)
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("")
    setLoading(true)

    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/send-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setStatus(payload?.error ?? "Could not send draft")
        return
      }

      setStatus("Confirmed reply sent to the customer.")
      router.refresh()
    } catch {
      setStatus("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
      <label className="grid gap-2 text-xs font-medium text-blue-900">
        AI draft waiting for your confirmation
        <textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-28 rounded-md border border-blue-100 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500" required />
      </label>
      {status ? <p className="mt-2 text-xs text-blue-900" role="status">{status}</p> : null}
      <Button type="submit" size="sm" className="mt-3" disabled={loading || !body.trim()}>
        {loading ? "Sending..." : "Confirm and send"}
      </Button>
    </form>
  )
}

"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function InboundEmailForm() {
  const router = useRouter()
  const [from, setFrom] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("")
    setLoading(true)

    try {
      const response = await fetch("/api/support/inbound-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, subject, body }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setStatus(payload?.error ?? "Could not ingest inbound email")
        return
      }

      setFrom("")
      setSubject("")
      setBody("")
      setStatus(payload?.created ? "New support ticket created with an AI draft." : "Existing ticket updated with an AI draft.")
      router.refresh()
    } catch {
      setStatus("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="op-panel mt-6 p-5" noValidate>
      <h2 className="font-semibold tracking-tight">Inbound email</h2>
      <div className="mt-4 grid gap-3">
        <label className="op-label">
          From
          <input value={from} onChange={(event) => setFrom(event.target.value)} type="email" placeholder="customer@example.com" className="op-field" />
        </label>
        <label className="op-label">
          Subject
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Re: Need help" className="op-field" />
        </label>
        <label className="op-label">
          Email body
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Paste the customer email reply. OpsPilot will create or update a ticket and draft a reply for your approval." className="op-field min-h-28 resize-y py-3 leading-6" />
        </label>
      </div>
      {status ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700" role="status">{status}</p> : null}
      <Button type="submit" className="mt-5" disabled={loading || !from.trim() || !subject.trim() || !body.trim()}>
        {loading ? "Ingesting..." : "Ingest email"}
      </Button>
    </form>
  )
}

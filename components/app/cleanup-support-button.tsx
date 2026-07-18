"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CleanupSupportButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")

  async function cleanup() {
    setStatus("")
    setLoading(true)

    try {
      const response = await fetch("/api/support/cleanup-system", { method: "POST" })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setStatus(payload?.error ?? "Cleanup failed")
        return
      }

      setStatus(payload.deleted ? `Removed ${payload.deleted} system email ticket${payload.deleted === 1 ? "" : "s"}.` : "No system email tickets found.")
      router.refresh()
    } catch {
      setStatus("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="op-panel mt-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold tracking-tight">Clean system emails</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Remove imported bounces, password resets, and no-reply notifications.</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={cleanup} disabled={loading}>
          <Trash2 className="size-4" />
          {loading ? "Cleaning" : "Clean"}
        </Button>
      </div>
      {status ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700" role="status">{status}</p> : null}
    </div>
  )
}

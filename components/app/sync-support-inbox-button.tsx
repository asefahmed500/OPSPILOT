"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SyncSupportInboxButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")

  async function sync() {
    setStatus("")
    setLoading(true)

    try {
      const response = await fetch("/api/support/sync-inbox", { method: "POST" })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setStatus(payload?.error ?? "Inbox sync failed")
        return
      }

      const count = Array.isArray(payload?.synced) ? payload.synced.length : 0
      setStatus(count ? `Synced ${count} customer email${count === 1 ? "" : "s"}.` : "No unread customer emails found.")
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
          <h2 className="font-semibold tracking-tight">Gmail inbox sync</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Pull unread customer replies from your mailbox into Support.</p>
        </div>
        <Button type="button" size="sm" onClick={sync} disabled={loading}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          {loading ? "Syncing" : "Sync"}
        </Button>
      </div>
      {status ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700" role="status">{status}</p> : null}
    </div>
  )
}

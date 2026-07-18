"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DeleteResourceButton({
  endpoint,
  label,
}: {
  endpoint: string
  label: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function remove() {
    setError("")
    setLoading(true)
    const response = await fetch(endpoint, { method: "DELETE" })
    setLoading(false)

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.error ?? "Delete failed")
      return
    }

    router.refresh()
  }

  return (
    <div className="grid justify-items-end gap-1">
      <Button type="button" size="icon-sm" variant="ghost" onClick={remove} disabled={loading} aria-label={`Delete ${label}`} title={`Delete ${label}`}>
        <Trash2 className="size-4 text-slate-500 transition group-hover/button:text-red-600" />
      </Button>
      {error ? <p className="max-w-36 text-right text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

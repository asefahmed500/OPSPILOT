"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DeleteWorkflowButton({ workflowId }: { workflowId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function remove() {
    setError("")
    setLoading(true)
    const response = await fetch(`/api/workflows/${workflowId}`, { method: "DELETE" })
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
      <Button type="button" size="sm" variant="secondary" onClick={remove} disabled={loading} aria-label="Delete workflow">
        <Trash2 className="size-4" />
        {loading ? "Deleting" : "Delete"}
      </Button>
      {error ? <p className="max-w-32 text-right text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

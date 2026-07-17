"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function RunWorkflowButton({ workflowId }: { workflowId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function run() {
    setError("")
    setLoading(true)
    const response = await fetch(`/api/workflows/${workflowId}/run`, { method: "POST" })
    setLoading(false)

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.error ?? "Workflow run failed")
      return
    }

    router.refresh()
  }

  return (
    <div className="grid justify-items-end gap-1">
      <Button size="sm" onClick={run} disabled={loading}>
        {loading ? "Running" : "Run"}
      </Button>
      {error ? <p className="max-w-32 text-right text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

"use client"

import { createContext, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type BulkDeleteContextValue = {
  selected: Set<string>
  toggle: (id: string) => void
  clear: () => void
  endpoint: string
  label: string
}

const BulkDeleteContext = createContext<BulkDeleteContextValue | null>(null)

function useBulkDelete() {
  const context = useContext(BulkDeleteContext)

  if (!context) {
    throw new Error("Bulk delete controls must be rendered inside BulkDeleteProvider")
  }

  return context
}

export function BulkDeleteProvider({
  endpoint,
  label,
  children,
}: {
  endpoint: string
  label: string
  children: ReactNode
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const value = useMemo<BulkDeleteContextValue>(
    () => ({
      selected,
      endpoint,
      label,
      toggle(id) {
        setSelected((current) => {
          const next = new Set(current)

          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }

          return next
        })
      },
      clear() {
        setSelected(new Set())
      },
    }),
    [endpoint, label, selected]
  )

  return <BulkDeleteContext.Provider value={value}>{children}</BulkDeleteContext.Provider>
}

export function BulkDeleteCheckbox({ id, label }: { id: string; label: string }) {
  const { selected, toggle } = useBulkDelete()

  return (
    <label className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white transition hover:border-slate-300" title={`Select ${label}`}>
      <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} className="size-3.5 accent-slate-950" aria-label={`Select ${label}`} />
    </label>
  )
}

export function BulkDeleteToolbar() {
  const router = useRouter()
  const { selected, endpoint, label, clear } = useBulkDelete()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const count = selected.size

  async function remove() {
    setError("")
    setLoading(true)
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    setLoading(false)

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.error ?? "Bulk delete failed")
      return
    }

    clear()
    router.refresh()
  }

  if (!count) {
    return null
  }

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <div>
        <p className="font-medium text-slate-900">{count} selected</p>
        {error ? <p className="text-xs text-red-600">{error}</p> : <p className="text-xs text-slate-500">Bulk actions for {label}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={loading}>
          Clear
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={remove} disabled={loading}>
          <Trash2 className="size-4" />
          {loading ? "Deleting" : "Delete selected"}
        </Button>
      </div>
    </div>
  )
}

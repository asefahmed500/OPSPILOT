"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bot,
  ClipboardList,
  Database,
  Headphones,
  Home,
  LineChart,
  MessageSquare,
  Settings,
  Workflow,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type AppNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const appNavItems: AppNavItem[] = [
  { href: "/app", label: "Dashboard", icon: Home },
  { href: "/app/assistant", label: "AI Assistant", icon: MessageSquare },
  { href: "/app/crm", label: "CRM", icon: Database },
  { href: "/app/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/app/support", label: "Support", icon: Headphones },
  { href: "/app/workflows", label: "Workflows", icon: Workflow },
  { href: "/app/reports", label: "Reports", icon: LineChart },
  { href: "/app/settings", label: "Settings", icon: Settings },
]

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname.startsWith(href)
}

export function AppBrand() {
  return (
    <Link href="/app" className="flex min-h-11 items-center gap-3 text-sm font-semibold tracking-tight">
      <span className="flex size-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
        <Bot className="size-4" aria-hidden="true" />
      </span>
      <span>OpsPilot AI</span>
    </Link>
  )
}

export function DesktopNav() {
  const pathname = usePathname()

  return (
    <nav className="mt-8 space-y-1" aria-label="Primary navigation">
      {appNavItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href)

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20",
              active && "bg-slate-950 text-white shadow-sm hover:bg-slate-950 hover:text-white"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="-mx-1 mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Primary navigation">
      {appNavItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href)

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm transition-colors",
              active && "border-slate-950 bg-slate-950 text-white"
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

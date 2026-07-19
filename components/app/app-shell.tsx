"use client"

import { useState } from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { AppBrand, DesktopNav, MobileNav, SidebarAutomationLaunchers } from "@/components/app/app-nav"
import { LogoutButton } from "@/components/app/logout-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail?: string | null
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const ToggleIcon = sidebarOpen ? PanelLeftClose : PanelLeftOpen

  return (
    <div className="min-h-dvh bg-[var(--op-surface)] text-slate-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-[17rem] border-r border-black/10 bg-white/85 p-4 shadow-[1px_0_0_rgba(15,23,42,0.03)] backdrop-blur transition-transform duration-300 ease-out lg:block",
          !sidebarOpen && "-translate-x-full"
        )}
      >
        <AppBrand />
        <DesktopNav />
        <SidebarAutomationLaunchers />
        <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          AI email, CRM, support, task, workflow, and report automations run through your workspace safety checks.
        </div>
      </aside>

      <div className={cn("transition-[padding] duration-300 ease-out", sidebarOpen && "lg:pl-[17rem]")}>
        <header className="sticky top-0 z-20 border-b border-black/10 bg-[var(--op-surface)]/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-tight">OpsPilot workspace</p>
              <p className="text-xs text-slate-500">{userEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((open) => !open)}
                className="hidden lg:inline-flex"
              >
                <ToggleIcon className="size-4" aria-hidden="true" />
              </Button>
              <LogoutButton />
            </div>
          </div>
          <MobileNav />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

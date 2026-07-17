import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { LogoutButton } from "@/components/app/logout-button"
import { AppBrand, DesktopNav, MobileNav } from "@/components/app/app-nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <div className="min-h-dvh bg-[var(--op-surface)] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-[17rem] border-r border-black/10 bg-white/85 p-4 shadow-[1px_0_0_rgba(15,23,42,0.03)] backdrop-blur lg:block">
        <AppBrand />
        <DesktopNav />
        <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          Internal actions are live. External adapters are running in mock mode.
        </div>
      </aside>
      <div className="lg:pl-[17rem]">
        <header className="sticky top-0 z-20 border-b border-black/10 bg-[var(--op-surface)]/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-tight">OpsPilot workspace</p>
              <p className="text-xs text-slate-500">{session.user.email}</p>
            </div>
            <LogoutButton />
          </div>
          <MobileNav />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

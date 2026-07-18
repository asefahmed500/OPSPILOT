import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AppShell } from "@/components/app/app-shell"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect("/login")
  }

  return <AppShell userEmail={session.user.email}>{children}</AppShell>
}

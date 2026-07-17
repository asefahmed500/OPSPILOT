"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  return (
    <Button variant="outline" className="bg-white" onClick={() => signOut({ callbackUrl: "/" })}>
      Log out
    </Button>
  )
}

"use client"

import Link from "next/link"
import { Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CursorTarget } from "@/components/landing/landing-motion"
import { navItems } from "@/components/landing/landing-data"

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-[#fbfaf6]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <CursorTarget>
          <Link href="/" className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-[#1a1a1a] text-white">
              <Bot className="size-4" />
            </span>
            OpsPilot AI
          </Link>
        </CursorTarget>
        <nav className="hidden items-center gap-6 text-sm text-[#5a5a5a] md:flex">
          {navItems.map(([href, label]) => (
            <CursorTarget key={href}>
              <a href={href}>{label}</a>
            </CursorTarget>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

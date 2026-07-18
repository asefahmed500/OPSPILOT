"use client"

import * as React from "react"

type Theme = "light" | "dark"

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeRef = React.useRef<Theme>("light")

  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem("opspilot-theme")
    const initialTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : getSystemTheme()

    themeRef.current = initialTheme
    applyTheme(initialTheme)
  }, [])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (typeof event.key !== "string" || event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      const nextTheme = themeRef.current === "dark" ? "light" : "dark"

      themeRef.current = nextTheme
      window.localStorage.setItem("opspilot-theme", nextTheme)
      applyTheme(nextTheme)

    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return children
}

export { ThemeProvider }

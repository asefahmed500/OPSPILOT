"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring } from "framer-motion"

type CursorMode = "default" | "interactive" | "text"

const CursorContext = createContext<((mode: CursorMode) => void) | null>(null)

export function useLandingCursor() {
  return useContext(CursorContext)
}

export function LandingExperience({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion()
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springX = useSpring(cursorX, { stiffness: 650, damping: 42 })
  const springY = useSpring(cursorY, { stiffness: 650, damping: 42 })
  const [mode, setMode] = useState<CursorMode>("default")
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        top: `${(index * 53) % 100}%`,
        size: 3 + (index % 5) * 2,
        delay: index * 0.18,
        duration: 7 + (index % 6),
      })),
    []
  )

  useEffect(() => {
    if (shouldReduceMotion) {
      return
    }

    function onPointerMove(event: PointerEvent) {
      cursorX.set(event.clientX)
      cursorY.set(event.clientY)
    }

    window.addEventListener("pointermove", onPointerMove)
    return () => window.removeEventListener("pointermove", onPointerMove)
  }, [cursorX, cursorY, shouldReduceMotion])

  return (
    <CursorContext.Provider value={setMode}>
      <div className="landing-snap relative min-h-screen overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          {particles.map((particle) => (
            <motion.span
              key={particle.id}
              className="absolute rounded-full bg-[#2c67f2]/20 shadow-[0_0_26px_rgba(44,103,242,0.28)]"
              style={{ left: particle.left, top: particle.top, width: particle.size, height: particle.size }}
              animate={shouldReduceMotion ? undefined : { y: [0, -26, 12, 0], x: [0, 12, -10, 0], opacity: [0.18, 0.55, 0.28, 0.18] }}
              transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
        {!shouldReduceMotion ? (
          <motion.div
            className={`landing-cursor pointer-events-none fixed left-0 top-0 z-[60] hidden backdrop-blur-md lg:block ${
              mode === "interactive"
                ? "landing-cursor-clickable -translate-x-1/2 -translate-y-1/2"
                : mode === "text"
                  ? "landing-cursor-text size-3 -translate-x-1.5 -translate-y-1.5"
                  : "landing-cursor-default size-9 -translate-x-4 -translate-y-4"
            }`}
            style={{ x: springX, y: springY }}
          >
            {mode === "interactive" ? (
              <>
                <span className="landing-cursor-wheel" />
                <span className="landing-cursor-click" />
              </>
            ) : null}
          </motion.div>
        ) : null}
        <div className="relative z-10">{children}</div>
      </div>
    </CursorContext.Provider>
  )
}

export function CursorTarget({ children, mode = "interactive", className = "" }: { children: ReactNode; mode?: CursorMode; className?: string }) {
  const setCursor = useLandingCursor()

  return (
    <span onMouseEnter={() => setCursor?.(mode)} onMouseLeave={() => setCursor?.("default")} className={className}>
      {children}
    </span>
  )
}

export const fadeInUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { delay, duration: 0.5 },
})

export const fadeInLeft = (delay = 0) => ({
  initial: { opacity: 0, x: -28 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { delay, duration: 0.5 },
})

export const fadeInRight = (delay = 0) => ({
  initial: { opacity: 0, x: 28 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { delay, duration: 0.5 },
})

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 })

  return <motion.div aria-hidden="true" className="fixed left-0 top-0 z-50 h-0.5 w-full origin-left bg-[#2c67f2]" style={{ scaleX }} />
}

export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  const setCursor = useLandingCursor()

  return (
    <motion.div
      onMouseEnter={() => setCursor?.("interactive")}
      onMouseLeave={() => setCursor?.("default")}
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`micro-card rounded-lg border border-white/55 bg-white/55 shadow-xl shadow-slate-900/5 backdrop-blur-md ${className}`}
    >
      {children}
    </motion.div>
  )
}

export function Magnetic({ children, className = "" }: { children: ReactNode; className?: string }) {
  const setCursor = useLandingCursor()

  return (
    <motion.div onMouseEnter={() => setCursor?.("interactive")} onMouseLeave={() => setCursor?.("default")} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`micro-button ${className}`}>
      {children}
    </motion.div>
  )
}

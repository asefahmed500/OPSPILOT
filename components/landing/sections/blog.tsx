"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, CheckCircle2, Clock3 } from "lucide-react"
import { CursorTarget, fadeInUp, GlassPanel } from "@/components/landing/landing-motion"

const articleSections = [
  {
    id: "ops-intake",
    label: "Intake",
    title: "1. Capture every operational request in one place",
    body: "OpsPilot treats leads, tickets, task requests, and workflow prompts as one operating stream. Instead of asking the team to remember where work came from, the system records context, source, urgency, and next action as soon as the request appears.",
  },
  {
    id: "ai-triage",
    label: "AI triage",
    title: "2. Let AI classify, summarize, and prepare the next step",
    body: "The assistant does not replace human judgment. It prepares the work: categorizing support issues, scoring lead intent, creating follow-up tasks, and drafting reports that the team can review before acting.",
  },
  {
    id: "workflow-loop",
    label: "Workflow loop",
    title: "3. Turn repeated work into reusable workflows",
    body: "Once a pattern repeats, OpsPilot converts it into a structured trigger and action plan. A new lead can create a CRM record, queue an email, assign an owner, and notify the team without scattering logic across tools.",
  },
  {
    id: "human-review",
    label: "Review",
    title: "4. Keep the human in control with activity history",
    body: "Every automated step writes back to the workspace activity feed. This makes the system auditable, easier to trust, and useful for small teams that need automation without losing visibility.",
  },
]

export function BlogSection() {
  const [activeId, setActiveId] = useState(articleSections[0].id)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible?.target.id) {
          setActiveId(visible.target.id)
        }
      },
      { rootMargin: "-30% 0px -45% 0px", threshold: [0.15, 0.35, 0.6] }
    )

    Object.values(sectionRefs.current).forEach((element) => {
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [])

  return (
    <section id="playbook" className="landing-section landing-section-scroll border-y border-black/5 bg-[#fbfaf6]/80 py-16 sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[280px_1fr] lg:gap-12">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <motion.div {...fadeInUp()} className="rounded-lg border border-white/70 bg-white/65 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-[#1a1a1a] text-white">
                <BookOpen className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">Ops playbook</p>
                <p className="text-xs text-[#8a8a8a]">5 min read</p>
              </div>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:gap-1 lg:overflow-visible lg:pb-0" aria-label="Article sections">
              {articleSections.map((section) => {
                const active = activeId === section.id

                return (
                  <CursorTarget key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={`flex min-h-10 shrink-0 items-center rounded-md px-3 text-sm transition ${
                        active ? "bg-[#2c67f2] text-white shadow-sm" : "text-[#5a5a5a] hover:bg-[#eaf1fe] hover:text-[#1d50d6]"
                      }`}
                    >
                      {section.label}
                    </a>
                  </CursorTarget>
                )
              })}
            </nav>
          </motion.div>
        </aside>

        <article className="min-w-0">
          <motion.div {...fadeInUp(0.08)} className="mb-8">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-[#5a5a5a]">
              <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/60 px-3 py-1 backdrop-blur">
                <Clock3 className="size-3.5 text-[#2c67f2]" />
                Operations guide
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/60 px-3 py-1 backdrop-blur">
                <CheckCircle2 className="size-3.5 text-[#16a34a]" />
                Built from the product workflow
              </span>
            </div>
            <h2 className="max-w-4xl text-[clamp(2rem,6vw,2.75rem)] font-bold leading-tight text-[#1a1a1a]">
              How an AI operations cockpit keeps small teams moving
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#5a5a5a] sm:text-lg sm:leading-8">
              A practical field guide for turning scattered customer work into a clean, reviewable operations loop.
            </p>
          </motion.div>

          <GlassPanel className="p-5 sm:p-8">
            <div className="space-y-10">
              {articleSections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  ref={(element) => {
                    sectionRefs.current[section.id] = element
                  }}
                  className="scroll-mt-28 border-b border-black/10 pb-10 last:border-b-0 last:pb-0"
                >
                  <motion.div {...fadeInUp(index * 0.05)}>
                    <p className="text-sm font-semibold text-[#2c67f2]">{section.label}</p>
                    <h3 className="mt-2 text-2xl font-bold leading-tight text-[#1a1a1a]">{section.title}</h3>
                    <p className="mt-4 text-base leading-8 text-[#5a5a5a]">{section.body}</p>
                    <div className="mt-5 rounded-md border border-[#e8e8eb] bg-[#fbfaf6] p-4 text-sm leading-6 text-[#5a5a5a]">
                      <span className="font-semibold text-[#1a1a1a]">OpsPilot pattern:</span>{" "}
                      {index === 0
                        ? "Normalize the request before assigning work."
                        : index === 1
                          ? "Use AI to prepare context, not hide the decision."
                          : index === 2
                            ? "Promote repeated behavior into a workflow."
                            : "Log every automated action for review."}
                    </div>
                  </motion.div>
                </section>
              ))}
            </div>
          </GlassPanel>
        </article>
      </div>
    </section>
  )
}

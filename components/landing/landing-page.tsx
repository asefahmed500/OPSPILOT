"use client"

import {
  ArchitectureSection,
  BlogSection,
  DashboardNoteSection,
  FeaturesSection,
  FinalCtaSection,
  HeroSection,
  JourneySection,
  LandingFooter,
  LandingHeader,
  PricingSection,
  ProblemSection,
  ScrollStoryStrip,
  SolutionSection,
} from "@/components/landing/landing-sections"
import { LandingExperience, ScrollProgress } from "@/components/landing/landing-motion"

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf6] text-[#1a1a1a]">
      <LandingExperience>
        <ScrollProgress />
        <LandingHeader />
        <HeroSection />
        <ScrollStoryStrip />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <JourneySection />
        <BlogSection />
        <DashboardNoteSection />
        <ArchitectureSection />
        <PricingSection />
        <FinalCtaSection />
        <LandingFooter />
      </LandingExperience>
    </main>
  )
}

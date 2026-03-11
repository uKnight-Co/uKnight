"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { LiveDemo } from "@/components/marketing/live-demo"

import { Manifesto } from "@/components/marketing/manifesto"
import { FeatureScroll } from "@/components/marketing/feature-scroll"
import { UKnightPlus } from "@/components/marketing/uknight-plus"
import { schools } from "@/data/schools"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center">
      <main className="w-full flex-1">
        {/* Transformative Hero Section */}
        <section className="relative overflow-hidden border-b bg-background pt-32 pb-16 md:pt-48 md:pb-32">
          {/* Ambient Background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-40" />

          <div className="container mx-auto relative z-10 px-4 md:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl text-center lg:text-left"
              >
                <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 mb-6">
                  <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                  Now live!
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                  The Connective Layer for <br />
                  <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                    University Students
                  </span>
                </h1>
                <p className="mt-6 text-lg text-muted-foreground sm:text-xl leading-relaxed">
                  Experience the <span className="text-amber-500 font-medium">spontaneity</span> of meeting new people, exclusively with your <span className="text-amber-500 font-medium">verified peers</span>. No bots, no strangers, just students.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full">
                  <Link href="/lobby" className="w-full sm:w-auto">
                    <Button size="lg" className="h-12 w-full px-8 text-base shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
                      Connect with .edu Email
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="h-12 w-full sm:w-auto px-8 text-base hover:bg-muted/50">
                    See how it works
                  </Button>
                </div>
              </motion.div>

              {/* Dynamic Live Demo Component */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative hidden lg:block"
              >
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 opacity-20 blur-xl" />
                <LiveDemo />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Social Proof Ticker */}
        <section className="border-b bg-muted/20 py-10">
          <div className="container mx-auto px-4 text-center md:px-8">
            <p className="mb-6 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trusted by students at</p>
            <div className="group overflow-hidden flex w-full">
              {/* To ensure a seamless scroll, we map the list enough times so it spans the width of the screen twice and animates by 50% */}
              <div className="flex w-max min-w-full animate-marquee shrink-0 gap-16 whitespace-nowrap opacity-50 grayscale transition-all group-hover:grayscale-0">
                {schools.map((uni) => (
                  <span key={uni.id} className="text-xl font-bold">{uni.shortName}</span>
                ))}
                {schools.map((uni) => (
                  <span key={`${uni.id}-dup`} className="text-xl font-bold">{uni.shortName}</span>
                ))}
                {schools.map((uni) => (
                  <span key={`${uni.id}-dup2`} className="text-xl font-bold">{uni.shortName}</span>
                ))}
                {schools.map((uni) => (
                  <span key={`${uni.id}-dup3`} className="text-xl font-bold">{uni.shortName}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Manifesto Section */}
        <Manifesto />

        {/* Feature Scroll Section */}
        <FeatureScroll />

        {/* uKnight+ Premium Section */}
        <UKnightPlus />


      </main>
    </div>
  )
}

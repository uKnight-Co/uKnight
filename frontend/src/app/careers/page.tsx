"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function CareersPage() {
    return (
        <div className="flex min-h-screen flex-col pt-20">
            <main className="container flex-1 px-4 py-20 md:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-auto max-w-2xl text-center"
                >
                    <Badge variant="outline" className="mb-4">We&apos;re Hiring</Badge>
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Join the Knights of the Round Table.</h1>
                    <p className="mt-6 text-lg text-muted-foreground">
                        Help us redefine how university students connect. We&apos;re looking for builders, dreamers, and night owls.
                    </p>
                </motion.div>

                <div className="mx-auto mt-16 max-w-3xl space-y-4">
                    {["Frontend Engineer (React/Next.js)", "Backend Engineer (Go/Node)", "Product Designer", "Growth Marketing Lead"].map((job) => (
                        <motion.div
                            key={job}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex items-center justify-between rounded-lg border p-6 transition-colors hover:bg-muted/50"
                        >
                            <div className="space-y-1">
                                <h3 className="font-semibold">{job}</h3>
                                <div className="flex gap-2 text-sm text-muted-foreground">
                                    <span>Remote</span>
                                    <span>•</span>
                                    <span>Full-time</span>
                                </div>
                            </div>
                            <Button variant="outline">Apply</Button>
                        </motion.div>
                    ))}
                </div>
            </main>
        </div>
    )
}

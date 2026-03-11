"use client"

import { motion } from "framer-motion"

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Main Content */}
            <main className="flex-1 pt-20">
                <section className="container px-4 py-20 md:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-auto max-w-3xl text-center"
                    >
                        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">We&apos;re Building the Digital Campus.</h1>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground">
                            uKnight is on a mission to restore the spontaneity of university life. In a world of scheduled Zoom calls and endless feeds, we&apos;re bringing back the magic of bumping into someone new on the quad.
                        </p>
                    </motion.div>
                </section>

                <section className="bg-muted/50 py-20">
                    <div className="container px-4 md:px-8">
                        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold">Student-First Security</h3>
                                <p className="text-muted-foreground">Exclusively for students with valid .edu emails. No bots, no strangers, just peers.</p>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold">Serendipitous Connection</h3>
                                <p className="text-muted-foreground">Our matching algorithm prioritizes cross-major and cross-year meets to expand your network.</p>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold">Privacy by Design</h3>
                                <p className="text-muted-foreground">Ephemeral chats. No recorded history. What happens on uKnight, stays on uKnight.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}

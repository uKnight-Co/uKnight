"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function ContactPage() {
    return (
        <div className="flex min-h-screen flex-col pt-20">
            <main className="container flex-1 px-4 py-20 md:px-8">
                <div className="grid gap-12 lg:grid-cols-2">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-4xl font-bold tracking-tight">Get in touch.</h1>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Have a question, feedback, or just want to say hi? We&apos;d love to hear from you.
                        </p>

                        <div className="mt-8 space-y-4">
                            <div>
                                <h3 className="font-semibold">Support</h3>
                                <p className="text-muted-foreground">help@uknight.edu</p>
                            </div>
                            <div>
                                <h3 className="font-semibold">Press</h3>
                                <p className="text-muted-foreground">press@uknight.edu</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl border bg-card p-8 shadow-sm"
                    >
                        <form className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" placeholder="you@university.edu" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" placeholder="What's this about?" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea id="message" placeholder="Tell us more..." className="min-h-[150px]" />
                            </div>
                            <Button className="w-full">Send Message</Button>
                        </form>
                    </motion.div>
                </div>
            </main>
        </div>
    )
}

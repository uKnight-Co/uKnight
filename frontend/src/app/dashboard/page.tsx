"use client"

import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import { Video, LogOut, ShieldCheck, Zap } from "lucide-react"

export default function DashboardPage() {
    const { user, signOut } = useAuth()

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Minimal Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <span className="text-primary">u</span>Knight
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground hidden sm:block">
                            {user?.email}
                        </div>
                        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 container max-w-5xl py-12 md:py-20 flex flex-col items-center justify-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-3xl space-y-8"
                >
                    <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 mb-4 cursor-default">
                        <span className="flex h-2 w-2 rounded-full bg-amber-500 mr-2"></span>
                        Verified Student
                    </div>

                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                        Welcome to the <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Connective Layer</span>
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        You're all set. Enter the lobby to start instantly connecting with verified peers from your university.
                    </p>

                    <div className="pt-8">
                        <Link href="/lobby">
                            <Button size="lg" className="h-16 px-12 text-lg shadow-xl shadow-amber-500/20 hover:scale-105 transition-all duration-300 group rounded-full relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <span className="relative z-10 flex items-center gap-3">
                                    <Video className="h-6 w-6" />
                                    Enter Lobby
                                </span>
                            </Button>
                        </Link>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 pt-16 text-left max-w-2xl mx-auto">
                        <div className="rounded-xl border bg-card p-6 shadow-sm">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">Verified Only</h3>
                            <p className="text-sm text-muted-foreground">Everyone you meet is a verified student with an official .edu email.</p>
                        </div>
                        <div className="rounded-xl border bg-card p-6 shadow-sm">
                            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                                <Zap className="h-5 w-5 text-amber-500" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">Instant Connections</h3>
                            <p className="text-sm text-muted-foreground">No swiping, no waiting. Instantly match for 1-on-1 video conversations.</p>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    )
}

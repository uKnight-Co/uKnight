"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Check, Star, Zap, Shield, Crown, Sparkles } from "lucide-react"

const features = [
    {
        name: "Advanced Filtering",
        description: "Filter by major, interests, and year level to find your perfect match.",
        icon: Zap,
    },
    {
        name: "Priority Matching",
        description: "Get seen first in the discovery pool and reduce wait times.",
        icon: Star,
    },
    {
        name: "Verified Badge",
        description: "Stand out with a premium gold badge on your profile.",
        icon: Shield,
    },
    {
        name: "Early Access",
        description: "Be the first to try new features and community events.",
        icon: Sparkles,
    },
]

export function UKnightPlus() {
    return (
        <section className="relative py-24 overflow-hidden bg-background">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="container relative z-10 px-4 md:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium mb-6"
                    >
                        <Crown className="w-4 h-4" />
                        Elevate Your Experience
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
                    >
                        Introducing <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent italic">uKnight+</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-muted-foreground"
                    >
                        The ultimate way to connect. More control, more visibility, and exclusive features for the most active students.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Free Tier */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative p-8 rounded-3xl border bg-card/50 backdrop-blur-sm"
                    >
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold mb-2">Basic</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold">$0</span>
                                <span className="text-muted-foreground">/month</span>
                            </div>
                            <p className="mt-4 text-muted-foreground italic">Standard access for all verified students.</p>
                        </div>

                        <ul className="space-y-4 mb-8">
                            {["Unlimited Conversations", "Verified Student Status", "Standard Matching"].map((item) => (
                                <li key={item} className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-primary" />
                                    </div>
                                    <span className="text-sm">{item}</span>
                                </li>
                            ))}
                            {["Advanced Filters", "Priority Queue", "Profile Themes"].map((item) => (
                                <li key={item} className="flex items-center gap-3 opacity-40">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className="text-sm line-through">{item}</span>
                                </li>
                            ))}
                        </ul>

                        <Button variant="outline" className="w-full h-12 rounded-xl" disabled>
                            Current Plan
                        </Button>
                    </motion.div>

                    {/* Premium Tier */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative p-0.5 rounded-3xl bg-gradient-to-b from-amber-400 to-amber-600 shadow-2xl shadow-amber-500/20"
                    >
                        <div className="relative h-full p-8 rounded-[22px] bg-background/90 dark:bg-background/95 backdrop-blur-sm overflow-hidden">
                            {/* Premium Glow Effect */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl" />

                            <div className="relative z-10">
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-2xl font-bold">uKnight+</h3>
                                        <span className="px-2 py-1 rounded-md bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider">Most Popular</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">$4.99</span>
                                        <span className="text-muted-foreground">/month</span>
                                    </div>
                                    <p className="mt-4 text-muted-foreground italic">Everything in Basic, plus more.</p>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {features.map((feature) => (
                                        <li key={feature.name} className="flex gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                <feature.icon className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{feature.name}</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-lg shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                    Get uKnight+
                                </Button>
                                <p className="mt-4 text-[10px] text-center text-muted-foreground">
                                    Secure payment powered by Stripe. Cancel anytime.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

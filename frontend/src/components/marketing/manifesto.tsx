"use client"

import { motion } from "framer-motion"

export function Manifesto() {
    return (
        <section className="py-20 md:py-48 bg-background overflow-hidden">
            <div className="container mx-auto px-4 md:px-8">
                <div className="max-w-4xl">
                    <h2 className="text-4xl md:text-8xl font-black tracking-tighter leading-[0.9]">
                        <motion.span
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="block"
                        >
                            WE ARE
                        </motion.span>
                        <motion.span
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="block text-muted-foreground"
                        >
                            BRINGING
                        </motion.span>
                        <motion.span
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="block"
                        >
                            SERENDIPITY
                        </motion.span>
                        <motion.span
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="block text-primary"
                        >
                            BACK.
                        </motion.span>
                    </h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="mt-12 text-xl md:text-2xl text-muted-foreground border-l-2 pl-6 border-primary max-w-2xl leading-relaxed"
                    >
                        Social media killed the spontaneous connection. We are rebuilding it.
                        No algorithms feeding you content. Just you, a stranger, and a moment in time.
                    </motion.p>
                </div>
            </div>
        </section>
    )
}

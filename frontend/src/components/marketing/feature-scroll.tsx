"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion"
import { ShieldCheck, Zap, Globe, Lock } from "lucide-react"

const features = [
    {
        title: "Real Students Only.",
        description: "Every user is verified via their .edu email. No bots, no randoms, just peers from your campus and beyond.",
        color: "bg-indigo-500",
        hex: "#6366f1",
    },
    {
        title: "Blink and You're There.",
        description: "Powered by WebRTC for sub-100ms latency. Skip the matching queues and get straight into the conversation.",
        color: "bg-yellow-500",
        hex: "#eab308",
    },
    {
        title: "Expand Your Bubble.",
        description: "Don't just stay in your dorm. Unlock connections with students from Harvard, MIT, Stanford, and 50+ other top universities.",
        color: "bg-blue-500",
        hex: "#3b82f6",
    },
    {
        title: "Ghost Mode Enabled.",
        description: "Zero message history. Zero recording. What happens on uKnight stays on uKnight. Ephemeral by design.",
        color: "bg-amber-500",
        hex: "#f59e0b",
    },
]

export function FeatureScroll() {
    const [activeFeature, setActiveFeature] = useState(0)
    const sectionRef = useRef<HTMLElement>(null)

    // Scroll progress for the entire feature section
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    })

    const rotateY = useTransform(scrollYProgress, [0, 0.5, 1], [12, 0, -12])
    const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [-6, 0, 6])

    return (
        <section ref={sectionRef} className="py-24 bg-background">
            <div className="container mx-auto px-4 md:px-8">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">

                    {/* Scrollable Text Content */}
                    <div className="w-full lg:w-1/2 order-2 lg:order-1">
                        {features.map((feature, index) => (
                            <FeatureText
                                key={index}
                                feature={feature}
                                index={index}
                                setActive={setActiveFeature}
                            />
                        ))}
                    </div>

                    {/* Sticky Visual - 3D Phone */}
                    <div className="hidden lg:block w-1/2 order-1 lg:order-2">
                        <div className="sticky top-24 h-[calc(100vh-12rem)] flex items-center justify-center"
                            style={{ perspective: "1200px" }}
                        >
                            {/* 3D Phone Container */}
                            <motion.div
                                style={{
                                    rotateY,
                                    rotateX,
                                    transformStyle: "preserve-3d",
                                }}
                                className="relative"
                            >
                                {/* Floating animation wrapper */}
                                <motion.div
                                    animate={{
                                        y: [0, -12, 0],
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                    className="relative"
                                    style={{ transformStyle: "preserve-3d" }}
                                >
                                    {/* Phone Body */}
                                    <div
                                        className="relative w-[280px] h-[580px] rounded-[3rem] overflow-hidden"
                                        style={{
                                            transformStyle: "preserve-3d",
                                            background: "linear-gradient(145deg, #2a2a2e 0%, #1a1a1e 50%, #0f0f12 100%)",
                                            boxShadow: `
                                                /* Outer shell */
                                                inset 0 1px 0 0 rgba(255,255,255,0.1),
                                                inset 0 -1px 0 0 rgba(0,0,0,0.3),
                                                inset 1px 0 0 0 rgba(255,255,255,0.05),
                                                inset -1px 0 0 0 rgba(255,255,255,0.05),
                                                /* Bezel depth */
                                                0 0 0 2px #1a1a1e,
                                                0 0 0 4px #2a2a2e,
                                                0 0 0 5px rgba(255,255,255,0.1)
                                            `,
                                        }}
                                    >
                                        {/* Dynamic Island / Notch */}
                                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
                                            <div
                                                className="w-28 h-7 bg-black rounded-full flex items-center justify-center gap-2"
                                                style={{
                                                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)"
                                                }}
                                            >
                                                {/* Camera */}
                                                <div className="w-3 h-3 rounded-full bg-zinc-900 ring-1 ring-zinc-700 relative overflow-hidden">
                                                    <div className="absolute inset-[2px] rounded-full bg-gradient-to-br from-blue-900/50 to-purple-900/50" />
                                                    <div className="absolute top-[1px] left-[1px] w-1 h-1 rounded-full bg-white/20" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Screen Inset (creates bezel effect) */}
                                        <div
                                            className="absolute inset-[6px] rounded-[2.6rem] overflow-hidden bg-background"
                                            style={{
                                                boxShadow: "inset 0 0 20px rgba(0,0,0,0.5), inset 0 0 2px rgba(0,0,0,0.8)",
                                            }}
                                        >
                                            {/* Background Pattern */}
                                            <div className="absolute inset-0 opacity-[0.03]"
                                                style={{
                                                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
                                                    backgroundSize: "20px 20px",
                                                }}
                                            />

                                            {/* Screen Content with AnimatePresence */}
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={activeFeature}
                                                    initial={{ opacity: 0, rotateY: -15, scale: 0.95, filter: "blur(4px)" }}
                                                    animate={{ opacity: 1, rotateY: 0, scale: 1, filter: "blur(0px)" }}
                                                    exit={{ opacity: 0, rotateY: 15, scale: 0.95, filter: "blur(4px)" }}
                                                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                                    className="w-full h-full flex items-center justify-center p-6"
                                                    style={{ transformStyle: "preserve-3d" }}
                                                >
                                                    {activeFeature === 0 && <VerifiedScreen />}
                                                    {activeFeature === 1 && <SpeedScreen />}
                                                    {activeFeature === 2 && <NetworkScreen />}
                                                    {activeFeature === 3 && <GhostScreen />}
                                                </motion.div>
                                            </AnimatePresence>

                                            {/* Screen edge glow matching feature color */}
                                            <motion.div
                                                className="absolute inset-0 pointer-events-none z-10 rounded-[2.6rem]"
                                                animate={{
                                                    boxShadow: `inset 0 0 60px ${features[activeFeature].hex}15, inset 0 0 120px ${features[activeFeature].hex}08`,
                                                }}
                                                transition={{ duration: 0.7 }}
                                            />

                                            {/* Home Indicator */}
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-20" />
                                        </div>

                                        {/* Screen Glare / Reflection */}
                                        <div
                                            className="absolute inset-[6px] rounded-[2.6rem] pointer-events-none z-20 overflow-hidden phone-glare"
                                        >
                                            <div
                                                className="absolute inset-0"
                                                style={{
                                                    background: `linear-gradient(
                                                        115deg,
                                                        transparent 0%,
                                                        transparent 30%,
                                                        rgba(255,255,255,0.03) 35%,
                                                        rgba(255,255,255,0.08) 40%,
                                                        rgba(255,255,255,0.03) 45%,
                                                        transparent 50%,
                                                        transparent 100%
                                                    )`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                </motion.div>
                            </motion.div>

                            {/* Ambient Glow — Large radial behind phone */}
                            <motion.div
                                className="absolute -z-10 rounded-full pointer-events-none"
                                style={{
                                    width: "500px",
                                    height: "700px",
                                }}
                                animate={{
                                    background: `radial-gradient(ellipse at center, ${features[activeFeature].hex}18 0%, ${features[activeFeature].hex}08 40%, transparent 70%)`,
                                    scale: [1, 1.05, 1],
                                }}
                                transition={{
                                    background: { duration: 0.7 },
                                    scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                                }}
                            />

                            {/* Secondary accent glow */}
                            <motion.div
                                className="absolute -z-10 rounded-full pointer-events-none"
                                style={{
                                    width: "300px",
                                    height: "300px",
                                    top: "-50px",
                                    right: "-50px",
                                    filter: "blur(80px)",
                                }}
                                animate={{
                                    backgroundColor: `${features[activeFeature].hex}12`,
                                }}
                                transition={{ duration: 0.7 }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function VerifiedScreen() {
    return (
        <div className="flex flex-col items-center gap-6">
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center ring-2 ring-green-500/20"
            >
                <ShieldCheck className="w-12 h-12 text-green-500" />
            </motion.div>
            <div className="text-center space-y-3">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "8rem" }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="h-4 bg-muted rounded mx-auto overflow-hidden"
                />
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "12rem" }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="h-3 bg-muted/50 rounded mx-auto overflow-hidden"
                />
            </div>
            <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                className="bg-green-500 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-green-500/30 flex items-center gap-2"
            >
                <ShieldCheck className="w-4 h-4" /> Verified Student
            </motion.div>
        </div>
    )
}

function SpeedScreen() {
    return (
        <div className="flex flex-col items-center gap-6 w-full">
            <div className="w-full space-y-4">
                <motion.div
                    initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 150 }}
                    className="flex items-center gap-3 bg-muted/50 p-3 rounded-xl w-[90%]"
                >
                    <div className="w-8 h-8 rounded-full bg-gray-300/20 animate-pulse" />
                    <div className="w-24 h-3 bg-gray-300/20 rounded animate-pulse" />
                </motion.div>
                <motion.div
                    initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 150 }}
                    className="flex items-center gap-3 bg-yellow-500/10 p-3 rounded-xl w-[90%] self-end ml-auto border border-yellow-500/20"
                >
                    <div className="w-24 h-3 bg-yellow-500/20 rounded" />
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-yellow-500" />
                    </div>
                </motion.div>
                <motion.div
                    initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
                    className="flex items-center gap-3 bg-muted/50 p-3 rounded-xl w-[75%]"
                >
                    <div className="w-8 h-8 rounded-full bg-gray-300/20" />
                    <div className="w-16 h-3 bg-gray-300/20 rounded" />
                </motion.div>
            </div>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-center"
            >
                <span className="text-xs text-muted-foreground font-mono tracking-wider">
                    Latency:{" "}
                </span>
                <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    className="text-green-500 font-bold font-mono text-sm"
                >
                    12ms
                </motion.span>
            </motion.div>
        </div>
    )
}

function NetworkScreen() {
    return (
        <div className="grid grid-cols-2 gap-4 w-full p-4 relative">
            <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                    animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                    className="w-32 h-32 border-2 border-blue-500/30 rounded-full"
                />
                <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                    className="absolute w-24 h-24 border border-blue-500/20 rounded-full"
                />
            </div>
            {[1, 2, 3, 4].map((i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: i * 0.12, type: "spring", stiffness: 200 }}
                    className="aspect-square bg-blue-500/5 rounded-2xl flex items-center justify-center border border-blue-500/10 backdrop-blur-sm relative overflow-hidden"
                >
                    <Globe className="w-8 h-8 text-blue-500" />
                    {/* Connection line */}
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: i * 0.12 + 0.3, duration: 0.4 }}
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"
                    />
                </motion.div>
            ))}
        </div>
    )
}

function GhostScreen() {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <motion.div
                animate={{
                    opacity: [1, 0.6, 0],
                    scale: [1, 1.05, 0.95],
                    filter: ["blur(0px)", "blur(2px)", "blur(10px)"],
                    y: [0, -5, -10],
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="bg-muted p-4 rounded-2xl max-w-[80%] text-center relative"
            >
                <p className="text-sm">This message will self-destruct...</p>
                {/* Dissolve particles */}
                <motion.div
                    animate={{ opacity: [0, 0.5, 0], x: [0, 20, 40], y: [0, -10, -20] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="absolute top-2 right-0 w-1 h-1 bg-muted-foreground/50 rounded-full"
                />
                <motion.div
                    animate={{ opacity: [0, 0.3, 0], x: [0, 15, 30], y: [0, -15, -25] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                    className="absolute top-4 right-1 w-1.5 h-1.5 bg-muted-foreground/30 rounded-full"
                />
            </motion.div>
            <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Lock className="w-8 h-8 text-muted-foreground/50" />
            </motion.div>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="text-[10px] text-muted-foreground/40 font-mono tracking-widest"
            >
                END-TO-END ENCRYPTED
            </motion.p>
        </div>
    )
}

function FeatureText({ feature, index, setActive }: { feature: typeof features[number], index: number, setActive: (i: number) => void }) {
    const ref = useRef(null)
    const isInView = useInView(ref, { margin: "-50% 0px -50% 0px" })

    useEffect(() => {
        if (isInView) {
            setActive(index)
        }
    }, [isInView, index, setActive])

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex min-h-[80vh] flex-col justify-center py-16"
        >
            {/* Mobile Icon */}
            <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${feature.color}/10 lg:hidden`}>
                <div className={`h-8 w-8 rounded-full ${feature.color}`} />
            </div>
            {/* Feature number indicator */}
            <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="text-sm font-mono text-muted-foreground/50 mb-4 tracking-widest"
            >
                0{index + 1}
            </motion.span>
            <h3 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
                {feature.title}
            </h3>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-md">
                {feature.description}
            </p>
            {/* Accent line */}
            <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mt-8 h-[2px] w-24 origin-left"
                style={{ backgroundColor: feature.hex }}
            />
        </motion.div>
    )
}

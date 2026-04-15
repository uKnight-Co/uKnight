"use client"

import { useState } from "react"
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Chrome, ArrowRight } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import AnimatedNetworkBg from "@/components/animated-network-bg"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const router = useRouter()
    const { setCustomLogin } = useAuth()

    const syncUserAndRedirect = async (user: User) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://uknight-backend-536429702801.us-central1.run.app" : "http://localhost:8080")
            const res = await fetch(`${apiUrl}/api/users/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email?.split("@")[0] || "Student",
                    profilePicture: user.photoURL,
                }),
            })

            if (res.ok) {
                const userData = await res.json()
                if (userData.verified) {
                    router.push("/lobby")
                } else {
                    router.push("/verify-email")
                }
            } else {
                setError("Failed to sync with database. Please try again.")
                await auth.signOut()
            }
        } catch (err) {
            console.warn("Backend sync failed:", err)
            setError("Cannot connect to server. Please ensure backend is running.")
            await auth.signOut()
        }
    }

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider()
            const result = await signInWithPopup(auth, provider)
            await syncUserAndRedirect(result.user)
        } catch (err) {
            setError("Failed to sign in with Google.")
            console.error(err)
        }
    }

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        // Try custom backend login first
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://uknight-backend-536429702801.us-central1.run.app" : "http://localhost:8080")
            const res = await fetch(`${apiUrl}/api/users/custom-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: email, password }),
            })

            if (res.ok) {
                const userData = await res.json()
                setCustomLogin({
                    uid: userData.userId,
                    email: userData.email,
                    displayName: userData.displayName,
                    photoURL: userData.profilePicture,
                }, userData.verified || false)

                if (userData.verified) {
                    router.push("/lobby")
                } else {
                    router.push("/verify-email")
                }
                return;
            }
        } catch {
            // Backend custom login failed, fallback to Firebase
        }

        // Fallback to purely Firebase Email/Password
        try {
            const result = await signInWithEmailAndPassword(auth, email, password)
            await syncUserAndRedirect(result.user)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Invalid username/email or password."
            setError(message)
            console.error(err)
        }
    }

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <AnimatedNetworkBg />

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 mx-auto w-full max-w-[420px] px-4"
            >
                {/* Logo/Header */}
                <div className="mb-8 text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="flex justify-center"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/uKnight_Icon.png"
                            alt="uKnight Logo"
                            className="h-24 w-24 object-contain drop-shadow-lg drop-shadow-amber-500/50"
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/UKnightText.png"
                            alt="uKnight"
                            className="h-16 mx-auto drop-shadow-lg"
                        />
                    </motion.div>
                </div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="rounded-2xl border border-amber-500/20 bg-slate-900/40 shadow-2xl shadow-amber-500/10 backdrop-blur-xl p-8"
                >
                    <div className="grid gap-6">
                        <div className="grid gap-2 text-center">
                            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                            <p className="text-sm text-slate-400">
                                Sign in to your account to continue
                            </p>
                        </div>

                        {/* Google Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Button
                                variant="outline"
                                className="w-full bg-white/5 border-amber-500/30 hover:bg-white/10 hover:border-amber-500/50 text-white transition-all duration-200 group"
                                onClick={handleGoogleLogin}
                            >
                                <Chrome className="mr-2 h-4 w-4 text-amber-400" />
                                Continue with Google
                                <ArrowRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </motion.div>

                        {/* Divider */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="relative"
                        >
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-amber-500/20" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-slate-900/40 px-2 text-amber-300/60 uppercase tracking-wide font-medium">
                                    Or continue with email
                                </span>
                            </div>
                        </motion.div>

                        {/* Form */}
                        <motion.form
                            onSubmit={handleEmailLogin}
                            className="grid gap-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <div className="grid gap-2">
                                <label htmlFor="email" className="text-xs font-semibold text-amber-300/80 uppercase tracking-wide">
                                    Username or Email
                                </label>
                                <Input
                                    id="email"
                                    type="text"
                                    placeholder="knight@university.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-white/5 border-amber-500/20 hover:border-amber-500/40 focus:border-amber-500/60 focus:ring-amber-500/20 text-white placeholder:text-slate-500"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="password" className="text-xs font-semibold text-amber-300/80 uppercase tracking-wide">
                                    Password
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-white/5 border-amber-500/20 hover:border-amber-500/40 focus:border-amber-500/60 focus:ring-amber-500/20 text-white placeholder:text-slate-500"
                                    required
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-lg bg-red-500/10 border border-red-500/30 p-3"
                                >
                                    <p className="text-sm text-red-400">{error}</p>
                                </motion.div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold transition-all duration-200 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 group mt-2"
                            >
                                Sign In
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </motion.form>
                    </div>
                </motion.div>

                {/* Signup Link */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-6 text-center text-sm"
                >
                    <span className="text-slate-400">Don&apos;t have an account? </span>
                    <Link
                        href="/signup"
                        className="font-semibold text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2"
                    >
                        Sign up here
                    </Link>
                </motion.div>

                {/* Bottom accent */}
                <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="mt-8 h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-transparent via-amber-500 to-transparent"
                />
            </motion.div>
        </div>
    )
}

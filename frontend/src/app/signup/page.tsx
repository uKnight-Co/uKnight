"use client"

import { useState } from "react"
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Chrome } from "lucide-react"

export default function SignupPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const router = useRouter()

    const syncUserAndRedirect = async (user: User) => {
        try {
            // const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
            const apiUrl = "https://uknight-backend-536429702801.us-central1.run.app"
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
                setError("Failed to register with database. Please try again.")
                await auth.signOut()
            }
        } catch (err) {
            console.warn("Backend sync failed:", err)
            setError("Cannot connect to server. Please ensure backend is running.")
            await auth.signOut()
        }
    }

    const handleGoogleSignup = async () => {
        try {
            const provider = new GoogleAuthProvider()
            const result = await signInWithPopup(auth, provider)
            await syncUserAndRedirect(result.user)
        } catch (err) {
            setError("Failed to sign up with Google.")
            console.error(err)
        }
    }

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password)
            await syncUserAndRedirect(result.user)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create account.")
        }
    }

    return (
        <div className="flex min-h-screen w-full lg:grid lg:grid-cols-2">
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[350px] gap-6">
                    <div className="grid gap-2 text-center">
                        <h1 className="text-3xl font-bold">Sign Up</h1>
                        <p className="text-balance text-muted-foreground">
                            Enter your information to create an account
                        </p>
                    </div>
                    <div className="grid gap-4">
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignup}>
                            <Chrome className="mr-2 h-4 w-4" />
                            Sign up with Google
                        </Button>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>
                        <form onSubmit={handleEmailSignup} className="grid gap-4">
                            <div className="grid gap-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" className="w-full">
                                Create Account
                            </Button>
                        </form>
                    </div>
                    <div className="mt-4 text-center text-sm">
                        Already have an account?{" "}
                        <Link href="/login" className="underline">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
            <div className="hidden bg-muted lg:block">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="h-full w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-background to-background"
                />
            </div>
        </div>
    )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, ShieldCheck, ArrowRight, Loader2, CheckCircle2, RefreshCw } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, serverTimestamp, Timestamp, deleteDoc, doc } from "firebase/firestore"

export default function VerifyEmailPage() {
    const { user } = useAuth()
    const backendUserId = user?.backendUid || user?.uid
    const router = useRouter()

    const [step, setStep] = useState<"enter-email" | "enter-otp" | "verified">("enter-email")
    const [schoolEmail, setSchoolEmail] = useState("")
    const [otp, setOtp] = useState(["", "", "", "", "", ""])
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [checkingVerification, setCheckingVerification] = useState(true)
    const otpRefs = useRef<(HTMLInputElement | null)[]>([])

    // Check if user is already verified on mount
    useEffect(() => {
        if (!backendUserId) {
            setCheckingVerification(false)
            return
        }

        const checkVerified = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://uknight-backend-536429702801.us-central1.run.app" : "http://localhost:8080")
                const res = await fetch(`${apiUrl}/api/users/${backendUserId}`)
                if (res.ok) {
                    const userData = await res.json()
                    if (userData.verified) {
                        router.push("/lobby")
                        return
                    }
                }
            } catch (err) {
                console.error("Error checking verification:", err)
            }
            setCheckingVerification(false)
        }

        checkVerified()
    }, [backendUserId, router])

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    const generateOTP = () => {
        return Math.floor(100000 + Math.random() * 900000).toString()
    }

    const sendOTP = async () => {
        if (!schoolEmail.endsWith(".edu")) {
            setError("Please use a valid .edu email address.")
            return
        }

        if (!user) {
            setError("You must be logged in to verify your email.")
            return
        }

        setLoading(true)
        setError("")

        try {
            const otpCode = generateOTP()

            // Delete any existing verification codes for this user
            const existingCodes = await getDocs(
                query(collection(db, "verification_codes"), where("userId", "==", user.uid))
            )
            for (const docSnap of existingCodes.docs) {
                await deleteDoc(doc(db, "verification_codes", docSnap.id))
            }

            // Store the OTP in verification_codes collection
            await addDoc(collection(db, "verification_codes"), {
                userId: user.uid,
                email: schoolEmail,
                code: otpCode,
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)), // 10 min expiry
            })

            // Write to the 'mail' collection — Trigger Email extension picks this up
            await addDoc(collection(db, "mail"), {
                to: schoolEmail,
                message: {
                    subject: "Your uKnight verification code",
                    text: `uKnight email verification\n\nYour verification code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, you can ignore this message.`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
                            <h1 style="font-size: 24px; margin: 0 0 8px 0;">uKnight</h1>
                            <p style="font-size: 14px; margin: 0 0 20px 0; color: #444;">Email verification</p>

                            <p style="font-size: 15px; margin: 0 0 12px 0;">Your verification code is:</p>
                            <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; font-family: monospace; margin: 0 0 20px 0;">${otpCode}</div>

                            <p style="font-size: 14px; margin: 0; color: #444;">This code expires in 10 minutes.</p>
                            <p style="font-size: 14px; margin: 8px 0 0 0; color: #444;">If you did not request this code, you can ignore this message.</p>
                        </div>
                    `,
                },
            })

            setStep("enter-otp")
            setResendCooldown(60) // 60 second cooldown
        } catch (err) {
            console.error("Error sending OTP:", err)
            setError("Failed to send verification email. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const verifyOTP = async () => {
        const otpCode = otp.join("")
        if (otpCode.length !== 6) {
            setError("Please enter the full 6-digit code.")
            return
        }

        if (!user) return

        setLoading(true)
        setError("")

        try {
            // Check the OTP in Firestore
            const codesQuery = query(
                collection(db, "verification_codes"),
                where("userId", "==", user.uid),
                where("code", "==", otpCode)
            )
            const snapshot = await getDocs(codesQuery)

            if (snapshot.empty) {
                setError("Invalid code. Please check and try again.")
                setLoading(false)
                return
            }

            const codeDoc = snapshot.docs[0].data()

            // Check expiration
            const expiresAt = codeDoc.expiresAt?.toDate?.() || new Date(0)
            if (new Date() > expiresAt) {
                setError("Code has expired. Please request a new one.")
                setLoading(false)
                return
            }

            // Mark user as verified in the backend
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://uknight-backend-536429702801.us-central1.run.app" : "http://localhost:8080")
            const res = await fetch(`${apiUrl}/api/users/${backendUserId}/verify`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    verified: true,
                    schoolEmail: schoolEmail,
                }),
            })

            if (!res.ok) {
                throw new Error("Failed to update verification status on server")
            }

            // Clean up the verification code
            for (const docSnap of snapshot.docs) {
                await deleteDoc(doc(db, "verification_codes", docSnap.id))
            }

            setStep("verified")

            // Redirect after a brief victory moment
            setTimeout(() => {
                router.push("/lobby")
            }, 2000)
        } catch (err) {
            console.error("Error verifying OTP:", err)
            setError("Verification failed. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return

        const newOtp = [...otp]
        newOtp[index] = value.slice(-1)
        setOtp(newOtp)

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus()
        }
    }

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus()
        }
        if (e.key === "Enter" && otp.join("").length === 6) {
            verifyOTP()
        }
    }

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
        if (pasted.length === 6) {
            setOtp(pasted.split(""))
            otpRefs.current[5]?.focus()
        }
    }

    if (checkingVerification) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user) {
        router.push("/login")
        return null
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="rounded-2xl border bg-card p-8 shadow-2xl">
                    {/* Progress indicator */}
                    <div className="mb-8 flex items-center justify-center gap-3">
                        <div className={`h-2 w-2 rounded-full transition-colors ${step === "enter-email" ? "bg-primary scale-125" : "bg-primary"}`} />
                        <div className={`h-0.5 w-12 transition-colors ${step !== "enter-email" ? "bg-primary" : "bg-muted"}`} />
                        <div className={`h-2 w-2 rounded-full transition-colors ${step === "enter-otp" ? "bg-primary scale-125" : step === "verified" ? "bg-primary" : "bg-muted"}`} />
                        <div className={`h-0.5 w-12 transition-colors ${step === "verified" ? "bg-primary" : "bg-muted"}`} />
                        <div className={`h-2 w-2 rounded-full transition-colors ${step === "verified" ? "bg-emerald-500 scale-125" : "bg-muted"}`} />
                    </div>

                    <AnimatePresence mode="wait">
                        {step === "enter-email" && (
                            <motion.div
                                key="enter-email"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                                        <Mail className="h-7 w-7 text-primary" />
                                    </div>
                                    <h1 className="text-2xl font-bold tracking-tight">Verify Your Student Email</h1>
                                    <p className="text-sm text-muted-foreground">
                                        Enter your <span className="font-medium text-amber-500">.edu</span> email to verify you&apos;re a student.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <Input
                                        type="email"
                                        placeholder="yourname@university.edu"
                                        value={schoolEmail}
                                        onChange={(e) => { setSchoolEmail(e.target.value); setError("") }}
                                        className="h-12 text-base"
                                    />
                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-sm text-red-500"
                                        >
                                            {error}
                                        </motion.p>
                                    )}
                                    <Button
                                        onClick={sendOTP}
                                        disabled={loading || !schoolEmail}
                                        className="w-full h-12 text-base font-medium"
                                    >
                                        {loading ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>Send Verification Code <ArrowRight className="ml-2 h-4 w-4" /></>
                                        )}
                                    </Button>
                                </div>

                                <p className="text-center text-xs text-muted-foreground">
                                    We&apos;ll send a 6-digit code to your school email.
                                </p>
                            </motion.div>
                        )}

                        {step === "enter-otp" && (
                            <motion.div
                                key="enter-otp"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
                                        <ShieldCheck className="h-7 w-7 text-amber-500" />
                                    </div>
                                    <h1 className="text-2xl font-bold tracking-tight">Enter Verification Code</h1>
                                    <p className="text-sm text-muted-foreground">
                                        We sent a code to <span className="font-medium text-foreground">{schoolEmail}</span>
                                    </p>
                                </div>

                                <div className="flex justify-center gap-2">
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => { otpRefs.current[i] = el }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            onPaste={i === 0 ? handleOtpPaste : undefined}
                                            className="h-14 w-12 rounded-xl border bg-background text-center text-xl font-bold transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    ))}
                                </div>

                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-red-500 text-center"
                                    >
                                        {error}
                                    </motion.p>
                                )}

                                <Button
                                    onClick={verifyOTP}
                                    disabled={loading || otp.join("").length !== 6}
                                    className="w-full h-12 text-base font-medium"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>Verify <CheckCircle2 className="ml-2 h-4 w-4" /></>
                                    )}
                                </Button>

                                <div className="flex items-center justify-between text-sm">
                                    <button
                                        onClick={() => { setStep("enter-email"); setOtp(["", "", "", "", "", ""]); setError("") }}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Change email
                                    </button>
                                    <button
                                        onClick={sendOTP}
                                        disabled={resendCooldown > 0 || loading}
                                        className="text-primary hover:text-primary/80 disabled:text-muted-foreground transition-colors flex items-center gap-1"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === "verified" && (
                            <motion.div
                                key="verified"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6 text-center py-4"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10"
                                >
                                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                </motion.div>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight text-emerald-500">Verified!</h1>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Welcome to uKnight. Redirecting to lobby...
                                    </p>
                                </div>
                                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    )
}

"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter, usePathname } from "next/navigation"

const PUBLIC_PATHS = ["/", "/login", "/signup", "/about", "/careers", "/contact", "/legal/privacy", "/legal/terms", "/verify-email"]

interface AuthContextType {
    user: User | null
    loading: boolean
    isVerified: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isVerified: false,
    signOut: async () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [isVerified, setIsVerified] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)

            if (firebaseUser) {
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
                    const res = await fetch(`${apiUrl}/api/users/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Student",
                            profilePicture: firebaseUser.photoURL,
                            verified: false, // Don't auto-set verified here; let the OTP flow handle it
                        }),
                    })

                    if (res.ok) {
                        const userData = await res.json()
                        setIsVerified(userData.verified || false)
                    }
                } catch {
                    // Backend sync is best-effort
                }
            } else {
                setIsVerified(false)
            }

            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    useEffect(() => {
        if (loading) return

        if (!user && !PUBLIC_PATHS.includes(pathname)) {
            router.push("/login")
        } else if (user && !isVerified && pathname === "/lobby") {
            // If user is logged in but not verified and trying to access lobby, redirect to verify
            router.push("/verify-email")
        }
    }, [user, loading, isVerified, pathname, router])

    const signOut = async () => {
        await firebaseSignOut(auth)
        setIsVerified(false)
        router.push("/login")
    }

    return (
        <AuthContext.Provider value={{ user, loading, isVerified, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)

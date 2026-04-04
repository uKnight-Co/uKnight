"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter, usePathname } from "next/navigation"

const PUBLIC_PATHS = ["/", "/login", "/signup", "/about", "/careers", "/contact", "/legal/privacy", "/legal/terms", "/verify-email"]

interface SessionUser {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
}

interface AuthContextType {
    user: SessionUser | null
    loading: boolean
    isVerified: boolean
    signOut: () => Promise<void>
    setCustomLogin: (userData: SessionUser, verified: boolean) => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isVerified: false,
    signOut: async () => { },
    setCustomLogin: () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [isVerified, setIsVerified] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    // Helper to allow custom frontend logins
    const setCustomLogin = (userData: SessionUser, verified: boolean) => {
        localStorage.setItem("uknight_custom_user", JSON.stringify(userData))
        localStorage.setItem("uknight_custom_verified", String(verified))
        setUser(userData)
        setIsVerified(verified)
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)

            if (firebaseUser) {
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                })
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://uknight-backend-536429702801.us-central1.run.app" : "http://localhost:8080")
                    const res = await fetch(`${apiUrl}/api/users/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Student",
                            profilePicture: firebaseUser.photoURL,
                            verified: false,
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
                // Before giving up, check if there's a custom local user
                const customUserStr = localStorage.getItem("uknight_custom_user")
                if (customUserStr) {
                    try {
                        const customUser = JSON.parse(customUserStr)
                        setUser(customUser)
                        setIsVerified(localStorage.getItem("uknight_custom_verified") === "true")
                    } catch {
                        setIsVerified(false)
                    }
                } else {
                    setIsVerified(false)
                }
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
        localStorage.removeItem("uknight_custom_user")
        localStorage.removeItem("uknight_custom_verified")
        setUser(null)
        setIsVerified(false)
        router.push("/login")
    }

    return (
        <AuthContext.Provider value={{ user, loading, isVerified, signOut, setCustomLogin }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)

"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter, usePathname } from "next/navigation"

interface AuthContextType {
    user: User | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user)
            setLoading(false)

            if (user) {
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
                    await fetch(`${apiUrl}/api/users/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: user.uid,
                            email: user.email,
                            displayName: user.displayName || user.email?.split("@")[0] || "Student",
                            profilePicture: user.photoURL,
                            verified: user.email?.endsWith(".edu") || false,
                        }),
                    })
                } catch {
                    // Backend sync is best-effort
                }
            }
        })

        return () => unsubscribe()
    }, [])

    const publicPaths = ["/", "/login", "/signup", "/about", "/careers", "/contact", "/legal/privacy", "/legal/terms"]

    useEffect(() => {
        if (!loading && !user && !publicPaths.includes(pathname)) {
            router.push("/login")
        }
    }, [user, loading, pathname, router])

    const signOut = async () => {
        await firebaseSignOut(auth)
        router.push("/login")
    }

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)

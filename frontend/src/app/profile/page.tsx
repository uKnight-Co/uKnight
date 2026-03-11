"use client"

import { useAuth } from "@/context/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { GraduationCap, Clock, User as UserIcon, Calendar, Settings, Heart } from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { PreferencesSelector } from "@/components/preferences-selector"
import { toast } from "sonner"

interface UserData {
    numPeopleMet: number
    timeSpentMinutes: number
    createdAt: string | null
    preferences: string | null
}

function formatTimeSpent(minutes: number): string {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remaining = minutes % 60
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}

function formatJoinDate(isoDate: string | null): string {
    if (!isoDate) return "Unknown"
    const date = new Date(isoDate)
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function parsePreferences(raw: string | null): string[] {
    if (!raw || raw.trim() === "") return []
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return raw.split(",").map((s) => s.trim()).filter(Boolean)
    }
}

export default function ProfilePage() {
    const { user } = useAuth()
    const [userData, setUserData] = useState<UserData | null>(null)
    const [preferences, setPreferences] = useState<string[]>([])
    const [savingPrefs, setSavingPrefs] = useState(false)

    useEffect(() => {
        if (!user?.uid) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
        fetch(`${apiUrl}/api/users/${user.uid}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    setUserData({
                        numPeopleMet: data.numPeopleMet ?? 0,
                        timeSpentMinutes: data.timeSpentMinutes ?? 0,
                        createdAt: data.createdAt ?? null,
                        preferences: data.preferences ?? null,
                    })
                    setPreferences(parsePreferences(data.preferences))
                }
            })
            .catch((err) => console.error("Failed to fetch user data:", err))
    }, [user?.uid])

    const handleSavePreferences = async (newPrefs: string[]) => {
        if (!user?.uid) return
        setSavingPrefs(true)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
            const res = await fetch(`${apiUrl}/api/users/${user.uid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.uid,
                    email: user.email,
                    preferences: JSON.stringify(newPrefs),
                }),
            })

            if (res.ok) {
                setPreferences(newPrefs)
                toast.success("Passions updated!")
            } else {
                toast.error("Failed to save passions.")
            }
        } catch {
            toast.error("Could not reach server.")
        } finally {
            setSavingPrefs(false)
        }
    }

    if (!user) return null

    const stats = [
        { label: "People Met", value: userData ? String(userData.numPeopleMet) : "—", icon: UserIcon },
        { label: "Time Chatted", value: userData ? formatTimeSpent(userData.timeSpentMinutes) : "—", icon: Clock },
        { label: "Joined", value: userData ? formatJoinDate(userData.createdAt) : "—", icon: Calendar },
    ]

    return (
        <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col items-center px-4 py-10 pt-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-8"
            >
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                        <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                            <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                            <AvatarFallback className="text-4xl">
                                {user.displayName?.charAt(0) || user.email?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 rounded-full bg-background p-1">
                            <div className="rounded-full bg-green-500 p-2 text-white">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold">{user.displayName || "Student"}</h1>
                        <p className="text-muted-foreground">{user.email}</p>
                    </div>

                    <Badge variant="secondary" className="px-4 py-1 text-sm">
                        Verified Student
                    </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {stats.map((stat) => (
                        <Card key={stat.label}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {stat.label}
                                </CardTitle>
                                <stat.icon className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="flex items-center gap-2">
                            <Heart className="h-5 w-5 text-primary" />
                            Passions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PreferencesSelector
                            selected={preferences}
                            onSave={handleSavePreferences}
                            saving={savingPrefs}
                        />
                        <p className="mt-3 text-xs text-muted-foreground">
                            Your passions help us match you with students who share your interests.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Account Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Manage your profile, preferences, and account settings.
                        </p>
                        <Link href="/settings">
                            <Button variant="outline" size="sm">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}

"use client"

import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { motion } from "framer-motion"
import { Save, Moon, Sun, Monitor, LogOut } from "lucide-react"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

interface UserSettings {
    displayName: string
    universityName: string
    schoolYear: string
    showUsername: boolean
}

export default function SettingsPage() {
    const { user, signOut } = useAuth()
    const { theme, setTheme } = useTheme()
    const [settings, setSettings] = useState<UserSettings>({
        displayName: "",
        universityName: "",
        schoolYear: "",
        showUsername: true,
    })
    const [saving, setSaving] = useState(false)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        if (!user?.uid) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
        fetch(`${apiUrl}/api/users/${user.uid}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    setSettings({
                        displayName: data.displayName || user.displayName || "",
                        universityName: data.universityName || "",
                        schoolYear: data.schoolYear || "",
                        showUsername: data.showUsername ?? true,
                    })
                } else {
                    setSettings((prev) => ({
                        ...prev,
                        displayName: user.displayName || "",
                    }))
                }
                setLoaded(true)
            })
            .catch(() => {
                setSettings((prev) => ({
                    ...prev,
                    displayName: user.displayName || "",
                }))
                setLoaded(true)
            })
    }, [user?.uid, user?.displayName])

    const handleSave = async () => {
        if (!user?.uid) return
        setSaving(true)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
            const res = await fetch(`${apiUrl}/api/users/${user.uid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.uid,
                    email: user.email,
                    displayName: settings.displayName,
                    universityName: settings.universityName,
                    schoolYear: settings.schoolYear,
                    showUsername: settings.showUsername,
                }),
            })

            if (res.ok) {
                toast.success("Settings saved successfully!")
            } else {
                toast.error("Failed to save settings. Please try again.")
            }
        } catch {
            toast.error("Could not reach the server. Please try again later.")
        } finally {
            setSaving(false)
        }
    }

    if (!user) return null
    if (!loaded) {
        return (
            <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
                <p className="text-muted-foreground">Loading settings...</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-2xl flex-col items-center py-10 pt-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-6"
            >
                <h1 className="text-3xl font-bold">Settings</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                value={settings.displayName}
                                onChange={(e) =>
                                    setSettings((s) => ({ ...s, displayName: e.target.value }))
                                }
                                placeholder="Your display name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="university">University</Label>
                            <Input
                                id="university"
                                value={settings.universityName}
                                onChange={(e) =>
                                    setSettings((s) => ({ ...s, universityName: e.target.value }))
                                }
                                placeholder="e.g. University of Central Florida"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="schoolYear">School Year</Label>
                            <Select
                                value={settings.schoolYear}
                                onValueChange={(val) =>
                                    setSettings((s) => ({ ...s, schoolYear: val }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Freshman">Freshman</SelectItem>
                                    <SelectItem value="Sophomore">Sophomore</SelectItem>
                                    <SelectItem value="Junior">Junior</SelectItem>
                                    <SelectItem value="Senior">Senior</SelectItem>
                                    <SelectItem value="Graduate">Graduate</SelectItem>
                                    <SelectItem value="Alumni">Alumni</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Show Username in Lobby</Label>
                                <p className="text-sm text-muted-foreground">
                                    Display your name to other users during video chat
                                </p>
                            </div>
                            <Button
                                variant={settings.showUsername ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                    setSettings((s) => ({ ...s, showUsername: !s.showUsername }))
                                }
                            >
                                {settings.showUsername ? "On" : "Off"}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Theme</Label>
                                <p className="text-sm text-muted-foreground">
                                    Choose your preferred appearance
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant={theme === "light" ? "default" : "outline"}
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={() => setTheme("light")}
                                >
                                    <Sun className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={theme === "dark" ? "default" : "outline"}
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={() => setTheme("dark")}
                                >
                                    <Moon className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={theme === "system" ? "default" : "outline"}
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={() => setTheme("system")}
                                >
                                    <Monitor className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-3">
                    <Button onClick={handleSave} disabled={saving} className="flex-1">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>

                <Card className="border-red-500/20">
                    <CardHeader>
                        <CardTitle className="text-red-500">Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Sign Out</p>
                                <p className="text-sm text-muted-foreground">
                                    Sign out of your account on this device
                                </p>
                            </div>
                            <Button variant="destructive" size="sm" onClick={signOut}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}

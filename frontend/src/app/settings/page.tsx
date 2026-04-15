"use client"

import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { Save, Moon, Sun, Monitor, LogOut, User, Palette, Sparkles, Shield, Eye, EyeOff, GraduationCap, Building2, AtSign, Lock, ArrowRight, Check } from "lucide-react"
import InterestsPicker from "@/components/interests-picker"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

interface UserSettings {
    displayName: string
    universityName: string
    schoolYear: string
    showUsername: boolean
    interests: string[]
    username?: string
    password?: string
}

type Section = "profile" | "appearance" | "interests" | "account"

const SECTIONS = [
    { id: "profile" as Section, label: "Profile", icon: User, description: "Your name, university & interests" },
    { id: "appearance" as Section, label: "Appearance", icon: Palette, description: "Theme & visibility settings" },
    { id: "interests" as Section, label: "Interests", icon: Sparkles, description: "Customize your matchmaking" },
    { id: "account" as Section, label: "Account", icon: Shield, description: "Security & sign out" },
]

export default function SettingsPage() {
    const { user, signOut } = useAuth()
    const backendUserId = user?.backendUid || user?.uid
    const { theme, setTheme } = useTheme()
    const [activeSection, setActiveSection] = useState<Section>("profile")
    const [settings, setSettings] = useState<UserSettings>({
        displayName: "",
        universityName: "",
        schoolYear: "",
        showUsername: true,
        interests: [],
        username: "",
        password: "",
    })
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [originalSettings, setOriginalSettings] = useState<UserSettings | null>(null)

    useEffect(() => {
        if (!backendUserId) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://uknight-backend-536429702801.us-central1.run.app" : "http://localhost:8080")
        fetch(`${apiUrl}/api/users/${backendUserId}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                const loaded: UserSettings = data ? {
                    displayName: data.displayName || user?.displayName || "",
                    universityName: data.universityName || "",
                    schoolYear: data.schoolYear || "",
                    showUsername: data.showUsername ?? true,
                    interests: data.interests || [],
                    username: data.username || "",
                    password: "",
                } : {
                    displayName: user?.displayName || "",
                    universityName: "",
                    schoolYear: "",
                    showUsername: true,
                    interests: [],
                    username: "",
                    password: "",
                }
                setSettings(loaded)
                setOriginalSettings(loaded)
                setLoaded(true)
            })
            .catch(() => {
                const fallback: UserSettings = { displayName: user?.displayName || "", universityName: "", schoolYear: "", showUsername: true, interests: [], username: "", password: "" }
                setSettings(fallback)
                setOriginalSettings(fallback)
                setLoaded(true)
            })
    }, [backendUserId, user?.displayName])

    useEffect(() => {
        if (!originalSettings) return
        const changed = JSON.stringify({ ...settings, password: "" }) !== JSON.stringify({ ...originalSettings, password: "" }) || (settings.password || "").length > 0
        setHasChanges(changed)
    }, [settings, originalSettings])

    const handleSave = async () => {
        if (!backendUserId) return
        setSaving(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://uknight-backend-536429702801.us-central1.run.app" : "http://localhost:8080")
            const payload = {
                displayName: settings.displayName,
                universityName: settings.universityName,
                schoolYear: settings.schoolYear,
                showUsername: settings.showUsername,
                interests: settings.interests ?? [],
                username: settings.username || null,
                password: settings.password || null,
            }

            const res = await fetch(`${apiUrl}/api/users/${backendUserId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                toast.success("Settings saved!")
                setSaved(true)
                setHasChanges(false)
                setOriginalSettings({ ...settings, password: "" })
                setTimeout(() => setSaved(false), 2000)
            } else {
                const errorText = await res.text()
                console.error("Settings save failed", res.status, errorText)
                toast.error(`Failed to save settings (${res.status}). Please try again.`)
            }
        } catch (err) {
            console.error("Settings save error", err)
            toast.error("Could not reach the server.")
        } finally {
            setSaving(false)
        }
    }

    const update = (patch: Partial<UserSettings>) => setSettings(s => ({ ...s, ...patch }))

    if (!user) return null
    if (!loaded) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-background/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-xl rounded-full animate-pulse" />
                        <div className="relative h-10 w-10 rounded-full border-2 border-transparent border-t-primary border-r-primary animate-spin" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Loading your settings…</p>
                </div>
            </div>
        )
    }

    const initials = (settings.displayName || user?.email || "?").slice(0, 2).toUpperCase()
    const avatarUrl = user?.photoURL

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background/50 to-background pb-12">
            {/* Header */}
            <div className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-40">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-400">Settings</h1>
                        <p className="text-sm text-muted-foreground mt-1">Personalize your uKnight experience</p>
                    </motion.div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
                    {/* ── Sidebar ── */}
                    <aside className="lg:col-span-1">
                        {/* Profile Card */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="mb-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-5 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-orange-500/0 to-red-500/0 group-hover:from-amber-500/5 group-hover:via-orange-500/5 group-hover:to-red-500/5 transition-all duration-300" />
                            <div className="relative space-y-4">
                                <div className="flex justify-center">
                                    <div className="relative">
                                        {avatarUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-3 ring-amber-500 shadow-lg" />
                                        ) : (
                                            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-2xl ring-3 ring-background shadow-lg">
                                                {initials}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background shadow-md" />
                                    </div>
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="font-semibold text-sm line-clamp-1 text-foreground">{settings.displayName || "Student"}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{user.email}</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Navigation */}
                        <nav className="space-y-2">
                            {SECTIONS.map(({ id, label, icon: Icon, description }, idx) => (
                                <motion.button
                                    key={id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + idx * 0.05 }}
                                    onClick={() => setActiveSection(id)}
                                    className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group relative ${activeSection === id
                                        ? "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/30 shadow-lg shadow-amber-500/5"
                                        : "hover:bg-white/5 border border-transparent"
                                    }`}
                                >
                                    {activeSection === id && (
                                        <motion.div layoutId="activeTab" className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl" transition={{ type: "spring", damping: 20, stiffness: 300 }} />
                                    )}
                                    <div className="relative flex items-center gap-3">
                                        <Icon className={`h-4 w-4 transition-colors duration-200 ${activeSection === id ? "text-amber-400" : "text-muted-foreground group-hover:text-amber-400/60"}`} />
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm font-medium ${activeSection === id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{label}</p>
                                            <p className="text-[11px] text-muted-foreground line-clamp-1">{description}</p>
                                        </div>
                                        {activeSection === id && (
                                            <motion.div initial={{ x: -4 }} animate={{ x: 0 }}>
                                                <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.button>
                            ))}
                        </nav>
                    </aside>

                    {/* ── Main Content ── */}
                    <main className="lg:col-span-3">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                                {/* Profile Section */}
                                {activeSection === "profile" && (
                                    <>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
                                                <p className="text-sm text-muted-foreground">This is how other students will see you</p>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 hover:bg-white/7 transition-all duration-200">
                                                    <Label htmlFor="displayName" className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                                        <User className="h-4 w-4 text-amber-400" />
                                                        Display Name
                                                    </Label>
                                                    <Input
                                                        id="displayName"
                                                        value={settings.displayName}
                                                        onChange={(e) => update({ displayName: e.target.value })}
                                                        placeholder="e.g. Alex Knight"
                                                        className="bg-white/5 border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                                                    />
                                                </motion.div>

                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 hover:bg-white/7 transition-all duration-200">
                                                    <Label htmlFor="schoolYear" className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                                        <GraduationCap className="h-4 w-4 text-amber-400" />
                                                        School Year
                                                    </Label>
                                                    <Select value={settings.schoolYear} onValueChange={(val) => update({ schoolYear: val })}>
                                                        <SelectTrigger id="schoolYear" className="bg-white/5 border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20">
                                                            <SelectValue placeholder="Select your year" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Alumni"].map(y => (
                                                                <SelectItem key={y} value={y}>{y}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </motion.div>
                                            </div>

                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 hover:bg-white/7 transition-all duration-200">
                                                <Label htmlFor="university" className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                                    <Building2 className="h-4 w-4 text-amber-400" />
                                                    University
                                                </Label>
                                                <Input
                                                    id="university"
                                                    value={settings.universityName}
                                                    onChange={(e) => update({ universityName: e.target.value })}
                                                    placeholder="e.g. University of Central Florida"
                                                    className="bg-white/5 border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                                                />
                                            </motion.div>
                                        </div>

                                        <div className="border-t border-white/10 pt-4">
                                            <div className="space-y-1 mb-4">
                                                <h3 className="text-lg font-bold text-foreground">Login Credentials</h3>
                                                <p className="text-sm text-muted-foreground">Sign in without Google using a username & password</p>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 hover:bg-white/7 transition-all duration-200">
                                                    <Label htmlFor="username" className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                                        <AtSign className="h-4 w-4 text-amber-400" />
                                                        Username
                                                    </Label>
                                                    <Input
                                                        id="username"
                                                        value={settings.username || ""}
                                                        onChange={(e) => update({ username: e.target.value })}
                                                        placeholder="knight123"
                                                        className="bg-white/5 border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                                                    />
                                                </motion.div>

                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 hover:bg-white/7 transition-all duration-200">
                                                    <Label htmlFor="password" className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                                        <Lock className="h-4 w-4 text-amber-400" />
                                                        Password
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="password"
                                                            type={showPassword ? "text" : "password"}
                                                            value={settings.password || ""}
                                                            onChange={(e) => update({ password: e.target.value })}
                                                            placeholder="Leave blank to keep unchanged"
                                                            className="bg-white/5 border-white/10 hover:border-white/20 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 pr-10"
                                                        />
                                                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(v => !v)}>
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Appearance Section */}
                                {activeSection === "appearance" && (
                                    <>
                                        <div className="space-y-1 mb-6">
                                            <h2 className="text-lg font-bold text-foreground">Appearance</h2>
                                            <p className="text-sm text-muted-foreground">Customize how uKnight looks and feels</p>
                                        </div>

                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:border-white/20 hover:bg-white/7 transition-all duration-200">
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-foreground mb-3">Theme</h3>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {([
                                                            { value: "light", icon: Sun, label: "Light" },
                                                            { value: "dark", icon: Moon, label: "Dark" },
                                                            { value: "system", icon: Monitor, label: "System" },
                                                        ] as const).map(({ value, icon: Icon, label }) => (
                                                            <motion.button key={value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTheme(value)} className={`relative px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border ${theme === value ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300 shadow-lg shadow-amber-500/10" : "bg-white/3 border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 hover:bg-white/5"}`}>
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Icon className="h-4 w-4" />
                                                                    {label}
                                                                </div>
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>

                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:border-white/20 hover:bg-white/7 transition-all duration-200">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-foreground">Show Name in Lobby</h3>
                                                    <p className="text-xs text-muted-foreground mt-1">Let other students see your display name</p>
                                                </div>
                                                <motion.button onClick={() => update({ showUsername: !settings.showUsername })} className={`relative h-7 w-12 rounded-full transition-all duration-300 ${settings.showUsername ? "bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20" : "bg-white/10"}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} role="switch" aria-checked={settings.showUsername}>
                                                    <motion.span initial={false} animate={{ x: settings.showUsername ? 20 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md" />
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}

                                {/* Interests Section */}
                                {activeSection === "interests" && (
                                    <>
                                        <div className="space-y-1 mb-6">
                                            <h2 className="text-lg font-bold text-foreground">Your Interests</h2>
                                            <p className="text-sm text-muted-foreground">We use these to match you with compatible students</p>
                                        </div>

                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:border-white/20 hover:bg-white/7 transition-all duration-200">
                                            <InterestsPicker selected={settings.interests} onChange={(interests) => update({ interests })} />
                                        </motion.div>
                                    </>
                                )}

                                {/* Account Section */}
                                {activeSection === "account" && (
                                    <>
                                        <div className="space-y-1 mb-6">
                                            <h2 className="text-lg font-bold text-foreground">Account & Security</h2>
                                            <p className="text-sm text-muted-foreground">Manage your account and sessions</p>
                                        </div>

                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                                            <div className="p-6 border-b border-white/10 hover:bg-white/7 transition-all duration-200">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-foreground">Sign Out</h3>
                                                        <p className="text-xs text-muted-foreground mt-1">Sign out of this device</p>
                                                    </div>
                                                    <motion.button onClick={signOut} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-10 px-4 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 font-medium text-sm transition-all duration-200 flex items-center gap-2">
                                                        <LogOut className="h-4 w-4" />
                                                        Sign Out
                                                    </motion.button>
                                                </div>
                                            </div>

                                            <div className="p-6 bg-red-500/5 border-t border-red-500/20 hover:bg-red-500/10 transition-all duration-200">
                                                <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Danger Zone</p>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-red-300">Delete Account</h3>
                                                        <p className="text-xs text-muted-foreground mt-1">Permanently delete your account</p>
                                                    </div>
                                                    <motion.button onClick={() => toast.error("Account deletion coming soon. Contact support.")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-10 px-4 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-300 font-medium text-sm transition-all duration-200">
                                                        Delete
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Save Bar */}
                        {activeSection !== "account" && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 p-4 flex items-center justify-between gap-4 sticky bottom-4 backdrop-blur-xl shadow-2xl shadow-amber-500/5">
                                <div className="text-sm font-medium">
                                    {hasChanges ? (
                                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-amber-300 flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                                            Unsaved changes
                                        </motion.span>
                                    ) : saved ? (
                                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 flex items-center gap-2">
                                            <Check className="h-4 w-4" />
                                            All changes saved
                                        </motion.span>
                                    ) : (
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                            No unsaved changes
                                        </span>
                                    )}
                                </div>
                                <motion.button onClick={handleSave} disabled={saving || (!hasChanges && !saved)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`h-10 px-5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${hasChanges ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50" : "bg-white/10 text-muted-foreground cursor-not-allowed"}`}>
                                    {saving ? (
                                        <>
                                            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                            Saving…
                                        </>
                                    ) : saved ? (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Saved!
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </motion.button>
                            </motion.div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}
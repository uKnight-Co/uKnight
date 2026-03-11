"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { X, Check, Pencil } from "lucide-react"

const ALL_PREFERENCES = [
    "Soccer", "Gaming", "Climbing", "Fishing",
    "Photography", "Volunteering", "Comedy", "Tea",
    "Disney", "Dog Lover", "Walking", "Cooking",
    "Outdoors", "Dancing", "Picnicking",
    "Board Games", "Shopping", "Working Out",
    "Sports", "Baking", "Cat Lover", "Gardening",
    "Movies", "Coffee", "Art", "Blogging", "Yoga",
    "Running", "Golf", "Spirituality", "Grab a Drink",
    "Travel", "Swimming", "DIY", "Hiking", "Astrology",
    "Instagram", "Music", "Museum", "Wine",
    "Brunch", "Reading", "Foodie", "Writer", "Trivia",
    "Language Exchange", "Vlogging",
    "Environmentalism", "Netflix", "Surfing", "Cycling",
    "Fashion", "Athlete", "Politics", "Craft Beer",
    "Anime", "Coding", "Startups", "Study Buddy",
    "Night Owl", "Early Bird", "Gym", "Basketball",
    "Football", "Tennis", "Skateboarding", "Poetry",
]

const MAX_SELECTIONS = 8
const MIN_SELECTIONS = 3

interface PreferencesSelectorProps {
    selected: string[]
    onSave: (preferences: string[]) => void
    saving?: boolean
}

export function PreferencesSelector({ selected, onSave, saving }: PreferencesSelectorProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState<string[]>(selected)

    const handleToggle = (pref: string) => {
        setDraft((prev) => {
            if (prev.includes(pref)) {
                return prev.filter((p) => p !== pref)
            }
            if (prev.length >= MAX_SELECTIONS) return prev
            return [...prev, pref]
        })
    }

    const handleSave = () => {
        onSave(draft)
        setIsEditing(false)
    }

    const handleCancel = () => {
        setDraft(selected)
        setIsEditing(false)
    }

    const openEditor = () => {
        setDraft(selected)
        setIsEditing(true)
    }

    if (!isEditing) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                        My Passions
                        {selected.length > 0 && (
                            <span className="ml-2 text-muted-foreground">({selected.length})</span>
                        )}
                    </p>
                    <Button variant="ghost" size="sm" onClick={openEditor} className="gap-1.5 text-xs">
                        <Pencil className="h-3 w-3" />
                        Edit
                    </Button>
                </div>
                {selected.length === 0 ? (
                    <button
                        onClick={openEditor}
                        className="w-full rounded-xl border-2 border-dashed border-muted-foreground/25 py-8 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                        Tap to add your passions and get better matches
                    </button>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {selected.map((pref) => (
                            <span
                                key={pref}
                                className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                            >
                                {pref}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Edit Passions</p>
                        <p className="text-xs text-muted-foreground">
                            Choose {MIN_SELECTIONS}-{MAX_SELECTIONS} passions.
                            <span className="ml-1 font-medium text-foreground">
                                ({draft.length}/{MAX_SELECTIONS})
                            </span>
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {ALL_PREFERENCES.map((pref) => {
                        const isSelected = draft.includes(pref)
                        const isDisabled = !isSelected && draft.length >= MAX_SELECTIONS
                        return (
                            <button
                                key={pref}
                                onClick={() => handleToggle(pref)}
                                disabled={isDisabled}
                                className={`
                                    rounded-full border px-3 py-1.5 text-sm font-medium transition-all
                                    ${isSelected
                                        ? "border-primary bg-primary/15 text-primary shadow-sm"
                                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                    }
                                    ${isDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}
                                `}
                            >
                                {pref}
                            </button>
                        )
                    })}
                </div>

                <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={handleCancel} className="flex-1">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={draft.length < MIN_SELECTIONS || saving}
                        className="flex-1 gap-1.5"
                    >
                        <Check className="h-4 w-4" />
                        {saving ? "Saving..." : "Done"}
                    </Button>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

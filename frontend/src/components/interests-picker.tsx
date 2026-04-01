"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const INTEREST_OPTIONS = [
    "Sports",
    "Music",
    "Gaming",
    "Technology",
    "Fitness & Health",
    "Art & Design",
    "Movies & TV",
    "Travel",
    "Food & Cooking",
    "Reading",
    "Science",
    "Photography",
    "Nature & Outdoors",
    "Fashion",
    "Business & Finance",
    "Volunteering",
    "Pets & Animals",
    "Dance",
    "Comedy",
    "Anime & Manga",
    "Entrepreneurship",
    "Cars & Automotive",
    "DIY & Crafts",
    "Esports",
    "Hip-Hop",
    "K-Pop",
    "Spirituality",
    "Social Media",
    "Board Games",
    "Politics",
] as const

interface InterestsPickerProps {
    selected: string[]
    onChange: (interests: string[]) => void
}

export default function InterestsPicker({ selected, onChange }: InterestsPickerProps) {
    const toggle = (interest: string) => {
        if (selected.includes(interest)) {
            onChange(selected.filter((i) => i !== interest))
        } else {
            onChange([...selected, interest])
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Interests</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Pick your interests so we can match you with like-minded students.
                </p>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((interest) => {
                        const isSelected = selected.includes(interest)
                        return (
                            <button
                                key={interest}
                                type="button"
                                onClick={() => toggle(interest)}
                                className={cn(
                                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                                    "hover:scale-105 active:scale-95",
                                    isSelected
                                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                        : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                )}
                            >
                                {interest}
                            </button>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

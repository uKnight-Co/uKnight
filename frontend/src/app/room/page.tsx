"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowRight, Mic, PhoneOff, Send, Video, Flag, Gamepad2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { GamePickerModal } from "@/components/game-pigeon/GamePickerModal"
import { GameOverlay } from "@/components/game-pigeon/GameOverlay"
import type { GameResult } from "@/components/game-pigeon/types"

type Message = {
    id: number
    sender: string
    text: string
    timestamp: string
    type?: "game-result"
    gameResult?: GameResult
}

function getInitialMessages(): Message[] {
    return [
        { id: 1, sender: "Stranger", text: "Hey! What's up?", timestamp: new Date(Date.now() - 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { id: 2, sender: "You", text: "Not much, just testing this new app. It looks clean!", timestamp: new Date(Date.now() - 30000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]
}

function GameResultBubble({ result }: { result: GameResult }) {
    const isWin = result.winner === "You"
    const isDraw = result.winner === "Draw"
    return (
        <div className={`rounded-2xl overflow-hidden border ${isWin ? "border-emerald-500/30 bg-emerald-500/10" : isDraw ? "border-amber-500/30 bg-amber-500/10" : "border-rose-500/30 bg-rose-500/10"} px-4 py-3 max-w-[85%]`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{result.emoji}</span>
                <span className="text-xs font-bold text-white/60">{result.gameName}</span>
            </div>
            <p className={`text-sm font-black mb-1 ${isWin ? "text-emerald-400" : isDraw ? "text-amber-400" : "text-rose-400"}`}>
                {isWin ? "🎉 You won!" : isDraw ? "🤝 Draw!" : "Stranger won!"}
            </p>
            <div className="flex gap-3 text-[10px] text-white/40">
                <span>You: {result.yourScore}</span>
                <span>•</span>
                <span>Stranger: {result.strangerScore}</span>
            </div>
        </div>
    )
}

export default function RoomPage() {
    const [messages, setMessages] = useState<Message[]>(getInitialMessages)
    const [inputText, setInputText] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [isReportOpen, setIsReportOpen] = useState(false)
    const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "failed" | "reconnecting">("connected")
    const [isGamePickerOpen, setIsGamePickerOpen] = useState(false)
    const [activeGameId, setActiveGameId] = useState<string | null>(null)
    const [modularQueue, setModularQueue] = useState<string[] | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const timer = setTimeout(() => {
            setConnectionState("reconnecting")
            setTimeout(() => setConnectionState("connected"), 3000)
        }, 15000)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7 && connectionState === "connected") {
                setIsTyping(true)
                setTimeout(() => setIsTyping(false), 3000)
            }
        }, 10000)
        return () => clearInterval(interval)
    }, [connectionState])

    // Auto-scroll to bottom when messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isTyping])

    const sendMessage = () => {
        if (!inputText.trim()) return
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setMessages([...messages, { id: Date.now(), sender: "You", text: inputText, timestamp }])
        setInputText("")
    }

    const handleReport = () => {
        setIsReportOpen(false)
        toast.success("User reported. Thank you for keeping uKnight safe.")
    }

    const handleStartGame = (gameId: string) => {
        setModularQueue(null)
        setActiveGameId(gameId)
    }

    const handleStartModular = (gameIds: string[]) => {
        setActiveGameId(null)
        setModularQueue(gameIds)
    }

    const handleGameResult = (result: GameResult) => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const msg: Message = {
            id: Date.now(),
            sender: "You",
            text: `${result.emoji} ${result.gameName}`,
            timestamp,
            type: "game-result",
            gameResult: result,
        }
        setMessages((prev) => [...prev, msg])
        const winMsg = result.winner === "You" ? "You won! 🎉" : result.winner === "Stranger" ? "Stranger won!" : "Draw! 🤝"
        toast.success(`Game over — ${winMsg}`)
    }

    const isGameActive = !!activeGameId || (!!modularQueue && modularQueue.length > 0)

    return (
        <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row relative">
            {/* Video Section */}
            <div className="relative flex flex-1 flex-col bg-black/90 p-4">
                <div className="relative flex-1 overflow-hidden rounded-xl bg-gray-900 ring-1 ring-white/10">
                    {/* Connection Overlay */}
                    {connectionState !== "connected" && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent text-primary" />
                                <p className="text-lg font-medium text-white animate-pulse">
                                    {connectionState === "connecting" && "Establishing secure connection..."}
                                    {connectionState === "reconnecting" && "Connection unstable, reconnecting..."}
                                    {connectionState === "failed" && "Connection failed. Please refresh."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Remote Video Placeholder */}
                    <div className="flex h-full w-full items-center justify-center">
                        <span className="text-muted-foreground">Stranger&apos;s Video</span>
                    </div>

                    {/* Local Video (PIP) */}
                    <div className="absolute right-4 top-4 h-32 w-48 overflow-hidden rounded-lg border border-white/10 bg-black shadow-2xl">
                        <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                            <span className="text-xs text-muted-foreground">You</span>
                        </div>
                    </div>

                    {/* Controls overlay */}
                    <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-4">
                        <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full backdrop-blur-md">
                            <Mic className="h-5 w-5" />
                        </Button>
                        <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full backdrop-blur-md">
                            <Video className="h-5 w-5" />
                        </Button>
                        <Link href="/">
                            <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full backdrop-blur-md">
                                <PhoneOff className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Skip Button Area (Desktop) */}
                <div className="mt-4 hidden justify-center md:flex">
                    <Button size="lg" className="gap-2 px-8" onClick={() => {
                        setConnectionState("connecting")
                        setTimeout(() => setConnectionState("connected"), 1500)
                        toast.info("Finding a new match...")
                    }}>
                        Next Person <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Chat Section */}
            <div className="flex h-1/2 w-full flex-col border-l bg-background md:h-full md:w-96 relative">
                <div className="flex items-center justify-between border-b p-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${connectionState === "connected" ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
                        <span className="font-semibold">Chat with Stranger</span>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Game Pigeon Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsGamePickerOpen(true)}
                            title="Play a game"
                            className="relative"
                        >
                            <Gamepad2 className={`h-4 w-4 ${isGameActive ? "text-violet-400" : "text-muted-foreground hover:text-foreground"}`} />
                            {isGameActive && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                            )}
                        </Button>

                        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Report User">
                                    <Flag className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Report User</DialogTitle>
                                    <DialogDescription>
                                        Please select a reason for reporting this user. Calls are recorded for safety.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="reason">Reason</Label>
                                        <Select>
                                            <SelectTrigger id="reason">
                                                <SelectValue placeholder="Select a reason" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="harassment">Harassment</SelectItem>
                                                <SelectItem value="nudity">Nudity / Inappropriate Content</SelectItem>
                                                <SelectItem value="spam">Spam</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsReportOpen(false)}>Cancel</Button>
                                    <Button variant="destructive" onClick={handleReport}>Submit Report</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <ScrollArea className="flex-1" ref={scrollRef as React.Ref<HTMLDivElement>}>
                    <div className="space-y-4 p-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${msg.sender === "You" ? "items-end" : "items-start"}`}
                            >
                                {msg.type === "game-result" && msg.gameResult ? (
                                    <GameResultBubble result={msg.gameResult} />
                                ) : (
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.sender === "You"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-foreground"
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                )}
                                <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                    {msg.sender} • {msg.timestamp}
                                </span>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
                                <span>Stranger is typing</span>
                                <span className="flex gap-0.5">
                                    <span className="h-1 w-1 rounded-full bg-current animate-bounce delay-0"></span>
                                    <span className="h-1 w-1 rounded-full bg-current animate-bounce delay-150"></span>
                                    <span className="h-1 w-1 rounded-full bg-current animate-bounce delay-300"></span>
                                </span>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="border-t p-4 flex-shrink-0">
                    <form
                        onSubmit={(e: React.FormEvent) => {
                            e.preventDefault()
                            sendMessage()
                        }}
                        className="flex gap-2"
                    >
                        <Input
                            placeholder="Type a message..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" size="icon">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                    <div className="mt-4 flex md:hidden">
                        <Button size="lg" className="w-full gap-2">
                            Next Person <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Game Picker Modal */}
                <GamePickerModal
                    isOpen={isGamePickerOpen}
                    onClose={() => setIsGamePickerOpen(false)}
                    onStartGame={handleStartGame}
                    onStartModular={handleStartModular}
                />

                {/* Game Overlay */}
                {isGameActive && (
                    <GameOverlay
                        gameId={activeGameId}
                        modularQueue={modularQueue}
                        onGameResult={handleGameResult}
                        onClose={() => {
                            setActiveGameId(null)
                            setModularQueue(null)
                        }}
                    />
                )}
            </div>
        </div>
    )
}

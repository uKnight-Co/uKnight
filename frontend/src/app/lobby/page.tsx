"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, Settings, Users, Send, MessageSquare, X, SkipForward, Gamepad2, Wand2, Maximize2, AlertTriangle, Expand, Shrink, Zap, Sparkles, Volume2, VolumeX } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MediaDeviceSelector } from "@/components/media-device-selector"
import { useMediaStore } from "@/store/media-store"
import { useAuth } from "@/context/auth-context"
import { motion, AnimatePresence } from "framer-motion"
import { Client, IMessage, StompSubscription } from "@stomp/stompjs"
import { Input } from "@/components/ui/input"
import { GamePickerModal, GAMES } from "@/components/game-pigeon/GamePickerModal"
import { GameOverlay } from "@/components/game-pigeon/GameOverlay"
import type { GameResult } from "@/components/game-pigeon/types"
import { createPortal } from "react-dom"
import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"
import { toast } from "sonner"

const POP_CULTURE = [
    "Are you tapping into the 'analog' living trend or are you still hopelessly addicted to screen time?",
    "If you were trapped in the Project Hail Mary spaceship with Ryan Gosling, what's the first thing you're saying to him?",
    "Which 'Older Brother Core' 2000s trend needs to absolutely stay dead and never come back?",
    "Be honest: are we hyped for The Super Mario Galaxy movie or are we officially tired of video game adaptations?",
    "If Zendaya and Robert Pattinson starred in a movie about your life, what would 'The Drama' actually be about?",
    "Who is unequivocally winning the Kendrick Lamar vs. the world beef at this point?",
    "What's your toxic TikTok trait: doing the 'Cartoon Chase' trend or pretending you don't scroll for 6 hours a day?",
    "If you had to survive a '28 Years Later' zombie outbreak using only items from your latest Amazon order, how cooked are you?"
];

const FUNNY_ICEBREAKERS = [
    "If animals could talk, which species would definitely be the rudest?",
    "What is the most chaotic thing you would do if you could be invisible for a day?",
    "Would you rather fight one horse-sized duck or a hundred duck-sized horses?",
    "If your FBI agent was watching your search history, what would they think is wrong with you?",
    "What is a conspiracy theory that you secretly 100% believe is true?"
];

const JOKES = [
    "Why don't skeletons fight each other? Because they don't have the guts.",
    "What do you call a fake noodle? An impasta.",
    "Why did the scarecrow win an award? Because he was outstanding in his field.",
    "What do you call a fish wearing a bowtie? Sofishticated.",
    "I told my Wi-Fi I loved it... it said we had a connection."
];

// ─── Sound Effects (Web Audio API, no external files) ──────────────────────
function useSoundEffect() {
    const audioCtx = useRef<AudioContext | null>(null)

    const getCtx = useCallback(() => {
        if (!audioCtx.current) {
            audioCtx.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        }
        return audioCtx.current
    }, [])

    const play = useCallback((type: "click" | "toggle-on" | "toggle-off" | "next" | "chat") => {
        try {
            const ctx = getCtx()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)

            switch (type) {
                case "click":
                    osc.type = "sine"
                    osc.frequency.setValueAtTime(880, ctx.currentTime)
                    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08)
                    gain.gain.setValueAtTime(0.08, ctx.currentTime)
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
                    osc.start(); osc.stop(ctx.currentTime + 0.1)
                    break
                case "toggle-on":
                    osc.type = "sine"
                    osc.frequency.setValueAtTime(440, ctx.currentTime)
                    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1)
                    gain.gain.setValueAtTime(0.07, ctx.currentTime)
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
                    osc.start(); osc.stop(ctx.currentTime + 0.12)
                    break
                case "toggle-off":
                    osc.type = "sine"
                    osc.frequency.setValueAtTime(660, ctx.currentTime)
                    osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.1)
                    gain.gain.setValueAtTime(0.07, ctx.currentTime)
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
                    osc.start(); osc.stop(ctx.currentTime + 0.12)
                    break
                case "next":
                    osc.type = "triangle"
                    osc.frequency.setValueAtTime(600, ctx.currentTime)
                    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.05)
                    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.15)
                    gain.gain.setValueAtTime(0.09, ctx.currentTime)
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
                    osc.start(); osc.stop(ctx.currentTime + 0.18)
                    break
                case "chat":
                    osc.type = "sine"
                    osc.frequency.setValueAtTime(523, ctx.currentTime)
                    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.06)
                    gain.gain.setValueAtTime(0.06, ctx.currentTime)
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
                    osc.start(); osc.stop(ctx.currentTime + 0.15)
                    break
            }
        } catch {
            // Audio not available, fail silently
        }
    }, [getCtx])

    return { play }
}

function TypewriterText({ text, speed = 35, className }: { text: string, speed?: number, className?: string }) {
    const [displayedText, setDisplayedText] = useState("");
    
    useEffect(() => {
        setDisplayedText("");
        let i = 0;
        const interval = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, speed);
        
        return () => clearInterval(interval);
    }, [text, speed]);
    
    return <span className={className}>{displayedText}<span className="animate-pulse">_</span></span>;
}

type ChatMessage = {
    id: string;
    sender: 'me' | 'partner';
    text: string;
    gameResult?: GameResult;
}

type SignalType = 'OFFER' | 'ANSWER' | 'ICE' | 'BYE' | 'MEDIA_STATE' | 'VIDEO_FILTER';

interface SignalData {
    type: SignalType;
    sdp?: string;
    candidate?: string;
    senderId?: string;
    targetPeerId?: string;
    mediaState?: { audioEnabled: boolean, videoEnabled: boolean };
    filter?: string;
}

interface MatchData {
    peerId: string;
    initiator: boolean;
    partnerName?: string;
    partnerSchool?: string;
    sharedInterests?: string[];
    matchReason?: string;
    partnerInterests?: string[];
}

const VIDEO_FILTERS = [
    { id: "none", name: "Normal", filter: "none", emoji: "📷" },
    { id: "warm", name: "Warm", filter: "sepia(50%) saturate(150%) brightness(1.1) hue-rotate(-10deg)", emoji: "☀️" },
    { id: "cool", name: "Cooling", filter: "hue-rotate(180deg) saturate(120%) brightness(1.1)", emoji: "❄️" },
    { id: "noir", name: "Noir", filter: "grayscale(100%) contrast(150%) brightness(0.9)", emoji: "🕵️" },
    { id: "vintage", name: "Vintage", filter: "sepia(80%) contrast(110%) brightness(0.9)", emoji: "📻" },
    { id: "neon", name: "Neon", filter: "hue-rotate(90deg) saturate(300%) contrast(150%) brightness(1.1)", emoji: "✨" },
    { id: "popart", name: "Pop Art", filter: "contrast(300%) saturate(300%) hue-rotate(30deg) sepia(20%)", emoji: "🎨" },
    { id: "dystopia", name: "Dystopia", filter: "sepia(50%) hue-rotate(270deg) contrast(150%) saturate(120%)", emoji: "🌪️" },
    { id: "xray", name: "X-Ray", filter: "invert(100%) grayscale(50%) contrast(120%)", emoji: "🦴" },
    { id: "vhs", name: "VHS", filter: "saturate(200%) contrast(120%) blur(1px) hue-rotate(-10deg)", emoji: "📼" },
    { id: "alien", name: "Alien", filter: "hue-rotate(120deg) saturate(200%) contrast(120%)", emoji: "👽" },
    { id: "fried", name: "Deep Fried", filter: "saturate(500%) contrast(200%) brightness(1.2) sepia(30%) hue-rotate(-20deg)", emoji: "🍟" },
    { id: "ghost", name: "Ghost", filter: "invert(90%) grayscale(100%) blur(1px) contrast(80%)", emoji: "👻" },
    { id: "toxic", name: "Toxic", filter: "hue-rotate(90deg) saturate(400%) contrast(150%) invert(20%)", emoji: "☢️" },
    { id: "trippy", name: "Trippy", filter: "hue-rotate(270deg) saturate(300%) contrast(200%) invert(10%)", emoji: "🌀" },
    { id: "blur", name: "Dreamy Blur", filter: "blur(4px) contrast(1.1) brightness(1.2)", emoji: "☁️" }
];

const BouncingCircles = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const circlesRef = useRef<(HTMLDivElement | null)[]>([]);
    const stateRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; color: string }[]>([]);

    useEffect(() => {
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        stateRef.current = Array.from({ length: 8 }).map((_, i) => {
            const size = 60 + Math.random() * 120;
            const speed = 1.5 + Math.random() * 2;
            const angle = Math.random() * Math.PI * 2;
            return {
                x: Math.random() * Math.max(0, width - size),
                y: Math.random() * Math.max(0, height - size),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color: `var(--chart-${(i % 5) + 1})`
            };
        });

        stateRef.current.forEach((circle, i) => {
            const el = circlesRef.current[i];
            if (el) {
                el.style.width = `${circle.size}px`;
                el.style.height = `${circle.size}px`;
                el.style.backgroundColor = circle.color;
            }
        });

        let animationFrameId: number;

        const animate = () => {
            if (containerRef.current) {
                const currentWidth = containerRef.current.clientWidth;
                const currentHeight = containerRef.current.clientHeight;

                stateRef.current.forEach((circle, i) => {
                    circle.x += circle.vx;
                    circle.y += circle.vy;

                    if (circle.x <= 0) { circle.x = 0; circle.vx *= -1; }
                    else if (circle.x + circle.size >= currentWidth) { circle.x = currentWidth - circle.size; circle.vx *= -1; }
                    if (circle.y <= 0) { circle.y = 0; circle.vy *= -1; }
                    else if (circle.y + circle.size >= currentHeight) { circle.y = currentHeight - circle.size; circle.vy *= -1; }

                    const el = circlesRef.current[i];
                    if (el) el.style.transform = `translate(${circle.x}px, ${circle.y}px)`;
                });
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    ref={(el) => { circlesRef.current[i] = el; }}
                    className="absolute rounded-full mix-blend-screen filter blur-xl opacity-40 will-change-transform top-0 left-0"
                />
            ))}
        </div>
    );
};

const InteractiveBlob = () => {
    const [transform, setTransform] = useState("translate(-50%, -50%)");

    useEffect(() => {
        let frame: number;
        const handleMouseMove = (e: MouseEvent) => {
            frame = requestAnimationFrame(() => {
                const x = (e.clientX / window.innerWidth) - 0.5;
                const y = (e.clientY / window.innerHeight) - 0.5;
                setTransform(`translate(calc(-50% + ${x * 60}px), calc(-50% + ${y * 60}px))`);
            });
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div 
            className="absolute top-1/2 left-1/2 pointer-events-none mix-blend-screen transition-transform duration-700 ease-out z-0"
            style={{ transform }}
        >
            <div 
                className="w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] opacity-80"
                style={{
                    background: "radial-gradient(circle at center, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0.1) 60%, transparent 100%)",
                    boxShadow: "inset 0 0 50px rgba(245,158,11,0.2), 0 0 60px rgba(245,158,11,0.1)",
                    animation: "blob_wave 8s ease-in-out infinite alternate"
                }}
            />
            <style>{`
                @keyframes blob_wave {
                    0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: scale(1) rotate(0deg); filter: blur(5px); }
                    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: scale(1.1) rotate(15deg); filter: blur(8px); }
                    100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: scale(0.95) rotate(-10deg); filter: blur(6px); }
                }
            `}</style>
        </div>
    );
};

const DemoPartnerBackground = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLImageElement>(null);
    const stateRef = useRef<{ x: number, y: number, vx: number, vy: number, size: number } | null>(null);

    useEffect(() => {
        if (!containerRef.current || !logoRef.current) return;
        
        if (!stateRef.current) {
            stateRef.current = { x: Math.random() * 50, y: Math.random() * 50, vx: 2, vy: 2, size: 100 };
        }
        
        let animationFrameId: number;

        const animate = () => {
            if (containerRef.current && logoRef.current && stateRef.current) {
                const currentWidth = containerRef.current.clientWidth;
                const currentHeight = containerRef.current.clientHeight;

                stateRef.current.x += stateRef.current.vx;
                stateRef.current.y += stateRef.current.vy;

                if (stateRef.current.x <= 0) { stateRef.current.x = 0; stateRef.current.vx *= -1; }
                else if (stateRef.current.x + stateRef.current.size >= currentWidth) { stateRef.current.x = currentWidth - stateRef.current.size; stateRef.current.vx *= -1; }
                
                if (stateRef.current.y <= 0) { stateRef.current.y = 0; stateRef.current.vy *= -1; }
                else if (stateRef.current.y + stateRef.current.size >= currentHeight) { stateRef.current.y = currentHeight - stateRef.current.size; stateRef.current.vy *= -1; }

                logoRef.current.style.transform = `translate(${stateRef.current.x}px, ${stateRef.current.y}px)`;
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-br from-slate-900 to-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
                ref={logoRef}
                src="/uKnight_Icon.png" 
                alt="uKnight Demo"
                className="absolute top-0 left-0 drop-shadow-2xl opacity-80 will-change-transform"
                style={{ width: '100px', height: '100px', objectFit: 'contain' }}
            />
        </div>
    );
};

export default function LobbyPage() {
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)
    const stompClient = useRef<Client | null>(null)
    const peerConnection = useRef<RTCPeerConnection | null>(null)
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([])
    const myUuid = useRef<string>(crypto.randomUUID())
    const lastNextTime = useRef<number>(0)
    const lastChatTime = useRef<number>(0)
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const waitingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const waitingAudioRef = useRef<HTMLAudioElement | null>(null)
    const gameMusicRef = useRef<HTMLAudioElement | null>(null)

    // Subscriptions
    const subscriptionMatch = useRef<StompSubscription | null>(null)
    const subscriptionSignal = useRef<StompSubscription | null>(null)
    const subscriptionChat = useRef<StompSubscription | null>(null)
    const subscriptionGame = useRef<StompSubscription | null>(null)

    // State
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [currentPeerId, setCurrentPeerId] = useState<string | null>(null)
    const [status, setStatus] = useState("Initializing camera...")
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatInput, setChatInput] = useState("")
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [isMicOn, setIsMicOn] = useState(true)
    const [isVideoOn, setIsVideoOn] = useState(true)
    const [remoteMicOn, setRemoteMicOn] = useState(true)
    const [remoteVideoOn, setRemoteVideoOn] = useState(true)
    const [myVideoFilter, setMyVideoFilter] = useState("none")
    const [remoteVideoFilter, setRemoteVideoFilter] = useState("none")
    const [showFilterMenu, setShowFilterMenu] = useState(false)
    const [isLocalMaximized, setIsLocalMaximized] = useState(false)
    const { videoDeviceId, audioDeviceId } = useMediaStore()
    const { user: firebaseUser } = useAuth()
    const [isMobileFullscreen, setIsMobileFullscreen] = useState(false)

    // Auto-hide controls
    const [controlsVisible, setControlsVisible] = useState(true)

    // Demo match
    const [showDemoButton, setShowDemoButton] = useState(false)
    const [isDemoMatch, setIsDemoMatch] = useState(false)

    // Music mute
    const [isMusicMuted, setIsMusicMuted] = useState(false)

    const { play: playSound } = useSoundEffect()

    const showControls = useCallback(() => {
        setControlsVisible(true)
        if (idleTimer.current) clearTimeout(idleTimer.current)
        idleTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    }, [])

    const playMusic = (audio: HTMLAudioElement | null) => {
        if (!audio) return
        audio.loop = true
        audio.play().catch((err) => console.log("Music play blocked until user interacts:", err))
    }

    const unlockMusic = () => {
        if (!isMusicMuted) {
            if (!currentPeerId && waitingAudioRef.current) {
                waitingAudioRef.current.volume = 0.6
                playMusic(waitingAudioRef.current)
            }
            const gameActive = !!(activeGameId || (modularQueue && modularQueue.length > 0))
            if (gameActive && gameMusicRef.current) {
                gameMusicRef.current.volume = 0.4
                playMusic(gameMusicRef.current)
            }
        }
    }

    useEffect(() => {
        // Start idle timer on mount
        idleTimer.current = setTimeout(() => setControlsVisible(false), 3000)
        return () => { if (idleTimer.current) clearTimeout(idleTimer.current) }
    }, [])

    const toggleMobileFullscreen = useCallback(() => {
        if (isMobileFullscreen) {
            // Exit fullscreen
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const doc = document as any;
            if (doc.fullscreenElement || doc.webkitFullscreenElement) {
                if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
                else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
            }
            setIsMobileFullscreen(false)
            document.documentElement.classList.remove('lobby-fullscreen')
        } else {
            // Try native fullscreen first, fall back to CSS-only mode
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const docEl = document.documentElement as any;
            const requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
            
            if (requestFs) {
                try {
                    const fsPromise = requestFs.call(docEl);
                    if (fsPromise && fsPromise.catch) {
                        fsPromise.catch(() => {});
                    }
                } catch (e) {
                    console.log("Fullscreen error:", e);
                }
            }
            setIsMobileFullscreen(true)
            document.documentElement.classList.add('lobby-fullscreen')
        }
    }, [isMobileFullscreen])

    useEffect(() => {
        const onFsChange = () => {
            if (!document.fullscreenElement) {
                setIsMobileFullscreen(false)
                document.documentElement.classList.remove('lobby-fullscreen')
            }
        }
        document.addEventListener('fullscreenchange', onFsChange)
        return () => {
            document.removeEventListener('fullscreenchange', onFsChange)
            document.documentElement.classList.remove('lobby-fullscreen')
        }
    }, [])

    // Game Pigeon state
    const [isGamePickerOpen, setIsGamePickerOpen] = useState(false)
    const [activeGameId, setActiveGameId] = useState<string | null>(null)
    const [modularQueue, setModularQueue] = useState<string[] | null>(null)
    const [gamePigeonMatchId, setGamePigeonMatchId] = useState<string | null>(null)
    const [gamePigeonRole, setGamePigeonRole] = useState<"initiator" | "responder" | null>(null)
    const [gamePigeonLastMove, setGamePigeonLastMove] = useState<Record<string, unknown> | null>(null)
    const [gamePigeonInvite, setGamePigeonInvite] = useState<{ senderId: string; matchId: string; gameType: string } | null>(null)

    // Match info state
    const [, setPartnerName] = useState<string | null>(null)
    const [, setPartnerSchool] = useState<string | null>(null)
    const [sharedInterests, setSharedInterests] = useState<string[]>([])
    const [hideInterests, setHideInterests] = useState(false)
    const [matchReason, setMatchReason] = useState<string | null>(null)

    // Icebreaker
    const [iceType, setIceType] = useState<"pop" | "funny" | "joke">("funny")
    const [iceText, setIceText] = useState(FUNNY_ICEBREAKERS[0])
    const [portalNode, setPortalNode] = useState<Element | null>(null)

    const setRandomIcebreaker = (type: "pop" | "funny" | "joke") => {
        setIceType(type);
        if (type === "pop") setIceText(POP_CULTURE[Math.floor(Math.random() * POP_CULTURE.length)]);
        if (type === "funny") setIceText(FUNNY_ICEBREAKERS[Math.floor(Math.random() * FUNNY_ICEBREAKERS.length)]);
        if (type === "joke") setIceText(JOKES[Math.floor(Math.random() * JOKES.length)]);
    }

    // Mutable refs for latest callbacks
    const localStreamRef = useRef<MediaStream | null>(null)
    const handleMatchFoundRef = useRef<((data: MatchData, stream: MediaStream) => Promise<void>) | null>(null)
    const handleSignalRef = useRef<((data: SignalData) => Promise<void>) | null>(null)

    useEffect(() => {
        localStreamRef.current = localStream;
        handleMatchFoundRef.current = handleMatchFound;
        handleSignalRef.current = handleSignal;
    })

    useEffect(() => {
        setPortalNode(document.getElementById("navbar-center-portal"));
    }, []);

    // Demo match — show button after 20s of waiting
    useEffect(() => {
        if (!currentPeerId) {
            waitingTimer.current = setTimeout(() => setShowDemoButton(true), 20000)
        } else {
            setShowDemoButton(false)
            if (waitingTimer.current) clearTimeout(waitingTimer.current)
        }
        return () => { if (waitingTimer.current) clearTimeout(waitingTimer.current) }
    }, [currentPeerId])

    // Waiting music loop
    useEffect(() => {
        const audio = waitingAudioRef.current;
        if (!audio) return;
        if (!currentPeerId && !isMusicMuted) {
            audio.volume = 0.6;
            audio.loop = true;
            audio.play().catch(e => console.log("Waiting music autoplay prevented", e));
        } else {
            audio.pause();
            if (currentPeerId) audio.currentTime = 0;
        }
    }, [currentPeerId, isMusicMuted]);

    // Game music: play at 40% when a game is active, duck when partner talks
    useEffect(() => {
        const audio = gameMusicRef.current;
        if (!audio) return;
        const gameActive = !!(activeGameId || (modularQueue && modularQueue.length > 0));
        if (gameActive && !isMusicMuted) {
            audio.volume = 0.4;
            audio.loop = true;
            audio.play().catch(() => {});
        } else {
            audio.pause();
            if (!gameActive) audio.currentTime = 0;
        }
    }, [activeGameId, modularQueue, isMusicMuted]);

    // Voice-activity ducking: lower game music when partner is talking
    useEffect(() => {
        if (!remoteVideoRef.current?.srcObject || isMusicMuted) return;
        const stream = remoteVideoRef.current.srcObject as MediaStream;
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) return;

        let ctx: AudioContext | null = null;
        let analyser: AnalyserNode | null = null;
        let rafId: number;
        try {
            ctx = new AudioContext();
            const source = ctx.createMediaStreamSource(stream);
            analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);

            const check = () => {
                if (!analyser || !gameMusicRef.current) return;
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                // If partner is speaking (avg > 15), duck to 15%, otherwise 40%
                const target = avg > 15 ? 0.15 : 0.4;
                const cur = gameMusicRef.current.volume;
                gameMusicRef.current.volume = cur + (target - cur) * 0.15;
                rafId = requestAnimationFrame(check);
            };
            rafId = requestAnimationFrame(check);
        } catch { /* Audio context not available */ }

        return () => {
            cancelAnimationFrame(rafId!);
            ctx?.close().catch(() => {});
        };
    }, [currentPeerId, activeGameId, modularQueue, isMusicMuted]);

    const simulateDemoMatch = useCallback(() => {
        playSound("next")
        setIsDemoMatch(true)
        setCurrentPeerId("demo-partner")
        setPartnerName("Alex (Demo)")
        setPartnerSchool("University of Central Florida")
        setSharedInterests(["Gaming", "Music", "Coffee"])
        setHideInterests(false)
        setMatchReason("Demo match — no real peer connected")
        setStatus("Connected (Demo)")
        setShowDemoButton(false)
        setIsChatOpen(true)
        setRandomIcebreaker("funny")
        // Seed realistic demo chat messages over time
        const msgs: { text: string; delay: number }[] = [
            { text: "Hey! 👋 Welcome to uKnight!", delay: 800 },
            { text: "This is a demo match so you can explore the UI", delay: 2500 },
            { text: "Try clicking the 🎮 Play button above to start a game!", delay: 5000 },
            { text: "You can also change your video filter with the ✨ wand button", delay: 8000 },
        ]
        msgs.forEach(({ text, delay }) => {
            setTimeout(() => {
                setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'partner', text }])
            }, delay)
        })
    }, [playSound])

    const log = (msg: string) => { console.log(msg) }

    // --- Helper Functions ---
    const sendSignal = (payload: SignalData) => {
        if (stompClient.current && stompClient.current.connected) {
            stompClient.current.publish({
                destination: '/app/signal',
                headers: { 'uuid': myUuid.current },
                body: JSON.stringify(payload)
            });
        }
    }

    const processIceQueue = async () => {
        const pc = peerConnection.current;
        if (!pc || !pc.remoteDescription) return;
        while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
                try { await pc.addIceCandidate(candidate); }
                catch (e) { console.error("Error adding buffered ICE candidate", e); }
            }
        }
    }

    const sendEndSession = () => {
        if (stompClient.current?.connected) {
            stompClient.current.publish({
                destination: '/app/end-session',
                headers: { 'uuid': myUuid.current },
                body: ''
            });
        }
    }

    const cleanupAndRejoin = () => {
        setStatus("Searching for verified students...");
        setCurrentPeerId(null);
        setChatMessages([]);
        setIsChatOpen(false);
        setIsDemoMatch(false);
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
            remoteVideoRef.current.load();
        }
        setRemoteVideoFilter("none");

        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        if (stompClient.current && stompClient.current.connected) {
            stompClient.current.publish({
                destination: '/app/join',
                headers: { 'uuid': myUuid.current },
                body: JSON.stringify({ university: "University of Central Florida", userId: firebaseUser?.uid || "" })
            });
        }
    }

    const handlePartnerDisconnect = () => {
        sendEndSession();
        cleanupAndRejoin();
    }

    const handleSignal = async (data: SignalData) => {
        const pc = peerConnection.current;

        if (data.type === 'BYE') { log("Partner skipped."); handlePartnerDisconnect(); return; }
        if (data.type === 'MEDIA_STATE' && data.mediaState) {
            setRemoteMicOn(data.mediaState.audioEnabled);
            setRemoteVideoOn(data.mediaState.videoEnabled);
            return;
        }
        if (data.type === 'VIDEO_FILTER' && data.filter) { setRemoteVideoFilter(data.filter); return; }
        if (!pc || (pc.signalingState as string) === 'closed') return;

        try {
            if (data.type === 'OFFER') {
                log("Received OFFER")
                if (!currentPeerId && data.senderId) setCurrentPeerId(data.senderId);
                const offer = JSON.parse(data.sdp!) as RTCSessionDescriptionInit;
                if ((pc.signalingState as string) === 'closed') return;
                await pc.setRemoteDescription(offer);
                await processIceQueue();
                if ((pc.signalingState as string) === 'closed') return;
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal({ type: 'ANSWER', sdp: JSON.stringify(answer), targetPeerId: data.senderId });
            } else if (data.type === 'ANSWER') {
                log("Received ANSWER")
                const answer = JSON.parse(data.sdp!) as RTCSessionDescriptionInit;
                if ((pc.signalingState as string) === 'closed') return;
                await pc.setRemoteDescription(answer);
                await processIceQueue();
            } else if (data.type === 'ICE') {
                if (data.candidate) {
                    const candidate = JSON.parse(data.candidate) as RTCIceCandidateInit;
                    if (pc.remoteDescription && (pc.signalingState as string) !== 'closed') {
                        try { log("Adding ICE candidate"); await pc.addIceCandidate(candidate); }
                        catch (e) { console.error("Error adding ICE candidate", e); }
                    } else {
                        log("Buffering ICE candidate");
                        iceCandidatesQueue.current.push(candidate);
                    }
                }
            }
        } catch (error) { console.error("Error handling signal:", error); }
    }

    const createPeerConnection = (targetPeerId: string, stream: MediaStream) => {
        if (peerConnection.current) peerConnection.current.close();

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'stun:stun.services.mozilla.com' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });

        pc.oniceconnectionstatechange = () => {
            log(`ICE Check: ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === 'failed') { log("ICE failed, retrying"); pc.restartIce(); }
        };
        pc.onsignalingstatechange = () => { log(`Signaling State: ${pc.signalingState}`); };
        stream.getTracks().forEach(track => { pc.addTrack(track, stream); });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal({ type: 'ICE', candidate: JSON.stringify(event.candidate), targetPeerId });
            }
        };

        pc.ontrack = (event) => {
            log("Track received: " + event.track.kind);
            if (remoteVideoRef.current) {
                const existingStream = remoteVideoRef.current.srcObject as MediaStream;
                if (event.streams && event.streams[0]) {
                    if (existingStream !== event.streams[0]) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    }
                } else {
                    if (!existingStream) {
                        remoteVideoRef.current.srcObject = new MediaStream([event.track]);
                    } else if (!existingStream.getTracks().some(t => t.id === event.track.id)) {
                        existingStream.addTrack(event.track);
                    }
                }
                if (remoteVideoRef.current.paused) {
                    remoteVideoRef.current.play().catch(e => { if (e.name !== 'AbortError') console.error("Autoplay error:", e); });
                }
            }
        };

        pc.onconnectionstatechange = () => { log(`Connection State: ${pc.connectionState}`) };
        peerConnection.current = pc;
    }

    const handleMatchFound = async (data: MatchData, stream: MediaStream) => {
        if (currentPeerId === data.peerId) { log("Ignoring duplicate match."); return; }

        log(`Match found! Partner: ${data.peerId.substring(0, 5)}... Initiator: ${data.initiator}`)
        setStatus("Connected! Negotiating...")
        setCurrentPeerId(data.peerId);
        setChatMessages([]);
        setIsChatOpen(false);
        setRemoteMicOn(true);
        setRemoteVideoOn(true);
        setRemoteVideoFilter("none");
        setPartnerName(data.partnerName || "Student");
        setPartnerSchool(data.partnerSchool || "Unknown");
        setSharedInterests(data.sharedInterests || []);
        setHideInterests(false);
        setMatchReason(data.matchReason || "Connected");

        if (myVideoFilter !== "none") {
            setTimeout(() => { sendSignal({ type: 'VIDEO_FILTER', filter: myVideoFilter, targetPeerId: data.peerId }); }, 500);
        }

        createPeerConnection(data.peerId, stream);
        setRandomIcebreaker("funny");

        if (data.initiator) {
            try {
                setTimeout(async () => {
                    if (!peerConnection.current) return;
                    const hasAudio = stream.getAudioTracks().length > 0;
                    const hasVideo = stream.getVideoTracks().length > 0;
                    if (!hasAudio) peerConnection.current.addTransceiver('audio', { direction: 'recvonly' });
                    if (!hasVideo) peerConnection.current.addTransceiver('video', { direction: 'recvonly' });
                    const offer = await peerConnection.current.createOffer();
                    await peerConnection.current.setLocalDescription(offer);
                    sendSignal({ type: 'OFFER', sdp: JSON.stringify(offer), targetPeerId: data.peerId });
                }, 100);
            } catch (err) { console.error("Error creating offer:", err); }
        }
    }

    const subscribeToTopics = (client: Client, uuid: string) => {
        subscriptionMatch.current = client.subscribe(`/topic/match/${uuid}`, (message: IMessage) => {
            const data = JSON.parse(message.body) as MatchData
            if (handleMatchFoundRef.current) handleMatchFoundRef.current(data, localStreamRef.current!)
        })
        subscriptionSignal.current = client.subscribe(`/topic/signal/${uuid}`, (message: IMessage) => {
            const data = JSON.parse(message.body) as SignalData
            if (handleSignalRef.current) handleSignalRef.current(data)
        })
        subscriptionChat.current = client.subscribe(`/topic/chat/${uuid}`, (message: IMessage) => {
            const data = JSON.parse(message.body) as { message: string };
            setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'partner', text: data.message }]);
            if (!isChatOpen) setIsChatOpen(true);
        })
        subscriptionGame.current = client.subscribe(`/topic/game/${uuid}`, (message: IMessage) => {
            const data = JSON.parse(message.body);
            console.log("GAME TOPIC DATA RECEIVED:", data);

            if (data.type === 'GAME_INVITE_SENT_CONFIRM') {
                console.log("Server confirmed invite sent to:", data.targetPeerId);
            } else if (data.type === 'GAME_INVITE') {
                const gameType: string = data.gameType || '';
                const isTournament = gameType.startsWith('tournament:');
                let displayName = gameType;
                if (isTournament) {
                    const games = gameType.split(':')[1].split(',');
                    displayName = `Tournament (${games.length} games)`;
                } else {
                    displayName = GAMES.find(g => g.id === gameType)?.name ?? gameType;
                }
                setGamePigeonInvite({ senderId: data.senderId, matchId: data.matchId, gameType });
                setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'partner', text: `🎮 Partner challenged you to ${displayName}! Check the invite below.` }]);
                setIsChatOpen(true);
            } else if (data.type === 'GAME_START') {
                setGamePigeonMatchId(data.matchId);
                setGamePigeonRole(data.role || 'responder');
                const isTournament = data.gameType?.startsWith('tournament:');
                if (isTournament) {
                    setActiveGameId(null);
                    setModularQueue(data.gameType.split(':')[1].split(','));
                } else {
                    setActiveGameId(data.gameType);
                    setModularQueue(null);
                }
            } else if (data.type === 'GAME_MOVE') {
                setGamePigeonLastMove(data.action || null);
            }
        })
    }

    const sendChat = () => {
        const now = Date.now();
        if (now - lastChatTime.current < 1000) return;
        lastChatTime.current = now;
        if (!chatInput.trim() || !currentPeerId) return;

        if (isDemoMatch) {
            // Demo mode — echo locally only
            const message = chatInput.trim();
            setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'me', text: message }]);
            setChatInput("");
            // Simulate a reply
            setTimeout(() => {
                const replies = ["Haha nice!", "I totally agree 😄", "That's wild!", "No way!", "Tell me more!"]
                setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'partner', text: replies[Math.floor(Math.random() * replies.length)] }]);
            }, 1500)
            return;
        }

        if (!stompClient.current?.connected) return;

        const message = chatInput.trim();
        if (message.toLowerCase() === '/knockout') { sendGamePigeonInvite('pigeon_knockout'); setChatInput(""); return; }

        setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'me', text: message }]);
        setChatInput("");
        stompClient.current.publish({
            destination: '/app/chat',
            headers: { 'uuid': myUuid.current },
            body: JSON.stringify({ targetPeerId: currentPeerId, message })
        });
    }

    const sendGamePigeonInvite = (gameData: string | string[]) => {
        if (!currentPeerId || !stompClient.current?.connected) return;
        const isTournament = Array.isArray(gameData);
        const gameTypeStr = isTournament ? `tournament:${gameData.join(',')}` : (gameData as string);
        let displayName = gameData as string;
        if (isTournament) { displayName = `Tournament (${gameData.length} games)`; }
        else { displayName = GAMES.find(g => g.id === gameData)?.name ?? (gameData as string); }

        setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'me', text: `🎮 Game invite sent: ${displayName}. Waiting for partner...` }]);
        setIsChatOpen(true);

        stompClient.current.publish({
            destination: '/app/game/invite',
            headers: { 'uuid': myUuid.current },
            body: JSON.stringify({ targetPeerId: currentPeerId, gameType: gameTypeStr })
        });

        setGamePigeonRole('initiator');
    }

    const sendGamePigeonMove = (action: Record<string, unknown>) => {
        if (!gamePigeonMatchId || !currentPeerId || !stompClient.current?.connected) return;
        stompClient.current.publish({
            destination: '/app/game/move',
            headers: { 'uuid': myUuid.current },
            body: JSON.stringify({ matchId: gamePigeonMatchId, targetPeerId: currentPeerId, action, type: 'GAME_MOVE', dx: 0, dy: 0 })
        });
    }

    const acceptGamePigeonInvite = () => {
        if (!gamePigeonInvite || !stompClient.current?.connected) return;
        stompClient.current.publish({
            destination: '/app/game/accept',
            headers: { 'uuid': myUuid.current },
            body: JSON.stringify({ targetPeerId: gamePigeonInvite.senderId, matchId: gamePigeonInvite.matchId, gameType: gamePigeonInvite.gameType, role: 'initiator' })
        });
        setGamePigeonMatchId(gamePigeonInvite.matchId);
        setGamePigeonRole('responder');
        const isTournament = gamePigeonInvite.gameType.startsWith('tournament:');
        if (isTournament) { setActiveGameId(null); setModularQueue(gamePigeonInvite.gameType.split(':')[1].split(',')); }
        else { setActiveGameId(gamePigeonInvite.gameType); setModularQueue(null); }
        setGamePigeonInvite(null);
    }

    const declineGamePigeonInvite = () => { setGamePigeonInvite(null); }

    const handleNext = () => {
        const now = Date.now();
        if (now - lastNextTime.current < 2000) return;
        lastNextTime.current = now;
        playSound("next")
        if (currentPeerId) {
            sendEndSession();
            sendSignal({ type: 'BYE', targetPeerId: currentPeerId });
        }
        cleanupAndRejoin();
    }

    const toggleMic = () => {
        const nextState = !isMicOn;
        playSound(nextState ? "toggle-on" : "toggle-off")
        setIsMicOn(nextState)
        if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = nextState);
        if (currentPeerId) sendSignal({ type: 'MEDIA_STATE', targetPeerId: currentPeerId, mediaState: { audioEnabled: nextState, videoEnabled: isVideoOn } });
    }

    const toggleVideo = () => {
        const nextState = !isVideoOn;
        playSound(nextState ? "toggle-on" : "toggle-off")
        setIsVideoOn(nextState)
        if (localStream) localStream.getVideoTracks().forEach(t => t.enabled = nextState);
        if (currentPeerId) sendSignal({ type: 'MEDIA_STATE', targetPeerId: currentPeerId, mediaState: { audioEnabled: isMicOn, videoEnabled: nextState } });
    }

    const handleSetVideoFilter = (f: string) => {
        playSound("click")
        setMyVideoFilter(f);
        if (currentPeerId) sendSignal({ type: 'VIDEO_FILTER', filter: f, targetPeerId: currentPeerId });
    }

    // --- Media & STOMP Effects ---
    useEffect(() => {
        let stream: MediaStream | null = null;
        async function getMedia() {
            try {
                if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());

                const constraints = {
                    video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
                    audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
                }

                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints)
                    setStatus("Camera Ready. Connecting to server...")
                } catch (err) {
                    console.warn("Fallback to audio only.", err)
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ audio: constraints.audio, video: false })
                        setStatus("Mic Ready (No Video). Connecting to server...")
                    } catch {
                        stream = new MediaStream()
                        setStatus("Ready (No Media). Connecting to server...")
                    }
                }

                setLocalStream(stream);
                setIsVideoOn(stream.getVideoTracks().length > 0);
                setIsMicOn(stream.getAudioTracks().length > 0);

                if (videoRef.current && stream.getVideoTracks().length > 0) {
                    videoRef.current.srcObject = stream
                }
            } catch (err) {
                console.error("Unexpected error in media init.", err)
                setStatus("Initialization Error.")
            }
        }
        getMedia()
        return () => { if (stream) stream.getTracks().forEach(track => track.stop()); }
    }, [videoDeviceId, audioDeviceId])

    useEffect(() => {
        if (!localStream) return;
        const uuid = myUuid.current;

        const client = new Client({
            brokerURL: process.env.NODE_ENV === 'production'
                ? 'wss://uknight-backend-536429702801.us-central1.run.app/ws'
                : 'ws://localhost:8080/ws',
            reconnectDelay: 5000,
            debug: (str) => console.log(str),
            onConnect: () => {
                log("Connected to Backend! UUID: " + uuid.substring(0, 5))
                setStatus("Searching for verified students...")
                subscribeToTopics(client, uuid);
                client.publish({
                    destination: '/app/join',
                    headers: { 'uuid': uuid },
                    body: JSON.stringify({ university: "University of Central Florida", userId: firebaseUser?.uid || "", interests: [] })
                })
            },
            onStompError: (frame) => { log('Broker Error: ' + frame.headers['message']) },
            onDisconnect: () => { setStatus("Disconnected. Retrying...") }
        });

        client.activate();
        stompClient.current = client;

        return () => {
            if (peerConnection.current) peerConnection.current.close();
            if (client.connected) {
                client.publish({ destination: '/app/end-session', headers: { 'uuid': uuid }, body: '' });
            }
            client.deactivate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localStream])


    return (
        <div
            className="relative h-screen w-full bg-black overflow-hidden flex items-center justify-center"
            onMouseMove={showControls}
            onTouchStart={showControls}
            onClick={unlockMusic}
        >
            {/* Persistent audio elements */}
            <audio ref={gameMusicRef} src="/gamemusic.mp3" loop className="hidden" />

            {/* Remote Video Container */}
            <motion.div
                className={isLocalMaximized ? "absolute bottom-32 md:bottom-8 lg:bottom-12 left-4 md:left-8 w-40 md:w-56 aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/20 z-20 bg-black/50 backdrop-blur-sm cursor-pointer hover:border-white/40" : "absolute inset-0 z-0"}
                drag={isLocalMaximized}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                onClick={() => { if (isLocalMaximized) setIsLocalMaximized(false); }}
            >
                {isLocalMaximized && (
                    <div className="absolute top-2 right-2 bg-black/60 p-1 md:p-1.5 rounded-full text-white backdrop-blur-md z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="h-3 w-3 md:h-4 md:w-4" />
                    </div>
                )}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover transition-all duration-300"
                    style={{ filter: remoteVideoFilter !== "none" ? VIDEO_FILTERS.find(f => f.id === remoteVideoFilter)?.filter : "none" }}
                />

                {/* Demo match placeholder — bouncing logo */}
                {isDemoMatch && <DemoPartnerBackground />}

                {/* Remote Media Offline Overlay */}
                {currentPeerId && !remoteVideoOn && !isDemoMatch && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-10 transition-opacity">
                        <VideoOff className="h-16 w-16 text-white/50 mb-4 animate-pulse" />
                        <p className="text-white/70 text-lg font-medium">Partner turned off their camera</p>
                    </div>
                )}

                {/* Remote Muted Icon */}
                {currentPeerId && !remoteMicOn && remoteVideoOn && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 shadow-xl border border-white/10 mt-16 text-white text-sm font-medium">
                        <MicOff className="h-5 w-5 text-red-500" />
                        <span>Partner Muted</span>
                    </div>
                )}

                {/* Lobby Info Stack (Match & Icebreakers) */}
                <div className="absolute top-[5.25rem] md:top-[4.5rem] mt-2 md:mt-0 left-0 w-full z-40 flex flex-col items-center gap-3 md:gap-2 pointer-events-none px-4">
                    {/* Shared Interests Banner */}
                    {currentPeerId && !hideInterests && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-linear-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md border border-amber-500/40 shadow-lg rounded-full flex flex-row items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 max-w-full pointer-events-auto relative pr-8 md:pr-10"
                        >
                            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-amber-500 flex-none" /><span className="text-amber-300 font-bold text-sm shrink-0">Matched on:</span>
                            <div className="flex flex-row gap-1.5 flex-wrap overflow-hidden">
                                {sharedInterests && sharedInterests.length > 0 ? (
                                    sharedInterests.map((interest, idx) => (
                                        <span key={idx} className="text-[10px] md:text-xs bg-amber-500/30 px-2 py-1 rounded-full text-amber-100 font-medium whitespace-nowrap">{interest}</span>
                                    ))
                                ) : (
                                    <span className="text-[10px] md:text-xs bg-amber-500/30 px-2 py-1 rounded-full text-amber-100 font-medium whitespace-nowrap">
                                        {matchReason === "Cross-campus connection" ? "Campus Connection" : (matchReason || "Campus Connection")}
                                    </span>
                                )}
                            </div>
                            <button 
                                onClick={() => setHideInterests(true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500/70 hover:text-amber-400 bg-black/20 hover:bg-black/40 rounded-full p-0.5 transition-colors"
                            >
                                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Icebreaker Banner - Rendered into Navbar */}
                {currentPeerId && portalNode
                    ? createPortal(
                        <div className="max-w-[40vw] sm:max-w-xl w-fit bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-lg rounded-full hidden sm:flex flex-row items-center gap-1 px-1.5 py-1 pointer-events-auto transition-all mr-2">
                            <div className="flex flex-row items-center gap-1 border-r border-white/10 pr-1.5 flex-none">
                               <button onClick={() => setRandomIcebreaker("pop")} className="text-[10px] sm:text-xs hover:scale-110 active:scale-95 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all bg-white/5" title="Current Events">🔥</button>
                               <button onClick={() => setRandomIcebreaker("funny")} className="text-[10px] sm:text-xs hover:scale-110 active:scale-95 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all bg-white/5" title="Wild Icebreaker">🧊</button>
                               <button onClick={() => setRandomIcebreaker("joke")} className="text-[10px] sm:text-xs hover:scale-110 active:scale-95 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all bg-white/5" title="Joke">😂</button>
                            </div>
                            <div className="flex-1 flex items-center px-1 min-w-0 overflow-hidden">
                                <TypewriterText text={iceText} speed={30} className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm font-bold leading-tight tracking-wide truncate ${iceType === "pop" ? "text-cyan-100" : iceType === "funny" ? "text-fuchsia-100" : "text-amber-100"}`} />
                            </div>
                        </div>,
                        portalNode
                    )
                    : null
                }
                
                {/* Mobile Fallback Icebreaker Banner */}
                {currentPeerId && (
                    <div className="sm:hidden absolute top-[8.5rem] mt-2 left-1/2 -translate-x-1/2 w-[90vw] bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-lg rounded-full flex flex-row items-center gap-1 px-1.5 py-1 pointer-events-auto transition-all z-40">
                        <div className="flex flex-row items-center gap-1 border-r border-white/10 pr-1.5 flex-none">
                           <button onClick={() => setRandomIcebreaker("pop")} className="text-[10px] hover:scale-110 active:scale-95 w-6 h-6 rounded-full flex items-center justify-center transition-all bg-white/5" title="Current Events">🔥</button>
                           <button onClick={() => setRandomIcebreaker("funny")} className="text-[10px] hover:scale-110 active:scale-95 w-6 h-6 rounded-full flex items-center justify-center transition-all bg-white/5" title="Wild Icebreaker">🧊</button>
                           <button onClick={() => setRandomIcebreaker("joke")} className="text-[10px] hover:scale-110 active:scale-95 w-6 h-6 rounded-full flex items-center justify-center transition-all bg-white/5" title="Joke">😂</button>
                        </div>
                        <div className="flex-1 flex items-center px-1 min-w-0 overflow-hidden">
                            <TypewriterText text={iceText} speed={30} className={`text-[10px] font-bold leading-tight tracking-wide truncate ${iceType === "pop" ? "text-cyan-100" : iceType === "funny" ? "text-fuchsia-100" : "text-amber-100"}`} />
                        </div>
                    </div>
                )}

                {/* Status / Waiting Overlay */}
                {!currentPeerId && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-md z-10 overflow-hidden">
                        <audio ref={waitingAudioRef} src="/waitingmusic.mp3" loop />
                        <BouncingCircles />
                        <div className="text-center relative z-10 flex flex-col items-center justify-center">
                            <InteractiveBlob />
                            <div className="relative mb-4 z-10">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                <Users className="h-16 w-16 text-primary mx-auto relative z-10 drop-shadow-md" />
                            </div>
                            <p className="text-foreground text-lg font-medium animate-pulse mb-6 relative z-10 drop-shadow-md">{status}</p>

                            {/* Demo Match Button */}
                            <AnimatePresence>
                                {showDemoButton && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className="flex flex-col items-center gap-2"
                                    >
                                        <p className="text-white/40 text-xs">Taking longer than usual?</p>
                                        <button
                                            onClick={simulateDemoMatch}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/40 hover:to-orange-500/40 border border-amber-500/40 hover:border-amber-400/60 rounded-full text-amber-300 font-semibold text-sm transition-all duration-200 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-95"
                                        >
                                            <Zap className="h-4 w-4" />
                                            Try Demo Match
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Local Video Container (PIP) */}
            <motion.div
                className={!isLocalMaximized
                    ? "absolute bottom-[4.5rem] md:bottom-24 left-3 md:left-8 w-28 sm:w-36 md:w-52 aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/20 z-20 bg-black/50 backdrop-blur-sm group hover:border-white/40 cursor-grab active:cursor-grabbing"
                    : "absolute inset-0 z-0"}
                drag={!isLocalMaximized}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            >
                {!isLocalMaximized && (
                    <div className="absolute top-1.5 right-1.5 bg-black/60 p-1 rounded-full text-white backdrop-blur-md z-30 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110" onClick={(e) => { e.stopPropagation(); setIsLocalMaximized(true); }}>
                        <Maximize2 className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                    </div>
                )}
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`h-full w-full object-cover transition-all duration-300 ${!isVideoOn ? "hidden" : ""}`}
                    style={{ filter: myVideoFilter !== "none" ? VIDEO_FILTERS.find(f => f.id === myVideoFilter)?.filter : "none" }}
                />
                {!isVideoOn && (
                    <div className="h-full w-full flex items-center justify-center text-white/50 text-[10px]">Video Off</div>
                )}
                {!isMicOn && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/60 p-1 rounded-full backdrop-blur-md z-30">
                        <MicOff className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 text-red-500" />
                    </div>
                )}
                <div className="absolute top-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[9px] md:text-xs text-white/90 backdrop-blur-md z-30 font-medium">You</div>
            </motion.div>

            {/* ─── Auto-hide Controls Bar ─────────────────────────────────── */}
            <AnimatePresence>
                {controlsVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl max-w-[calc(100vw-1.5rem)] overflow-visible"
                    >
                        {/* Mic */}
                        <button
                            className={`h-9 w-9 md:h-11 md:w-11 flex-none rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                                !isMicOn
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                                    : "bg-white/8 text-white/70 hover:bg-white/15 hover:text-white border border-white/10"
                            }`}
                            onClick={toggleMic}
                            title={isMicOn ? "Mute" : "Unmute"}
                        >
                            {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        </button>

                        {/* Camera */}
                        <button
                            className={`h-9 w-9 md:h-11 md:w-11 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                                !isVideoOn
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                                    : "bg-white/8 text-white/70 hover:bg-white/15 hover:text-white border border-white/10"
                            }`}
                            onClick={toggleVideo}
                            title={isVideoOn ? "Turn off camera" : "Turn on camera"}
                        >
                            {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                        </button>

                        {/* Chat */}
                        {currentPeerId && (
                            <button
                                className="relative h-9 w-9 md:h-11 md:w-11 shrink-0 rounded-xl flex items-center justify-center bg-white/8 text-white/70 hover:bg-white/15 hover:text-white border border-white/10 transition-all duration-200 active:scale-95"
                                onClick={() => { playSound("chat"); setIsChatOpen(!isChatOpen); }}
                                title="Chat"
                            >
                                <MessageSquare className="h-4 w-4" />
                                {chatMessages.length > 0 && !isChatOpen && (
                                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border border-black/60" />
                                )}
                            </button>
                        )}

                        {/* Divider */}
                        <div className="w-px h-5 bg-white/10 mx-0.5" />

                        {/* Next */}
                        <button
                            className="h-9 md:h-11 px-3 md:px-5 shrink-0 rounded-xl flex items-center gap-1.5 bg-white text-black hover:bg-white/90 font-semibold text-sm transition-all duration-200 active:scale-95 shadow-lg"
                            onClick={handleNext}
                            title="Next person"
                        >
                            <SkipForward className="h-4 w-4" />
                            <span className="hidden sm:inline text-xs md:text-sm">Next</span>
                        </button>

                        {/* Divider */}
                        <div className="w-px h-5 bg-white/10 mx-0.5" />

                        {/* Filters */}
                        <div className="relative">
                            <button
                                className={`h-9 w-9 md:h-11 md:w-11 shrink-0 rounded-xl flex items-center justify-center bg-white/8 text-white/70 hover:bg-white/15 hover:text-white border transition-all duration-200 active:scale-95 ${
                                    myVideoFilter !== "none" ? "border-amber-500/50 text-amber-400 bg-amber-500/10" : "border-white/10"
                                }`}
                                onClick={() => { playSound("click"); setShowFilterMenu(!showFilterMenu); }}
                                title="Video Filter"
                            >
                                <Wand2 className="h-4 w-4" />
                            </button>
                            <AnimatePresence>
                                {showFilterMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full mb-3 right-0 sm:left-1/2 sm:-translate-x-1/2 bg-slate-900/98 backdrop-blur-xl border border-white/15 p-2.5 rounded-2xl shadow-2xl grid grid-cols-2 gap-1.5 w-[min(280px,80vw)] z-50 max-h-[50vh] overflow-y-auto"
                                    >
                                        {VIDEO_FILTERS.map((f) => (
                                            <button
                                                key={f.id}
                                                onClick={(e) => { e.stopPropagation(); handleSetVideoFilter(f.id); setShowFilterMenu(false); }}
                                                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                                                    myVideoFilter === f.id ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "hover:bg-white/8 text-white/80 hover:text-white border border-transparent"
                                                }`}
                                            >
                                                <span>{f.emoji}</span> {f.name}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Media Settings */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <button
                                    className="h-9 w-9 md:h-11 md:w-11 shrink-0 rounded-xl flex items-center justify-center bg-white/8 text-white/70 hover:bg-white/15 hover:text-white border border-white/10 transition-all duration-200 active:scale-95"
                                    onClick={() => playSound("click")}
                                    title="Media Settings"
                                >
                                    <Settings className="h-4 w-4" />
                                </button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Media Settings</DialogTitle></DialogHeader>
                                <MediaDeviceSelector />
                            </DialogContent>
                        </Dialog>

                        {/* Music Mute */}
                        <button
                            className={`h-9 w-9 md:h-11 md:w-11 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                                isMusicMuted
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                                    : "bg-white/8 text-white/70 hover:bg-white/15 hover:text-white border border-white/10"
                            }`}
                            onClick={() => {
                                playSound("click")
                                const nextMuted = !isMusicMuted
                                setIsMusicMuted(nextMuted)
                                if (!nextMuted) {
                                    if (!currentPeerId && waitingAudioRef.current) {
                                        waitingAudioRef.current.volume = 0.6
                                        waitingAudioRef.current.loop = true
                                        waitingAudioRef.current.play().catch(() => {})
                                    }
                                    const gameActive = !!(activeGameId || (modularQueue && modularQueue.length > 0))
                                    if (gameActive && gameMusicRef.current) {
                                        gameMusicRef.current.volume = 0.4
                                        gameMusicRef.current.loop = true
                                        gameMusicRef.current.play().catch(() => {})
                                    }
                                }
                            }}
                            title={isMusicMuted ? "Unmute Music" : "Mute Music"}
                        >
                            {isMusicMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>

                        {/* Fullscreen (all screen sizes) */}
                        <button
                            className="h-9 w-9 md:h-11 md:w-11 shrink-0 rounded-xl flex items-center justify-center bg-white/8 text-white/70 hover:bg-white/15 hover:text-white border border-white/10 transition-all duration-200 active:scale-95"
                            onClick={() => { playSound("click"); toggleMobileFullscreen(); }}
                            title={isMobileFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isMobileFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                        </button>

                        {/* Report */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <button
                                    className="h-9 w-9 md:h-11 md:w-11 shrink-0 rounded-xl flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all duration-200 active:scale-95"
                                    onClick={() => playSound("click")}
                                    title="Report User"
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md bg-slate-900 border-red-500/30">
                                <DialogHeader>
                                    <DialogTitle className="text-red-400 flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" /> Report User
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="py-4 text-white/80">
                                    <p className="mb-4 text-sm">Are you sure you want to report this user? This will flag their account for review by moderators.</p>
                                    <div className="flex justify-end gap-3 mt-6">
                                        <Button variant="ghost" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))}>Cancel</Button>
                                        <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={async () => {
                                            try {
                                                await addDoc(collection(db, "reports"), { reportedUser: currentPeerId || "unknown", reporter: user?.uid || "unknown", timestamp: new Date() });
                                                toast.success("User reported successfully. Thank you for keeping uKnight safe.");
                                                document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                                            } catch {
                                                toast.error("Failed to submit report. Please try again later.");
                                            }
                                        }}>Submit Report</Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Chat Overlay */}
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute top-14 right-0 bottom-[72px] md:bottom-0 w-full md:w-96 bg-black/40 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col shadow-2xl"
                    >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h3 className="text-white font-medium">Chat</h3>
                                <Button
                                    size="sm"
                                    onClick={() => setIsGamePickerOpen(true)}
                                    className="relative bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 h-8 text-xs gap-1.5 px-3"
                                >
                                    <Gamepad2 className="h-3.5 w-3.5" />
                                    Play
                                    {(activeGameId || (modularQueue && modularQueue.length > 0)) && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    )}
                                </Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => setIsChatOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm text-center px-6">
                                    <MessageSquare className="h-8 w-8 mb-3 opacity-50" />
                                    <p>Send a message...</p>
                                </div>
                            ) : (
                                chatMessages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.gameResult ? (
                                            <div className={`max-w-[90%] rounded-2xl overflow-hidden border px-4 py-3 backdrop-blur-md ${
                                                msg.gameResult.winner === 'You' ? 'border-emerald-500/30 bg-emerald-500/10' :
                                                msg.gameResult.winner === 'Draw' ? 'border-amber-500/30 bg-amber-500/10' :
                                                'border-rose-500/30 bg-rose-500/10'
                                            }`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-base">{msg.gameResult.emoji}</span>
                                                    <span className="text-xs font-bold text-white/60">{msg.gameResult.gameName}</span>
                                                </div>
                                                <p className={`text-sm font-black mb-1 ${
                                                    msg.gameResult.winner === 'You' ? 'text-emerald-400' :
                                                    msg.gameResult.winner === 'Draw' ? 'text-amber-400' : 'text-rose-400'
                                                }`}>
                                                    {msg.gameResult.winner === 'You' ? '🎉 You won!' : msg.gameResult.winner === 'Draw' ? '🤝 Draw!' : 'Stranger won!'}
                                                </p>
                                                <div className="flex gap-3 text-[10px] text-white/40">
                                                    <span>You: {msg.gameResult.yourScore}</span>
                                                    <span>•</span>
                                                    <span>Stranger: {msg.gameResult.strangerScore}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`max-w-[85%] px-4 py-2.5 text-sm backdrop-blur-md shadow-md ${msg.sender === 'me'
                                                ? 'bg-linear-to-tr from-amber-600 to-amber-500 text-white font-medium border border-amber-400/50 rounded-2xl rounded-tr-sm'
                                                : 'bg-white/10 text-white border border-white/10 rounded-2xl rounded-tl-sm'
                                                }`}>
                                                {msg.text}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 bg-black/20">
                            <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="flex gap-2">
                                <Input
                                    placeholder="Type a message..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    disabled={!currentPeerId}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                                />
                                <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={!currentPeerId || !chatInput.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Game Pigeon Incoming Invite Banner */}
            {gamePigeonInvite && (
                <div className="absolute bottom-[88px] md:bottom-32 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/40 rounded-2xl px-4 md:px-5 py-3 md:py-4 shadow-2xl shadow-amber-500/20 flex items-center gap-3 md:gap-4 backdrop-blur-xl w-[min(340px,calc(100vw-1.5rem))]">
                    <span className="text-2xl">{
                        gamePigeonInvite.gameType.startsWith('tournament:')
                            ? '🏆'
                            : GAMES.find(g => g.id === gamePigeonInvite.gameType)?.emoji ?? '🎮'
                    }</span>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white">Game Challenge!</p>
                        <p className="text-[11px] text-white/50">{
                            gamePigeonInvite.gameType.startsWith('tournament:')
                                ? `Tournament (${gamePigeonInvite.gameType.split(':')[1].split(',').length} games)`
                                : GAMES.find(g => g.id === gamePigeonInvite.gameType)?.name ?? gamePigeonInvite.gameType
                        }</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={acceptGamePigeonInvite} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors">Accept</button>
                        <button onClick={declineGamePigeonInvite} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 text-xs font-bold rounded-xl transition-colors">Decline</button>
                    </div>
                </div>
            )}

            {/* Game Pigeon Picker */}
            <GamePickerModal
                isOpen={isGamePickerOpen}
                onClose={() => setIsGamePickerOpen(false)}
                onStartGame={(gameId) => {
                    if (currentPeerId && stompClient.current?.connected && !isDemoMatch) {
                        sendGamePigeonInvite(gameId)
                    } else {
                        setModularQueue(null)
                        setActiveGameId(gameId)
                    }
                }}
                onStartModular={(gameIds) => {
                    if (currentPeerId && stompClient.current?.connected && !isDemoMatch) {
                        sendGamePigeonInvite(gameIds)
                    } else {
                        setActiveGameId(null)
                        setModularQueue(gameIds)
                    }
                }}
            />

            {/* Game Pigeon Overlay */}
            {(activeGameId || (modularQueue && modularQueue.length > 0)) && (
                <GameOverlay
                    gameId={activeGameId}
                    modularQueue={modularQueue}
                    myRole={gamePigeonRole ?? undefined}
                    sendMove={gamePigeonMatchId ? sendGamePigeonMove : undefined}
                    lastOpponentMove={gamePigeonLastMove}
                    onGameResult={(result: GameResult) => {
                        setChatMessages(prev => [...prev, {
                            id: crypto.randomUUID(),
                            sender: 'me',
                            text: `${result.emoji} ${result.gameName}`,
                            gameResult: result,
                        }])
                        setIsChatOpen(true)
                        setGamePigeonMatchId(null)
                        setGamePigeonRole(null)
                        setGamePigeonLastMove(null)
                    }}
                    onClose={() => {
                        setActiveGameId(null)
                        setModularQueue(null)
                        setGamePigeonMatchId(null)
                        setGamePigeonRole(null)
                        setGamePigeonLastMove(null)
                    }}
                />
            )}
        </div>
    )
}

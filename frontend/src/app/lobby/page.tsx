"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, Settings, Users, Send, MessageSquare, X, SkipForward, Gamepad2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MediaDeviceSelector } from "@/components/media-device-selector"
import { useMediaStore } from "@/store/media-store"
import { useAuth } from "@/context/auth-context"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Client, IMessage, StompSubscription } from "@stomp/stompjs"
import { Input } from "@/components/ui/input"
import { GamePickerModal, GAMES } from "@/components/game-pigeon/GamePickerModal"
import { GameOverlay } from "@/components/game-pigeon/GameOverlay"
import type { GameResult } from "@/components/game-pigeon/types"
import { RefreshCw } from "lucide-react"
import { createPortal } from "react-dom"

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

type SignalType = 'OFFER' | 'ANSWER' | 'ICE' | 'BYE' | 'MEDIA_STATE';

interface SignalData {
    type: SignalType;
    sdp?: string;
    candidate?: string;
    senderId?: string;
    targetPeerId?: string;
    mediaState?: { audioEnabled: boolean, videoEnabled: boolean };
}

interface MatchData {
    peerId: string;
    initiator: boolean;
}

const BouncingCircles = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const circlesRef = useRef<(HTMLDivElement | null)[]>([]);
    const stateRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; color: string }[]>([]);

    useEffect(() => {
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Initialize state
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

        // Apply initial static styles
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

                    // Bounce off edges (DVD style)
                    if (circle.x <= 0) {
                        circle.x = 0;
                        circle.vx *= -1;
                    } else if (circle.x + circle.size >= currentWidth) {
                        circle.x = currentWidth - circle.size;
                        circle.vx *= -1;
                    }

                    if (circle.y <= 0) {
                        circle.y = 0;
                        circle.vy *= -1;
                    } else if (circle.y + circle.size >= currentHeight) {
                        circle.y = currentHeight - circle.size;
                        circle.vy *= -1;
                    }

                    const el = circlesRef.current[i];
                    if (el) {
                        el.style.transform = `translate(${circle.x}px, ${circle.y}px)`;
                    }
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
                    ref={(el) => {
                        circlesRef.current[i] = el;
                    }}
                    className="absolute rounded-full mix-blend-screen filter blur-xl opacity-40 will-change-transform top-0 left-0"
                />
            ))}
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
    const { videoDeviceId, audioDeviceId } = useMediaStore()
    const { user: firebaseUser } = useAuth()

    // Game Pigeon state
    const [isGamePickerOpen, setIsGamePickerOpen] = useState(false)
    const [activeGameId, setActiveGameId] = useState<string | null>(null)
    const [modularQueue, setModularQueue] = useState<string[] | null>(null)
    const [gamePigeonMatchId, setGamePigeonMatchId] = useState<string | null>(null)
    const [gamePigeonRole, setGamePigeonRole] = useState<"initiator" | "responder" | null>(null)
    const [gamePigeonLastMove, setGamePigeonLastMove] = useState<Record<string, unknown> | null>(null)
    const [gamePigeonInvite, setGamePigeonInvite] = useState<{ senderId: string; matchId: string; gameType: string } | null>(null)

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

    // --- Mutable refs for latest callbacks and state ---
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

    const log = (msg: string) => {
        console.log(msg)
    }

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
                try {
                    await pc.addIceCandidate(candidate);
                } catch (e) {
                    console.error("Error adding buffered ICE candidate", e);
                }
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
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
            remoteVideoRef.current.load();
        }

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

        // Handle SKIP signal (BYE)
        if (data.type === 'BYE') {
            log("Partner skipped.");
            handlePartnerDisconnect();
            return;
        }

        if (data.type === 'MEDIA_STATE' && data.mediaState) {
            setRemoteMicOn(data.mediaState.audioEnabled);
            setRemoteVideoOn(data.mediaState.videoEnabled);
            return;
        }

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
                        try {
                            log("Adding ICE candidate immediately");
                            await pc.addIceCandidate(candidate);
                        } catch (e) {
                            console.error("Error adding ICE candidate", e);
                        }
                    } else {
                        log("Buffering ICE candidate (Remote description not set)");
                        iceCandidatesQueue.current.push(candidate);
                    }
                }
            }
        } catch (error) {
            console.error("Error handling signal:", error);
        }
    }

    const createPeerConnection = (targetPeerId: string, stream: MediaStream) => {
        if (peerConnection.current) {
            peerConnection.current.close();
        }

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                { urls: 'stun:stun.services.mozilla.com' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });

        pc.oniceconnectionstatechange = () => {
            log(`ICE Check: ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === 'failed') {
                log("ICE connection failed. Retrying...");
                pc.restartIce();
            }
        };

        pc.onsignalingstatechange = () => {
            log(`Signaling State: ${pc.signalingState}`);
        };

        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                log(`Generated Candidate: ${event.candidate.type} (${event.candidate.protocol})`);
                sendSignal({
                    type: 'ICE',
                    candidate: JSON.stringify(event.candidate),
                    targetPeerId: targetPeerId
                });
            }
        };

        pc.ontrack = (event) => {
            log("Track received: " + event.track.kind);
            if (remoteVideoRef.current) {
                const existingStream = remoteVideoRef.current.srcObject as MediaStream;
                if (event.streams && event.streams[0]) {
                    if (existingStream !== event.streams[0]) {
                        log("Assigning new remote stream to video element");
                        remoteVideoRef.current.srcObject = event.streams[0];
                    }
                } else {
                    if (!existingStream) {
                        log("Creating fallback stream for track");
                        const newStream = new MediaStream([event.track]);
                        remoteVideoRef.current.srcObject = newStream;
                    } else {
                        log("Adding track to existing fallback stream");
                        if (!existingStream.getTracks().some(t => t.id === event.track.id)) {
                            existingStream.addTrack(event.track);
                        }
                    }
                }

                if (remoteVideoRef.current.paused) {
                    remoteVideoRef.current.play().catch(e => {
                        if (e.name !== 'AbortError') console.error("Autoplay error:", e);
                    });
                }
            }
        };

        pc.onconnectionstatechange = () => {
            log(`Connection State: ${pc.connectionState}`)
        };

        peerConnection.current = pc;
    }

    const handleMatchFound = async (data: MatchData, stream: MediaStream) => {
        if (currentPeerId === data.peerId) {
            log("Ignoring duplicate match event for same peer.");
            return;
        }

        log(`Match found! Partner: ${data.peerId.substring(0, 5)}... Initiator: ${data.initiator}`)
        setStatus("Connected! Negotiating...")
        setCurrentPeerId(data.peerId);
        setChatMessages([]);
        setIsChatOpen(false);
        setRemoteMicOn(true);
        setRemoteVideoOn(true);

        createPeerConnection(data.peerId, stream);

        // Randomize icebreaker on new match
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
            } catch (err) {
                console.error("Error creating offer:", err);
            }
        }
    }

    const subscribeToTopics = (client: Client, uuid: string) => {
        subscriptionMatch.current = client.subscribe(`/topic/match/${uuid}`, (message: IMessage) => {
            const data = JSON.parse(message.body) as MatchData
            if (handleMatchFoundRef.current) {
                handleMatchFoundRef.current(data, localStreamRef.current!)
            }
        })

        subscriptionSignal.current = client.subscribe(`/topic/signal/${uuid}`, (message: IMessage) => {
            const data = JSON.parse(message.body) as SignalData
            if (handleSignalRef.current) {
                handleSignalRef.current(data)
            }
        })

        subscriptionChat.current = client.subscribe(`/topic/chat/${uuid}`, (message: IMessage) => {
            const data = JSON.parse(message.body) as { message: string };
            setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'partner', text: data.message }]);
            if (!isChatOpen) {
                setIsChatOpen(true);
            }
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

                // Game Pigeon invite
                setGamePigeonInvite({ senderId: data.senderId, matchId: data.matchId, gameType });
                setChatMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    sender: 'partner',
                    text: `🎮 Partner challenged you to ${displayName}! Check the invite below.`
                }]);
                setIsChatOpen(true);
            } else if (data.type === 'GAME_START') {
                // Game Pigeon start
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
                // Relay opponent move to the active game component
                setGamePigeonLastMove(data.action || null);
            }
        })
    }

    const sendChat = () => {
        const now = Date.now();
        if (now - lastChatTime.current < 1000) return; // 1 second cooldown
        lastChatTime.current = now;

        if (!chatInput.trim() || !currentPeerId || !stompClient.current?.connected) return;

        // Chat spam protection removed per user request - allow unlimited messaging

        const message = chatInput.trim();

        // Handle slash commands
        if (message.toLowerCase() === '/knockout') {
            sendGamePigeonInvite('pigeon_knockout');
            setChatInput("");
            return;
        }

        setChatMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'me', text: message }]);
        setChatInput("");

        stompClient.current.publish({
            destination: '/app/chat',
            headers: { 'uuid': myUuid.current },
            body: JSON.stringify({ targetPeerId: currentPeerId, message: message })
        });
    }

    const sendGamePigeonInvite = (gameData: string | string[]) => {
        if (!currentPeerId || !stompClient.current?.connected) return;

        const isTournament = Array.isArray(gameData);
        const gameTypeStr = isTournament ? `tournament:${gameData.join(',')}` : (gameData as string);
        
        let displayName = gameData as string;
        if (isTournament) {
            displayName = `Tournament (${gameData.length} games)`;
        } else {
            displayName = GAMES.find(g => g.id === gameData)?.name ?? (gameData as string);
        }

        setChatMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender: 'me',
            text: `🎮 Game invite sent: ${displayName}. Waiting for partner...`
        }]);
        setIsChatOpen(true);

        stompClient.current.publish({
            destination: '/app/game/invite',
            headers: { 'uuid': myUuid.current },
            body: JSON.stringify({ targetPeerId: currentPeerId, gameType: gameTypeStr })
        });

        // Optimistically set role as initiator and wait for GAME_START
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
            body: JSON.stringify({
                targetPeerId: gamePigeonInvite.senderId,
                matchId: gamePigeonInvite.matchId,
                gameType: gamePigeonInvite.gameType,
                role: 'initiator'  // tell server to notify initiator
            })
        });

        setGamePigeonMatchId(gamePigeonInvite.matchId);
        setGamePigeonRole('responder');
        
        const isTournament = gamePigeonInvite.gameType.startsWith('tournament:');
        if (isTournament) {
            setActiveGameId(null);
            setModularQueue(gamePigeonInvite.gameType.split(':')[1].split(','));
        } else {
            setActiveGameId(gamePigeonInvite.gameType);
            setModularQueue(null);
        }
        setGamePigeonInvite(null);
    }

    const declineGamePigeonInvite = () => {
        setGamePigeonInvite(null);
    }

    const handleNext = () => {
        const now = Date.now();
        if (now - lastNextTime.current < 2000) return;
        lastNextTime.current = now;

        if (currentPeerId) {
            sendEndSession();
            sendSignal({ type: 'BYE', targetPeerId: currentPeerId });
        }
        cleanupAndRejoin();
    }

    const toggleMic = () => {
        const nextState = !isMicOn;
        setIsMicOn(nextState)
        if (localStream) {
            localStream.getAudioTracks().forEach(t => t.enabled = nextState);
        }
        if (currentPeerId) {
            sendSignal({ type: 'MEDIA_STATE', targetPeerId: currentPeerId, mediaState: { audioEnabled: nextState, videoEnabled: isVideoOn } });
        }
    }

    const toggleVideo = () => {
        const nextState = !isVideoOn;
        setIsVideoOn(nextState)
        if (localStream) {
            localStream.getVideoTracks().forEach(t => t.enabled = nextState);
        }
        if (currentPeerId) {
            sendSignal({ type: 'MEDIA_STATE', targetPeerId: currentPeerId, mediaState: { audioEnabled: isMicOn, videoEnabled: nextState } });
        }
    }

    // --- Effects ---

    useEffect(() => {
        let stream: MediaStream | null = null;
        async function getMedia() {
            try {
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => track.stop());
                }

                const constraints = {
                    video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
                    audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
                }

                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints)
                    setStatus("Camera Ready. Connecting to server...")
                } catch (err) {
                    console.warn("Error accessing video+audio. Trying fallback to audio only.", err)
                    try {
                        const audioConstraints = { audio: constraints.audio, video: false }
                        stream = await navigator.mediaDevices.getUserMedia(audioConstraints)
                        setStatus("Mic Ready (No Video). Connecting to server...")
                    } catch (audioErr) {
                        console.warn("Error accessing audio, proceeding with no media.", audioErr)
                        stream = new MediaStream() // empty stream
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
                console.error("Unexpected error in media initialization.", err)
                setStatus("Initialization Error.")
            }
        }
        getMedia()

        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        }
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
                    body: JSON.stringify({ university: "University of Central Florida", userId: firebaseUser?.uid || "" })
                })
            },
            onStompError: (frame) => {
                log('Broker Error: ' + frame.headers['message'])
            },
            onDisconnect: () => {
                setStatus("Disconnected. Retrying...")
            }
        });

        client.activate();
        stompClient.current = client;

        return () => {
            if (peerConnection.current) peerConnection.current.close();
            if (client.connected) {
                client.publish({
                    destination: '/app/end-session',
                    headers: { 'uuid': uuid },
                    body: ''
                });
            }
            client.deactivate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localStream])

    // --- UI Variants ---
    const glassButton = "bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 text-white shadow-lg transition-all"

    return (
        <div className="relative h-screen w-full bg-black overflow-hidden flex items-center justify-center">

            {/* Remote Video (Full Screen) */}
            <div className="absolute inset-0">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                />

                {/* Remote Media Offline Overlay */}
                {currentPeerId && !remoteVideoOn && (
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

                {/* Icebreaker Banner */}
                {currentPeerId && portalNode && createPortal(
                    <div className="w-full max-w-lg lg:max-w-xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg rounded-full flex flex-row items-center gap-2 px-2 py-1 animate-in slide-in-from-top-2">
                        <div className="flex flex-row items-center gap-1.5 border-r border-white/10 pr-2">
                           <button onClick={() => setRandomIcebreaker("pop")} className="text-sm sm:text-base hover:scale-110 active:scale-95 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-sm" title="Current Events">🔥</button>
                           <button onClick={() => setRandomIcebreaker("funny")} className="text-sm sm:text-base hover:scale-110 active:scale-95 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-500/30 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-sm" title="Wild Icebreaker">🧊</button>
                           <button onClick={() => setRandomIcebreaker("joke")} className="text-sm sm:text-base hover:scale-110 active:scale-95 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/30 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-sm" title="Joke">😂</button>
                        </div>
                        <div className="flex-1 flex items-center px-1">
                            <TypewriterText text={iceText} speed={30} className={`text-xs md:text-sm lg:text-[15px] font-bold leading-snug tracking-wide ${iceType === "pop" ? "text-cyan-100" : iceType === "funny" ? "text-fuchsia-100" : "text-amber-100"}`} />
                        </div>
                    </div>,
                    portalNode
                )}
                {/* Fallback pattern if portal doesn't exist */}
                {currentPeerId && !portalNode && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 w-[90%] md:w-auto max-w-lg bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg rounded-full flex flex-row items-center gap-2 px-2 py-1.5">
                        <div className="flex flex-row items-center gap-1.5 border-r border-white/10 pr-2">
                           <button onClick={() => setRandomIcebreaker("pop")} className="text-sm sm:text-base hover:scale-110 active:scale-95 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-sm" title="Current Events">🔥</button>
                           <button onClick={() => setRandomIcebreaker("funny")} className="text-sm sm:text-base hover:scale-110 active:scale-95 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-500/30 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-sm" title="Wild Icebreaker">🧊</button>
                           <button onClick={() => setRandomIcebreaker("joke")} className="text-sm sm:text-base hover:scale-110 active:scale-95 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/30 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-sm" title="Joke">😂</button>
                        </div>
                        <div className="flex-1 flex items-center px-1">
                            <TypewriterText text={iceText} speed={30} className={`text-xs md:text-sm font-bold leading-snug tracking-wide max-w-[280px] sm:max-w-md wrap-break-word ${iceType === "pop" ? "text-cyan-100" : iceType === "funny" ? "text-fuchsia-100" : "text-amber-100"}`} />
                        </div>
                    </div>
                )}

                {/* Status Overlay */}
                {!currentPeerId && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-md z-10 overflow-hidden">
                        <BouncingCircles />
                        
                        {/* Waiting Text */}
                        <div className="text-center relative z-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                <Users className="h-16 w-16 text-primary mx-auto mb-4 relative z-10" />
                            </div>
                            <p className="text-foreground text-lg font-medium animate-pulse">{status}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Local Video (Floating PIP) */}
            <motion.div
                className="absolute bottom-32 md:bottom-8 lg:bottom-12 left-4 md:left-8 w-32 md:w-48 aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/20 z-20 bg-black/50 backdrop-blur-sm"
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`h-full w-full object-cover ${!isVideoOn ? "hidden" : ""}`}
                />
                {!isVideoOn && (
                    <div className="h-full w-full flex items-center justify-center text-white/50 text-xs">
                        Video Off
                    </div>
                )}
                {!isMicOn && (
                    <div className="absolute bottom-2 right-2 bg-black/60 p-1.5 rounded-full backdrop-blur-md z-30">
                        <MicOff className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                    </div>
                )}
                <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] md:text-xs text-white/90 backdrop-blur-md z-30 font-medium">
                    You
                </div>
            </motion.div>

            {/* Controls Bar */}
            <div className="absolute bottom-8 left-0 right-0 flex flex-wrap justify-center items-center gap-3 px-4 z-30">
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full ${glassButton} ${!isMicOn ? "bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30" : ""}`}
                    onClick={toggleMic}
                >
                    {isMicOn ? <Mic className="h-5 w-5 md:h-6 md:w-6" /> : <MicOff className="h-5 w-5 md:h-6 md:w-6" />}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full ${glassButton} ${!isVideoOn ? "bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30" : ""}`}
                    onClick={toggleVideo}
                >
                    {isVideoOn ? <Video className="h-5 w-5 md:h-6 md:w-6" /> : <VideoOff className="h-5 w-5 md:h-6 md:w-6" />}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full ${glassButton}`}
                    onClick={() => setIsChatOpen(!isChatOpen)}
                >
                    <MessageSquare className="h-5 w-5 md:h-6 md:w-6" />
                    {chatMessages.length > 0 && !isChatOpen && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 md:h-3 md:w-3 bg-red-500 rounded-full border border-black" />
                    )}
                </Button>

                <Button
                    className="h-12 md:h-14 px-6 md:px-8 shrink-0 rounded-full bg-white text-black hover:bg-white/90 font-medium shadow-xl shadow-white/10 transition-all active:scale-95"
                    onClick={handleNext}
                >
                    <SkipForward className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    Next
                </Button>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className={`h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full ${glassButton}`}>
                            <Settings className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Media Settings</DialogTitle>
                        </DialogHeader>
                        <MediaDeviceSelector />
                    </DialogContent>
                </Dialog>

                <Link href="/">
                    <Button variant="ghost" size="icon" className={`h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full ${glassButton} bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20`}>
                        <X className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                </Link>
            </div>

            {/* Chat Overlay */}
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute top-14 right-0 bottom-0 w-full md:w-96 bg-black/40 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col shadow-2xl"
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
                                            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm backdrop-blur-md ${msg.sender === 'me'
                                                ? 'bg-white/20 text-white border border-white/20 rounded-tr-sm'
                                                : 'bg-white/10 text-white border border-white/10 rounded-tl-sm'
                                                }`}>
                                                {msg.text}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 bg-black/20">
                            <form
                                onSubmit={(e) => { e.preventDefault(); sendChat(); }}
                                className="flex gap-2"
                            >
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
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/40 rounded-2xl px-5 py-4 shadow-2xl shadow-amber-500/20 flex items-center gap-4 backdrop-blur-xl min-w-[280px]">
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
                    // If connected to a peer, send a real invite; otherwise local demo
                    if (currentPeerId && stompClient.current?.connected) {
                        sendGamePigeonInvite(gameId)
                    } else {
                        setModularQueue(null)
                        setActiveGameId(gameId)
                    }
                }}
                onStartModular={(gameIds) => {
                    // If connected to a peer, send a real invite; otherwise local demo
                    if (currentPeerId && stompClient.current?.connected) {
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

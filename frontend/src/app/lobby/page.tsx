"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, Settings, Users, Send, MessageSquare, X, SkipForward } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MediaDeviceSelector } from "@/components/media-device-selector"
import { useMediaStore } from "@/store/media-store"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Client, IMessage, StompSubscription } from "@stomp/stompjs"
import { Input } from "@/components/ui/input"
import { KnockoutGame } from "@/components/knockout/KnockoutGame"

type ChatMessage = {
    id: string; // Unique ID for keys
    sender: 'me' | 'partner';
    text: string;
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

    // Game state
    const [isGameActive, setIsGameActive] = useState(false)
    const [gameMatchId, setGameMatchId] = useState<string | null>(null)
    const [gameInvite, setGameInvite] = useState<{ senderId: string, matchId: string } | null>(null)

    // --- Mutable refs for latest callbacks and state ---
    const localStreamRef = useRef<MediaStream | null>(null)
    const handleMatchFoundRef = useRef<((data: MatchData, stream: MediaStream) => Promise<void>) | null>(null)
    const handleSignalRef = useRef<((data: SignalData) => Promise<void>) | null>(null)

    useEffect(() => {
        localStreamRef.current = localStream;
        handleMatchFoundRef.current = handleMatchFound;
        handleSignalRef.current = handleSignal;
    })

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

    const cleanupAndRejoin = () => {
        setStatus("Searching for verified students...");
        setCurrentPeerId(null);
        setChatMessages([]);
        setIsChatOpen(false);
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
            remoteVideoRef.current.load(); // Force reload to clear frame
        }

        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        // Re-join lobby
        if (stompClient.current && stompClient.current.connected) {
            stompClient.current.publish({
                destination: '/app/join',
                headers: { 'uuid': myUuid.current },
                body: "University of Central Florida"
            });
        }
    }

    const handlePartnerDisconnect = () => {
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
                setChatMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    sender: 'me',
                    text: `(Server confirmed: Invite delivered to partner)`
                }]);
            } else if (data.type === 'GAME_INVITE') {
                setGameInvite({ senderId: data.senderId, matchId: data.matchId });
                // Also show in chat for better visibility
                setChatMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    sender: 'partner',
                    text: "Challenge! Partner wants to play Knockout. Use the buttons above to respond."
                }]);
            } else if (data.type === 'GAME_START') {
                setGameMatchId(data.matchId);
                setIsGameActive(true);
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
            sendGameInvite();
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

    const sendGameInvite = () => {
        if (!currentPeerId || !stompClient.current?.connected) {
            console.error("Cannot send invite: ", { currentPeerId, connected: stompClient.current?.connected });
            return;
        }

        console.log("Sending game invite to:", currentPeerId);

        // Add feedback to chat history for the sender
        setChatMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender: 'me',
            text: "Challenge sent! Waiting for partner to accept..."
        }]);

        stompClient.current.publish({
            destination: '/app/game/invite',
            headers: { 'uuid': myUuid.current },
            body: JSON.stringify({ targetPeerId: currentPeerId, gameType: 'knockout' })
        });
    }

    const acceptGameInvite = () => {
        if (!gameInvite || !stompClient.current?.connected) return;

        stompClient.current.publish({
            destination: '/app/game/accept',
            headers: { 'uuid': myUuid.current },
            body: JSON.stringify({ targetPeerId: gameInvite.senderId, matchId: gameInvite.matchId })
        });

        setGameMatchId(gameInvite.matchId);
        setGameInvite(null);
        setIsGameActive(true);
    }

    const declineGameInvite = () => {
        setGameInvite(null);
    }

    const handleNext = () => {
        const now = Date.now();
        if (now - lastNextTime.current < 2000) return; // 2 second cooldown
        lastNextTime.current = now;

        if (currentPeerId) {
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
            sendSignal({ type: 'MEDIA_STATE', targetPeerId: currentPeerId, mediaState: { audioEnabled: nextState, videoEnabled: isVideoOn }});
        }
    }

    const toggleVideo = () => {
        const nextState = !isVideoOn;
        setIsVideoOn(nextState)
        if (localStream) {
            localStream.getVideoTracks().forEach(t => t.enabled = nextState);
        }
        if (currentPeerId) {
            sendSignal({ type: 'MEDIA_STATE', targetPeerId: currentPeerId, mediaState: { audioEnabled: isMicOn, videoEnabled: nextState }});
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
            brokerURL: 'wss://uknight-backend-536429702801.us-central1.run.app/ws',
            reconnectDelay: 5000,
            debug: (str) => console.log(str),
            onConnect: () => {
                log("Connected to Backend! UUID: " + uuid.substring(0, 5))
                setStatus("Searching for verified students...")
                subscribeToTopics(client, uuid);
                client.publish({
                    destination: '/app/join',
                    headers: { 'uuid': uuid },
                    body: "University of Central Florida"
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
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 shadow-xl border border-white/10">
                        <MicOff className="h-5 w-5 text-red-500" />
                        <span className="text-white text-sm font-medium">Partner Muted</span>
                    </div>
                )}

                {/* Status Overlay */}
                {!currentPeerId && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-10">
                        <div className="text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                <Users className="h-16 w-16 text-primary mx-auto mb-4 relative z-10" />
                            </div>
                            <p className="text-white text-lg font-medium animate-pulse">{status}</p>
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
                    style={{ transform: "scaleX(-1)" }}
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
                                {currentPeerId && !isGameActive && (
                                    <Button
                                        size="sm"
                                        onClick={sendGameInvite}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs"
                                    >
                                        Play
                                    </Button>
                                )}
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
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm backdrop-blur-md ${msg.sender === 'me'
                                            ? 'bg-white/20 text-white border border-white/20 rounded-tr-sm'
                                            : 'bg-white/10 text-white border border-white/10 rounded-tl-sm'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {gameInvite && (
                            <div className="p-4 border-b border-white/10 bg-emerald-500/10">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-white">
                                        <span className="font-medium">Partner</span> wants to play Knockout!
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={acceptGameInvite}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={declineGameInvite}
                                            className="text-white/70 hover:text-white hover:bg-white/10"
                                        >
                                            Decline
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

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

            {/* Knockout Game Overlay */}
            {isGameActive && gameMatchId && (
                <KnockoutGame
                    matchId={gameMatchId}
                    myId={myUuid.current}
                    opponentId={currentPeerId!}
                    stompClient={stompClient.current}
                    onClose={() => {
                        setIsGameActive(false);
                        setGameMatchId(null);
                    }}
                />
            )}
        </div>
    )
}

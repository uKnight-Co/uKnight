"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, RefreshCw, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Puck = {
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
};

type GameState = {
    matchId: string;
    pucks: [Puck | null, Puck | null];
    currentTurn: string;
    player1Score: number;
    player2Score: number;
    round: number;
    roundOver: boolean;
    winner: string | null;
};

interface StompClient {
    connected: boolean;
    subscribe: (dest: string, cb: (msg: { body: string }) => void) => { unsubscribe: () => void };
    publish: (params: { destination: string; headers: Record<string, string>; body: string }) => void;
}

type KnockoutProps = {
    matchId: string | null;
    myId: string;
    opponentId: string;
    stompClient: StompClient | null;
    onClose: () => void;
};

const CANVAS_SIZE = 400;
const PLATFORM_RADIUS = 0.45;
const VISUAL_PLATFORM_RADIUS = 180;

function shadeColor(col: string, amt: number) {
    const usePound = col[0] === "#";
    const num = parseInt(col.slice(1), 16);
    let r = (num >> 16) + amt;
    let g = (num >> 8 & 0x00FF) + amt;
    let b = (num & 0x0000FF) + amt;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, "0");
}

function drawPuck(ctx: CanvasRenderingContext2D, puck: Puck, color: string) {
    const x = CANVAS_SIZE / 2 + puck.x * (CANVAS_SIZE / 2);
    const y = CANVAS_SIZE / 2 + puck.y * (CANVAS_SIZE / 2);
    const radius = puck.radius * (CANVAS_SIZE / 2);

    const dist = Math.sqrt(puck.x * puck.x + puck.y * puck.y);
    const opacity = dist > PLATFORM_RADIUS ? 0.3 : 1;

    ctx.globalAlpha = opacity;

    ctx.beginPath();
    ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x - radius / 3, y - radius / 3, 0, x, y, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, shadeColor(color, -20));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = 1;
}

export function KnockoutGame({ matchId, myId, opponentId, stompClient, onClose }: KnockoutProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pucksRef = useRef<[Puck, Puck]>([
        { x: -0.3, y: 0, radius: 0.05, vx: 0, vy: 0 },
        { x: 0.3, y: 0, radius: 0.05, vx: 0, vy: 0 }
    ]);

    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [renderTrigger, setRenderTrigger] = useState(0);

    // --- Physics Helpers (Mirrored from Backend) ---

    const resolveCollision = (p1: Puck, p2: Puck) => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = p1.radius + p2.radius;

        if (distance < minDistance && distance > 0) {
            const nx = dx / distance;
            const ny = dy / distance;
            const dvx = p1.vx - p2.vx;
            const dvy = p1.vy - p2.vy;
            const dvn = dvx * nx + dvy * ny;

            if (dvn > 0) {
                const impulse = dvn;
                p1.vx -= impulse * nx;
                p1.vy -= impulse * ny;
                p2.vx += impulse * nx;
                p2.vy += impulse * ny;
            }

            const overlap = (minDistance - distance) / 2;
            p1.x -= overlap * nx;
            p1.y -= overlap * ny;
            p2.x += overlap * nx;
            p2.y += overlap * ny;
        }
    };

    // --- Game Loop ---

    useEffect(() => {
        let frameId: number;

        const update = () => {
            const p = pucksRef.current;
            let moved = false;

            // Update positions and apply friction
            for (const puck of p) {
                if (Math.abs(puck.vx) > 0.0001 || Math.abs(puck.vy) > 0.0001) {
                    puck.x += puck.vx;
                    puck.y += puck.vy;
                    puck.vx *= 0.98;
                    puck.vy *= 0.98;
                    moved = true;
                } else {
                    puck.vx = 0;
                    puck.vy = 0;
                }
            }

            resolveCollision(p[0], p[1]);

            if (moved || isDragging) {
                setRenderTrigger(prev => prev + 1);
            }

            frameId = requestAnimationFrame(update);
        };

        frameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frameId);
    }, [isDragging]);

    // --- Rendering ---

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        const centerX = CANVAS_SIZE / 2;
        const centerY = CANVAS_SIZE / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, VISUAL_PLATFORM_RADIUS, 0, Math.PI * 2);
        const platformGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, VISUAL_PLATFORM_RADIUS);
        platformGrad.addColorStop(0, "#1e293b");
        platformGrad.addColorStop(1, "#0f172a");
        ctx.fillStyle = platformGrad;
        ctx.fill();
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, VISUAL_PLATFORM_RADIUS * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = "#1e293b";
        ctx.stroke();

        const p = pucksRef.current;
        drawPuck(ctx, p[0], "#ef4444");
        drawPuck(ctx, p[1], "#3b82f6");

        if (isDragging && isMyTurn) {
            const dx = dragEnd.x - dragStart.x;
            const dy = dragEnd.y - dragStart.y;
            const magnitude = Math.sqrt(dx * dx + dy * dy);

            if (magnitude > 10) {
                ctx.beginPath();
                ctx.moveTo(dragStart.x, dragStart.y);
                ctx.lineTo(dragStart.x - dx * 0.8, dragStart.y - dy * 0.8);
                ctx.strokeStyle = "#10b981";
                ctx.lineWidth = 4;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.beginPath();
                ctx.arc(dragStart.x, dragStart.y, Math.min(magnitude / 2, 60), 0, Math.PI * 2);
                ctx.fillStyle = "#10b98120";
                ctx.fill();
                ctx.strokeStyle = "#10b981";
                ctx.stroke();
            }
        }
    }, [renderTrigger, isDragging, isMyTurn, dragStart, dragEnd]);

    // --- Input Handlers ---

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isMyTurn) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const myIndex = gameState?.pucks[0]?.radius ? (myId === opponentId ? 1 : 0) : 0; // Simple fallback
        // Better indexing: check who we are in the game
        const p = pucksRef.current[myIndex];
        const px = CANVAS_SIZE / 2 + p.x * (CANVAS_SIZE / 2);
        const py = CANVAS_SIZE / 2 + p.y * (CANVAS_SIZE / 2);
        const pr = p.radius * (CANVAS_SIZE / 2);

        if (Math.sqrt((x - px) ** 2 + (y - py) ** 2) < pr + 20) {
            setIsDragging(true);
            setDragStart({ x: px, y: py });
            setDragEnd({ x, y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        setDragEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);

        const dx = dragEnd.x - dragStart.x;
        const dy = dragEnd.y - dragStart.y;
        if (Math.sqrt(dx * dx + dy * dy) > 20) {
            stompClient.publish({
                destination: "/app/game/move",
                headers: { uuid: myId },
                body: JSON.stringify({ matchId, dx, dy })
            });
        }
    };

    // --- WebSocket Handlers ---

    useEffect(() => {
        if (!stompClient?.connected) return;

        const sub = stompClient.subscribe(`/topic/game/${myId}`, (msg: { body: string }) => {
            const data = JSON.parse(msg.body);

            if (data.type === "GAME_MOVE_ANNOUNCE") {
                const isMe = data.senderId === myId;
                if (!isMe) {
                    const idx = 1;
                    pucksRef.current[idx].vx = data.dx * 0.015;
                    pucksRef.current[idx].vy = data.dy * 0.015;
                } else {
                    // Apply move to my puck
                    pucksRef.current[0].vx = data.dx * 0.015;
                    pucksRef.current[0].vy = data.dy * 0.015;
                }
            } else if (data.type === "GAME_STATE_SYNC") {
                setGameState(data);
                setIsMyTurn(data.currentTurn === myId);

                // Absolute reconciliation (stop current movement if any)
                if (data.pucks[0]) {
                    pucksRef.current[0].x = data.pucks[0].x;
                    pucksRef.current[0].y = data.pucks[0].y;
                    pucksRef.current[0].vx = 0;
                    pucksRef.current[0].vy = 0;
                }
                if (data.pucks[1]) {
                    pucksRef.current[1].x = data.pucks[1].x;
                    pucksRef.current[1].y = data.pucks[1].y;
                    pucksRef.current[1].vx = 0;
                    pucksRef.current[1].vy = 0;
                }
            }
        });

        return () => sub.unsubscribe();
    }, [stompClient, myId]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            >
                <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl w-[450px]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-emerald-500/20 p-2 rounded-lg">
                                <Gamepad2 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Knockout</h2>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white/40 hover:text-white">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex justify-around items-center mb-6 bg-white/5 rounded-2xl py-4 border border-white/5">
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Player 1</p>
                            <p className={`text-2xl font-black ${isMyTurn ? 'text-emerald-400' : 'text-white'}`}>{gameState?.player1Score || 0}</p>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Round</p>
                            <p className="text-xl font-bold text-white">{gameState?.round || 1}</p>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Player 2</p>
                            <p className={`text-2xl font-black ${!isMyTurn ? 'text-emerald-400' : 'text-white'}`}>{gameState?.player2Score || 0}</p>
                        </div>
                    </div>

                    <div className="relative group">
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_SIZE}
                            height={CANVAS_SIZE}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            className={`rounded-2xl transition-all ${isMyTurn ? 'cursor-crosshair' : 'cursor-wait'} ring-1 ring-white/10 shadow-inner`}
                        />
                        {!isMyTurn && gameState && !gameState.winner && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                                <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Partner&apos;s Turn</span>
                            </div>
                        )}
                    </div>

                    {gameState?.winner && (
                        <div className="mt-6 text-center animate-in fade-in zoom-in duration-300">
                            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                            <h3 className="text-2xl font-black text-white mb-2">{gameState.winner === myId ? "VICTORY!" : "DEFEAT"}</h3>
                            <Button onClick={onClose} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-6 rounded-2xl shadow-lg shadow-emerald-500/20">
                                Finish Match
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

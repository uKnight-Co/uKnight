"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameProps } from "../types";

type Puck = { x: number; y: number; radius: number; vx: number; vy: number };

const CANVAS_SIZE = 360;
const PLATFORM_RADIUS = 0.45;
const VISUAL_PLATFORM_RADIUS = 162; // 0.45 * 360
const MAX_SHOT_POWER = 130;
const TOTAL_ROUNDS = 5;
const FRICTION = 0.98;

function shadeColor(col: string, amt: number) {
  const num = parseInt(col.slice(1), 16);
  let r = ((num >> 16) & 0xff) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

function drawPuck(ctx: CanvasRenderingContext2D, puck: Puck, color: string) {
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const half = CANVAS_SIZE / 2;
  const x = cx + puck.x * half;
  const y = cy + puck.y * half;
  const r = puck.radius * half;

  const dist = Math.sqrt(puck.x * puck.x + puck.y * puck.y);
  ctx.globalAlpha = dist > PLATFORM_RADIUS ? 0.25 : 1;

  // Shadow
  ctx.beginPath();
  ctx.arc(x + 2, y + 3, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fill();

  // Puck body
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(x - r / 3, y - r / 3, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, shadeColor(color, -40));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Highlight
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();

  ctx.globalAlpha = 1;
}

export function Knockout({ onGameEnd, onClose, myRole, sendMove, lastOpponentMove }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pucksRef = useRef<[Puck, Puck]>([
    { x: -0.3, y: 0, radius: 0.055, vx: 0, vy: 0 },
    { x: 0.3, y: 0, radius: 0.055, vx: 0, vy: 0 },
  ]);

  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [round, setRound] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
  const [roundMsg, setRoundMsg] = useState<string | null>(null);
  const [phase, setPhase] = useState<"playing" | "roundOver" | "done">("playing");
  const [renderTick, setRenderTick] = useState(0);
  const [isShootingLocked, setIsShootingLocked] = useState(false);
  const shootingLockedRef = useRef(false);
  const lastProcessedMoveRef = useRef<string | null>(null);

  // Network roles
  const isNetworked = !!myRole;
  const localPlayerNum = myRole === "responder" ? 2 : 1; // 1 = Red, 2 = Blue

  // Only allow input if it's our turn, OR if we're playing locally (no network)
  const isMyTurn = !isNetworked || currentPlayer === localPlayerNum;

  const updateShootingLock = useCallback((val: boolean) => {
    shootingLockedRef.current = val;
    setIsShootingLocked(val);
  }, []);

  // Resolve elastic collision between two pucks
  const resolveCollision = (p1: Puck, p2: Puck) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = p1.radius + p2.radius;
    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const dvx = p1.vx - p2.vx;
      const dvy = p1.vy - p2.vy;
      const dvn = dvx * nx + dvy * ny;
      if (dvn > 0) {
        p1.vx -= dvn * nx;
        p1.vy -= dvn * ny;
        p2.vx += dvn * nx;
        p2.vy += dvn * ny;
      }
      const overlap = (minDist - dist) / 2;
      p1.x -= overlap * nx;
      p1.y -= overlap * ny;
      p2.x += overlap * nx;
      p2.y += overlap * ny;
    }
  };

  // Check if both pucks are off-platform and determine round winner
  const checkRoundEnd = useCallback(() => {
    const [p1, p2] = pucksRef.current;
    const p1Off = Math.sqrt(p1.x ** 2 + p1.y ** 2) > PLATFORM_RADIUS + p1.radius;
    const p2Off = Math.sqrt(p2.x ** 2 + p2.y ** 2) > PLATFORM_RADIUS + p2.radius;

    if (p1Off && p2Off) return "draw";
    if (p1Off) return "p2";
    if (p2Off) return "p1";
    return null;
  }, []);

  const handleNextRoundLogic = useCallback(() => {
    setRound((currentRound) => {
       const nextRoundNum = currentRound + 1;
       if (nextRoundNum > TOTAL_ROUNDS) {
         setPhase("done");
         return currentRound;
       }
       // Reset pucks
       pucksRef.current = [
         { x: -0.3, y: 0, radius: 0.055, vx: 0, vy: 0 },
         { x: 0.3, y: 0, radius: 0.055, vx: 0, vy: 0 },
       ];
       updateShootingLock(false);
       
       // Even rounds (2, 4) start with Blue (2). Odd rounds (1, 3, 5) start with Red (1).
       setCurrentPlayer(nextRoundNum % 2 === 0 ? 2 : 1);
       setRoundMsg(null);
       setPhase("playing");
       setRenderTick((t) => t + 1);
       return nextRoundNum;
    });
  }, [updateShootingLock]);

  const handleFinishGameLogic = useCallback(() => {
    setScores((s) => {
       const winner = s.p1 > s.p2 ? "You" : s.p2 > s.p1 ? "Stranger" : "Draw";
       onGameEnd({
         winner,
         yourScore: `${s.p1} KOs`,
         strangerScore: `${s.p2} KOs`,
         gameName: "Knockout",
         emoji: "🥊",
       });
       onClose();
       return s;
    });
  }, [onGameEnd, onClose]);

  // Physics game loop
  useEffect(() => {
    let frameId: number;
    let settled = false;

    const update = () => {
      const [pa, pb] = pucksRef.current;
      let moving = false;

      for (const p of [pa, pb]) {
        const speed = Math.sqrt(p.vx ** 2 + p.vy ** 2);
        if (speed > 0.0003) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= FRICTION;
          p.vy *= FRICTION;
          moving = true;
        } else {
          p.vx = 0;
          p.vy = 0;
        }
      }

      resolveCollision(pa, pb);

      if (moving || isDragging) {
        setRenderTick((t) => t + 1);
      }

      // Once everything settles after a shot, check for round end
      if (!moving && shootingLockedRef.current) {
        updateShootingLock(false);
        settled = true;
        const winner = checkRoundEnd();
        if (winner) {
          if (!settled) return; // prevent double-fire
          settled = false;
          setPhase("roundOver");
          if (winner === "draw") {
            setRoundMsg("💥 Draw — both knocked off!");
          } else if (winner === "p1") {
            setRoundMsg("🔴 Red knocks off Blue!");
            setScores((s) => ({ ...s, p1: s.p1 + 1 }));
          } else {
            setRoundMsg("🔵 Blue knocks off Red!");
            setScores((s) => ({ ...s, p2: s.p2 + 1 }));
          }
        } else {
          // Nobody fell off this turn — just switch player
          setCurrentPlayer((cp) => (cp === 1 ? 2 : 1));
        }
      }

      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [isDragging, checkRoundEnd, updateShootingLock]);

  // Network sync for opponent's shot
  useEffect(() => {
    if (isNetworked && lastOpponentMove && lastOpponentMove.type === "SHOT") {
      const moveId = lastOpponentMove.id as string;
      if (lastProcessedMoveRef.current !== moveId && !isMyTurn) {
         lastProcessedMoveRef.current = moveId;
         const dx = lastOpponentMove.dx as number;
         const dy = lastOpponentMove.dy as number;
         const mag = lastOpponentMove.mag as number;
         const clamp = lastOpponentMove.clamp as number;
         const scale = 0.0001;

         // Verify the opponent's turn matches the current turn index
         const oppIndex = currentPlayer === 1 ? 0 : 1;
         pucksRef.current[oppIndex].vx = -(dx / mag) * clamp * scale;
         pucksRef.current[oppIndex].vy = -(dy / mag) * clamp * scale;
         updateShootingLock(true);
      }
    } else if (isNetworked && lastOpponentMove && lastOpponentMove.type === "NEXT_ROUND") {
      const moveId = lastOpponentMove.id as string;
      if (lastProcessedMoveRef.current !== moveId) {
         lastProcessedMoveRef.current = moveId;
         handleNextRoundLogic();
      }
    } else if (isNetworked && lastOpponentMove && lastOpponentMove.type === "FINISH_GAME") {
      const moveId = lastOpponentMove.id as string;
      if (lastProcessedMoveRef.current !== moveId) {
         lastProcessedMoveRef.current = moveId;
         handleFinishGameLogic();
      }
    }
  }, [lastOpponentMove, isNetworked, isMyTurn, currentPlayer, updateShootingLock, handleNextRoundLogic, handleFinishGameLogic]);

  // Canvas draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, VISUAL_PLATFORM_RADIUS + 6, 0, Math.PI * 2);
    ctx.strokeStyle = currentPlayer === 1 ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Platform
    ctx.beginPath();
    ctx.arc(cx, cy, VISUAL_PLATFORM_RADIUS, 0, Math.PI * 2);
    const platGrad = ctx.createRadialGradient(cx - 30, cy - 30, 0, cx, cy, VISUAL_PLATFORM_RADIUS);
    platGrad.addColorStop(0, "#1e3a52");
    platGrad.addColorStop(0.6, "#0f1e2e");
    platGrad.addColorStop(1, "#060d14");
    ctx.fillStyle = platGrad;
    ctx.fill();
    ctx.strokeStyle = "#1e3a5c";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner rings
    for (const rf of [0.65, 0.35]) {
      ctx.beginPath();
      ctx.arc(cx, cy, VISUAL_PLATFORM_RADIUS * rf, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Cross lines
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - VISUAL_PLATFORM_RADIUS, cy); ctx.lineTo(cx + VISUAL_PLATFORM_RADIUS, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - VISUAL_PLATFORM_RADIUS); ctx.lineTo(cx, cy + VISUAL_PLATFORM_RADIUS); ctx.stroke();
    ctx.restore();

    drawPuck(ctx, pucksRef.current[0], "#ef4444");
    drawPuck(ctx, pucksRef.current[1], "#3b82f6");

    // Drag aim line
    if (isDragging && phase === "playing") {
      const dx = dragEnd.x - dragStart.x;
      const dy = dragEnd.y - dragStart.y;
      const mag = Math.sqrt(dx ** 2 + dy ** 2);
      if (mag > 8) {
        const clamp = Math.min(mag, MAX_SHOT_POWER);
        const ratio = clamp / mag;
        const ex = dragStart.x - dx * ratio * 0.9;
        const ey = dragStart.y - dy * ratio * 0.9;

        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = currentPlayer === 1 ? "#ef444480" : "#3b82f680";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        const arrowLen = 10;
        const angle = Math.atan2(ey - dragStart.y, ex - dragStart.x);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - arrowLen * Math.cos(angle - 0.4), ey - arrowLen * Math.sin(angle - 0.4));
        ctx.lineTo(ex - arrowLen * Math.cos(angle + 0.4), ey - arrowLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = currentPlayer === 1 ? "#ef4444" : "#3b82f6";
        ctx.fill();

        // Power ring
        const power = Math.round((clamp / MAX_SHOT_POWER) * 100);
        ctx.beginPath();
        ctx.arc(dragStart.x, dragStart.y, Math.min(clamp / 3, 40), 0, Math.PI * 2);
        ctx.fillStyle = currentPlayer === 1 ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)";
        ctx.fill();
        ctx.strokeStyle = currentPlayer === 1 ? "#ef444470" : "#3b82f670";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = currentPlayer === 1 ? "#ef4444" : "#3b82f6";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${power}%`, dragStart.x, dragStart.y - Math.min(clamp / 3, 40) - 6);
      }
    }
  }, [renderTick, isDragging, dragStart, dragEnd, currentPlayer, phase]);

  // ── Input helpers ──────────────────────────────────────────────────────────
  const getCoords = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const sx = CANVAS_SIZE / rect.width;
    const sy = CANVAS_SIZE / rect.height;
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  };

  const myPuckIndex = currentPlayer === 1 ? 0 : 1;

  const startDrag = (cx: number, cy: number) => {
    if (phase !== "playing" || shootingLockedRef.current || !isMyTurn) return;
    const coords = getCoords(cx, cy);
    if (!coords) return;
    const p = pucksRef.current[myPuckIndex];
    const half = CANVAS_SIZE / 2;
    const px = half + p.x * half;
    const py = half + p.y * half;
    const pr = p.radius * half;
    if (Math.hypot(coords.x - px, coords.y - py) < pr + 28) {
      setIsDragging(true);
      setDragStart({ x: px, y: py });
      setDragEnd(coords);
    }
  };
  const moveDrag = (cx: number, cy: number) => {
    if (!isDragging) return;
    const coords = getCoords(cx, cy);
    if (coords) setDragEnd(coords);
  };
  const endDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const dx = dragEnd.x - dragStart.x;
    const dy = dragEnd.y - dragStart.y;
    const mag = Math.hypot(dx, dy);
    if (mag > 15) {
      const clamp = Math.min(mag, MAX_SHOT_POWER);
      const scale = 0.0001; // properly scaled physics
      pucksRef.current[myPuckIndex].vx = -(dx / mag) * clamp * scale;
      pucksRef.current[myPuckIndex].vy = -(dy / mag) * clamp * scale;
      updateShootingLock(true);
      
      // Broadcast over network if available
      if (isNetworked && sendMove) {
         sendMove({ type: "SHOT", id: crypto.randomUUID(), dx, dy, mag, clamp });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => startDrag(e.clientX, e.clientY);
  const handleMouseMove = (e: React.MouseEvent) => moveDrag(e.clientX, e.clientY);
  const handleMouseUp = () => endDrag();
  const handleTouchStart = (e: React.TouchEvent) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); };
  const handleTouchMove = (e: React.TouchEvent) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); };
  const handleTouchEnd = (e: React.TouchEvent) => { e.preventDefault(); endDrag(); };

  // ── Round/Game flow ────────────────────────────────────────────────────────
  const onNextRoundClick = () => {
    handleNextRoundLogic();
    if (isNetworked && sendMove) {
      sendMove({ type: "NEXT_ROUND", id: crypto.randomUUID() });
    }
  };

  const onFinishGameClick = () => {
    handleFinishGameLogic();
    if (isNetworked && sendMove) {
      sendMove({ type: "FINISH_GAME", id: crypto.randomUUID() });
    }
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Scoreboard */}
      <div className="flex justify-around items-center bg-white/5 rounded-2xl py-3 border border-white/8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <p className="text-[10px] uppercase tracking-widest text-white/40">Red {isNetworked && localPlayerNum === 1 ? "(You)" : !isNetworked ? "(P1)" : ""}</p>
          </div>
          <p className="text-2xl font-black text-red-400">{scores.p1}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Round</p>
          <p className="text-xl font-bold text-white">{Math.min(round, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <p className="text-[10px] uppercase tracking-widest text-white/40">Blue {isNetworked && localPlayerNum === 2 ? "(You)" : !isNetworked ? "(P2)" : ""}</p>
          </div>
          <p className="text-2xl font-black text-blue-400">{scores.p2}</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`rounded-2xl ring-1 ring-white/10 w-full max-w-[360px] ${
            phase === "playing" && !isShootingLocked
              ? "cursor-crosshair"
              : "cursor-wait"
          }`}
          style={{ touchAction: "none" }}
        />

        {/* Turn badge */}
        {phase === "playing" && !isShootingLocked && (
          <div
            className={`absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${
              currentPlayer === 1
                ? "bg-red-500/20 border-red-500/30 text-red-400"
                : "bg-blue-500/20 border-blue-500/30 text-blue-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${currentPlayer === 1 ? "bg-red-400" : "bg-blue-400"}`} />
            {currentPlayer === 1 ? "Red's Turn — Drag to Shoot!" : "Blue's Turn — Drag to Shoot!"}
          </div>
        )}

        {/* Waiting for physics to settle */}
        {phase === "playing" && isShootingLocked && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full border border-white/10 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-white/50 animate-spin" />
            <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Settling…</span>
          </div>
        )}
      </div>

      {/* Round Over overlay */}
      <AnimatePresence>
        {phase === "roundOver" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-col gap-3"
          >
            <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
              <p className="text-lg font-black text-white mb-1">{roundMsg}</p>
              <p className="text-xs text-white/40">
                Red: {scores.p1} · Blue: {scores.p2}
              </p>
            </div>
            {round < TOTAL_ROUNDS ? (
              <Button
                onClick={onNextRoundClick}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
              >
                Next Round →
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setPhase("done");
                  if (isNetworked && sendMove) {
                    sendMove({ type: "NEXT_ROUND", id: crypto.randomUUID() });
                  }
                }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl"
              >
                See Final Result!
              </Button>
            )}
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-3"
          >
            <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10">
              <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-2 drop-shadow-[0_0_12px_rgba(234,179,8,0.5)]" />
              <p className="text-2xl font-black text-white mb-1">
                {scores.p1 > scores.p2
                  ? "🏆 Red Wins!"
                  : scores.p2 > scores.p1
                  ? "🏆 Blue Wins!"
                  : "🤝 It's a Draw!"}
              </p>
              <p className="text-sm text-white/50">
                Red: {scores.p1} KOs · Blue: {scores.p2} KOs
              </p>
            </div>
            <Button
              onClick={onFinishGameClick}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
            >
              Finish Game
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

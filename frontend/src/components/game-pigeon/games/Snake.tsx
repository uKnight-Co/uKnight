"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameProps, Player } from "../types";

const CANVAS_W = 260;
const CANVAS_H = 260;
const CELL = 20;
const GAME_DURATION = 30;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };

function randomFood(snake: Point[]): Point {
  let f: Point;
  do {
    f = {
      x: Math.floor(Math.random() * (CANVAS_W / CELL)) * CELL,
      y: Math.floor(Math.random() * (CANVAS_H / CELL)) * CELL,
    };
  } while (snake.some(s => s.x === f.x && s.y === f.y));
  return f;
}

export function Snake({ onGameEnd, myRole, sendMove, lastOpponentMove }: GameProps) {
  const isNetworked = !!myRole && !!sendMove;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<"intro" | "playing" | "waiting" | "done">("intro");
  const [myScore, setMyScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

  const snakeRef = useRef<Point[]>([{ x: 120, y: 120 }]);
  const dirRef = useRef<Direction>("RIGHT");
  const foodRef = useRef<Point>({ x: 160, y: 120 });
  const scoreRef = useRef(0);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid dots
    ctx.fillStyle = "#1e293b";
    for (let x = 0; x < CANVAS_W; x += CELL)
      for (let y = 0; y < CANVAS_H; y += CELL) {
        ctx.beginPath();
        ctx.arc(x + CELL / 2, y + CELL / 2, 1, 0, Math.PI * 2);
        ctx.fill();
      }

    // Food (amber)
    const f = foodRef.current;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(f.x + CELL / 2, f.y + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Snake (amber gradient)
    snakeRef.current.forEach((seg, i) => {
      const t = i / snakeRef.current.length;
      ctx.fillStyle = i === 0 ? "#f59e0b" : `hsl(${45 - t * 20}, 80%, ${55 - t * 15}%)`;
      const p = i === 0 ? 1 : 2;
      ctx.beginPath();
      ctx.roundRect(seg.x + p, seg.y + p, CELL - p * 2, CELL - p * 2, 4);
      ctx.fill();
    });
  }, []);

  const stopAll = useCallback(() => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startGame = useCallback(() => {
    snakeRef.current = [{ x: 120, y: 120 }];
    dirRef.current = "RIGHT";
    foodRef.current = randomFood(snakeRef.current);
    scoreRef.current = 0;
    drawGame();
    setTimeLeft(GAME_DURATION);
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopAll();
          const finalScore = scoreRef.current;
          setMyScore(finalScore);
          if (isNetworked && sendMove) sendMove({ type: "FINISHED", score: finalScore });
          setPhase("waiting");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    gameLoopRef.current = setInterval(() => {
      const snake = snakeRef.current;
      const dir = dirRef.current;
      const head = snake[0];
      let nx = head.x + (dir === "RIGHT" ? CELL : dir === "LEFT" ? -CELL : 0);
      let ny = head.y + (dir === "DOWN" ? CELL : dir === "UP" ? -CELL : 0);
      nx = ((nx % CANVAS_W) + CANVAS_W) % CANVAS_W;
      ny = ((ny % CANVAS_H) + CANVAS_H) % CANVAS_H;

      if (snake.some(s => s.x === nx && s.y === ny)) {
        stopAll();
        const finalScore = scoreRef.current;
        setMyScore(finalScore);
        if (isNetworked && sendMove) sendMove({ type: "FINISHED", score: finalScore });
        setPhase("waiting");
        return;
      }

      const newSnake = [{ x: nx, y: ny }, ...snake];
      if (nx === foodRef.current.x && ny === foodRef.current.y) {
        scoreRef.current++;
        foodRef.current = randomFood(newSnake);
      } else {
        newSnake.pop();
      }
      snakeRef.current = newSnake;
      drawGame();
    }, 120);
  }, [drawGame, stopAll, isNetworked, sendMove]);

  // Key controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = { ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT" };
      const newDir = map[e.key];
      if (!newDir) return;
      const opp: Record<Direction, Direction> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
      if (opp[dirRef.current] !== newDir) dirRef.current = newDir;
      e.preventDefault();
    };
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("keydown", handleKey); stopAll(); };
  }, [stopAll]);

  const opponentScore = useMemo(() => {
    if (!isNetworked || !lastOpponentMove) return null;
    const m = lastOpponentMove as { type?: string; score?: number };
    if (m.type === "FINISHED" && typeof m.score === "number") return m.score;
    return null;
  }, [isNetworked, lastOpponentMove]);

  const effectivePhase = (phase === "waiting" && (!isNetworked || opponentScore !== null)) ? "done" : phase;

  const finishGame = () => {
    const them = opponentScore ?? 0;
    const winner: Player | "Draw" = myScore > them ? "You" : them > myScore ? "Stranger" : "Draw";
    onGameEnd({ winner, yourScore: myScore, strangerScore: them, gameName: "Snake", emoji: "🐍" });
  };

  // Swipe controls
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const opp: Record<Direction, Direction> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    if (Math.abs(dx) > Math.abs(dy)) {
      const d = dx > 0 ? "RIGHT" : "LEFT";
      if (opp[dirRef.current] !== d) dirRef.current = d;
    } else {
      const d = dy > 0 ? "DOWN" : "UP";
      if (opp[dirRef.current] !== d) dirRef.current = d;
    }
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {isNetworked && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/70">
          <Wifi className="w-3 h-3" />
          <span>Live — Both playing simultaneously! 30s sprint, highest score wins.</span>
        </div>
      )}

      {/* Score bar */}
      <div className="flex justify-around items-center bg-white/5 rounded-2xl py-3 border border-amber-500/10">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">You 🟡</p>
          <p className="text-2xl font-black text-amber-400">{myScore}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Snake</p>
          {effectivePhase === "playing" && (
            <p className={`text-lg font-black ${timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-white"}`}>{timeLeft}s</p>
          )}
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Stranger 🔴</p>
          <p className="text-2xl font-black text-rose-400">{isNetworked ? (opponentScore ?? "?") : "—"}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {effectivePhase === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
            <p className="text-center text-sm text-white/60">
              {GAME_DURATION}s sprint — collect as much food as you can! Highest score wins.
            </p>
            <Button onClick={startGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
              Start!
            </Button>
          </motion.div>
        )}

        {effectivePhase === "playing" && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm font-bold py-1.5 rounded-xl text-amber-400 bg-amber-500/10 border border-amber-500/20">
            🐍 GO! Arrow keys or swipe to move.
          </motion.div>
        )}

        {effectivePhase === "waiting" && (
          <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 py-4">
            <p className="text-sm font-bold text-amber-400">✅ You scored {myScore}!</p>
            <p className="text-sm text-white/50 animate-pulse">Waiting for opponent to finish...</p>
          </motion.div>
        )}

        {effectivePhase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
            <div className="bg-white/5 rounded-2xl p-5 text-center border border-white/10">
              <p className="text-3xl font-black text-white mb-3">
                {myScore > (opponentScore ?? 0) ? "You win! 🎉" : (opponentScore ?? 0) > myScore ? "Stranger wins!" : "Draw! 🤝"}
              </p>
              <div className="flex justify-around">
                <div><p className="text-xs text-white/40 mb-1">You</p><p className="text-xl font-black text-amber-400">{myScore} 🍎</p></div>
                <div><p className="text-xs text-white/40 mb-1">Stranger</p><p className="text-xl font-black text-rose-400">{opponentScore ?? "—"} 🍎</p></div>
              </div>
            </div>
            <Button onClick={finishGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
              Finish Game
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas — shown while playing */}
      {effectivePhase === "playing" && (
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="rounded-2xl border border-amber-500/20 shadow-2xl shadow-amber-500/10"
            style={{ touchAction: "none", imageRendering: "pixelated" }}
          />
        </div>
      )}

      {/* Mobile D-pad */}
      {effectivePhase === "playing" && (
        <div className="flex flex-col items-center gap-1 md:hidden">
          <button
            onClick={() => { const o = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" } as const; if (o[dirRef.current] !== "UP") dirRef.current = "UP"; }}
            className="w-12 h-10 bg-white/10 rounded-xl text-white font-bold">↑</button>
          <div className="flex gap-1">
            <button onClick={() => { if (dirRef.current !== "RIGHT") dirRef.current = "LEFT"; }} className="w-12 h-10 bg-white/10 rounded-xl text-white font-bold">←</button>
            <button onClick={() => { if (dirRef.current !== "UP") dirRef.current = "DOWN"; }} className="w-12 h-10 bg-white/10 rounded-xl text-white font-bold">↓</button>
            <button onClick={() => { if (dirRef.current !== "LEFT") dirRef.current = "RIGHT"; }} className="w-12 h-10 bg-white/10 rounded-xl text-white font-bold">→</button>
          </div>
        </div>
      )}
    </div>
  );
}



"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameProps, Player } from "../types";

const ROUNDS = 5;
const MIN_WAIT = 1500;
const MAX_WAIT = 4000;

export function ReactionTime({ onGameEnd, myRole, sendMove, lastOpponentMove }: GameProps) {
  const isNetworked = !!myRole && !!sendMove;

  const [phase, setPhase] = useState<"intro" | "playing" | "waiting" | "done">("intro");
  const [roundPhase, setRoundPhase] = useState<"waiting" | "green" | "tapped">("waiting");
  const [round, setRound] = useState(1);
  const [myTimes, setMyTimes] = useState<number[]>([]);
  const [tooFast, setTooFast] = useState(false);
  const [lastTime, setLastTime] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greenStartRef = useRef<number>(0);
  const myTimesRef = useRef<number[]>([]);

  const clearTimer = useCallback(() => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const scheduleGreen = useCallback(() => {
    setRoundPhase("waiting"); setTooFast(false); setLastTime(null);
    const wait = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
    timerRef.current = setTimeout(() => { setRoundPhase("green"); greenStartRef.current = Date.now(); }, wait);
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const startGame = useCallback(() => {
    setRound(1); setMyTimes([]); myTimesRef.current = []; setPhase("playing"); scheduleGreen();
  }, [scheduleGreen]);

  const finishMyRounds = useCallback((times: number[]) => {
    if (isNetworked && sendMove) sendMove({ type: "DONE", times });
    setPhase("waiting");
  }, [isNetworked, sendMove]);

  const theirTimes = useMemo(() => {
    if (!isNetworked || !lastOpponentMove) return null;
    const m = lastOpponentMove as { type?: string; times?: number[] };
    if (m.type === "DONE" && Array.isArray(m.times)) return m.times;
    return null;
  }, [isNetworked, lastOpponentMove]);

  const effectivePhase = (phase === "waiting" && (!isNetworked || theirTimes !== null)) ? "done" : phase;

  const handleTap = useCallback(() => {
    if (roundPhase === "waiting") {
      clearTimer(); setTooFast(true);
      const newTimes = [...myTimesRef.current, 9999];
      myTimesRef.current = newTimes;
      setMyTimes(newTimes);
      setTimeout(() => {
        const next = round + 1;
        if (next > ROUNDS) { finishMyRounds(newTimes); }
        else { setRound(next); scheduleGreen(); }
      }, 1200);
      return;
    }
    if (roundPhase !== "green") return;
    const rt = Date.now() - greenStartRef.current;
    setLastTime(rt); setRoundPhase("tapped");
    const newTimes = [...myTimesRef.current, rt];
    myTimesRef.current = newTimes;
    setMyTimes(newTimes);
  }, [roundPhase, round, clearTimer, scheduleGreen, finishMyRounds]);

  const handleNext = useCallback(() => {
    const next = round + 1;
    if (next > ROUNDS) { finishMyRounds(myTimesRef.current); }
    else { setRound(next); scheduleGreen(); }
  }, [round, scheduleGreen, finishMyRounds]);

  const avg = (arr: number[]) => {
    const valid = arr.filter(t => t !== 9999);
    return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 9999;
  };

  const finishGame = () => {
    const a1 = avg(myTimes);
    const a2 = theirTimes ? avg(theirTimes) : 0;
    const winner: Player | "Draw" = a1 < a2 ? "You" : a2 < a1 ? "Stranger" : "Draw";
    onGameEnd({ winner, yourScore: `${a1}ms avg`, strangerScore: `${a2}ms avg`, gameName: "Reaction Time", emoji: "⚡" });
  };

  const bgColor = roundPhase === "green" ? "bg-emerald-500" : tooFast ? "bg-red-600" : "bg-slate-700/75";
  const myAvg = myTimes.filter(t => t !== 9999).length ? `${avg(myTimes)}ms` : "—";
  const theirAvg = theirTimes ? `${avg(theirTimes)}ms` : isNetworked ? "?" : "—";

  return (
    <div className="flex flex-col gap-4 select-none">
      {isNetworked && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/70">
          <Wifi className="w-3 h-3" />
          <span>Live — Both playing simultaneously! Fastest average wins.</span>
        </div>
      )}

      <div className="flex justify-around items-center bg-white/5 rounded-2xl py-3 border border-amber-500/10">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">You avg</p>
          <p className="text-2xl font-black text-amber-400">{myAvg}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Round</p>
          <p className="text-xl font-bold text-white">{round}/{ROUNDS}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Stranger avg</p>
          <p className="text-2xl font-black text-rose-400">{theirAvg}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {effectivePhase === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
              <p className="text-4xl mb-2">⚡</p>
              <p className="text-sm text-white/70">Wait for green, tap as fast as you can! {ROUNDS} rounds. Lowest average time wins.</p>
            </div>
            <Button onClick={startGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">Start!</Button>
          </motion.div>
        )}

        {effectivePhase === "playing" && (
          <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            <div className="flex gap-1 justify-center">
              {Array.from({ length: ROUNDS }, (_, i) => (
                <div key={i} className={`h-2 flex-1 rounded-full ${i < myTimes.length ? "bg-amber-500" : i === myTimes.length ? "bg-white/30 animate-pulse" : "bg-white/10"}`} />
              ))}
            </div>
            <motion.button onClick={handleTap}
              className={`rounded-2xl p-8 text-center w-full transition-all ${bgColor} cursor-pointer active:scale-95`}
              whileTap={{ scale: 0.95 }}>
              {tooFast
                ? <div><p className="text-4xl font-black text-white">❌ Too fast!</p><p className="text-sm text-white/80 mt-1">Wait for green...</p></div>
                : roundPhase === "waiting"
                ? <div><p className="text-4xl font-black text-white/60">Wait...</p><p className="text-sm text-white/40 mt-1">Don&apos;t tap yet!</p></div>
                : roundPhase === "green"
                ? <div><p className="text-4xl font-black text-white">TAP NOW!</p><p className="text-sm text-white/75 mt-1 animate-pulse">Go go go!</p></div>
                : <div><p className="text-4xl font-black text-white">{lastTime}ms</p><p className="text-sm text-white/75 mt-1">{lastTime! < 250 ? "⚡ Lightning!" : lastTime! < 400 ? "💪 Nice!" : "😅 A bit slow..."}</p></div>}
            </motion.button>
            {roundPhase === "tapped" && (
              <Button onClick={handleNext} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
                {round >= ROUNDS ? "See Results →" : `Next Round (${round + 1}/${ROUNDS})`}
              </Button>
            )}
          </motion.div>
        )}

        {effectivePhase === "waiting" && (
          <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm font-bold text-amber-400">✅ Done! Your avg: {myAvg}</p>
            <p className="text-sm text-white/50 animate-pulse">Waiting for opponent to finish...</p>
          </motion.div>
        )}

        {effectivePhase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
            <div className="bg-white/5 rounded-2xl p-5 text-center border border-white/10">
              <p className="text-3xl font-black text-white mb-3">
                {avg(myTimes) < (theirTimes ? avg(theirTimes) : Infinity) ? "You win! ⚡" : (theirTimes && avg(theirTimes) < avg(myTimes)) ? "Stranger wins!" : "Draw! 🤝"}
              </p>
              <div className="flex justify-around">
                <div><p className="text-xs text-white/40 mb-1">You</p><p className="text-lg font-black text-amber-400">{myAvg}</p></div>
                <div><p className="text-xs text-white/40 mb-1">Stranger</p><p className="text-lg font-black text-rose-400">{theirAvg}</p></div>
              </div>
            </div>
            <Button onClick={finishGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">Finish Game</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



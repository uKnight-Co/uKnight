"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GameProps, Player } from "../types";

type Difficulty = "easy" | "medium" | "hard";
interface Problem { question: string; answer: number; }

function makeProblem(d: Difficulty): Problem {
  const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
  if (d === "easy") { const a = rand(1, 20), b = rand(1, 20), op = Math.random() < 0.5 ? "+" : "-"; return { question: `${a} ${op} ${b}`, answer: op === "+" ? a + b : a - b }; }
  if (d === "medium") { const a = rand(2, 12), b = rand(2, 12); return { question: `${a} × ${b}`, answer: a * b }; }
  const a = rand(10, 50), b = rand(2, 10), c = rand(1, 20);
  return { question: `(${a} + ${c}) ÷ ${b}`, answer: Math.round((a + c) / b) };
}

const TOTAL = 10;
const TIME_EACH = 10;

export function MathDuel({ onGameEnd, myRole, sendMove, lastOpponentMove }: GameProps) {
  const isNetworked = !!myRole && !!sendMove;
  const isInitiator = myRole === "initiator";

  const [phase, setPhase] = useState<"select" | "waiting" | "racing" | "done">("select");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIME_EACH);
  const [myScore, setMyScore] = useState(0);
  const [theirScore, setTheirScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myScoreRef = useRef(0);

  const stopTimer = useCallback(() => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startTimer = useCallback((i: number) => {
    stopTimer();
    setTimeLeft(TIME_EACH); setFeedback(null); setInput("");
    timerRef.current = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { stopTimer(); advanceQuestion(i); return 0; }
      return t - 1;
    }), 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopTimer]);

  const advanceQuestion = useCallback((i: number) => {
    stopTimer();
    const next = i + 1;
    if (next >= TOTAL) {
      setPhase("done");
      if (sendMove) sendMove({ type: "DONE", score: myScoreRef.current });
      return;
    }
    setIdx(next);
    startTimer(next);
  }, [stopTimer, sendMove, startTimer]);

  const startGame = useCallback((probs: Problem[]) => {
    setProblems(probs); setIdx(0); setMyScore(0); myScoreRef.current = 0;
    setTheirScore(null); setPhase("racing"); startTimer(0);
  }, [startTimer]);

  const handleStart = () => {
    const probs = Array.from({ length: TOTAL }, () => makeProblem(difficulty));
    if (isNetworked && sendMove) sendMove({ type: "INIT", difficulty, problems: probs });
    startGame(probs);
  };

  useEffect(() => {
    if (!isNetworked || !lastOpponentMove) return;
    const m = lastOpponentMove as { type?: string; difficulty?: Difficulty; problems?: Problem[]; score?: number };
    if (m.type === "INIT" && Array.isArray(m.problems)) {
      setDifficulty(m.difficulty ?? "easy");
      startGame(m.problems);
    } else if (m.type === "DONE" && typeof m.score === "number") {
      setTheirScore(m.score);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOpponentMove]);

  const handleSubmit = () => {
    if (!problems[idx] || feedback) return;
    stopTimer();
    const val = parseInt(input);
    const correct = val === problems[idx].answer;
    if (correct) { setMyScore(s => { myScoreRef.current = s + 1; return s + 1; }); }
    setFeedback({ correct, answer: problems[idx].answer });
    setTimeout(() => advanceQuestion(idx), 1200);
  };

  useEffect(() => () => stopTimer(), [stopTimer]);

  const finishGame = () => {
    const them = theirScore ?? 0;
    const winner: Player | "Draw" = myScore > them ? "You" : them > myScore ? "Stranger" : "Draw";
    onGameEnd({ winner, yourScore: myScore, strangerScore: them, gameName: "Math Duel", emoji: "🧮" });
  };

  const timerPct = (timeLeft / TIME_EACH) * 100;

  return (
    <div className="flex flex-col gap-4 select-none">
      {isNetworked && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/70">
          <Wifi className="w-3 h-3" />
          <span>Live — Same problems, most correct wins!</span>
        </div>
      )}

      <div className="flex justify-around items-center bg-white/5 rounded-2xl py-3 border border-amber-500/10">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">You</p>
          <p className="text-2xl font-black text-amber-400">{myScore}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{phase === "racing" ? `Q ${idx + 1}/${TOTAL}` : "Math Duel"}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Stranger</p>
          <p className="text-2xl font-black text-rose-400">{isNetworked ? (theirScore ?? "?") : "—"}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "select" && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            <p className="text-center text-sm text-white/60">Both players get the same {TOTAL} questions — most correct wins!</p>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`py-3 rounded-xl text-sm font-bold capitalize transition-all ${difficulty === d ? "bg-amber-500 text-black" : "bg-white/5 text-white/60 hover:bg-amber-500/10"}`}>
                  {d === "easy" ? "😊 Easy" : d === "medium" ? "🤔 Medium" : "🔥 Hard"}
                </button>
              ))}
            </div>
            {(!isNetworked || isInitiator) && (
              <Button onClick={handleStart} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">Start Duel!</Button>
            )}
            {isNetworked && !isInitiator && (
              <div className="text-center py-3 text-sm text-white/40 bg-white/5 rounded-xl">Waiting for opponent to start...</div>
            )}
          </motion.div>
        )}

        {phase === "waiting" && (
          <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-6">
            <div className="animate-spin text-3xl">🧮</div>
            <p className="text-sm text-white/50">Waiting for opponent to start...</p>
          </motion.div>
        )}

        {phase === "racing" && problems[idx] && (
          <motion.div key={`q-${idx}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${timerPct > 50 ? "bg-amber-500" : timerPct > 25 ? "bg-orange-500" : "bg-red-500"}`} style={{ width: `${timerPct}%` }} />
            </div>
            <p className="text-center text-xs text-white/40">{timeLeft}s</p>
            <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10">
              <p className="text-4xl font-black text-white">{problems[idx].question} = ?</p>
            </div>
            <AnimatePresence>
              {feedback && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`text-center py-3 rounded-xl font-bold text-lg ${feedback.correct ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                  {feedback.correct ? "✅ Correct!" : `❌ Answer: ${feedback.answer}`}
                </motion.div>
              )}
            </AnimatePresence>
            {!feedback && (
              <div className="flex gap-2">
                <Input autoFocus type="number" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="Your answer..." className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 font-bold text-center text-lg" />
                <Button onClick={handleSubmit} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">OK</Button>
              </div>
            )}
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
            {isNetworked && theirScore === null ? (
              <div className="text-center py-4">
                <p className="text-sm font-bold text-amber-400">✅ You got {myScore}/{TOTAL}! Waiting for opponent...</p>
                <div className="animate-pulse mt-2 text-white/40 text-sm">⏳</div>
              </div>
            ) : (
              <>
                <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10">
                  <p className="text-3xl font-black text-white mb-2">
                    {myScore > (theirScore ?? 0) ? "You win! 🎉" : (theirScore ?? 0) > myScore ? "Stranger wins!" : "Draw! 🤝"}
                  </p>
                  <p className="text-sm text-white/60">You: {myScore} · Stranger: {theirScore ?? "—"} out of {TOTAL}</p>
                </div>
                <Button onClick={finishGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">Finish Game</Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GameProps, Player } from "../types";

const WORD_BANK = [
  "PLANET", "GUITAR", "JUNGLE", "KNIGHT", "BREEZE", "FROZEN", "SIMPLE",
  "VOYAGE", "CHROME", "POCKET", "SILVER", "CASTLE", "DRAGON", "FLOWER",
  "PURPLE", "ANCHOR", "BRIDGE", "COFFEE", "DIVINE", "EMPIRE",
];

function scramble(word: string): string {
  const arr = word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join("");
  return result === word ? scramble(word) : result;
}

const ROUNDS = 5;
const TIME_PER_WORD = 30;

export function WordScramble({ onGameEnd, myRole, sendMove, lastOpponentMove }: GameProps) {
  const isNetworked = !!myRole && !!sendMove;
  const isInitiator = myRole === "initiator";

  const [round, setRound] = useState(1);
  const [word, setWord] = useState<string>("");
  const [scrambledWord, setScrambledWord] = useState<string>("");
  const [phase, setPhase] = useState<"waiting" | "racing" | "result" | "done">(
    isNetworked ? (isInitiator ? "racing" : "waiting") : "racing"
  );
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIME_PER_WORD);
  const [iSolved, setISolved] = useState(false);
  const [mySolveTime, setMySolveTime] = useState<number | null>(null);
  const [theirSolveTime, setTheirSolveTime] = useState<number | null>(null);
  const [theyDone, setTheyDone] = useState(false);
  const [scores, setScores] = useState({ me: 0, them: 0 });
  const [roundMsg, setRoundMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopTimer = useCallback(() => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startRound = useCallback((w: string, sc: string) => {
    setWord(w); setScrambledWord(sc); setInput("");
    setISolved(false); setMySolveTime(null); setTheirSolveTime(null); setTheyDone(false);
    setPhase("racing"); setTimeLeft(TIME_PER_WORD);
    startTimeRef.current = Date.now();
    stopTimer();
    timerRef.current = setInterval(() => setTimeLeft(t => { if (t <= 1) { stopTimer(); return 0; } return t - 1; }), 1000);
  }, [stopTimer]);

  // Initiator picks words for each round
  useEffect(() => {
    if (!isNetworked || !isInitiator || !sendMove) {
      // Solo or initiator — start locally
      const w = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
      const sc = scramble(w);
      startRound(w, sc);
      if (isNetworked && sendMove) sendMove({ type: "INIT", word: w, scramble: sc });
      return;
    }
    if (isInitiator && sendMove) {
      const w = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
      const sc = scramble(w);
      startRound(w, sc);
      sendMove({ type: "INIT", word: w, scramble: sc });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // Handle timer expiry
  useEffect(() => {
    if (timeLeft === 0 && phase === "racing") {
      if (!iSolved && sendMove && isNetworked) sendMove({ type: "TIMEOUT" });
      setISolved(true); // treat as done (failed)
      setMySolveTime(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Both done?
  useEffect(() => {
    if (phase === "racing" && iSolved && theyDone) resolveRound();
    else if (phase === "racing" && iSolved && !isNetworked) resolveRound();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iSolved, theyDone]);

  useEffect(() => {
    if (!isNetworked || !lastOpponentMove) return;
    const m = lastOpponentMove as { type?: string; word?: string; scramble?: string; time?: number };
    if (m.type === "INIT" && m.word && m.scramble) {
      startRound(m.word, m.scramble);
    } else if (m.type === "SOLVED" && typeof m.time === "number") {
      setTheirSolveTime(m.time);
      setTheyDone(true);
    } else if (m.type === "TIMEOUT") {
      setTheirSolveTime(null);
      setTheyDone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOpponentMove]);

  const handleSubmit = () => {
    if (iSolved || phase !== "racing") return;
    if (input.toUpperCase() === word) {
      const elapsed = Date.now() - startTimeRef.current;
      stopTimer();
      setISolved(true);
      setMySolveTime(elapsed);
      if (isNetworked && sendMove) sendMove({ type: "SOLVED", time: elapsed });
    }
    setInput("");
  };

  const resolveRound = () => {
    stopTimer();
    const myT = mySolveTime;
    const theirT = theirSolveTime;
    let msg = "";
    const newScores = { ...scores };
    if (myT !== null && theirT !== null) {
      if (myT < theirT) { newScores.me++; msg = `You win! (${(myT/1000).toFixed(1)}s vs ${(theirT/1000).toFixed(1)}s) 🎉`; }
      else if (theirT < myT) { newScores.them++; msg = `Stranger wins! (${(theirT/1000).toFixed(1)}s vs ${(myT/1000).toFixed(1)}s)`; }
      else { msg = "Tie!"; }
    } else if (myT !== null) { newScores.me++; msg = "You win — Stranger timed out! 🎉"; }
    else if (theirT !== null) { newScores.them++; msg = "Stranger wins — You timed out!"; }
    else { msg = "Both timed out! 😅"; }
    setScores(newScores);
    setRoundMsg(msg);
    setPhase("result");
  };

  const nextRound = () => {
    if (round >= ROUNDS) { setPhase("done"); return; }
    setRound(r => r + 1);
    if (!isInitiator) setPhase("waiting");
  };

  const finishGame = () => {
    const winner: Player | "Draw" = scores.me > scores.them ? "You" : scores.them > scores.me ? "Stranger" : "Draw";
    onGameEnd({ winner, yourScore: scores.me, strangerScore: scores.them, gameName: "Word Scramble", emoji: "🔤" });
  };

  const timerPct = (timeLeft / TIME_PER_WORD) * 100;

  return (
    <div className="flex flex-col gap-4 select-none">
      {isNetworked && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/70">
          <Wifi className="w-3 h-3" />
          <span>Live — Race to unscramble the same word!</span>
        </div>
      )}

      <div className="flex justify-around items-center bg-white/5 rounded-2xl py-3 border border-amber-500/10">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">You</p>
          <p className="text-2xl font-black text-amber-400">{scores.me}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Round {round}/{ROUNDS}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Stranger</p>
          <p className="text-2xl font-black text-rose-400">{scores.them}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "waiting" && (
          <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-6">
            <div className="animate-spin text-3xl">🔤</div>
            <p className="text-sm text-white/50">Waiting for the word...</p>
          </motion.div>
        )}

        {phase === "racing" && scrambledWord && (
          <motion.div key={`race-${round}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${timerPct > 50 ? "bg-amber-500" : timerPct > 25 ? "bg-orange-500" : "bg-red-500"}`} style={{ width: `${timerPct}%` }} />
            </div>
            <p className="text-center text-sm font-bold text-white/60">{timeLeft}s remaining</p>
            <div className="bg-white/5 rounded-2xl p-5 text-center border border-white/10">
              <p className="text-[10px] text-white/40 uppercase mb-2">Unscramble this!</p>
              <p className="text-4xl font-black text-white tracking-[0.3em]">{scrambledWord}</p>
            </div>
            {iSolved ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl py-3 text-center text-sm text-amber-400 font-bold">
                {mySolveTime ? `✅ Solved in ${(mySolveTime/1000).toFixed(1)}s!` : "❌ Timed out!"} Waiting...
              </div>
            ) : (
              <div className="flex gap-2">
                <Input autoFocus value={input} onChange={e => setInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="Type the word..." className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 uppercase font-bold tracking-wider text-center text-lg" />
                <Button onClick={handleSubmit} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">Submit</Button>
              </div>
            )}
            {theyDone && !iSolved && <p className="text-center text-xs text-rose-400">Opponent solved it — hurry!</p>}
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
            <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
              <p className="text-[10px] text-white/40 uppercase mb-2">The word was</p>
              <p className="text-3xl font-black text-amber-400 tracking-widest">{word}</p>
            </div>
            <p className="text-center text-base font-bold text-white bg-white/5 py-3 rounded-xl">{roundMsg}</p>
            <Button onClick={nextRound} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
              {round >= ROUNDS ? "See Final Result" : "Next Word →"}
            </Button>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
            <div className="bg-white/5 rounded-2xl p-5 text-center border border-white/10">
              <p className="text-2xl font-black text-white mb-2">
                {scores.me > scores.them ? "You win! 🎉" : scores.them > scores.me ? "Stranger wins!" : "Draw! 🤝"}
              </p>
              <p className="text-sm text-white/60">{scores.me} wins vs {scores.them} wins over {ROUNDS} rounds</p>
            </div>
            <Button onClick={finishGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">Finish Game</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

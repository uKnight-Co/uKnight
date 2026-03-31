"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GameProps, Player } from "../types";

const MAX_GUESSES = 10;

interface GuessEntry { value: number; hint: "higher" | "lower" | "correct" }

const hintColor = (h: GuessEntry["hint"]) =>
  h === "correct" ? "text-emerald-400" : h === "higher" ? "text-sky-400" : "text-orange-400";
const hintIcon = (h: GuessEntry["hint"]) =>
  h === "correct" ? "✅" : h === "higher" ? "⬆️" : "⬇️";

export function GuessTheNumber({ onGameEnd, myRole, sendMove, lastOpponentMove }: GameProps) {
  const isNetworked = !!myRole && !!sendMove;
  const isInitiator = myRole === "initiator";

  // The secret number — same for both players (randomed by initiator, seeded to responder)
  const [secret, setSecret] = useState<number | null>(() =>
    !isNetworked || isInitiator ? Math.floor(Math.random() * 100) + 1 : null
  );
  const [input, setInput] = useState("");
  const [myGuesses, setMyGuesses] = useState<GuessEntry[]>([]);
  const [done, setDone] = useState(false);
  const [opponentGuesses, setOpponentGuesses] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(isNetworked && !isInitiator);

  // Initiator seeds secret to opponent
  useEffect(() => {
    if (!isNetworked || !isInitiator || !sendMove || secret === null) return;
    sendMove({ type: "INIT", secret });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isNetworked || !lastOpponentMove) return;
    const m = lastOpponentMove as { type?: string; secret?: number; guesses?: number };
    if (m.type === "INIT" && typeof m.secret === "number") {
      setSecret(m.secret);
      setWaiting(false);
    } else if (m.type === "DONE" && typeof m.guesses === "number") {
      setOpponentGuesses(m.guesses);
    }
  }, [lastOpponentMove, isNetworked]);

  const handleGuess = () => {
    if (done || secret === null) return;
    const val = parseInt(input);
    if (isNaN(val) || val < 1 || val > 100) return;
    const hint: GuessEntry["hint"] = val === secret ? "correct" : val < secret ? "higher" : "lower";
    const newGuesses = [...myGuesses, { value: val, hint }];
    setMyGuesses(newGuesses);
    setInput("");
    if (hint === "correct" || newGuesses.length >= MAX_GUESSES) {
      setDone(true);
      if (isNetworked && sendMove) sendMove({ type: "DONE", guesses: newGuesses.length });
    }
  };

  const finishGame = () => {
    const mine = myGuesses.length;
    const theirs = opponentGuesses;
    let winner: Player | "Draw";
    if (theirs === null) winner = "You";
    else if (mine < theirs) winner = "You";
    else if (theirs < mine) winner = "Stranger";
    else winner = "Draw";
    onGameEnd({ winner, yourScore: `${mine} guesses`, strangerScore: theirs !== null ? `${theirs} guesses` : "DNF", gameName: "Guess the Number", emoji: "🔢" });
  };

  const showResult = done && (!isNetworked || opponentGuesses !== null);
  const remaining = MAX_GUESSES - myGuesses.length;
  const solved = myGuesses.some(g => g.hint === "correct");

  if (waiting) return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-white/60">
      <div className="animate-spin text-4xl">🔢</div>
      <p className="text-sm">Getting the number...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 select-none">
      {isNetworked && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/70">
          <Wifi className="w-3 h-3" />
          <span>Live — Same number 1-100, fewest guesses wins!</span>
        </div>
      )}

      <div className="flex justify-around items-center bg-white/5 rounded-2xl py-3 border border-amber-500/10">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Your guesses</p>
          <p className="text-2xl font-black text-amber-400">{myGuesses.length}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">🔢 1-100</p>
          <p className="text-xs text-white/40">{remaining} left</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Their guesses</p>
          <p className="text-2xl font-black text-rose-400">{isNetworked ? (opponentGuesses ?? "?") : "—"}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="playing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-3">
            <p className="text-center text-sm font-bold text-amber-300 bg-amber-500/10 rounded-xl py-2 border border-amber-500/20">
              🎯 Guess the number! Fewest guesses wins.
            </p>
            <div className="flex gap-2">
              <Input type="number" min={1} max={100} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGuess()}
                placeholder="Guess (1-100)..."
                className="flex-1 bg-white/5 border-white/10 text-white" autoFocus />
              <Button onClick={handleGuess} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">Guess</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {myGuesses.map((g, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-lg bg-white/5 font-mono ${hintColor(g.hint)}`}>
                  {g.value} {hintIcon(g.hint)}
                </span>
              ))}
            </div>
          </motion.div>
        ) : !showResult ? (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm font-bold text-amber-400">{solved ? `✅ Got it in ${myGuesses.length} guesses!` : `❌ Out of guesses! The number was ${secret}.`}</p>
            <p className="text-sm text-white/50 animate-pulse">Waiting for opponent...</p>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
            <div className="bg-white/5 rounded-2xl p-5 text-center border border-white/10">
              <p className="text-2xl font-black text-white mb-2">
                {myGuesses.length < (opponentGuesses ?? Infinity) ? "You win! 🎉" : (opponentGuesses ?? 0) < myGuesses.length ? "Stranger wins!" : "Draw! 🤝"}
              </p>
              <p className="text-sm text-white/60">The number was <span className="text-amber-400 font-bold">{secret}</span></p>
              <p className="text-sm text-white/50 mt-1">You: {myGuesses.length} guesses · Stranger: {opponentGuesses ?? "—"}</p>
            </div>
            <Button onClick={finishGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">Finish Game</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

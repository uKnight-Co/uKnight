"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Wifi } from "lucide-react";
import type { GameProps, Player } from "../types";

type Choice = "Rock" | "Paper" | "Scissors";

const CHOICES: { label: Choice; emoji: string }[] = [
  { label: "Rock", emoji: "🪨" },
  { label: "Paper", emoji: "📄" },
  { label: "Scissors", emoji: "✂️" },
];

function getWinner(a: Choice, b: Choice): "p1" | "p2" | "draw" {
  if (a === b) return "draw";
  if (
    (a === "Rock" && b === "Scissors") ||
    (a === "Paper" && b === "Rock") ||
    (a === "Scissors" && b === "Paper")
  )
    return "p1";
  return "p2";
}

const TOTAL_ROUNDS = 5;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function RockPaperScissors({ onGameEnd, onClose: _onClose, myRole, sendMove, lastOpponentMove }: GameProps) {
  const isNetworked = !!myRole && !!sendMove;

  const [myChoice, setMyChoice] = useState<Choice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<Choice | null>(null);
  const [scores, setScores] = useState({ me: 0, them: 0, draws: 0 });
  const [round, setRound] = useState(1);
  const [roundResult, setRoundResult] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // — Offline (same-device) state —
  const [phase, setPhase] = useState<"p1-pick" | "p2-pick" | "reveal">("p1-pick");
  const [p1Choice, setP1Choice] = useState<Choice | null>(null);

  // Handle networked pick
  const handleMyPick = (c: Choice) => {
    if (myChoice || waitingForOpponent) return;
    setMyChoice(c);
    setWaitingForOpponent(true);
    if (sendMove) sendMove({ type: "CHOICE", choice: c });
  };

  // Receive opponent's choice
  useEffect(() => {
    if (!isNetworked || !lastOpponentMove) return;
    const move = lastOpponentMove as { type?: string; choice?: Choice };
    if (move.type === "CHOICE" && move.choice) {
      setOpponentChoice(move.choice);
      setWaitingForOpponent(false);
    } else if (move.type === "NEXT_ROUND") {
      setMyChoice(null);
      setOpponentChoice(null);
      setRoundResult(null);
      setRevealed(false);
      setRound((r) => r + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOpponentMove]);

  // Resolve round when both choices are in (networked)
  useEffect(() => {
    if (!isNetworked || !myChoice || !opponentChoice || revealed) return;
    setRevealed(true);

    // Determine who "p1" is: initiator is always the reference point
    const initiatorChoice = myRole === "initiator" ? myChoice : opponentChoice;
    const responderChoice = myRole === "initiator" ? opponentChoice : myChoice;
    const result = getWinner(initiatorChoice, responderChoice);

    const iWon = (myRole === "initiator" && result === "p1") || (myRole === "responder" && result === "p2");
    const isDraw = result === "draw";

    const newScores = { ...scores };
    if (iWon) { newScores.me++; setRoundResult("You win this round! 🎉"); }
    else if (isDraw) { newScores.draws++; setRoundResult("Draw! 🤝"); }
    else { newScores.them++; setRoundResult("Stranger wins this round!"); }
    setScores(newScores);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myChoice, opponentChoice]);

  const nextRoundNetworked = () => {
    if (round >= TOTAL_ROUNDS) {
      const winner: Player | "Draw" = scores.me > scores.them ? "You" : scores.them > scores.me ? "Stranger" : "Draw";
      onGameEnd({ winner, yourScore: scores.me, strangerScore: scores.them, gameName: "Rock Paper Scissors", emoji: "✂️" });
      return;
    }
    setMyChoice(null);
    setOpponentChoice(null);
    setRoundResult(null);
    setRevealed(false);
    setRound((r) => r + 1);
    if (sendMove) sendMove({ type: "NEXT_ROUND" });
  };

  // ─── Offline mode (original behavior) ───
  const handleP1Pick = (c: Choice) => { setP1Choice(c); setPhase("p2-pick"); };
  const handleP2Pick = (c: Choice) => {
    const result = getWinner(p1Choice!, c);
    const newScores = { ...scores };
    if (result === "p1") { newScores.me++; setRoundResult("You win this round! 🎉"); }
    else if (result === "p2") { newScores.them++; setRoundResult("Stranger wins this round!"); }
    else { newScores.draws++; setRoundResult("Draw! 🤝"); }
    setScores(newScores);
    setOpponentChoice(c);
    setPhase("reveal");
  };
  const nextRoundOffline = () => {
    if (round >= TOTAL_ROUNDS) {
      const winner: Player | "Draw" = scores.me > scores.them ? "You" : scores.them > scores.me ? "Stranger" : "Draw";
      onGameEnd({ winner, yourScore: scores.me, strangerScore: scores.them, gameName: "Rock Paper Scissors", emoji: "✂️" });
      return;
    }
    setP1Choice(null); setOpponentChoice(null); setRoundResult(null);
    setRound((r) => r + 1); setPhase("p1-pick");
  };

  const emoji = (c: Choice | null) => CHOICES.find((ch) => ch.label === c)?.emoji ?? "❓";

  // ─── NETWORKED UI ───
  if (isNetworked) {
    return (
      <div className="flex flex-col gap-4 select-none">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400/70">
          <Wifi className="w-3 h-3" />
          <span>Live — Both pick simultaneously</span>
        </div>

        <div className="flex justify-around items-center bg-slate-800/75 rounded-2xl py-3 border border-slate-700">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">You</p>
            <p className="text-2xl font-black text-amber-400">{scores.me}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Round {round}/{TOTAL_ROUNDS}</p>
            <p className="text-sm font-bold text-white/60">{scores.draws} draws</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Stranger</p>
            <p className="text-2xl font-black text-rose-400">{scores.them}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {myChoice ? (
                <p className="text-center text-sm text-amber-300 font-bold bg-amber-500/10 py-2 rounded-xl animate-pulse">
                  You picked {emoji(myChoice)} — waiting for opponent...
                </p>
              ) : (
                <p className="text-center text-sm text-amber-300 font-bold bg-amber-500/10 py-2 rounded-xl">
                  🫵 Pick your weapon!
                </p>
              )}
              <div className="grid grid-cols-3 gap-3">
                {CHOICES.map(({ label, emoji: e }) => (
                  <motion.button
                    key={label}
                    whileHover={{ scale: myChoice ? 1 : 1.08, y: myChoice ? 0 : -4 }}
                    whileTap={{ scale: myChoice ? 1 : 0.95 }}
                    onClick={() => handleMyPick(label)}
                    disabled={!!myChoice}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      myChoice === label
                        ? "bg-amber-900/75 border-amber-600"
                        : myChoice
                        ? "bg-slate-800/75 border-slate-700 opacity-40 cursor-not-allowed"
                        : "bg-slate-800/75 border-slate-600 hover:border-amber-600 hover:bg-amber-900/75 cursor-pointer"
                    }`}
                  >
                    <span className="text-4xl">{e}</span>
                    <span className="text-xs text-white/70 font-medium">{label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="reveal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
              <div className="flex items-center justify-around bg-slate-800/75 rounded-2xl py-6 border border-slate-700">
                <div className="text-center">
                  <p className="text-[10px] text-white/40 uppercase mb-2">You</p>
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="text-5xl block">
                    {emoji(myChoice)}
                  </motion.span>
                  <p className="text-sm text-white/70 mt-2">{myChoice}</p>
                </div>
                <span className="text-3xl text-white/30">VS</span>
                <div className="text-center">
                  <p className="text-[10px] text-white/40 uppercase mb-2">Stranger</p>
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="text-5xl block">
                    {emoji(opponentChoice)}
                  </motion.span>
                  <p className="text-sm text-white/70 mt-2">{opponentChoice}</p>
                </div>
              </div>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center text-base font-bold text-white bg-slate-800/75 py-2 rounded-xl">
                {roundResult}
              </motion.p>
              <Button onClick={nextRoundNetworked} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl">
                {round >= TOTAL_ROUNDS ? "See Final Result" : "Next Round →"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── OFFLINE UI (original same-device gameplay) ───
  return (
    <div className="flex flex-col gap-4 select-none">
      <div className="flex justify-around items-center bg-white/5 rounded-2xl py-3 border border-white/5">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">You</p>
          <p className="text-2xl font-black text-amber-400">{scores.me}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Round {round}/{TOTAL_ROUNDS}</p>
          <p className="text-sm font-bold text-white/60">{scores.draws} draws</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Stranger</p>
          <p className="text-2xl font-black text-rose-400">{scores.them}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "p1-pick" && (
          <motion.div key="p1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-3">
            <p className="text-center text-sm text-amber-300 font-bold bg-amber-500/10 py-2 rounded-xl">
              🫵 You — Choose your weapon (then pass to Stranger)
            </p>
            <div className="grid grid-cols-3 gap-3">
              {CHOICES.map(({ label, emoji: e }) => (
                <motion.button key={label} whileHover={{ scale: 1.08, y: -4 }} whileTap={{ scale: 0.95 }} onClick={() => handleP1Pick(label)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800/75 border border-slate-600 hover:border-amber-600 hover:bg-amber-900/75 transition-all">
                  <span className="text-4xl">{e}</span>
                  <span className="text-xs text-white/70 font-medium">{label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
        {phase === "p2-pick" && (
          <motion.div key="p2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-3">
            <p className="text-center text-sm text-rose-300 font-bold bg-rose-500/10 py-2 rounded-xl">
              🫴 Stranger — Your turn! (You picked in secret)
            </p>
            <div className="grid grid-cols-3 gap-3">
              {CHOICES.map(({ label, emoji: e }) => (
                <motion.button key={label} whileHover={{ scale: 1.08, y: -4 }} whileTap={{ scale: 0.95 }} onClick={() => handleP2Pick(label)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800/75 border border-slate-600 hover:border-rose-600 hover:bg-rose-900 transition-all">
                  <span className="text-4xl">{e}</span>
                  <span className="text-xs text-white/70 font-medium">{label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
        {phase === "reveal" && (
          <motion.div key="reveal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
            <div className="flex items-center justify-around bg-slate-800/75 rounded-2xl py-6 border border-slate-700">
              <div className="text-center">
                <p className="text-[10px] text-white/40 uppercase mb-2">You</p>
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="text-5xl block">{emoji(p1Choice)}</motion.span>
                <p className="text-sm text-white/70 mt-2">{p1Choice}</p>
              </div>
              <span className="text-3xl text-white/30">VS</span>
              <div className="text-center">
                <p className="text-[10px] text-white/40 uppercase mb-2">Stranger</p>
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="text-5xl block">{emoji(opponentChoice)}</motion.span>
                <p className="text-sm text-white/70 mt-2">{opponentChoice}</p>
              </div>
            </div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center text-base font-bold text-white bg-slate-800/75 py-2 rounded-xl">
              {roundResult}
            </motion.p>
            <Button onClick={nextRoundOffline} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl">
              {round >= TOTAL_ROUNDS ? "See Final Result" : "Next Round →"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



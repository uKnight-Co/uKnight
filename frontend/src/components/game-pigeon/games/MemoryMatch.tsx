"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameProps, Player } from "../types";

const CARD_EMOJIS = ["🐶", "🐱", "🐸", "🦊", "🐼", "🦋", "🌸", "⭐", "🍕", "🎸", "🚀", "🎯"];
const GRID_SIZE = 4;
const TOTAL_PAIRS = (GRID_SIZE * GRID_SIZE) / 2;

interface Card { id: number; emoji: string; flipped: boolean; matched: boolean; }

function makeCards(order?: string[]): Card[] {
  const emojis = order ?? (() => {
    const base = CARD_EMOJIS.slice(0, TOTAL_PAIRS);
    const doubled = [...base, ...base];
    for (let i = doubled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
    }
    return doubled;
  })();
  return emojis.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

export function MemoryMatch({ onGameEnd, myRole, sendMove, lastOpponentMove }: GameProps) {
  const isNetworked = !!myRole && !!sendMove;
  const isInitiator = myRole === "initiator";

  const [cards, setCards] = useState<Card[]>(() => isNetworked && !isInitiator ? [] : makeCards());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState(0);
  const [flips, setFlips] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [done, setDone] = useState(false);
  const [opponentFlips, setOpponentFlips] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(isNetworked && !isInitiator);

  // Initiator sends the shared deck on mount
  useEffect(() => {
    if (!isNetworked || !isInitiator || !sendMove) return;
    const base = CARD_EMOJIS.slice(0, TOTAL_PAIRS);
    const doubled = [...base, ...base];
    for (let i = doubled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
    }
    sendMove({ type: "INIT", deck: doubled });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isNetworked || !lastOpponentMove) return;
    const m = lastOpponentMove as { type?: string; deck?: string[]; flips?: number };
    if (m.type === "INIT" && Array.isArray(m.deck)) {
      setCards(makeCards(m.deck));
      setWaiting(false);
    } else if (m.type === "DONE" && typeof m.flips === "number") {
      setOpponentFlips(m.flips);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOpponentMove]);

  const handleFlip = useCallback((idx: number) => {
    if (isChecking || done || cards[idx]?.flipped || cards[idx]?.matched || flipped.length === 2) return;
    const newCards = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    const newFlipped = [...flipped, idx];
    setCards(newCards);
    setFlipped(newFlipped);
    setFlips(f => f + 1);

    if (newFlipped.length === 2) {
      setIsChecking(true);
      const [a, b] = newFlipped;
      if (newCards[a].emoji === newCards[b].emoji) {
        setTimeout(() => {
          setCards(p => p.map((c, i) => (i === a || i === b) ? { ...c, matched: true } : c));
          const newMatched = matched + 1;
          setMatched(newMatched);
          setFlipped([]);
          setIsChecking(false);
          if (newMatched >= TOTAL_PAIRS) {
            setDone(true);
            const totalFlips = flips + 1;
            if (isNetworked && sendMove) sendMove({ type: "DONE", flips: totalFlips });
          }
        }, 600);
      } else {
        setTimeout(() => {
          setCards(p => p.map((c, i) => (i === a || i === b) ? { ...c, flipped: false } : c));
          setFlipped([]);
          setIsChecking(false);
        }, 900);
      }
    }
  }, [cards, flipped, isChecking, done, matched, flips, isNetworked, sendMove]);

  const finishGame = () => {
    const myFlips = flips;
    const theirFlips = opponentFlips;
    let winner: Player | "Draw";
    if (theirFlips === null) winner = "You";
    else if (myFlips < theirFlips) winner = "You";
    else if (theirFlips < myFlips) winner = "Stranger";
    else winner = "Draw";
    onGameEnd({ winner, yourScore: `${myFlips} flips`, strangerScore: theirFlips !== null ? `${theirFlips} flips` : "DNF", gameName: "Memory Match", emoji: "🃏" });
  };

  if (waiting) return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-white/60">
      <div className="animate-spin text-4xl">🃏</div>
      <p className="text-sm">Setting up the board...</p>
    </div>
  );

  const showResult = done && (!isNetworked || opponentFlips !== null);

  return (
    <div className="flex flex-col gap-3 select-none">
      {isNetworked && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/70">
          <Wifi className="w-3 h-3" />
          <span>Live — Same deck, fewest flips wins!</span>
        </div>
      )}

      <div className="flex justify-around items-center bg-slate-800/75 rounded-2xl py-3 border border-slate-700">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Your flips</p>
          <p className="text-2xl font-black text-amber-400">{flips}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Pairs</p>
          <p className="text-sm text-white/60">{matched}/{TOTAL_PAIRS}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Their flips</p>
          <p className="text-2xl font-black text-rose-400">{isNetworked ? (opponentFlips ?? "?") : "—"}</p>
        </div>
      </div>

      {!done ? (
        <div className="text-center text-sm font-bold py-1.5 rounded-xl text-amber-400 bg-amber-900/75 border border-amber-700">
          Flip cards — match all {TOTAL_PAIRS} pairs! Fewest flips wins.
        </div>
      ) : !isNetworked || opponentFlips !== null ? null : (
        <div className="text-center text-sm font-bold py-1.5 rounded-xl text-amber-400/70 bg-amber-500/10 animate-pulse">
          ✅ Done in {flips} flips! Waiting for opponent...
        </div>
      )}

      <div className="grid gap-2 mx-auto w-full" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
        {cards.map((card, i) => (
          <motion.button key={card.id} onClick={() => handleFlip(i)}
            whileHover={!card.flipped && !card.matched && !isChecking && !done ? { scale: 1.05 } : {}}
            whileTap={!card.flipped && !card.matched && !isChecking && !done ? { scale: 0.95 } : {}}
            className={`aspect-square rounded-xl flex items-center justify-center text-2xl border transition-all ${
              card.matched ? "bg-amber-700/75 border-amber-500"
              : card.flipped ? "bg-slate-600/75 border-slate-400"
              : "bg-slate-800/75 border-slate-600 cursor-pointer hover:bg-amber-900/75 hover:border-amber-600"
            }`}>
            <AnimatePresence mode="wait">
              {card.flipped || card.matched
                ? <motion.span key="face" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: 90, opacity: 0 }}>{card.emoji}</motion.span>
                : <motion.span key="back" className="text-white/60 text-lg font-bold">?</motion.span>}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-3">
            <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
              <p className="text-2xl font-black text-white mb-1">
                {flips < (opponentFlips ?? Infinity) ? "You win! 🎉" : (opponentFlips ?? 0) < flips ? "Stranger wins!" : "Draw! 🤝"}
              </p>
              <p className="text-sm text-white/50">You: {flips} flips · Stranger: {opponentFlips ?? "—"} flips</p>
            </div>
            <Button onClick={finishGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">Finish Game</Button>
          </motion.div>
        )}
        {done && !isNetworked && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-3">
            <Button onClick={finishGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">Finish Game</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



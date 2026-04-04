"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gamepad2, Plus, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameDefinition } from "./types";

import { TicTacToe } from "./games/TicTacToe";
import { Connect4 } from "./games/Connect4";
import { WordScramble } from "./games/WordScramble";
import { Knockout } from "./games/Knockout";
import { MemoryMatch } from "./games/MemoryMatch";
import { RockPaperScissors } from "./games/RockPaperScissors";
import { Snake } from "./games/Snake";
import { Minesweeper } from "./games/Minesweeper";
import { GuessTheNumber } from "./games/GuessTheNumber";
import { ReactionTime } from "./games/ReactionTime";

export const GAMES: GameDefinition[] = [
  {
    id: "tictactoe", name: "Tic-Tac-Toe", emoji: "❌",
    tagline: "Classic 3×3 battle",
    rules: "Players take turns placing X or O on a 3×3 grid. First to get 3 in a row (horizontal, vertical, or diagonal) wins the round!",
    component: TicTacToe,
  },
  {
    id: "connect4", name: "Connect 4", emoji: "🔴",
    tagline: "Drop discs, 4 in a row",
    rules: "Players alternate dropping colored discs into a 7-column grid. Discs fall to the lowest available space. First to connect 4 of your color in a row (any direction) wins!",
    component: Connect4,
  },
  {
    id: "wordscramble", name: "Word Scramble", emoji: "🔤",
    tagline: "Unscramble fastest!",
    rules: "A word is scrambled and shown. Player 1 has 30 seconds to type it correctly. Then Player 2 gets the same scramble. Fastest correct answer wins the round! Best of 5.",
    component: WordScramble,
  },
  {
    id: "pigeon_knockout", name: "Knockout", emoji: "🥊",
    tagline: "Knock pucks off the platform!",
    rules: "Two pucks face off on a circular platform. Take turns dragging and shooting your puck to knock the opponent's off the edge! 5 rounds — most knockouts wins. Red = You, Blue = Stranger.",
    component: Knockout,
  },
  {
    id: "memorymatch", name: "Memory Match", emoji: "🃏",
    tagline: "Flip & match emoji pairs",
    rules: "A 4×4 grid of face-down cards. On your turn, flip 2 cards. If they match, you score a point and go again! If not, they flip back and it's the other player's turn. Most matches wins.",
    component: MemoryMatch,
  },
  {
    id: "rps", name: "Rock Paper Scissors", emoji: "✂️",
    tagline: "Best of 5 rounds",
    rules: "Player 1 picks their weapon secretly, then passes to Player 2 who picks theirs. Both choices are revealed at once. Rock beats Scissors, Scissors beats Paper, Paper beats Rock. Best of 5!",
    component: RockPaperScissors,
  },
  {
    id: "snake", name: "Snake", emoji: "🐍",
    tagline: "30s high score battle",
    rules: "Each player gets 30 seconds to play Snake. Eat food to grow longer and score points. The snake wraps around edges. Hit yourself and your run ends early. Highest score wins!",
    component: Snake,
  },
  {
    id: "minesweeper", name: "Minesweeper", emoji: "💣",
    tagline: "Reveal most safe tiles",
    rules: "Each player gets their own 9×9 board with 10 hidden mines. Click to reveal tiles — empty tiles auto-reveal neighbors. Hit a mine and your run ends. Most safe tiles revealed wins!",
    component: Minesweeper,
  },
  {
    id: "guessthenumber", name: "Guess the Number", emoji: "🔢",
    tagline: "1-100, fewest guesses",
    rules: "Player 1 picks a secret number (1-100) and Player 2 guesses it, receiving Higher/Lower hints. Then swap! The player who needed fewer guesses wins. Max 10 guesses each.",
    component: GuessTheNumber,
  },
  {
    id: "reactiontime", name: "Reaction Time", emoji: "⚡",
    tagline: "Tap when it turns green!",
    rules: "Wait for the button to turn green, then tap as fast as possible! Tapping too early counts as a penalty miss. Each player does 5 rounds. Lowest average reaction time wins.",
    component: ReactionTime,
  },
];

interface GamePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (gameId: string) => void;
  onStartModular: (gameIds: string[]) => void;
}

const COMIC_STYLES = [
  { shape: "rounded-[24px_8px_24px_8px]", bg: "bg-gradient-to-br from-blue-500 to-indigo-600", transform: "hover:rotate-2 hover:scale-[1.05]" },
  { shape: "rounded-[8px_24px_8px_24px]", bg: "bg-gradient-to-br from-amber-400 to-orange-500", transform: "hover:-rotate-2 hover:scale-[1.05]" },
  { shape: "rounded-[24px_24px_8px_8px]", bg: "bg-gradient-to-br from-emerald-400 to-green-600", transform: "hover:rotate-1 hover:scale-[1.05]" },
  { shape: "rounded-[8px_8px_24px_24px]", bg: "bg-gradient-to-br from-cyan-400 to-blue-500", transform: "hover:-rotate-1 hover:scale-[1.05]" },
  { shape: "rounded-[16px_32px_16px_32px]", bg: "bg-gradient-to-br from-violet-500 to-purple-600", transform: "hover:rotate-3 hover:scale-[1.05]" },
];

export function GamePickerModal({ isOpen, onClose, onStartGame, onStartModular }: GamePickerModalProps) {
  const [tab, setTab] = useState<"single" | "modular">("single");
  const [queue, setQueue] = useState<string[]>([]);
  const [rulesFor, setRulesFor] = useState<string | null>(null);

  const toggleQueue = (id: string) => {
    setQueue((q) => q.includes(id) ? q.filter((x) => x !== id) : [...q, id]);
  };

  const removeFromQueue = (id: string) => setQueue((q) => q.filter((x) => x !== id));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-full md:max-w-md bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 border-4 border-black rounded-t-[32px] md:rounded-[32px] overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] font-[family-name:var(--font-mountains)]"
          >
            {/* Comic dot halftone overlay for modal */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,black_2px,transparent_2px)] [background-size:12px_12px] z-0 pointer-events-none mix-blend-overlay"></div>
            {/* Handle */}
            <div className="flex justify-center pt-3 md:hidden">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b-4 border-black/50 bg-black/20 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="bg-amber-400 p-2 rounded-xl border-2 border-black transform -rotate-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                  <Gamepad2 className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white leading-none tracking-wider text-shadow-sm">UKnight Clubhouse</h2>
                  <p className="text-sm text-white/80 font-bold">Challenge your match partner!</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/20 text-white/70 hover:text-white h-10 w-10 border-2 border-transparent hover:border-white/50 transition-all">
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-5 pt-4 pb-2 relative z-10">
              {(["single", "modular"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 rounded-xl text-lg font-bold transition-all border-2 ${tab === t ? "bg-amber-400 text-black border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transform -translate-y-1" : "bg-black/30 border-transparent text-white/70 hover:bg-black/50"}`}
                >
                  {t === "single" ? "🎮 Single Game" : "🏆 Tournament Mode"}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 relative z-10">
              <AnimatePresence mode="wait">
                {tab === "single" ? (
                  <motion.div key="single" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="grid grid-cols-2 gap-2.5 pt-2">
                    {GAMES.map((game, i) => {
                      const style = COMIC_STYLES[i % COMIC_STYLES.length];
                      return (
                      <div key={game.id} className="relative group">
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => { onStartGame(game.id); onClose(); }}
                          className={`w-full flex flex-col items-start gap-2 p-3.5 ${style.shape} ${style.bg} border-4 border-white/90 shadow-[4px_4px_0_0_rgba(255,255,255,0.8)] ${style.transform} transition-all text-left overflow-hidden relative z-10`}
                        >
                          <span className="text-4xl drop-shadow-md relative z-10">{game.emoji}</span>
                          <div className="relative z-10">
                            <p className="text-xl font-[family-name:var(--font-mountains)] font-bold text-white tracking-wide text-shadow-sm">{game.name}</p>
                            <p className="text-[11px] text-white/90 mt-0.5 leading-tight font-medium bg-black/20 px-2 py-0.5 rounded-full inline-block backdrop-blur-sm">{game.tagline}</p>
                          </div>
                          
                          {/* Comic dot halftone overlay */}
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,black_2px,transparent_2px)] [background-size:8px_8px] z-0 mix-blend-overlay"></div>
                        </motion.button>

                        {/* Rules tooltip button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setRulesFor(rulesFor === game.id ? null : game.id); }}
                          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all z-10"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>

                        <AnimatePresence>
                          {rulesFor === game.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -4, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.95 }}
                              className="absolute top-full left-0 right-0 mt-2 z-20 bg-amber-200 border-2 border-black rounded-[12px_24px_12px_24px] p-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="absolute top-[-8px] left-4 w-4 h-4 bg-amber-200 border-l-2 border-t-2 border-black rotate-45" />
                              <p className="text-[12px] font-bold text-black leading-relaxed font-[family-name:var(--font-mountains)]">{game.rules}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )})}
                  </motion.div>
                ) : (
                  <motion.div key="modular" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-3 pt-2">
                    <p className="text-lg text-white/80 font-bold text-center">Select games to add to your tournament playlist. They'll play in order!</p>

                    {/* Queue */}
                    {queue.length > 0 && (
                      <div className="bg-black/30 rounded-[20px] p-4 border-2 border-black shadow-inner">
                        <p className="text-sm uppercase tracking-widest text-amber-300 font-bold mb-3">Your Playlist ({queue.length} games)</p>
                        <div className="flex flex-wrap gap-2">
                          {queue.map((id, i) => {
                            const g = GAMES.find((g) => g.id === id)!;
                            return (
                              <motion.div
                                key={id}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 border-2 border-black rounded-full text-sm text-black font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] transform hover:-rotate-2 transition-transform"
                              >
                                <span className="opacity-70">{i + 1}.</span>
                                {g.emoji} {g.name}
                                <button onClick={() => removeFromQueue(id)} className="ml-1 text-black/60 hover:text-red-600 transition-colors bg-white/30 rounded-full p-0.5">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Game selector */}
                    <div className="grid grid-cols-2 gap-2">
                      {GAMES.map((game, i) => {
                        const inQueue = queue.includes(game.id);
                        const style = COMIC_STYLES[i % COMIC_STYLES.length];
                        return (
                          <motion.button
                            key={game.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => toggleQueue(game.id)}
                            className={`flex items-center gap-2 p-2.5 border-2 transition-all relative overflow-hidden ${
                              inQueue 
                                ? `${style.shape} ${style.bg} border-white shadow-[2px_2px_0_0_rgba(255,255,255,0.7)] text-white` 
                                : `rounded-xl bg-white/5 border-white/10 text-white/70 hover:border-white/30 grayscale hover:grayscale-0`
                            }`}
                          >
                            <span className="text-2xl relative z-10">{game.emoji}</span>
                            <p className="text-sm font-[family-name:var(--font-mountains)] font-bold flex-1 leading-tight relative z-10 tracking-widest">{game.name}</p>
                            {inQueue ? (
                              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0 relative z-10">
                                <span className="text-[10px] text-black font-black">{queue.indexOf(game.id) + 1}</span>
                              </div>
                            ) : (
                              <Plus className="w-4 h-4 text-white/50 flex-shrink-0" />
                            )}
                            
                            {inQueue && (
                              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,black_2px,transparent_2px)] [background-size:8px_8px] z-0 mix-blend-overlay"></div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    {queue.length >= 2 && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                        <Button
                          onClick={() => { onStartModular(queue); onClose(); }}
                          className="w-full bg-linear-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-black font-black font-[family-name:var(--font-mountains)] border-4 border-black rounded-[24px_8px_24px_8px] py-6 text-2xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all"
                        >
                          🏆 Start Tournament ({queue.length} games)
                        </Button>
                      </motion.div>
                    )}

                    {queue.length < 2 && (
                      <p className="text-center text-[15px] font-bold text-white/70 mt-2">Select at least 2 games to start a tournament</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

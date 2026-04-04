"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, ChevronRight, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAMES } from "./GamePickerModal";
import type { GameResult } from "./types";

interface GameOverlayProps {
  gameId: string | null;
  modularQueue: string[] | null;
  onGameResult: (result: GameResult) => void;
  onClose: () => void;
  // Network props — provided when playing cross-device
  myRole?: "initiator" | "responder";
  sendMove?: (action: Record<string, unknown>) => void;
  lastOpponentMove?: Record<string, unknown> | null;
}

export function GameOverlay({ gameId, modularQueue, onGameResult, onClose, myRole, sendMove, lastOpponentMove }: GameOverlayProps) {
  const isModular = !!modularQueue && modularQueue.length > 0;
  const [modularIndex, setModularIndex] = useState(0);
  const [modularScores, setModularScores] = useState({ you: 0, stranger: 0 });
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const currentGameId = isModular ? modularQueue![modularIndex] : gameId;
  const currentGame = GAMES.find((g) => g.id === currentGameId);
  const GameComponent = currentGame?.component;

  const handleClose = () => {
    if (sendMove) {
      sendMove({ type: "FORCE_CLOSE" });
    }
    onClose();
  };

  useEffect(() => {
    if (lastOpponentMove?.type === "FORCE_CLOSE") {
      onClose();
    }
  }, [lastOpponentMove, onClose]);

  const handleGameEnd = (result: GameResult) => {
    if (isModular) {
      setLastResult(result);
      const newScores = { ...modularScores };
      if (result.winner === "You") newScores.you++;
      else if (result.winner === "Stranger") newScores.stranger++;
      setModularScores(newScores);
      setShowRoundResult(true);

      if (modularIndex >= modularQueue!.length - 1) {
        setAllDone(true);
      }
    } else {
      onGameResult(result);
      handleClose();
    }
  };

  const handleNextGame = () => {
    setShowRoundResult(false);
    setLastResult(null);
    setModularIndex((i) => i + 1);
  };

  const handleFinishTournament = () => {
    const totalGames = modularQueue!.length;
    const winner = modularScores.you > modularScores.stranger ? "You" : modularScores.stranger > modularScores.you ? "Stranger" : "Draw";
    onGameResult({
      winner,
      yourScore: `${modularScores.you}/${totalGames} games`,
      strangerScore: `${modularScores.stranger}/${totalGames} games`,
      gameName: `Tournament (${totalGames} games)`,
      emoji: "🏆",
    });
    handleClose();
  };

  if (!currentGame || !GameComponent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className={`w-full md:max-w-md bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 border-4 border-black rounded-t-[32px] md:rounded-[32px] overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] font-[family-name:var(--font-mountains)] relative z-10`}
        >
          {/* Comic dot halftone overlay for modal */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,black_2px,transparent_2px)] [background-size:12px_12px] z-0 pointer-events-none mix-blend-overlay"></div>
          
          <div className="relative z-10 flex flex-col h-full">
          {/* Handle */}
          <div className="flex justify-center pt-3 md:hidden">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b-4 border-black/50 bg-black/20 flex-shrink-0 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-400 p-2 rounded-xl border-2 border-black transform -rotate-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex items-center justify-center">
                <span className="text-xl flex">{currentGame.emoji}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white leading-none tracking-wider text-shadow-sm">{currentGame.name}</h2>
                {isModular && (
                  <p className="text-sm text-amber-400 font-bold mt-1">
                    Tournament — Game {modularIndex + 1}/{modularQueue!.length}
                  </p>
                )}
                {myRole && (
                  <p className="text-sm text-emerald-400/90 font-bold mt-1">
                    🌐 Live multiplayer
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Modular score */}
              {isModular && (
                <div className="flex items-center gap-1.5 bg-black/30 rounded-full px-3 py-1 border-2 border-black shadow-inner">
                  <span className="text-sm font-bold text-emerald-400">{modularScores.you}</span>
                  <span className="text-sm text-white/50 font-bold">–</span>
                  <span className="text-sm font-bold text-rose-400">{modularScores.stranger}</span>
                </div>
              )}
              <Button
                variant="ghost" size="icon"
                onClick={handleClose}
                className="rounded-full hover:bg-white/20 text-white/70 hover:text-white h-10 w-10 border-2 border-transparent hover:border-white/50 transition-all ml-2"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Modular game queue progress */}
          {isModular && (
            <div className="px-5 pt-3 flex gap-1">
              {modularQueue!.map((id, i) => {
                const g = GAMES.find((g) => g.id === id);
                return (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full transition-all ${
                      i < modularIndex ? "bg-emerald-500" : i === modularIndex ? "bg-amber-500 animate-pulse" : "bg-white/10"
                    }`}
                    title={g?.name}
                  />
                );
              })}
            </div>
          )}

          {/* Game area */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <AnimatePresence mode="wait">
              {showRoundResult ? (
                <motion.div
                  key="round-result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col gap-4"
                >
                  <div className="text-center">
                    <span className="text-5xl">{lastResult?.emoji}</span>
                    <h3 className="text-xl font-black text-white mt-3 mb-1">{lastResult?.gameName}</h3>
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm ${
                      lastResult?.winner === "You" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : lastResult?.winner === "Stranger" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {lastResult?.winner === "You" ? "🎉 You won!" : lastResult?.winner === "Stranger" ? "Stranger won!" : "🤝 Draw!"}
                    </div>
                  </div>

                  <div className="flex justify-around bg-white/5 rounded-2xl py-4 border border-white/5">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">You</p>
                      <p className="text-lg font-black text-white">{lastResult?.yourScore}</p>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Stranger</p>
                      <p className="text-lg font-black text-white">{lastResult?.strangerScore}</p>
                    </div>
                  </div>

                  {/* Tournament standings */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <p className="text-[10px] uppercase tracking-widest text-amber-400/60 mb-3">Tournament Standings</p>
                    <div className="flex justify-around">
                      <div className="text-center">
                        <Gamepad2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                        <p className="text-2xl font-black text-emerald-400">{modularScores.you}</p>
                        <p className="text-[10px] text-white/40">You</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-white/30 mt-2">vs</p>
                      </div>
                      <div className="text-center">
                        <Gamepad2 className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                        <p className="text-2xl font-black text-rose-400">{modularScores.stranger}</p>
                        <p className="text-[10px] text-white/40">Stranger</p>
                      </div>
                    </div>
                  </div>

                  {allDone ? (
                    <Button
                      onClick={handleFinishTournament}
                      className="w-full bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold rounded-2xl py-5 text-base shadow-lg shadow-amber-500/25"
                    >
                      <Trophy className="w-5 h-5 mr-2" /> See Final Winner!
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextGame}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl py-4"
                    >
                      Next Game: {GAMES.find((g) => g.id === modularQueue![modularIndex + 1])?.emoji}{" "}
                      {GAMES.find((g) => g.id === modularQueue![modularIndex + 1])?.name}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </motion.div>
              ) : (
                <motion.div key={`game-${modularIndex}-${currentGameId}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <GameComponent
                    onGameEnd={handleGameEnd}
                    onClose={handleClose}
                    myRole={myRole}
                    sendMove={sendMove}
                    lastOpponentMove={lastOpponentMove}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameProps, Player } from "../types";

const ROWS = 9;
const COLS = 9;
const MINES = 10;

type CellState = { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number };
type Board = CellState[][];

function makeBoardFromMines(minePositions: number[]): Board {
  const board: Board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );
  minePositions.forEach(pos => {
    const r = Math.floor(pos / COLS);
    const c = pos % COLS;
    board[r][c].mine = true;
  });
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) count++;
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
}

function randomMinePositions(): number[] {
  const positions = Array.from({ length: ROWS * COLS }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions.slice(0, MINES);
}

function floodReveal(board: Board, r: number, c: number): Board {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return board;
  if (board[r][c].revealed || board[r][c].mine || board[r][c].flagged) return board;
  board[r][c] = { ...board[r][c], revealed: true };
  if (board[r][c].adjacent === 0) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr !== 0 || dc !== 0) floodReveal(board, r + dr, c + dc);
    }
  }
  return board;
}

const NUM_COLORS = ["", "#3b82f6", "#22c55e", "#ef4444", "#7c3aed", "#dc2626", "#06b6d4", "#000", "#6b7280"];
const SAFE_TILES = ROWS * COLS - MINES;

export function Minesweeper({ onGameEnd, myRole, sendMove, lastOpponentMove }: GameProps) {
  const isNetworked = !!myRole && !!sendMove;
  const isInitiator = myRole === "initiator";

  const [minePositions] = useState<number[]>(() => !isNetworked || isInitiator ? randomMinePositions() : []);
  const [board, setBoard] = useState<Board>(() => minePositions.length > 0 ? makeBoardFromMines(minePositions) : []);
  const [revealedCount, setRevealedCount] = useState(0);
  const [exploded, setExploded] = useState(false);
  const [done, setDone] = useState(false);
  const [opponentScore, setOpponentScore] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(isNetworked && !isInitiator);
  const [startTime] = useState(Date.now());

  // Initiator seeds mines
  useEffect(() => {
    if (!isNetworked || !isInitiator || !sendMove) return;
    sendMove({ type: "INIT", mines: minePositions });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isNetworked || !lastOpponentMove) return;
    const m = lastOpponentMove as { type?: string; mines?: number[]; score?: number };
    if (m.type === "INIT" && Array.isArray(m.mines)) {
      const newBoard = makeBoardFromMines(m.mines);
      setBoard(newBoard);
      setWaiting(false);
    } else if (m.type === "DONE" && typeof m.score === "number") {
      setOpponentScore(m.score);
    }
  }, [lastOpponentMove, isNetworked]);

  const handleReveal = useCallback((r: number, c: number) => {
    if (done || exploded || !board[r] || board[r][c].revealed || board[r][c].flagged) return;
    if (board[r][c].mine) {
      const boom = board.map(row => row.map(cell => cell.mine ? { ...cell, revealed: true } : cell));
      setBoard(boom);
      setExploded(true);
      setDone(true);
      if (isNetworked && sendMove) sendMove({ type: "DONE", score: revealedCount });
      return;
    }
    const next = board.map(row => row.map(cell => ({ ...cell })));
    floodReveal(next, r, c);
    const count = next.flat().filter(c => c.revealed && !c.mine).length;
    setBoard(next);
    setRevealedCount(count);
    if (count >= SAFE_TILES) {
      setDone(true);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (isNetworked && sendMove) sendMove({ type: "DONE", score: SAFE_TILES * 100 - elapsed });
    }
  }, [board, done, exploded, revealedCount, isNetworked, sendMove, startTime]);

  const handleFlag = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (done || !board[r] || board[r][c].revealed) return;
    const next = board.map(row => row.map(cell => ({ ...cell })));
    next[r][c].flagged = !next[r][c].flagged;
    setBoard(next);
  }, [board, done]);

  const finishGame = () => {
    const mine = revealedCount;
    const theirs = opponentScore;
    let winner: Player | "Draw";
    if (theirs === null) winner = exploded ? "Stranger" : "You";
    else if (!exploded && mine >= SAFE_TILES) winner = theirs > mine ? "Stranger" : "You";
    else if (mine > (theirs ?? 0)) winner = "You";
    else if ((theirs ?? 0) > mine) winner = "Stranger";
    else winner = "Draw";
    onGameEnd({ winner, yourScore: `${mine} tiles`, strangerScore: theirs !== null ? `${theirs} pts` : "—", gameName: "Minesweeper", emoji: "💣" });
  };

  const showResult = done && (!isNetworked || opponentScore !== null);

  if (waiting) return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-white/60">
      <div className="animate-spin text-4xl">💣</div>
      <p className="text-sm">Generating minefield...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 select-none">
      {isNetworked && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/70">
          <Wifi className="w-3 h-3" />
          <span>Live — Same minefield, most safe tiles wins!</span>
        </div>
      )}

      <div className="flex justify-around items-center bg-white/5 rounded-2xl py-3 border border-amber-500/10">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">You</p>
          <p className="text-2xl font-black text-amber-400">{revealedCount}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">💣 {MINES} mines</p>
          <p className="text-xs text-white/40">{SAFE_TILES - revealedCount} left</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Stranger</p>
          <p className="text-2xl font-black text-rose-400">{isNetworked ? (opponentScore !== null ? "✓" : "?") : "—"}</p>
        </div>
      </div>

      <AnimatePresence>
        {exploded && !done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/20 border border-red-500/30 rounded-xl py-2 text-center text-sm text-red-400 font-bold">
            💥 Mine hit! Score: {revealedCount} tiles
          </motion.div>
        )}
        {done && !showResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2 text-sm text-amber-400/70 animate-pulse">
            {exploded ? `💥 Exploded at ${revealedCount} tiles — waiting for opponent...` : `🏆 Board cleared! Waiting for opponent...`}
          </motion.div>
        )}
      </AnimatePresence>

      {!done && !exploded && (
        <div className="text-center text-sm font-bold py-1.5 rounded-xl text-amber-400 bg-amber-500/10 border border-amber-500/20">
          Click to reveal · Right-click to flag · Most tiles wins!
        </div>
      )}

      <div className="overflow-auto rounded-xl border border-white/10 bg-slate-900/75 p-2">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: "2px" }}>
          {board.map((row, r) => row.map((cell, c) => (
            <button key={`${r}-${c}`}
              onClick={() => handleReveal(r, c)}
              onContextMenu={e => handleFlag(e, r, c)}
              disabled={cell.revealed || done}
              className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all ${
                cell.revealed
                  ? cell.mine ? "bg-red-600" : "bg-slate-700/75"
                  : cell.flagged ? "bg-amber-500/30 hover:bg-amber-500/40"
                  : "bg-slate-600/75 hover:bg-amber-500/30 cursor-pointer"
              }`}>
              {cell.revealed
                ? cell.mine ? "💣"
                  : cell.adjacent > 0 ? <span style={{ color: NUM_COLORS[cell.adjacent] }}>{cell.adjacent}</span> : ""
                : cell.flagged ? "🚩" : ""}
            </button>
          )))}
        </div>
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-3">
            <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
              <p className="text-2xl font-black text-white mb-1">
                {revealedCount >= SAFE_TILES ? "You cleared it! 🎉" : exploded ? "Stranger might win!" : "See result..."}
              </p>
              <p className="text-sm text-white/50">You: {revealedCount} tiles · Stranger: {opponentScore !== null ? `${opponentScore} pts` : "—"}</p>
            </div>
            <Button onClick={finishGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">Finish Game</Button>
          </motion.div>
        )}
        {!isNetworked && done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
            <Button onClick={finishGame} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">Finish Game</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



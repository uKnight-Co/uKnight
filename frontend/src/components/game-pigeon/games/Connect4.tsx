"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameProps, Player } from "../types";

const ROWS = 6;
const COLS = 7;

type Cell = 1 | 2 | null;
type Board = Cell[][];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function dropPiece(board: Board, col: number, player: 1 | 2): Board | null {
  const next = board.map((r) => [...r]);
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!next[row][col]) {
      next[row][col] = player;
      return next;
    }
  }
  return null;
}

function checkWin(board: Board): { winner: 1 | 2 | null; cells: [number, number][] } {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== p) break;
          cells.push([nr, nc]);
        }
        if (cells.length === 4) return { winner: p, cells };
      }
    }
  }
  if (board[0].every((c) => c !== null)) return { winner: null, cells: [] };
  return { winner: null, cells: [] };
}

function isBoardFull(board: Board): boolean {
  return board[0].every((c) => c !== null);
}

export function Connect4({ onGameEnd, onClose, myRole, sendMove, lastOpponentMove }: GameProps) {
  const isNetworked = !!myRole && !!sendMove;

  // initiator = Player 1 (Red), responder = Player 2 (Yellow)
  const myPlayer: 1 | 2 = myRole === "initiator" ? 1 : 2;
  const opponentPlayer: 1 | 2 = myPlayer === 1 ? 2 : 1;

  const [board, setBoard] = useState<Board>(emptyBoard());
  const [turn, setTurn] = useState<1 | 2>(1);
  const [winCells, setWinCells] = useState<[number, number][] | null>(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [round, setRound] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  const isMyTurn = !isNetworked || turn === myPlayer;
  const currentPlayer: Player = turn === myPlayer ? "You" : "Stranger";

  const applyDrop = useCallback((col: number, player: 1 | 2, currentBoard: Board) => {
    const next = dropPiece(currentBoard, col, player);
    if (!next) return null;
    const { winner, cells } = checkWin(next);
    return { next, winner, cells };
  }, []);

  const handleDrop = useCallback(
    (col: number) => {
      if (gameOver || winCells) return;
      if (isNetworked && !isMyTurn) return;

      const result = applyDrop(col, turn, board);
      if (!result) return;
      const { next, winner, cells } = result;
      setBoard(next);

      if (isNetworked && sendMove) {
        sendMove({ type: "MOVE", col });
        setWaitingForOpponent(true);
      }

      if (winner) {
        setWinCells(cells);
        setGameOver(true);
        setWaitingForOpponent(false);
        setScores((s) => ({ ...s, [winner === 1 ? "p1" : "p2"]: s[winner === 1 ? "p1" : "p2"] + 1 }));
      } else if (isBoardFull(next)) {
        setGameOver(true);
        setWaitingForOpponent(false);
      } else {
        setTurn(turn === 1 ? 2 : 1);
      }
    },
    [board, turn, gameOver, winCells, isNetworked, isMyTurn, sendMove, applyDrop]
  );

  // Apply opponent's move from network
  useEffect(() => {
    if (!isNetworked || !lastOpponentMove) return;
    const move = lastOpponentMove as { type?: string; col?: number };
    if (move.type === "MOVE" && typeof move.col === "number") {
      const result = applyDrop(move.col, opponentPlayer, board);
      if (!result) return;
      const { next, winner, cells } = result;
      setBoard(next);
      setWaitingForOpponent(false);

      if (winner) {
        setWinCells(cells);
        setGameOver(true);
        setScores((s) => ({ ...s, [winner === 1 ? "p1" : "p2"]: s[winner === 1 ? "p1" : "p2"] + 1 }));
      } else if (isBoardFull(next)) {
        setGameOver(true);
      } else {
        setTurn(myPlayer);
      }
    } else if (move.type === "NEXT_ROUND") {
      setBoard(emptyBoard());
      setWinCells(null);
      setGameOver(false);
      setTurn(1);
      setRound((r) => r + 1);
      setWaitingForOpponent(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOpponentMove]);

  const nextRound = () => {
    setBoard(emptyBoard());
    setWinCells(null);
    setGameOver(false);
    setTurn(1);
    setRound((r) => r + 1);
    if (isNetworked && sendMove) {
      sendMove({ type: "NEXT_ROUND" });
    }
  };

  const finishGame = () => {
    const myScore = myPlayer === 1 ? scores.p1 : scores.p2;
    const theirScore = myPlayer === 1 ? scores.p2 : scores.p1;
    const winner: Player | "Draw" = myScore > theirScore ? "You" : theirScore > myScore ? "Stranger" : "Draw";
    onGameEnd({ winner, yourScore: myScore, strangerScore: theirScore, gameName: "Connect 4", emoji: "🔴" });
  };

  const isDraw = gameOver && !winCells;
  const isWinCell = (r: number, c: number) => winCells?.some(([wr, wc]) => wr === r && wc === c);
  const youWon = winCells && board.find((row, r) => row.find((c, ci) => isWinCell(r, ci) && c === myPlayer));

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Network status */}
      {isNetworked && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400/70">
          <Wifi className="w-3 h-3" />
          <span>Live — You are {myPlayer === 1 ? "🔴 Red (goes first)" : "🟡 Yellow (goes second)"}</span>
        </div>
      )}

      {/* Scoreboard */}
      <div className="flex justify-around items-center bg-white/5 rounded-2xl py-3 border border-white/5">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">You {myPlayer === 1 ? "🔴" : "🟡"}</p>
          <p className={`text-2xl font-black ${isMyTurn && !gameOver ? (myPlayer === 1 ? "text-red-400" : "text-yellow-400") : "text-white"}`}>
            {myPlayer === 1 ? scores.p1 : scores.p2}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Round</p>
          <p className="text-xl font-bold text-white">{round}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Stranger {myPlayer === 1 ? "🟡" : "🔴"}</p>
          <p className={`text-2xl font-black ${!isMyTurn && !gameOver ? (opponentPlayer === 2 ? "text-yellow-400" : "text-red-400") : "text-white"}`}>
            {myPlayer === 1 ? scores.p2 : scores.p1}
          </p>
        </div>
      </div>

      {/* Turn / Result */}
      <AnimatePresence mode="wait">
        <motion.div
          key={gameOver ? "done" : turn}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`text-center text-sm font-bold py-1.5 rounded-xl ${
            gameOver
              ? isDraw
                ? "text-amber-400 bg-amber-500/10"
                : winCells
                ? youWon ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                : ""
              : isMyTurn
              ? "text-amber-400 bg-amber-500/10"
              : "text-rose-400 bg-rose-500/10"
          }`}
        >
          {gameOver
            ? isDraw
              ? "It's a Draw! 🤝"
              : youWon ? "You win! 🎉" : "Stranger wins!"
            : waitingForOpponent
            ? "Waiting for opponent..."
            : `${currentPlayer}'s Turn — Click a column`}
        </motion.div>
      </AnimatePresence>

      {/* Board */}
      <div className="bg-blue-900/40 rounded-2xl p-2 border border-blue-500/20 overflow-hidden">
        {/* Column hover buttons */}
        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {Array.from({ length: COLS }, (_, c) => (
            <button
              key={c}
              onClick={() => handleDrop(c)}
              onMouseEnter={() => setHoverCol(c)}
              onMouseLeave={() => setHoverCol(null)}
              disabled={gameOver || !!winCells || (isNetworked && !isMyTurn)}
              className="h-5 flex items-center justify-center"
            >
              <AnimatePresence>
                {hoverCol === c && !gameOver && isMyTurn && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`w-3 h-3 rounded-full ${myPlayer === 1 ? "bg-red-400" : "bg-yellow-400"}`}
                  />
                )}
              </AnimatePresence>
            </button>
          ))}
        </div>

        {board.map((row, r) => (
          <div key={r} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
            {row.map((cell, c) => (
              <motion.div
                key={c}
                onClick={() => handleDrop(c)}
                className={`aspect-square rounded-full border cursor-pointer transition-all ${
                  isWinCell(r, c)
                    ? "border-white shadow-lg scale-110"
                    : "border-white/10"
                } ${
                  cell === 1
                    ? "bg-red-500 border-red-400"
                    : cell === 2
                    ? "bg-yellow-400 border-yellow-300"
                    : "bg-slate-800/80"
                }`}
                animate={isWinCell(r, c) ? { scale: [1, 1.15, 1], boxShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 14px rgba(255,255,255,0.7)", "0 0 8px rgba(255,255,255,0.4)"] } : {}}
                transition={{ duration: 0.6, repeat: isWinCell(r, c) ? Infinity : 0 }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {gameOver && (
          <Button onClick={nextRound} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" /> Next Round
          </Button>
        )}
        <Button onClick={finishGame} variant="outline" className="flex-1 border-white/10 text-white/70 hover:bg-white/10 rounded-xl">
          Finish Game
        </Button>
      </div>
    </div>
  );
}

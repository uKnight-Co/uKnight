"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Circle, RotateCcw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameProps, Player } from "../types";

type Cell = "X" | "O" | null;
type Board = Cell[];

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Board): { winner: Cell; line: number[] | null } {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every(Boolean)) return { winner: null, line: null };
  return { winner: null, line: null };
}

export function TicTacToe({ onGameEnd, myRole, sendMove, lastOpponentMove }: GameProps) {
  const isNetworked = !!myRole && !!sendMove;
  const mySymbol: "X" | "O" = myRole === "initiator" ? "X" : "O";
  const opponentSymbol: "X" | "O" = mySymbol === "X" ? "O" : "X";

  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [round, setRound] = useState(1);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  const currentPlayer: Player = turn === mySymbol ? "You" : "Stranger";
  const isMyTurn = !isNetworked || turn === mySymbol;

  const applyMove = useCallback((idx: number, currentBoard: Board, currentTurn: "X" | "O") => {
    if (currentBoard[idx] || gameOver || winLine) return null;
    const next = currentBoard.slice();
    next[idx] = currentTurn;
    const { winner, line } = checkWinner(next);
    return { next, winner, line };
  }, [gameOver, winLine]);

  const handleClick = useCallback((idx: number) => {
    if (board[idx] || gameOver || winLine) return;
    if (isNetworked && !isMyTurn) return;
    const result = applyMove(idx, board, turn);
    if (!result) return;
    const { next, winner, line } = result;
    setBoard(next);
    if (isNetworked && sendMove) { sendMove({ type: "MOVE", cell: idx }); setWaitingForOpponent(true); }
    if (winner) {
      setWinLine(line); setGameOver(true); setWaitingForOpponent(false);
      setScores((s) => ({ ...s, [winner]: s[winner === "X" ? "X" : "O"] + 1 }));
    } else if (next.every(Boolean)) {
      setGameOver(true); setWaitingForOpponent(false);
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
    } else { setTurn(turn === "X" ? "O" : "X"); }
  }, [board, turn, gameOver, winLine, isNetworked, isMyTurn, sendMove, applyMove]);

  useEffect(() => {
    if (!isNetworked || !lastOpponentMove) return;
    const move = lastOpponentMove as { type?: string; cell?: number };
    if (move.type === "MOVE" && typeof move.cell === "number") {
      const result = applyMove(move.cell, board, opponentSymbol);
      if (!result) return;
      const { next, winner, line } = result;
      setBoard(next); setWaitingForOpponent(false);
      if (winner) { setWinLine(line); setGameOver(true); setScores((s) => ({ ...s, [winner]: s[winner === "X" ? "X" : "O"] + 1 })); }
      else if (next.every(Boolean)) { setGameOver(true); setScores((s) => ({ ...s, draws: s.draws + 1 })); }
      else { setTurn(mySymbol); }
    } else if (move.type === "NEXT_ROUND") {
      setBoard(Array(9).fill(null)); setWinLine(null); setGameOver(false); setTurn("X"); setRound((r) => r + 1); setWaitingForOpponent(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOpponentMove]);

  const nextRound = () => {
    setBoard(Array(9).fill(null)); setWinLine(null); setGameOver(false); setTurn("X"); setRound((r) => r + 1);
    if (isNetworked && sendMove) sendMove({ type: "NEXT_ROUND" });
  };

  const finishGame = () => {
    const winner: Player | "Draw" =
      scores.X > scores.O ? (mySymbol === "X" ? "You" : "Stranger")
      : scores.O > scores.X ? (mySymbol === "O" ? "You" : "Stranger") : "Draw";
    onGameEnd({ winner, yourScore: mySymbol === "X" ? scores.X : scores.O, strangerScore: mySymbol === "X" ? scores.O : scores.X, gameName: "Tic-Tac-Toe", emoji: "❌" });
  };

  const { winner: currentWinner } = checkWinner(board);
  const isDraw = gameOver && !currentWinner;
  const youWon = currentWinner === mySymbol;

  return (
    <div className="flex flex-col gap-4 select-none">
      {isNetworked && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400/70">
          <Wifi className="w-3 h-3" />
          <span>Live — You are {mySymbol === "X" ? "X (goes first)" : "O (goes second)"}</span>
        </div>
      )}

      {/* Scoreboard */}
      <div className="flex justify-around items-center bg-white/5 rounded-2xl py-3 border border-amber-500/10">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">You ({mySymbol})</p>
          <p className={`text-2xl font-black ${isMyTurn && !gameOver ? "text-amber-400" : "text-white"}`}>
            {mySymbol === "X" ? scores.X : scores.O}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Round</p>
          <p className="text-xl font-bold text-white">{round}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Stranger ({opponentSymbol})</p>
          <p className={`text-2xl font-black ${!isMyTurn && !gameOver ? "text-rose-400" : "text-white"}`}>
            {mySymbol === "X" ? scores.O : scores.X}
          </p>
        </div>
      </div>

      {/* Turn indicator */}
      <AnimatePresence mode="wait">
        {!gameOver ? (
          <motion.div key={turn} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className={`text-center text-sm font-bold py-1.5 rounded-xl ${isMyTurn ? "text-amber-400 bg-amber-500/10 border border-amber-500/20" : "text-rose-400 bg-rose-500/10"}`}>
            {waitingForOpponent ? "Waiting for opponent..." : `${currentPlayer}'s Turn`}
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={`text-center text-sm font-bold py-1.5 rounded-xl ${isDraw ? "text-amber-400 bg-amber-500/10" : youWon ? "text-amber-400 bg-amber-500/10 border border-amber-500/30" : "text-rose-400 bg-rose-500/10"}`}>
            {isDraw ? "Draw! 🤝" : youWon ? "You win this round! 🎉" : "Stranger wins this round!"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2 mx-auto w-full max-w-[300px]">
        {board.map((cell, i) => (
          <motion.button key={i}
            whileHover={{ scale: cell || gameOver || (isNetworked && !isMyTurn) ? 1 : 1.05 }}
            whileTap={{ scale: cell || gameOver || (isNetworked && !isMyTurn) ? 1 : 0.95 }}
            onClick={() => handleClick(i)}
            className={`aspect-square rounded-xl flex items-center justify-center border transition-all ${
              winLine?.includes(i) ? "border-amber-500 bg-amber-500/20 shadow-lg shadow-amber-500/30"
              : "border-white/10 bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/30"
            } ${!cell && !gameOver && (!isNetworked || isMyTurn) ? "cursor-pointer" : "cursor-default"}`}>
            <AnimatePresence>
              {cell && (
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                  {cell === "X" ? <X className="w-8 h-8 text-amber-400 stroke-3" /> : <Circle className="w-8 h-8 text-rose-400 stroke-3" />}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        {gameOver && (
          <Button onClick={nextRound} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" /> Next Round
          </Button>
        )}
        <Button onClick={finishGame} variant="outline" className="flex-1 border-amber-500/20 text-white/70 hover:bg-amber-500/10 hover:border-amber-500/40 rounded-xl">
          Finish Game
        </Button>
      </div>
    </div>
  );
}

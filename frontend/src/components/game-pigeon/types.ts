export type Player = "You" | "Stranger";

export interface GameResult {
  winner: Player | "Draw";
  yourScore: number | string;
  strangerScore: number | string;
  gameName: string;
  emoji: string;
}

export interface GameProps {
  onGameEnd: (result: GameResult) => void;
  onClose: () => void;
  // Network props — present when playing cross-device via WebSocket
  myRole?: "initiator" | "responder";
  sendMove?: (action: Record<string, unknown>) => void;
  lastOpponentMove?: Record<string, unknown> | null;
}

export interface GameDefinition {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  rules: string;
  component: React.ComponentType<GameProps>;
}

import type { Avatar } from "./adventure";
import type { Question, Settings, Stats } from "./rules";

export type PublicPlayer = Stats & { id: string; name: string; index: number; left: boolean; avatar?: Avatar };
export type Feedback = { correct: boolean; answer: string };
export type RoomView = {
  code: string;
  topic: string;
  version: number;
  serverNow: number;
  hostId: string;
  playerId: string;
  settings: Settings;
  questionCount?: number;
  phase: "lobby" | "playing" | "finished";
  startsAt: number;
  endsAt: number;
  players: PublicPlayer[];
  question: Omit<Question, "correct"> | null;
  feedback: Feedback | null;
};

export type RoomAction =
  | { action: "create"; name: string; settings: Settings; avatar: Avatar }
  | { action: "join"; name: string; code: string; avatar: Avatar }
  | { action: "avatar"; avatar: Avatar }
  | { action: "settings"; settings: Settings }
  | { action: "start" | "leave" | "rematch" }
  | { action: "answer"; index: number; choice: number; round: number };

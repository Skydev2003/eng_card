import type { CorrectEvent } from "./correct-events";
import type { Avatar } from "./adventure";
import type { Question, Settings, Stats } from "./rules";

export type PublicPlayer = Stats & { id: string; name: string; index: number; left: boolean; ready?: boolean; avatar?: Avatar };
export type Feedback = { correct: boolean; answer: string; reason?: "timeout" };
export type RoomView = {
  code: string;
  topic: string;
  version: number;
  serverNow: number;
  hostId: string;
  playerId: string;
  settings: Settings;
  questionCount?: number;
  questionDeadline?: number;
  nextQuestionDeadline?: number;
  phase: "lobby" | "playing" | "finished";
  startsAt: number;
  endsAt: number;
  players: PublicPlayer[];
  question: Omit<Question, "correct"> | null;
  feedback: Feedback | null;
  recentCorrect?: CorrectEvent[];
};

export type RoomAction =
  | { action: "create"; name: string; settings: Settings; avatar: Avatar }
  | { action: "join"; code: string; name?: string; avatar?: Avatar }
  | { action: "avatar"; avatar: Avatar }
  | { action: "ready"; ready: boolean }
  | { action: "rename"; name: string }
  | { action: "settings"; settings: Settings }
  | { action: "start" | "leave" | "rematch" }
  | { action: "answer"; index: number; choice: number; round: number };

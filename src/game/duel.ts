import { grade, type Stats } from "./rules.ts";

type Vote = { choice: number; at: number };

export type DuelQuestion = {
  index: number;
  openedAt: number;
  deadline: number;
  votes: Record<string, Vote>;
  reveal?: { until: number; overtook: Record<string, string[]> };
};

export type DuelView = {
  index: number;
  answered: boolean;
  answeredCount: number;
  playerCount: number;
  reveal?: { correctChoice: number; overtook: string[] };
};

export const DUEL_REVEAL_MS = 1_500;

export function openDuelQuestion(index: number, openedAt: number, duration: number, endsAt: number): DuelQuestion {
  return { index, openedAt, deadline: Math.min(openedAt + duration, endsAt), votes: {} };
}

export function recordDuelVote(question: DuelQuestion, playerId: string, choice: number, now: number) {
  if (question.reveal || now < question.openedAt || now >= question.deadline || question.votes[playerId]) return false;
  question.votes[playerId] = { choice, at: now };
  return true;
}

export function compareDuelScores(a: Stats, b: Stats) {
  return b.score - a.score || b.correct - a.correct;
}

export function revealDuelQuestion<T extends Stats & { id: string; left: boolean }>(
  question: DuelQuestion, players: T[], correctChoice: number, maxHearts: number, now: number,
) {
  if (question.reveal || now < question.openedAt) return;
  const active = players.filter((player) => !player.left);
  if (now < question.deadline && !active.every((player) => question.votes[player.id])) return;

  return active.map((player) => {
    const vote = question.votes[player.id];
    const correct = vote?.choice === correctChoice;
    const points = correct ? 100 + Math.floor(20 * (question.deadline - vote.at) / (question.deadline - question.openedAt)) : 0;
    const stats = grade(player, correct);
    return {
      player, correct, points, reason: vote ? undefined : "timeout" as const,
      stats: { ...stats, score: player.score + points, hearts: stats.hearts || maxHearts },
    };
  });
}

import { grade, type Stats } from "./rules.ts";

export const DEFAULT_QUESTION_SECONDS = 5;
export const QUESTION_SECONDS = [3, 5, 8, 10, 15, 20] as const;

type TimedRunner = Stats & { index: number; deadline?: number };

export function expireQuestions<T extends TimedRunner>(runner: T, now: number, duration: number, questionCount: number): T {
  if (!runner.deadline || now < runner.deadline || !runner.hearts || runner.index >= questionCount) return runner;
  const missed = Math.min(1 + Math.floor((now - runner.deadline) / duration), runner.hearts, questionCount - runner.index);
  const stats = grade(runner, false);
  return {
    ...runner, ...stats, hearts: runner.hearts - missed,
    index: runner.index + missed, deadline: runner.deadline + missed * duration,
  };
}

export function chasePressure(deadline: number | undefined, now: number, duration: number) {
  return deadline ? Math.min(1, Math.max(0, 1 - (deadline - now) / duration)) : 0;
}

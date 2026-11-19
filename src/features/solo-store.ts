import { create } from "zustand";
import { buildDeck, grade, initialStats, MATCH_MS } from "@/game/rules";
import type { Question, Settings, Stats } from "@/game/rules";
import { appendCorrect, type CorrectEvent } from "@/game/correct-events";
import { DEFAULT_QUESTION_SECONDS, expireQuestions } from "@/game/question-timer";
import type { Feedback } from "@/game/room";

type Solo = {
  deck: Question[];
  stats: Stats;
  index: number;
  endsAt: number;
  deadline: number;
  questionMs: number;
  feedback: Feedback | null;
  recentCorrect: CorrectEvent[];
  start: (settings: Settings) => void;
  answer: (index: number, choice: number) => void;
  tick: () => void;
};

function settleSolo(state: Solo, now: number): Solo {
  if (!state.deadline) return state;
  const runner = { ...state.stats, index: state.index, deadline: state.deadline };
  const next = expireQuestions(runner, Math.min(now, state.endsAt - 1), state.questionMs, state.deck.length);
  if (next === runner) return state;
  const { index, deadline, ...stats } = next;
  const missed = state.deck[index - 1];
  return { ...state, index, deadline, stats, feedback: {
    correct: false, answer: missed.options[missed.correct], reason: "timeout",
  } };
}

export const useSolo = create<Solo>((set) => ({
  deck: [], stats: initialStats(3), index: 0, endsAt: 0, deadline: 0, questionMs: DEFAULT_QUESTION_SECONDS * 1_000,
  feedback: null, recentCorrect: [],
  start: (settings) => {
    const now = Date.now();
    const questionMs = (settings.questionSeconds ?? DEFAULT_QUESTION_SECONDS) * 1_000;
    set({
      deck: buildDeck(settings), stats: initialStats(settings.hearts), index: 0,
      endsAt: now + MATCH_MS, deadline: now + questionMs, questionMs, feedback: null, recentCorrect: [],
    });
  },
  tick: () => set((state) => settleSolo(state, Date.now())),
  answer: (index, choice) => set((current) => {
    const now = Date.now();
    const state = settleSolo(current, now);
    const question = state.deck[state.index];
    if (index !== state.index || !question || !state.stats.hearts || now >= state.endsAt) return state;
    const correct = question.correct === choice;
    const stats = grade(state.stats, correct);
    return {
      index: state.index + 1, stats, deadline: now + state.questionMs,
      recentCorrect: correct ? appendCorrect(state.recentCorrect, {
        playerId: "solo", playerName: "คุณ", index, points: stats.score - state.stats.score, at: now,
      }) : state.recentCorrect,
      feedback: { correct, answer: question.options[question.correct] },
    };
  }),
}));

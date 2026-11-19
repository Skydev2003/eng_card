import { create } from "zustand";
import { buildDeck, grade, initialStats, MATCH_MS } from "@/game/rules";
import type { Question, Settings, Stats } from "@/game/rules";
import type { Feedback } from "@/game/room";

type Solo = {
  deck: Question[];
  stats: Stats;
  index: number;
  endsAt: number;
  feedback: Feedback | null;
  start: (settings: Settings) => void;
  answer: (index: number, choice: number) => void;
};

export const useSolo = create<Solo>((set) => ({
  deck: [], stats: initialStats(3), index: 0, endsAt: 0, feedback: null,
  start: (settings) => set({
    deck: buildDeck(settings), stats: initialStats(settings.hearts), index: 0,
    endsAt: Date.now() + MATCH_MS, feedback: null,
  }),
  answer: (index, choice) => set((state) => {
    const question = state.deck[state.index];
    if (index !== state.index || !question || !state.stats.hearts || Date.now() >= state.endsAt) return state;
    const correct = question.correct === choice;
    return {
      index: state.index + 1, stats: grade(state.stats, correct),
      feedback: { correct, answer: question.options[question.correct] },
    };
  }),
}));

import { distractorsFor, wordsFor } from "./vocabulary.ts";

export const categories = {
  all: "รวมทุกหมวด", people: "ผู้คน", animals: "สัตว์", objects: "สิ่งของ", places: "สถานที่", food: "อาหาร",
};
export const difficulties = { easy: "ง่าย", normal: "ปกติ", hard: "ยาก" };
export type Settings = { category: keyof typeof categories; difficulty: keyof typeof difficulties; hearts: number; questionSeconds?: number };
export const defaults: Settings = { category: "all", difficulty: "normal", hearts: 3, questionSeconds: 5 };
export const ROUND_SIZE = 40;
export const MATCH_MS = 180_000;
export const CAPACITY = 6;

export type Question = { image: string; options: [string, string]; correct: number };
export type Stats = { score: number; hearts: number; streak: number; bestStreak: number; speed: number; correct: number };

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function buildDeck(settings: Settings, size = ROUND_SIZE): Question[] {
  const preferred = wordsFor(settings.category, settings.difficulty);
  const deck: Question[] = [];
  while (deck.length < size) {
    const batch = shuffle(preferred);
    if (batch[0].image === deck.at(-1)?.image) batch.push(batch.shift()!);
    for (const target of batch) {
      const choices = distractorsFor(target, settings.difficulty);
      const decoy = choices[Math.floor(Math.random() * choices.length)];
      const options: Question["options"] = Math.random() < 0.5 ? [target.word, decoy.word] : [decoy.word, target.word];
      deck.push({ image: target.image, options, correct: options.indexOf(target.word) });
      if (deck.length === size) break;
    }
  }
  return deck;
}

export function initialStats(hearts: number): Stats {
  return { score: 0, hearts, streak: 0, bestStreak: 0, speed: 1, correct: 0 };
}

export function grade(stats: Stats, correct: boolean): Stats {
  if (stats.hearts === 0) return stats;
  if (!correct) return { ...stats, hearts: stats.hearts - 1, streak: 0, speed: 1 };
  const streak = stats.streak + 1;
  return {
    ...stats, streak, bestStreak: Math.max(stats.bestStreak, streak), correct: stats.correct + 1,
    score: stats.score + 100 + 25 * (streak - 1), speed: Math.min(2.5, 1 + streak * 0.15),
  };
}

export function compareScores(a: Stats, b: Stats) {
  return b.score - a.score || b.hearts - a.hearts || b.correct - a.correct;
}

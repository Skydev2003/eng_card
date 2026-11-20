import { closePictureOptions, distractorsFor, wordsFor } from "./vocabulary.ts";
import { textClueFor, type WordTextClue } from "./text-clues.ts";

export const categories = {
  all: "รวมทุกหมวด", people: "ผู้คนและกิจกรรม", animals: "สัตว์และธรรมชาติ", objects: "สิ่งของ", places: "สถานที่และการเดินทาง", food: "อาหาร",
};
export const difficulties = { easy: "ง่าย", normal: "ปกติ", hard: "ยาก" };
export type Settings = { category: keyof typeof categories; difficulty: keyof typeof difficulties; hearts: number; questionSeconds?: number };
export const defaults: Settings = { category: "all", difficulty: "normal", hearts: 3, questionSeconds: 5 };
export const ROUND_SIZE = 40;
export const MATCH_MS = 180_000;
export const CAPACITY = 6;

type QuestionClue = { image: string; textClue?: never } | { textClue: WordTextClue; image?: never };
export type PublicQuestion = QuestionClue & { options: [string, string] };
export type Question = PublicQuestion & { correct: number };
export type Stats = { score: number; hearts: number; streak: number; bestStreak: number; speed: number; correct: number };

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function* shuffledRounds<T>(items: T[]): Generator<T, never> {
  let last: T | undefined;
  while (true) {
    const batch = shuffle(items);
    if (batch.length > 1 && batch[0] === last) batch.push(batch.shift()!);
    for (const item of batch) {
      last = item;
      yield item;
    }
  }
}

function question(image: string, word: string, decoy: string): Question {
  const textClue = textClueFor(word);
  const clue = textClue ? { textClue } : { image };
  return Math.random() < 0.5
    ? { ...clue, options: [word, decoy], correct: 0 }
    : { ...clue, options: [decoy, word], correct: 1 };
}

export function publicQuestion(question: Question): PublicQuestion {
  return question.textClue
    ? { textClue: question.textClue, options: question.options }
    : { image: question.image, options: question.options };
}

export function buildDeck(settings: Settings, size = ROUND_SIZE): Question[] {
  const { category, difficulty } = settings;
  const picturePool = wordsFor(category, difficulty);
  const pictures = shuffledRounds(difficulty === "hard"
    ? picturePool.filter((entry) => closePictureOptions(entry).length > 0) : picturePool);
  return Array.from({ length: size }, () => {
    const target = pictures.next().value;
    const choices = distractorsFor(target, difficulty);
    const decoy = choices[Math.floor(Math.random() * choices.length)];
    return question(target.image, target.word, decoy.word);
  });
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

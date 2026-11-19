import "server-only";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { buildDeck, CAPACITY, categories, defaults, difficulties, grade, initialStats, MATCH_MS } from "@/game/rules";
import type { Question, Settings } from "@/game/rules";
import type { Feedback, PublicPlayer, RoomView } from "@/game/room";
import type { Prisma, Room } from "@/generated/prisma/client";
import { defaultAvatar, validAvatar } from "@/game/adventure";
import { appendCorrect, type CorrectEvent } from "@/game/correct-events";
import { DEFAULT_QUESTION_SECONDS, expireQuestions, QUESTION_SECONDS } from "@/game/question-timer";
import { availableRunnerName, guestReadiness } from "@/game/lobby";
import { database } from "./db";

type Player = PublicPlayer & { hash: string; feedback: Feedback | null; deadline?: number };
type State = {
  settings: Settings; hostId: string; players: Player[]; deck: Question[]; recentCorrect?: CorrectEvent[]; startsAt: number; endsAt: number;
};
const ttl = 86_400_000;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export class RoomError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function db() {
  const client = database();
  if (!client) throw new RoomError("โหมดเพื่อนยังไม่ได้เชื่อมต่อฐานข้อมูล", 503);
  return client;
}

function getPhase(state: State, now: number): RoomView["phase"] {
  if (!state.startsAt) return "lobby";
  const everyoneDone = state.players.every((p) => p.left || p.hearts === 0 || p.index >= state.deck.length);
  return everyoneDone || now >= state.endsAt ? "finished" : "playing";
}

function nextDeadline(state: State) {
  const times = state.players.flatMap((player) =>
    !player.left && player.hearts && player.index < state.deck.length && player.deadline
      && player.deadline < state.endsAt ? [player.deadline] : []);
  return times.length ? Math.min(...times) : undefined;
}

function settleTimeouts(state: State, now: number) {
  if (!state.startsAt) return false;
  let updated = false;
  const cutoff = Math.min(now, state.endsAt - 1);
  const duration = (state.settings.questionSeconds ?? DEFAULT_QUESTION_SECONDS) * 1000;
  state.players = state.players.map((player) => {
    if (player.left) return player;
    const next = expireQuestions(player, cutoff, duration, state.deck.length);
    if (next === player) return player;
    const missed = state.deck[next.index - 1];
    updated = true;
    return { ...next, feedback: { correct: false, answer: missed.options[missed.correct], reason: "timeout" } };
  });
  return updated;
}

function view(room: Room, state: State, player: Player, now: number): RoomView {
  const phase = getPhase(state, now);
  const question = phase === "playing" && player.hearts > 0 ? state.deck[player.index] : undefined;
  return {
    code: room.code, version: room.version, topic: room.topic, settings: state.settings, hostId: state.hostId,
    playerId: player.id, phase, startsAt: state.startsAt, endsAt: state.endsAt, serverNow: now,
    questionDeadline: question ? player.deadline : undefined,
    nextQuestionDeadline: phase === "playing" ? nextDeadline(state) : undefined,
    feedback: player.feedback, recentCorrect: state.recentCorrect, questionCount: state.deck.length || undefined,
    question: question ? { image: question.image, options: question.options } : null,
    players: state.players.map(({ id, name, index, left, ready, avatar, score, hearts, streak, bestStreak, speed, correct }) =>
      ({ id, name, index, left, ready: ready ?? false, avatar, score, hearts, streak, bestStreak, speed, correct })),
  };
}

function parseSettings(value: unknown): Settings {
  const s = value as Partial<Settings> | undefined;
  if (!s || typeof s.category !== "string" || !Object.hasOwn(categories, s.category)
    || typeof s.difficulty !== "string" || !Object.hasOwn(difficulties, s.difficulty)
    || typeof s.hearts !== "number" || !Number.isInteger(s.hearts) || s.hearts < 1 || s.hearts > 5
    || (s.questionSeconds !== undefined && !QUESTION_SECONDS.some((seconds) => seconds === s.questionSeconds))) {
    throw new RoomError("การตั้งค่าห้องไม่ถูกต้อง");
  }
  return { category: s.category, difficulty: s.difficulty, hearts: s.hearts, questionSeconds: s.questionSeconds ?? DEFAULT_QUESTION_SECONDS };
}

function playerName(name: unknown) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 24) {
    throw new RoomError("กรอกชื่อผู้เล่น 1–24 ตัวอักษร");
  }
  return name.trim();
}

function makePlayer(name: unknown, hearts: number, token: string, avatar: unknown): Player {
  return {
    ...initialStats(hearts), name: playerName(name), id: randomUUID(), hash: hash(token),
    index: 0, left: false, ready: false, feedback: null, avatar: validAvatar(avatar) ? avatar : defaultAvatar,
  };
}

function findPlayer(state: State, token?: string) {
  const digest = token && hash(token);
  return state.players.find((p) => p.hash === digest && !p.left);
}

function missing() {
  return new RoomError("ไม่พบห้องนี้หรือห้องหมดอายุแล้ว", 404);
}

function requirePlayer(state: State, token?: string) {
  const player = findPlayer(state, token);
  if (!player) throw new RoomError("กรุณาเข้าร่วมห้องอีกครั้ง", 401);
  return player;
}

const json = (state: State) => state as unknown as Prisma.InputJsonValue;
const decode = (room: Room) => room.state as unknown as State;

export async function createRoom(name: unknown, input: unknown, avatar: unknown) {
  const settings = input === undefined ? defaults : parseSettings(input);
  const token = randomBytes(32).toString("hex");
  const host = makePlayer(name, settings.hearts, token, avatar);
  const state: State = { settings, hostId: host.id, players: [host], deck: [], startsAt: 0, endsAt: 0 };
  const now = Date.now();
  const client = db();
  await client.room.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = String(randomInt(1_000_000)).padStart(6, "0");
    try {
      const room = await client.room.create({
        data: { code, topic: `run:${randomUUID()}`, state: json(state), expiresAt: new Date(now + ttl) },
      });
      return { view: view(room, state, host, now), token };
    } catch (error) {
      if (!(typeof error === "object" && error && "code" in error && error.code === "P2002")) throw error;
    }
  }
  throw new RoomError("สร้างรหัสห้องไม่สำเร็จ กรุณาลองอีกครั้ง", 503);
}

export async function readRoom(code: string, token?: string) {
  if (!token) throw new RoomError("กรุณาเข้าร่วมห้องอีกครั้ง", 401);
  const room = await db().room.findUnique({ where: { code } });
  const now = Date.now();
  if (!room || room.expiresAt.getTime() <= now) throw missing();
  const state = decode(room);
  const player = requirePlayer(state, token);
  const deadline = nextDeadline(state);
  if (deadline !== undefined && deadline <= now) {
    const settled = await mutateRoom(code, token, { action: "sync" });
    if (!settled.view) throw missing();
    return settled.view;
  }
  return view(room, state, player, now);
}

export async function mutateRoom(code: string, token: string | undefined, input: Record<string, unknown>) {
  return db().$transaction(async (tx) => {
    const [room] = await tx.$queryRaw<Room[]>`SELECT * FROM "game_rooms" WHERE "code" = ${code} FOR UPDATE`;
    const now = Date.now();
    if (!room || room.expiresAt.getTime() <= now) throw missing();
    const state = decode(room);
    const save = () => tx.room.update({
      where: { code }, data: { state: json(state), version: { increment: 1 }, expiresAt: new Date(now + ttl) },
    });

    if (input.action === "join") {
      const existing = findPlayer(state, token);
      if (existing) return { view: view(room, state, existing, now) };
      if (getPhase(state, now) !== "lobby") throw new RoomError("รอบนี้เริ่มแล้ว รอให้โฮสต์เปิดรอบใหม่", 409);
      if (state.players.length >= CAPACITY) throw new RoomError("ห้องเต็มแล้ว", 409);
      const newToken = randomBytes(32).toString("hex");
      const player = makePlayer(input.name ?? availableRunnerName(state.players), state.settings.hearts, newToken, input.avatar);
      state.players.push(player);
      return { view: view(await save(), state, player, now), token: newToken };
    }

    requirePlayer(state, token);
    const expired = settleTimeouts(state, now);
    const player = requirePlayer(state, token);
    const phase = getPhase(state, now);
    const unchanged = async () => ({ view: view(expired ? await save() : room, state, player, now) });
    const isHost = player.id === state.hostId;
    switch (input.action) {
      case "sync":
        return unchanged();

      case "avatar":
        if (phase !== "lobby") throw new RoomError("ปรับตัวละครได้ในห้องรอ", 409);
        if (!validAvatar(input.avatar)) throw new RoomError("ตัวละครไม่ถูกต้อง");
        if (player.avatar?.mascot === input.avatar.mascot && player.avatar?.palette === input.avatar.palette) return unchanged();
        player.avatar = input.avatar;
        player.ready = false;
        break;

      case "rename": {
        if (phase !== "lobby") throw new RoomError("เปลี่ยนชื่อได้ในห้องรอ", 409);
        const name = playerName(input.name);
        if (player.name === name) return unchanged();
        player.name = name;
        break;
      }

      case "ready":
        if (phase !== "lobby") throw new RoomError("กดพร้อมได้ในห้องรอ", 409);
        if (isHost) throw new RoomError("โฮสต์เป็นผู้กดเริ่มเกม", 403);
        if (typeof input.ready !== "boolean") throw new RoomError("สถานะพร้อมไม่ถูกต้อง");
        if ((player.ready ?? false) === input.ready) return unchanged();
        player.ready = input.ready;
        break;

      case "settings":
      case "start":
      case "rematch":
        if (!isHost) throw new RoomError("เฉพาะโฮสต์เท่านั้นที่ทำรายการนี้ได้", 403);
        if (input.action === "rematch") {
          if (phase !== "finished") throw new RoomError("เกมยังไม่จบ", 409);
          state.players = state.players.filter((p) => !p.left);
          for (const member of state.players) Object.assign(member, initialStats(state.settings.hearts), { index: 0, feedback: null, deadline: undefined, ready: false });
          Object.assign(state, { startsAt: 0, endsAt: 0, deck: [], recentCorrect: [] });
          break;
        }
        if (phase !== "lobby") throw new RoomError("เกมเริ่มแล้ว", 409);
        if (input.action === "settings") {
          state.settings = parseSettings(input.settings);
          for (const member of state.players) {
            member.hearts = state.settings.hearts;
            member.ready = false;
          }
          break;
        }
        const readiness = guestReadiness(state.players, state.hostId);
        if (readiness.total === 0) throw new RoomError("ต้องมีผู้เล่นอย่างน้อย 2 คน", 409);
        if (!readiness.canStart) throw new RoomError("รอให้ผู้เล่นทุกคนกดพร้อมก่อนเริ่มเกม", 409);
        state.deck = buildDeck(state.settings);
        state.recentCorrect = [];
        state.startsAt = now + 3_000;
        state.endsAt = state.startsAt + MATCH_MS;
        for (const member of state.players) {
          member.deadline = state.startsAt + (state.settings.questionSeconds ?? DEFAULT_QUESTION_SECONDS) * 1_000;
        }
        break;

      case "answer": {
        const question = state.deck[player.index];
        if (input.round !== state.startsAt || input.index !== player.index || phase !== "playing"
          || !question || player.hearts === 0 || now < state.startsAt) {
          return unchanged();
        }
        if (input.choice !== 0 && input.choice !== 1) throw new RoomError("คำตอบไม่ถูกต้อง");
        const correct = question.correct === input.choice;
        const next = grade(player, correct);
        if (correct) state.recentCorrect = appendCorrect(state.recentCorrect ?? [], {
          playerId: player.id, playerName: player.name, index: player.index,
          points: next.score - player.score, at: now,
        });
        Object.assign(player, next, {
          index: player.index + 1, deadline: player.deadline ? now + (state.settings.questionSeconds ?? DEFAULT_QUESTION_SECONDS) * 1_000 : undefined,
          feedback: { correct, answer: question.options[question.correct] },
        });
        break;
      }

      case "leave": {
        if (phase === "lobby") state.players = state.players.filter((p) => p !== player);
        else player.left = true;
        const nextHost = state.players.find((p) => !p.left);
        if (!nextHost) await tx.room.delete({ where: { code } });
        else {
          if (isHost) state.hostId = nextHost.id;
          await save();
        }
        return { view: null };
      }

      default:
        throw new RoomError("ไม่รู้จักคำสั่งนี้");
    }
    return { view: view(await save(), state, player, now) };
  });
}

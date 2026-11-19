import "server-only";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { buildDeck, CAPACITY, categories, defaults, difficulties, grade, initialStats, MATCH_MS } from "@/game/rules";
import type { Question, Settings } from "@/game/rules";
import type { Feedback, PublicPlayer, RoomView } from "@/game/room";
import type { Prisma, Room } from "@/generated/prisma/client";
import { defaultAvatar, validAvatar } from "@/game/adventure";
import { database } from "./db";

type Player = PublicPlayer & { hash: string; feedback: Feedback | null };
type State = {
  settings: Settings; hostId: string; players: Player[]; deck: Question[]; startsAt: number; endsAt: number;
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

function view(room: Room, state: State, player: Player, now: number): RoomView {
  const phase = getPhase(state, now);
  const question = phase === "playing" && player.hearts > 0 ? state.deck[player.index] : undefined;
  return {
    code: room.code, version: room.version, topic: room.topic, settings: state.settings, hostId: state.hostId,
    playerId: player.id, phase, startsAt: state.startsAt, endsAt: state.endsAt, serverNow: now,
    feedback: player.feedback, questionCount: state.deck.length || undefined,
    question: question ? { image: question.image, options: question.options } : null,
    players: state.players.map(({ id, name, index, left, avatar, score, hearts, streak, bestStreak, speed, correct }) =>
      ({ id, name, index, left, avatar, score, hearts, streak, bestStreak, speed, correct })),
  };
}

function parseSettings(value: unknown): Settings {
  const s = value as Partial<Settings> | undefined;
  if (!s || typeof s.category !== "string" || !Object.hasOwn(categories, s.category)
    || typeof s.difficulty !== "string" || !Object.hasOwn(difficulties, s.difficulty)
    || typeof s.hearts !== "number" || !Number.isInteger(s.hearts) || s.hearts < 1 || s.hearts > 5) {
    throw new RoomError("การตั้งค่าห้องไม่ถูกต้อง");
  }
  return { category: s.category, difficulty: s.difficulty, hearts: s.hearts };
}

function makePlayer(name: unknown, hearts: number, token: string, avatar: unknown): Player {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 24) {
    throw new RoomError("กรอกชื่อผู้เล่น 1–24 ตัวอักษร");
  }
  return {
    ...initialStats(hearts), name: name.trim(), id: randomUUID(), hash: hash(token),
    index: 0, left: false, feedback: null, avatar: validAvatar(avatar) ? avatar : defaultAvatar,
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
  return view(room, state, requirePlayer(state, token), now);
}

export async function mutateRoom(code: string, token: string | undefined, input: Record<string, unknown>) {
  return db().$transaction(async (tx) => {
    const [room] = await tx.$queryRaw<Room[]>`SELECT * FROM "game_rooms" WHERE "code" = ${code} FOR UPDATE`;
    const now = Date.now();
    if (!room || room.expiresAt.getTime() <= now) throw missing();
    const state = decode(room);
    const phase = getPhase(state, now);
    const save = () => tx.room.update({
      where: { code }, data: { state: json(state), version: { increment: 1 }, expiresAt: new Date(now + ttl) },
    });

    if (input.action === "join") {
      const existing = findPlayer(state, token);
      if (existing) return { view: view(room, state, existing, now) };
      if (phase !== "lobby") throw new RoomError("รอบนี้เริ่มแล้ว รอให้โฮสต์เปิดรอบใหม่", 409);
      if (state.players.length >= CAPACITY) throw new RoomError("ห้องเต็มแล้ว", 409);
      const newToken = randomBytes(32).toString("hex");
      const player = makePlayer(input.name, state.settings.hearts, newToken, input.avatar);
      state.players.push(player);
      return { view: view(await save(), state, player, now), token: newToken };
    }

    const player = requirePlayer(state, token);
    const isHost = player.id === state.hostId;
    switch (input.action) {
      case "avatar":
        if (!validAvatar(input.avatar)) throw new RoomError("ตัวละครไม่ถูกต้อง");
        player.avatar = input.avatar;
        break;


      case "settings":
      case "start":
      case "rematch":
        if (!isHost) throw new RoomError("เฉพาะโฮสต์เท่านั้นที่ทำรายการนี้ได้", 403);
        if (input.action === "rematch") {
          if (phase !== "finished") throw new RoomError("เกมยังไม่จบ", 409);
          state.players = state.players.filter((p) => !p.left);
          for (const member of state.players) Object.assign(member, initialStats(state.settings.hearts), { index: 0, feedback: null });
          Object.assign(state, { startsAt: 0, endsAt: 0, deck: [] });
          break;
        }
        if (phase !== "lobby") throw new RoomError("เกมเริ่มแล้ว", 409);
        if (input.action === "settings") {
          state.settings = parseSettings(input.settings);
          for (const member of state.players) member.hearts = state.settings.hearts;
          break;
        }
        if (state.players.length < 2) throw new RoomError("ต้องมีผู้เล่นอย่างน้อย 2 คน", 409);
        state.deck = buildDeck(state.settings);
        state.startsAt = now + 3_000;
        state.endsAt = state.startsAt + MATCH_MS;
        break;

      case "answer": {
        const question = state.deck[player.index];
        if (input.round !== state.startsAt || input.index !== player.index || phase !== "playing"
          || !question || player.hearts === 0 || now < state.startsAt) {
          return { view: view(room, state, player, now) };
        }
        if (input.choice !== 0 && input.choice !== 1) throw new RoomError("คำตอบไม่ถูกต้อง");
        const correct = question.correct === input.choice;
        Object.assign(player, grade(player, correct), {
          index: player.index + 1, feedback: { correct, answer: question.options[question.correct] },
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

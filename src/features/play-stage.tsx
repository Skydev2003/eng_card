"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Image from "next/image";
import { Check, Flame, Heart, Timer, Trophy, X } from "lucide-react";
import { defaultAvatar, type Avatar } from "@/game/adventure";
import { AvatarPicker, Mascot, RunScene } from "./run-scene";
import type { Feedback, PublicPlayer } from "@/game/room";
import { compareScores, MATCH_MS, ROUND_SIZE, type Question, type Stats } from "@/game/rules";

export function useClock(active: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const timer = setInterval(tick, 180);
    return () => { cancelAnimationFrame(first); clearInterval(timer); };
  }, [active]);
  return now;
}

export function Leaderboard({ players, playerId, finished = false, count = ROUND_SIZE }: {
  players: PublicPlayer[]; playerId: string; finished?: boolean; count?: number;
}) {
  const rankScores = (a: PublicPlayer, b: PublicPlayer) =>
    Number(b.hearts > 0) - Number(a.hearts > 0) || compareScores(a, b);
  const sorted = players.filter((p) => !p.left).sort(rankScores);
  return <section className="panel scoreboard">
    <h2><Trophy size={20} /> อันดับผู้เล่น</h2>
    <ol>{sorted.map((p, index) => <li key={p.id}>
      <span className="rank">{index > 0 && rankScores(sorted[index - 1], p) === 0 ? "=" : index + 1}</span>
      <Mascot avatar={p.avatar ?? defaultAvatar} />
      <span className="player-name">{p.name}{p.id === playerId && <small> คุณ</small>}
        {p.hearts === 0 && <small> · ตกรอบ</small>}
        {!finished && p.hearts > 0 && p.index >= count && <small> · เล่นจบแล้ว</small>}
      </span>
      <strong>{p.score.toLocaleString("en-US")}</strong>
    </li>)}</ol>
  </section>;
}

export function PlayStage({ question, stats, index, feedback, hearts, startsAt, endsAt, now, busy, onAnswer, avatar, onAvatar, count = ROUND_SIZE }: {
  question: Omit<Question, "correct"> | null; stats: Stats; index: number; feedback: Feedback | null;
  hearts: number; startsAt: number; endsAt: number; now: number; busy?: boolean; onAnswer: (choice: number) => void;
  avatar: Avatar; onAvatar: (avatar: Avatar) => void; count?: number;
}) {
  const countdown = Math.max(0, Math.ceil((startsAt - now) / 1000));
  const time = Math.max(0, Math.min(MATCH_MS / 1000, Math.ceil((endsAt - now) / 1000)));
  const playable = !!question && !countdown && time > 0 && !busy;
  const keypress = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat || !playable || (event.key !== "1" && event.key !== "2")) return;
    if (event.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    event.preventDefault();
    onAnswer(Number(event.key) - 1);
  });
  useEffect(() => {
    const handle = (event: KeyboardEvent) => keypress(event);
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  return <section className="stage panel">
    <div className="game-hud">
      <div className="hearts" aria-label={`หัวใจ ${stats.hearts} จาก ${hearts}`}>
        {Array.from({ length: hearts }, (_, i) => <Heart key={i} size={23} className={i < stats.hearts ? "alive" : ""} aria-hidden />)}
      </div>
      <span><Timer size={17} /> {time}s</span>
      <span><Flame size={17} /> {stats.streak} คอมโบ</span>
      <strong>{stats.score.toLocaleString("en-US")} <small>แต้ม</small></strong>
    </div>
    <RunScene stats={stats} hearts={hearts} avatar={avatar} />
    <progress className="timer-bar" max={MATCH_MS} value={Math.max(0, Math.min(MATCH_MS, endsAt - now))} aria-label="เวลาที่เหลือ" />
    {countdown ? <div className="stage-message"><strong>{countdown}</strong><p>เตรียมวิ่ง!</p></div>
      : question ? <div className="quiz">
          <div className="question-top"><span>ข้อ {index + 1} / {count}</span><h2>ภาพนี้คือคำว่าอะไร?</h2></div>
          <Image key={question.image} src={question.image} alt="ภาพโจทย์คำศัพท์" width={168} height={168} unoptimized className="word-image" />
          <div className="answers">{question.options.map((option, i) =>
            <button disabled={!playable} key={option} onClick={() => onAnswer(i)}><kbd>{i + 1}</kbd>{option}</button>)}</div>
          <div className="feedback" aria-live="polite">{feedback && (feedback.correct
            ? <span className="correct"><Check size={17} /> ถูกต้อง · {feedback.answer}</span>
            : <span className="wrong"><X size={17} /> เสีย 1 หัวใจ · คำตอบคือ {feedback.answer}</span>)}</div>
        </div>
      : <div className="stage-message"><h2>{stats.hearts ? "ตอบครบแล้ว!" : "ซอมบี้จับคุณได้!"}</h2>
        {feedback && <p>คำตอบล่าสุดคือ {feedback.answer}</p>}
        <p>ดูอันดับระหว่างรอผู้เล่นคนอื่นจบเกม</p></div>}
    <AvatarPicker avatar={avatar} onChange={onAvatar} busy={busy} />
  </section>;
}

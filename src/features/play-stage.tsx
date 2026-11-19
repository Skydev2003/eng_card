"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Check, Flame, Heart, MapPin, Maximize, Timer, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { defaultAvatar, runProgress, stages, type Avatar } from "@/game/adventure";
import { Mascot, RunScene } from "./run-scene";
import { AnswerNotices } from "./answer-notices";
import type { CorrectEvent } from "@/game/correct-events";
import type { TrailAudio } from "./trail-audio";
import { chasePressure } from "@/game/question-timer";
import type { Feedback, PublicPlayer } from "@/game/room";
import { compareScores, MATCH_MS, ROUND_SIZE, type PublicQuestion, type Stats } from "@/game/rules";

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

export function PlayStage({ question, stats, index, feedback, hearts, startsAt, endsAt, now, busy, onAnswer, avatar,
  count = ROUND_SIZE, players = [], playerId, onExit, isRoom, error, recentCorrect = [], questionDeadline, questionMs = 5_000, sound,
}: {
  question: PublicQuestion | null; stats: Stats; index: number; feedback: Feedback | null;
  hearts: number; startsAt: number; endsAt: number; now: number; busy?: boolean; onAnswer: (choice: number) => void;
  avatar: Avatar; count?: number;
  players?: PublicPlayer[]; playerId?: string; recentCorrect?: CorrectEvent[]; questionDeadline?: number; questionMs?: number; sound: TrailAudio; onExit: () => void; isRoom?: boolean; error?: string;
}) {
  const frame = useRef<HTMLElement>(null);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const progress = runProgress(stats.correct);
  useEffect(() => {
    const check = requestAnimationFrame(() => setCanFullscreen(Boolean(document.fullscreenEnabled && frame.current?.requestFullscreen)));
    return () => cancelAnimationFrame(check);
  }, []);
  const playFeedback = useEffectEvent(() => {
    if (feedback) sound.play(feedback.correct ? "right" : "wrong");
  });
  const playMilestone = useEffectEvent(() => sound.play("stage"));
  useEffect(() => {
    if (index > 0) playFeedback();
  }, [index]);
  useEffect(() => {
    if (progress.stageIndex > 0) playMilestone();
  }, [progress.stageIndex]);

  const countdown = Math.max(0, Math.ceil((startsAt - now) / 1000));
  const remaining = Math.max(0, Math.min(MATCH_MS, endsAt - now));
  const time = Math.ceil(remaining / 1000);
  const timer = `${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`;
  const questionRemaining = questionDeadline ? Math.max(0, Math.min(questionMs, questionDeadline - now)) : null;
  const pressure = question && !countdown ? chasePressure(questionDeadline, now, questionMs) : 0;
  const playable = !!question && !countdown && time > 0 && questionRemaining !== 0 && !busy;

  const upcomingImage = countdown ? question?.image : undefined;
  useEffect(() => {
    if (upcomingImage) new window.Image().src = upcomingImage;
  }, [upcomingImage]);
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

  const bubble = question && !countdown && <div className="trail-question">
    <h2><span className="sr-only">ภาพนี้คือคำว่าอะไร? </span>ข้อ {index + 1}/{count}</h2>
    {questionRemaining !== null && <div className={`question-timer${pressure >= 0.7 ? " question-timer-urgent" : ""}`}>
      <progress max={questionMs} value={questionRemaining} aria-label="เวลาตอบข้อนี้" />
      <strong aria-hidden="true">{Math.ceil(questionRemaining / 1_000)}s</strong>
    </div>}
    <Image src={question.image} alt="ภาพโจทย์คำศัพท์" width={168} height={168} unoptimized loading="eager" className="word-image" />
  </div>;

  return <section className="game-screen" ref={frame} aria-label="สนามวิ่ง WordRun">
    <RunScene stats={stats} hearts={hearts} avatar={avatar} peers={players.filter((player) => player.id !== playerId)}
      question={bubble} pressure={pressure} questionKey={countdown ? -1 : index} />
    <header className="game-top">
      <div className="game-hud" role="group" aria-label="สถานะการแข่งขัน">
        <div className="hud-stat hud-score"><span>คะแนน</span>
          <strong>{stats.score.toLocaleString("en-US")}</strong>
          {stats.streak > 1 && <small aria-label={`คอมโบ ${stats.streak}`}><Flame size={14} /> {stats.streak}×</small>}
        </div>
        <div className="hud-stat hud-time"><span><Timer size={14} /> เวลารอบ</span><strong>{timer}</strong></div>
        <div className="hud-stat"><span>หัวใจ</span>
          <div className="hearts" aria-label={`หัวใจ ${stats.hearts} จาก ${hearts}`}>
            {Array.from({ length: hearts }, (_, i) => <Heart key={i} className={i < stats.hearts ? "alive" : ""} aria-hidden />)}
          </div>
        </div>
      </div>
      <div className="game-actions">
        <button type="button" className="game-icon" data-audio-toggle title={sound.enabled ? "ปิดเสียงเอฟเฟกต์" : "เปิดเสียงเอฟเฟกต์"} aria-label={sound.enabled ? "ปิดเสียงเอฟเฟกต์" : "เปิดเสียงเอฟเฟกต์"}
          aria-pressed={sound.enabled} onClick={() => void sound.toggle()}>{sound.enabled ? <Volume2 size={21} /> : <VolumeX size={21} />}</button>
        {players.length > 0 && <button type="button" className="game-icon" title="อันดับผู้เล่น" aria-label="อันดับผู้เล่น"
          aria-expanded={showScores} onClick={() => setShowScores(!showScores)}><Trophy size={21} /></button>}
        {canFullscreen && <button type="button" className="game-icon fullscreen-control" title="สลับเต็มจอ" aria-label="สลับเต็มจอ"
          onClick={() => {
            const transition = document.fullscreenElement ? document.exitFullscreen() : frame.current?.requestFullscreen();
            void transition?.catch(() => {});
          }}><Maximize size={19} /></button>}
        <button type="button" className="game-icon" title={isRoom ? "ออกจากห้อง" : "กลับหน้าหลัก"}
          aria-label={isRoom ? "ออกจากห้อง" : "กลับหน้าหลัก"} onClick={onExit} disabled={busy}><ArrowLeft size={22} /></button>
      </div>
    </header>
    <div className="trail-location"><MapPin size={17} /><span>{progress.stage.name}</span><small>ด่าน {progress.stageIndex + 1}/{stages.length}</small></div>
    <AnswerNotices events={recentCorrect} now={now} playerId={playerId} />
    {showScores && playerId && <aside className="game-drawer"><Leaderboard players={players} playerId={playerId} count={count} /></aside>}
    {error && <p className="game-error notice" role="alert">{error}</p>}
    {countdown > 0 && <div className="trail-status" aria-live="polite"><strong>{countdown}</strong><p>เตรียมวิ่ง!</p></div>}
    {!countdown && !question && <div className="trail-status">
      <h2>{stats.hearts ? "ตอบครบแล้ว!" : "มอนสเตอร์จับคุณได้!"}</h2><p>รอเพื่อนวิ่งจบ ดูอันดับระหว่างรอได้</p>
    </div>}
    <div className="trail-ground-ui">
      {question && !countdown && <div className="ground-answers" aria-label="ตัวเลือกคำศัพท์">{question.options.map((option, i) =>
        <button type="button" disabled={!playable} key={i} onClick={() => onAnswer(i)}>
          <kbd>{i + 1}</kbd><span>{option}</span>
        </button>)}</div>}
      <div className="trail-foot">
        <span className="trail-distance">{progress.distance.toLocaleString("en-US")} ม.</span>
        <progress max={MATCH_MS} value={remaining} aria-label="เวลาที่เหลือ" />
        <span className="trail-feedback" aria-live="polite">{feedback && (feedback.correct
          ? <><Check size={16} /> ถูกต้อง · {feedback.answer}</>
          : <><X size={16} /> {feedback.reason === "timeout" ? "หมดเวลา · เสียหัวใจ" : "เสียหัวใจ"} · {feedback.answer}</>)}</span>
      </div>
    </div>
  </section>;
}

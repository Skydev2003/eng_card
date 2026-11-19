"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { avatarHue, defaultAvatar, hikers, mascotArt, palettes, peerOffset, runProgress, stages, type Avatar } from "@/game/adventure";
import type { PublicPlayer } from "@/game/room";
import type { Stats } from "@/game/rules";

export function Mascot({ avatar, className = "" }: { avatar: Avatar; className?: string }) {
  return <span aria-hidden="true" className={`mascot ${className}`} style={{
    "--mascot-image": `url("/art/hikers/${mascotArt(avatar.mascot)}.webp")`,
    "--mascot-hue": `${avatarHue(avatar)}deg`,
  } as CSSProperties} />;
}

export function AvatarPicker({ avatar, onChange, busy }: {
  avatar: Avatar; onChange: (avatar: Avatar) => void; busy?: boolean;
}) {
  return <div className="avatar-options">
    <fieldset disabled={busy}>
      <legend>เลือกนักวิ่ง</legend>
      <div className="mascot-options">{Object.entries(hikers).map(([key, label]) => {
        const mascot = key as keyof typeof hikers;
        return <button type="button" aria-pressed={mascotArt(avatar.mascot) === mascot} key={mascot}
          onClick={() => onChange({ ...avatar, mascot })}>
          <Mascot avatar={{ ...avatar, mascot }} /><span>{label}</span>
        </button>;
      })}</div>
    </fieldset>
    <fieldset disabled={busy}>
      <legend>สีตัวละคร</legend>
      <div className="palette-options">{Object.entries(palettes).map(([key, value]) => (
        <button type="button" aria-pressed={avatar.palette === key} key={key}
          onClick={() => onChange({ ...avatar, palette: key as Avatar["palette"] })}>
          <span aria-hidden="true" style={{ background: value.swatch }} />{value.label}
        </button>
      ))}</div>
    </fieldset>
  </div>;

}

const wind = Array.from({ length: 13 }, (_, i) => ({
  "--leaf-y": `${12 + (i * 17) % 66}%`,
  "--leaf-delay": `${-(i * 3.7)}s`,
  "--leaf-duration": `${9 + (i * 7) % 9}s`,
  "--leaf-size": `${8 + (i * 5) % 13}px`,
}) as CSSProperties);

export function RunScene({ stats, hearts, avatar, peers, question, questionKey, pressure }: {
  stats: Stats; hearts: number; avatar: Avatar; peers: PublicPlayer[];
  question?: ReactNode; questionKey: number; pressure: number;
}) {
  const progress = runProgress(stats.correct);
  const track = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const scroll = useRef<gsap.core.Tween | null>(null);
  useEffect(() => {
    const next = stages[progress.stageIndex + 1];
    if (next) new Image().src = `/art/stages/${next.scene}.webp`;
  }, [progress.stageIndex]);
  useLayoutEffect(() => {
    if (!track.current) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      scroll.current = gsap.fromTo(track.current, { xPercent: 0 }, { xPercent: -50, duration: 27, ease: "none", repeat: -1 });
      return () => { scroll.current = null; };
    });
    return () => media.revert();
  }, [progress.stageIndex]);
  useEffect(() => { scroll.current?.timeScale(0.74 + 0.48 * stats.speed); }, [stats.speed, progress.stageIndex]);
  useLayoutEffect(() => {
    if (!bubble.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = gsap.fromTo(bubble.current, { opacity: 0.38, y: 19, scale: 0.86 },
      { opacity: 1, y: 0, scale: 1, duration: 0.30, ease: "back.out(1.6)", clearProps: "transform,opacity" });
    return () => { animation.kill(); };
  }, [questionKey]);
  const danger = (hearts - stats.hearts) / hearts;
  const scene = `url("/art/stages/${progress.stage.scene}.webp")`;

  return <div className="trail-world" style={{
    "--stride": `${0.52 / Math.sqrt(stats.speed)}s`,
    "--danger": danger,
    "--pressure": pressure,
  } as CSSProperties}>
    <div className="trail-panorama" ref={track} key={progress.stage.scene} aria-hidden="true"
      style={{ "--scene-image": scene } as CSSProperties}><span /><span /></div>
    <div className="trail-sun" aria-hidden="true" />
    <div className="trail-warning" aria-hidden="true" />
    <div className="trail-wind" aria-hidden="true">{wind.map((style, i) => <i key={i} style={style} />)}</div>
    <div className="trail-hazard" aria-hidden="true"><div className="trail-steps" /><span /></div>
    {peers.filter((player) => !player.left && player.hearts > 0).map((player, i) => (
      <div className="trail-peer" data-testid="trail-peer" key={player.id} style={{
        "--peer-x": `${Math.max(-42, Math.min(38, peerOffset(player.correct, stats.correct) + ([-14, 10, -20, 19, -8][i] ?? 0)))}vw`,
        "--peer-lane": `${[24, 55, 12, 44, 35][i]}px`,
        "--stride": `${0.53 / Math.sqrt(player.speed)}s`,
        "--phase": `${-0.08 * i}s`,
      } as CSSProperties}>
        <span className="peer-name">{player.name}</span>
        <div className="trail-steps" />
        <Mascot avatar={player.avatar ?? defaultAvatar} className="trail-body" />
      </div>
    ))}
    <div className={`trail-self${stats.hearts === 0 ? " caught" : ""}`}>
      {question && <div className="question-anchor"><div className="trail-bubble" ref={bubble} key={questionKey}>{question}</div></div>}
      {stats.hearts > 0 && <span className="you-pin">คุณ</span>}
      <div className="trail-steps" aria-hidden="true" />
      <Mascot avatar={avatar} className="trail-body" />
    </div>
    <div className="trail-grass" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => <i key={i} style={{
        "--grass-x": `${i * 9.1}%`,
        "--grass-h": `${24 + (i * 11) % 47}px`,
        "--grass-delay": `${-(i % 7) * 0.29}s`,
      } as CSSProperties}><b /><b /><b /></i>)}
    </div>
  </div>;
}

import { useEffect, type CSSProperties } from "react";
import { MapPin, Palette, Zap } from "lucide-react";
import { avatarHue, mascots, palettes, runProgress, STAGE_LENGTH, stages, type Avatar } from "@/game/adventure";
import type { Stats } from "@/game/rules";

export function Mascot({ avatar, className = "" }: { avatar: Avatar; className?: string }) {
  return <span aria-hidden="true" className={`mascot ${className}`} style={{
    "--mascot-image": `url("/art/mascots/${avatar.mascot}.webp")`,
    "--mascot-hue": `${avatarHue(avatar)}deg`,
  } as CSSProperties} />;
}

export function AvatarPicker({ avatar, onChange, busy }: {
  avatar: Avatar; onChange: (avatar: Avatar) => void; busy?: boolean;
}) {
  return <details className="avatar-picker">
    <summary><Palette size={17} /> แต่งตัวละคร</summary>
    <div className="avatar-options">
      <fieldset disabled={busy}>
        <legend>ตัวละคร</legend>
        <div className="mascot-options">{Object.entries(mascots).map(([key, label]) => {
          const mascot = key as Avatar["mascot"];
          return <button type="button" aria-pressed={avatar.mascot === mascot} key={key}
            onClick={() => onChange({ ...avatar, mascot })}>
            <Mascot avatar={{ ...avatar, mascot }} />{label}
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
    </div>
  </details>;
}

export function RunScene({ stats, hearts, avatar }: { stats: Stats; hearts: number; avatar: Avatar }) {
  const progress = runProgress(stats.correct);
  useEffect(() => {
    const next = stages[progress.stageIndex + 1];
    if (next) new Image().src = `/art/stages/${next.scene}.webp`;
  }, [progress.stageIndex]);
  const danger = (hearts - stats.hearts) / hearts;
  return <>
    <div className="chase" style={{
      "--speed": `${0.46 / stats.speed}s`,
      "--danger": danger,
      "--travel": progress.steps / STAGE_LENGTH,
    } as CSSProperties}>
      <div className="scene-track" key={progress.stage.scene} style={{
        backgroundImage: `url("/art/stages/${progress.stage.scene}.webp")`,
      }} aria-hidden="true" />
      <div className="chase-road" aria-hidden="true" />
      <div className="chase-zombie sprite" aria-hidden="true" />
      <Mascot className="chase-runner sprite" avatar={avatar} />
      <span className="scene-label"><MapPin size={16} /> {progress.stage.name}</span>
      <span className="scene-speed"><Zap size={16} /> {stats.speed.toFixed(2)}×</span>
    </div>
    <div className="run-progress">
      <span>ด่าน {progress.stageIndex + 1}/{stages.length}</span>
      <progress max={STAGE_LENGTH} value={progress.steps} aria-label="ความคืบหน้าในด่าน" />
      <strong>{progress.distance.toLocaleString("en-US")} ม.</strong>
    </div>
  </>;
}

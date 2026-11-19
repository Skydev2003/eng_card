"use client";

import { useState, type FormEvent } from "react";
import { Check, Clipboard, Play, Settings2, Users } from "lucide-react";
import { defaultAvatar, type Avatar } from "@/game/adventure";
import { guestReadiness } from "@/game/lobby";
import { DEFAULT_QUESTION_SECONDS } from "@/game/question-timer";
import type { PublicPlayer, RoomAction, RoomView } from "@/game/room";
import { CAPACITY, categories, difficulties, type Settings } from "@/game/rules";
import { RoundSettings } from "./round-settings";
import { AvatarPicker, Mascot } from "./run-scene";

export function RoomLobby({ room, player, busy, send, onAvatar }: {
  room: RoomView; player: PublicPlayer; busy: boolean;
  send: (action: RoomAction) => Promise<boolean>; onAvatar: (avatar: Avatar) => void;
}) {
  const [name, setName] = useState(player.name);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<Settings | null>(null);
  const host = player.id === room.hostId;
  const readiness = guestReadiness(room.players, room.hostId);
  const avatar = player.avatar ?? defaultAvatar;
  const settings = room.settings;
  const seconds = settings.questionSeconds ?? DEFAULT_QUESTION_SECONDS;
  const changed = draft !== null && (draft.category !== settings.category || draft.difficulty !== settings.difficulty
    || draft.hearts !== settings.hearts || draft.questionSeconds !== seconds);

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() && name.trim() !== player.name) await send({ action: "rename", name: name.trim() });
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft && changed && await send({ action: "settings", settings: draft })) setDraft(null);
  }

  return <div className="lobby-grid room-lobby">
    <section className="panel form-panel lobby-profile" aria-labelledby="lobby-title">
      <div className="lobby-avatar-preview">
        <div className="lobby-heading">
          <h1 id="lobby-title">ห้องรอ</h1>
          <p>เลือกนักวิ่ง แล้วเตรียมลงสนาม</p>
        </div>
        <Mascot avatar={avatar} />
      </div>
      <form className="lobby-name" onSubmit={saveName}>
        <label>ชื่อบนกระดานคะแนน<input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} autoComplete="off" /></label>
        <button className="profile-save" disabled={busy || !name.trim() || name.trim() === player.name} type="submit">บันทึก</button>
      </form>
      <AvatarPicker avatar={avatar} onChange={onAvatar} busy={busy} />
      {!host && <div className="lobby-ready-actions">
        <button className={player.ready ? "profile-save" : "primary"} disabled={busy} type="button"
          aria-pressed={Boolean(player.ready)} onClick={() => void send({ action: "ready", ready: !player.ready })}>
          {player.ready ? "ยกเลิกพร้อม" : <><Check size={18} /> พร้อม</>}
        </button>
        {player.ready && <p>พร้อมแล้ว รอโฮสต์เริ่มเกม</p>}
      </div>}
    </section>
    <section className="panel scoreboard lobby-roster" aria-labelledby="roster-title">
      <div className="lobby-invite">
        <div><strong>รหัสชวนเพื่อน</strong><small>แตะรหัสเพื่อคัดลอก</small></div>
        <button className="room-code" type="button" onClick={async () => {
          try { await navigator.clipboard.writeText(room.code); setCopied(true); }
          catch { setCopied(false); }
        }} aria-label="คัดลอกรหัสห้อง">{room.code} {copied ? <Check size={20} /> : <Clipboard size={20} />}</button>
        {copied && <small className="copy-status" role="status">คัดลอกรหัสแล้ว</small>}
      </div>
      <h2 id="roster-title"><Users size={20} /> ผู้เล่น <small>{room.players.length}/{CAPACITY}</small></h2>
      <ol>{room.players.map((member, index) => <li key={member.id}>
        <span className="rank">{index + 1}</span><Mascot avatar={member.avatar ?? defaultAvatar} />
        <span className="player-name">{member.name}{member.id === player.id && <small> คุณ</small>}</span>
        {member.id === room.hostId ? <small className="ready-state">โฮสต์</small> : (
          <small className="ready-state" data-ready={Boolean(member.ready)}>{member.ready ? "พร้อม" : "ยังไม่พร้อม"}</small>
        )}
      </li>)}</ol>
      <section className="lobby-round" aria-labelledby="lobby-round-title">
        <div className="lobby-round-heading">
          <h3 id="lobby-round-title"><Settings2 size={18} /> ตั้งค่าเกม</h3>
          {host && <button className="profile-save" type="button" aria-expanded={draft !== null} disabled={busy}
            onClick={() => setDraft(draft ? null : { ...settings, questionSeconds: seconds })}>
            {draft ? "ยกเลิก" : "แก้ไข"}
          </button>}
        </div>
        {host && draft ? <form className="lobby-settings-form" onSubmit={saveSettings}>
          <RoundSettings value={draft} onChange={setDraft} disabled={busy} />
          <p>เมื่อบันทึก ผู้เล่นต้องกดพร้อมอีกครั้ง</p>
          <button className="primary wide" type="submit" disabled={busy || !changed}>บันทึกการตั้งค่า</button>
        </form> : <dl className="lobby-summary">
          <div><dt>หมวด</dt><dd>{categories[settings.category]}</dd></div>
          <div><dt>ระดับ</dt><dd>{difficulties[settings.difficulty]}</dd></div>
          <div><dt>หัวใจ</dt><dd>{settings.hearts} ดวง</dd></div>
          <div><dt>เวลาต่อข้อ</dt><dd>{seconds} วินาที</dd></div>
        </dl>}
      </section>
      {host ? <>
        <button className="primary wide" type="button" disabled={busy || draft !== null || !readiness.canStart}
          onClick={() => void send({ action: "start" })}><Play size={18} /> เริ่มเกม</button>
        <p className="lobby-rule" aria-live="polite">{readiness.total
          ? `แขกพร้อม ${readiness.ready}/${readiness.total}`
          : "คัดลอกรหัสแล้วชวนเพื่อนเข้าห้อง"}</p>
      </> : !player.ready && <p className="lobby-rule">กด «พร้อม» เมื่อเลือกตัวละครเสร็จ</p>}
    </section>
  </div>;
}

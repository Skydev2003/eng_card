"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Gamepad2, Heart, Music, Music2, Play, Settings2, Timer, Users, Volume2, VolumeX, X, Zap } from "lucide-react";
import { CAPACITY, defaults, MATCH_MS, ROUND_SIZE } from "@/game/rules";
import { PlayStage, useClock } from "./play-stage";
import { useRoom } from "./use-room";
import { defaultAvatar, type Avatar } from "@/game/adventure";
import { AvatarPicker, Mascot } from "./run-scene";
import { useAvatar } from "./avatar-store";
import { useSolo } from "./solo-store";
import { WORD_COUNT } from "@/game/vocabulary";
import { AnswerNotices } from "./answer-notices";
import { RaceResults } from "./race-results";
import { RoomLobby } from "./room-lobby";
import { RoundSettings } from "./round-settings";
import { useTrailAudio } from "./trail-audio";
import { DEFAULT_QUESTION_SECONDS } from "@/game/question-timer";

type Menu = "home" | "solo" | "create" | "join";

function GameHelp({ dialog }: { dialog: React.RefObject<HTMLDialogElement | null> }) {
  return <dialog ref={dialog} className="game-help-dialog" aria-labelledby="help-title">
    <form method="dialog"><button className="game-icon" aria-label="ปิดวิธีเล่น"><X size={20} /></button></form>
    <h2 id="help-title">วิธีเอาตัวรอด</h2>
    <ul>
      <li><BookOpen /><div><strong>ดูโจทย์ เลือกคำ</strong><p>ดูภาพ ตัวเลข หรือคำใบ้ภาษาไทย แล้วแตะคำตอบบนพื้น หรือกด 1 และ 2 บนคีย์บอร์ด</p></div></li>
      <li><Timer /><div><strong>ตอบก่อนมอนสเตอร์มาถึง</strong><p>ค่าเริ่มต้น {DEFAULT_QUESTION_SECONDS} วินาทีต่อข้อ ตอบผิดหรือหมดเวลาเสีย 1 หัวใจ</p></div></li>
      <li><Zap /><div><strong>ต่อคอมโบ</strong><p>ตอบถูกติดกันได้แต้มเพิ่ม และทุก 10 คำตอบถูกจะเปลี่ยนฉาก</p></div></li>
      <li><Heart /><div><strong>รักษาหัวใจ</strong><p>หัวใจหมดจะตกรอบ ผู้รอดที่ได้แต้มมากที่สุดชนะ</p></div></li>
    </ul>
    <a className="art-credits" href="/art/words/oxford/credits.txt" target="_blank" rel="noreferrer">เครดิตภาพคำศัพท์</a>
  </dialog>;
}

export function Arcade() {
  const help = useRef<HTMLDialogElement>(null);
  const [menu, setMenu] = useState<Menu>("home");
  const [settings, setSettings] = useState(defaults);
  const [joinCode, setJoinCode] = useState("");
  const [soloActive, setSoloActive] = useState(false);
  const [soloAvatar, setSoloAvatar] = useState<Avatar>(defaultAvatar);
  const solo = useSolo();
  const tick = solo.tick;
  const nextSoloImage = soloActive ? solo.deck[solo.index + 1]?.image : undefined;
  const soloDeadline = soloActive && solo.stats.hearts && solo.index < solo.deck.length
    && solo.deadline < solo.endsAt ? solo.deadline : 0;
  useEffect(() => {
    if (!soloDeadline) return;
    const timer = setTimeout(tick, Math.max(0, soloDeadline - Date.now()) + 8);
    return () => clearTimeout(timer);
  }, [soloDeadline, tick]);
  useEffect(() => {
    if (!nextSoloImage) return;
    new Image().src = nextSoloImage;
  }, [nextSoloImage]);
  const { avatar, setAvatar } = useAvatar();
  useEffect(() => { void useAvatar.persist.rehydrate(); }, []);
  const connection = useRoom();
  const { room, send, busy, error } = connection;
  const now = useClock(soloActive || room?.phase === "playing" || room?.phase === "finished");
  const player = room?.players.find((p) => p.id === room.playerId);
  const host = room?.hostId === room?.playerId;
  const roomAvatar = player?.avatar ?? avatar;
  const clock = now ? now + (room?.offset ?? 0) : room?.serverNow ?? 0;

  function go(next: Menu) {
    connection.clearError();
    setMenu(next);
  }

  function startSolo() {
    setSoloAvatar(avatar);
    solo.start(settings);
    setSoloActive(true);
  }

  async function changeAvatar(next: Avatar) {
    if (!room || await send({ action: "avatar", avatar: next })) setAvatar(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (menu === "solo") startSolo();
    if (menu === "create" && await send({ action: "create", name: "โฮสต์", settings, avatar })) go("home");
    if (menu === "join" && await send({ action: "join", code: joinCode })) go("home");
  }

  const alert = error && <p className="notice" role="alert">{error}</p>;
  const home = !room && !soloActive && menu === "home";
  const soloInProgress = soloActive && solo.stats.hearts > 0 && solo.index < solo.deck.length && now < solo.endsAt;
  const inGame = room?.phase === "playing" || (!room && soloInProgress);
  const sound = useTrailAudio(inGame);
  const onResults = room?.phase === "finished" || (soloActive && !soloInProgress && !room);

  return <main className={home ? "title-page" : inGame ? "game-main" : onResults ? "camp-page shell result-page" : "camp-page shell interior"}>
      {!home && !inGame && <button type="button" className="game-icon camp-back"
        aria-label={room ? "ออกจากห้อง" : "กลับหน้าหลัก"}
        title={room ? "ออกจากห้อง" : "กลับหน้าหลัก"} disabled={busy}
        onClick={() => {
          if (room) void send({ action: "leave" });
          else { setSoloActive(false); go("home"); }
        }}><ArrowLeft size={21} /></button>}
      {home && <>
        <section className="title-screen spring-cover" aria-labelledby="game-title">
          <div className="cover-glints" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} />)}</div>
          <div className="title-audio" aria-label="ตั้งค่าเสียง">
            <button type="button" className="title-audio-button" data-audio-toggle
              aria-label={sound.music ? "ปิดเพลง" : "เปิดเพลง"} aria-pressed={sound.music}
              onClick={sound.toggleMusic}>{sound.music ? <Music2 size={18} /> : <Music size={18} />} เพลง</button>
            <button type="button" className="title-audio-button" data-audio-toggle
              aria-label={sound.enabled ? "ปิดเสียงเอฟเฟกต์" : "เปิดเสียงเอฟเฟกต์"} aria-pressed={sound.enabled}
              onClick={sound.toggle}>{sound.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />} เอฟเฟกต์</button>
          </div>
          <div className="title-layout">
            <div className="title-identity">
              <h1 id="game-title" aria-label="WordRun">WORD<span>RUN</span></h1>
              <p className="title-tagline">คิดให้ไว วิ่งให้รอด!</p>
              <p className="title-description">ดูโจทย์ เลือกศัพท์อังกฤษ แล้ววิ่งหนีเจ้ามอนสเตอร์</p>
              <nav className="title-menu" aria-label="เมนูเริ่มเกม">
                <button className="title-choice title-choice-main" onClick={() => go("solo")}>
                  <Play size={21} fill="currentColor" /><span>เล่นคนเดียว</span><ArrowRight size={19} />
                </button>
                <button className="title-choice" onClick={() => go("create")}><Users size={19} /><span>สร้างห้อง</span></button>
                <button className="title-choice" onClick={() => go("join")}><Gamepad2 size={19} /><span>เข้าร่วมด้วยรหัส</span></button>
                <button className="title-help" onClick={() => help.current?.showModal()}><BookOpen size={17} /> วิธีเล่น</button>
                {alert}
              </nav>
              <p className="title-menu-note"><BookOpen size={14} /> {WORD_COUNT} คำศัพท์ <span aria-hidden="true">·</span> <Users size={15} /> สูงสุด {CAPACITY} คน</p>
            </div>
          </div>
        </section>
        <GameHelp dialog={help} />
      </>}
      {!room && !soloActive && menu === "join" && <section className="panel join-panel" aria-labelledby="join-title">
        <span className="section-icon"><Gamepad2 /></span>
        <h1 id="join-title">เข้าร่วมห้อง</h1>
        <form onSubmit={submit}>
          <label><span className="sr-only">รหัสห้อง</span>
            <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000" autoComplete="off" className="code-input" /></label>
          {alert}
          <button className="primary wide" disabled={busy || joinCode.length !== 6}>
            {busy ? "กำลังเชื่อมต่อ…" : "เข้าร่วมห้อง"} <ArrowRight size={18} />
          </button>
        </form>
      </section>}
      {!room && !soloActive && (menu === "create" || menu === "solo") && <section key={menu} className={`panel form-panel camp-form camp-${menu}`}>
        <div className="camp-intro">
          <span className="section-icon">{menu === "solo" ? <Gamepad2 /> : <Users />}</span>
          <h1>{menu === "solo" ? "เล่นคนเดียว" : "สร้างห้อง"}</h1>
          <p>{menu === "solo" ? `ฝึกศัพท์ ${ROUND_SIZE} ข้อ ภายใน ${MATCH_MS / 1000} วินาที` : "กำหนดกติการอบนี้ก่อนชวนเพื่อน"}</p>
          {menu === "solo" && <div className="camp-preview"><Mascot avatar={avatar} /></div>}
        </div>
        <form onSubmit={submit}>
          <RoundSettings value={settings} onChange={setSettings} disabled={busy} />
          {menu === "solo" && <AvatarPicker avatar={avatar} onChange={setAvatar} />}
          {alert}
          <button className="primary wide" disabled={busy}>{busy ? "กำลังเชื่อมต่อ…" : menu === "solo" ? "เริ่มวิ่ง" : "สร้างห้อง"} <ArrowRight size={18} /></button>
        </form>
      </section>}
      {soloActive && !room && (soloInProgress
        ? <PlayStage question={solo.deck[solo.index]} stats={solo.stats} index={solo.index} feedback={solo.feedback}
            hearts={settings.hearts} startsAt={0} endsAt={solo.endsAt} now={now || solo.endsAt - MATCH_MS} onAnswer={(choice) => solo.answer(solo.index, choice)} avatar={soloAvatar} playerId="solo" recentCorrect={solo.recentCorrect}
            questionDeadline={solo.deadline} questionMs={solo.questionMs} sound={sound}
            onExit={() => { setSoloActive(false); go("home"); }} />
        : <RaceResults solo playerId="solo" questionCount={ROUND_SIZE}
            runners={[{ ...solo.stats, id: "solo", name: "นักวิ่ง", index: solo.index, left: false, avatar: soloAvatar }]}
            notices={<AnswerNotices events={solo.recentCorrect} now={now} playerId="solo" />}>
            <button className="primary" onClick={startSolo}><Play size={18} /> เล่นใหม่</button>
            <button className="trophy-quiet" onClick={() => { setSoloActive(false); go("solo"); }}><Settings2 size={17} /> เปลี่ยนการตั้งค่า</button>
          </RaceResults>)}
      {room && player && <>
        {!inGame && alert}
        {room.phase === "lobby" ? <RoomLobby key={room.code} room={room} player={player} busy={busy} send={send} onAvatar={changeAvatar} />
          : room.phase === "playing" ? <PlayStage question={room.question} stats={player} index={player.index} hearts={room.settings.hearts} feedback={room.feedback}
            startsAt={room.startsAt} endsAt={room.endsAt} now={clock} busy={busy} avatar={roomAvatar} count={room.questionCount}
            players={room.players} playerId={player.id} isRoom error={error} recentCorrect={room.recentCorrect}
            questionDeadline={room.questionDeadline} questionMs={(room.settings.questionSeconds ?? DEFAULT_QUESTION_SECONDS) * 1_000} sound={sound}
            onExit={() => void send({ action: "leave" })}
            onAnswer={(choice) => void send({ action: "answer", index: player.index, round: room.startsAt, choice })} /> : <RaceResults runners={room.players} playerId={player.id} questionCount={room.questionCount ?? ROUND_SIZE}
            notices={<AnswerNotices events={room.recentCorrect ?? []} now={clock} playerId={player.id} />}>
            {host ? <button className="primary" disabled={busy} onClick={() => void send({ action: "rematch" })}><Play size={18} /> กลับห้องเพื่อเล่นใหม่</button>
              : <p>รอโฮสต์เปิดรอบใหม่</p>}
          </RaceResults>}
      </>}
    </main>;
}

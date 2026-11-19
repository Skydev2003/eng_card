"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Clipboard, Gamepad2, Heart, Play, Settings2, Timer, Trophy, Users, Zap } from "lucide-react";
import { CAPACITY, categories, compareScores, defaults, difficulties, MATCH_MS, ROUND_SIZE, type Settings } from "@/game/rules";
import { Leaderboard, PlayStage, useClock } from "./play-stage";
import { useRoom } from "./use-room";
import { defaultAvatar, type Avatar } from "@/game/adventure";
import { AvatarPicker, Mascot } from "./run-scene";
import { useAvatar } from "./avatar-store";
import { useSolo } from "./solo-store";

type Menu = "home" | "solo" | "create" | "join";

function Setup({ value, onChange, disabled = false }: {
  value: Settings; onChange: (value: Settings) => void; disabled?: boolean;
}) {
  return <fieldset disabled={disabled} className="settings">
    <legend><Settings2 size={17} /> ตั้งค่ารอบ</legend>
    <label>หมวดคำศัพท์<select value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value as Settings["category"] })}>
      {Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>ระดับความยาก<select value={value.difficulty} onChange={(e) => onChange({ ...value, difficulty: e.target.value as Settings["difficulty"] })}>
      {Object.entries(difficulties).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>จำนวนหัวใจ<select value={value.hearts} onChange={(e) => onChange({ ...value, hearts: Number(e.target.value) })}>
      {[1, 2, 3, 4, 5].map((hearts) => <option key={hearts} value={hearts}>{hearts} ดวง</option>)}
    </select></label>
  </fieldset>;
}

export function Arcade() {
  const [menu, setMenu] = useState<Menu>("home");
  const [settings, setSettings] = useState(defaults);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [soloActive, setSoloActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const solo = useSolo();
  const { avatar, setAvatar } = useAvatar();
  useEffect(() => { void useAvatar.persist.rehydrate(); }, []);
  const connection = useRoom();
  const { room, send, busy, error } = connection;
  const now = useClock(soloActive || room?.phase === "playing");
  const player = room?.players.find((p) => p.id === room.playerId);
  const host = room?.hostId === room?.playerId;
  const roomAvatar = player?.avatar ?? avatar;
  const clock = now ? now + (room?.offset ?? 0) : room?.serverNow ?? 0;

  function go(next: Menu) {
    connection.clearError();
    setMenu(next);
    setCopied(false);
  }

  function startSolo() {
    solo.start(settings);
    setSoloActive(true);
  }

  async function changeAvatar(next: Avatar) {
    if (!room || await send({ action: "avatar", avatar: next })) setAvatar(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (menu === "solo") startSolo();
    if (menu === "create" && await send({ action: "create", name: name.trim() || "โฮสต์", settings, avatar })) go("home");
    if (menu === "join" && await send({ action: "join", name: name.trim() || "นักวิ่ง", code: joinCode, avatar })) go("home");
  }

  const alert = error && <p className="notice" role="alert">{error}</p>;
  const home = !room && !soloActive && menu === "home";

  return <>
    {!home && <header className="site-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={() => {
          if (!room) { setSoloActive(false); go("home"); }
        }} aria-label="WordRun หน้าหลัก" aria-disabled={!!room}><span className="brand-mark"><Zap size={21} fill="currentColor" /></span> WORD<span className="brand-accent">RUN</span></button>
        {room ? <button className="quiet" disabled={busy} onClick={() => void send({ action: "leave" })}><ArrowLeft size={17} /> ออกจากห้อง</button>
          : <button className="quiet" onClick={() => { setSoloActive(false); go("home"); }}><ArrowLeft size={17} /> หน้าหลัก</button>}
      </div>
    </header>}
    <main className={home ? "title-page" : "shell interior"}>
      {home && <>
        <section className="title-screen" aria-labelledby="game-title">
          <div className="title-layout">
            <div className="title-identity">
              <h1 id="game-title" aria-label="WordRun">WORD<span>RUN</span><i aria-hidden="true" /></h1>
              <p className="title-tagline">คิดให้ไว วิ่งให้รอด!</p>
              <p className="title-description">ดูภาพ เลือกศัพท์อังกฤษ แล้ววิ่งหนีซอมบี้</p>
            </div>
            <nav className="title-menu" aria-label="เมนูเริ่มเกม">
              <button className="title-choice title-choice-main" onClick={() => go("solo")}>
                <Play size={22} fill="currentColor" /><span>เล่นคนเดียว</span><ArrowRight size={19} />
              </button>
              <button className="title-choice" onClick={() => go("create")}>
                <Users size={22} /><span>สร้างห้อง</span><ArrowRight size={19} />
              </button>
              <button className="title-choice" onClick={() => go("join")}>
                <Gamepad2 size={22} /><span>เข้าร่วมด้วยรหัส</span><ArrowRight size={19} />
              </button>
              <a className="title-choice title-help" href="#how"><BookOpen size={20} /><span>วิธีเล่น</span><ArrowRight size={17} /></a>
              <p className="title-menu-note">เล่นกับเพื่อนได้สูงสุด {CAPACITY} คนต่อห้อง</p>
              {alert}
            </nav>
          </div>
        </section>
        <section className="how shell" id="how">
          <h2>วิธีเอาตัวรอด</h2>
          <div className="how-grid">
            <div><BookOpen /><h3>ดูภาพ เลือกคำ</h3><p>กดคำตอบ 1 ใน 2 ตัวเลือก หรือใช้ปุ่ม 1 และ 2</p></div>
            <div><Zap /><h3>ต่อคอมโบ</h3><p>ตอบถูกติดกันเพื่อวิ่งเร็วขึ้นและได้แต้มเพิ่ม</p></div>
            <div><Heart /><h3>รักษาหัวใจ</h3><p>ตอบผิดเสีย 1 ดวง หัวใจหมดจะตกรอบ</p></div>
          </div>
        </section>
      </>}
      {!room && !soloActive && !home && <section key={menu} className="panel form-panel">
        <span className="section-icon">{menu === "solo" ? <Gamepad2 /> : <Users />}</span>
        <h1>{menu === "solo" ? "เล่นคนเดียว" : menu === "create" ? "สร้างห้อง" : "เข้าร่วมห้อง"}</h1>
        <p>{menu === "solo" ? `ฝึกศัพท์ ${ROUND_SIZE} ข้อ ภายใน ${MATCH_MS / 1000} วินาที` : menu === "create" ? "ตั้งค่ารอบแล้วแชร์รหัสห้องให้เพื่อน" : "กรอกรหัส 6 หลักที่ได้รับจากเพื่อน"}</p>
        <form onSubmit={submit}>
          {menu === "join" && <label>รหัสห้อง<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="code-input" /></label>}
          {menu !== "solo" && <label>ชื่อผู้เล่น <small>(ไม่บังคับ)</small><input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="ชื่อที่เพื่อนจะเห็น" /></label>}
          {menu !== "join" && <Setup value={settings} onChange={setSettings} disabled={busy} />}
          <AvatarPicker avatar={avatar} onChange={setAvatar} />
          {alert}
          <button className="primary wide" disabled={busy}>{busy ? "กำลังเชื่อมต่อ…" : menu === "solo" ? "เริ่มวิ่ง" : menu === "create" ? "สร้างห้อง" : "เข้าร่วมห้อง"} <ArrowRight size={18} /></button>
        </form>
      </section>}
      {soloActive && !room && (solo.stats.hearts > 0 && solo.index < solo.deck.length && now < solo.endsAt
        ? <div className="game-layout solo-game">
          <PlayStage question={solo.deck[solo.index]} stats={solo.stats} index={solo.index} feedback={solo.feedback}
            hearts={settings.hearts} startsAt={0} endsAt={solo.endsAt} now={now || solo.endsAt - MATCH_MS} onAnswer={(choice) => solo.answer(solo.index, choice)} avatar={avatar} onAvatar={setAvatar} />
        </div>
        : <section className="panel form-panel results"><span className="section-icon"><Trophy /></span>
          <h1>{solo.stats.hearts ? "จบรอบฝึก" : "ซอมบี้จับคุณได้!"}</h1>
          <strong className="final-score">{solo.stats.score.toLocaleString("en-US")}</strong>
          <p>แต้ม · ตอบถูก {solo.stats.correct} / {ROUND_SIZE} · คอมโบสูงสุด {solo.stats.bestStreak}</p>
          {solo.feedback && <p>คำตอบล่าสุดคือ {solo.feedback.answer}</p>}
          <button className="primary wide" onClick={startSolo}><Play size={18} /> เล่นใหม่</button>
          <button className="quiet wide" onClick={() => { setSoloActive(false); go("solo"); }}><Settings2 size={17} /> เปลี่ยนการตั้งค่า</button>
        </section>)}
      {room && player && <>
        {alert}
        {room.phase === "lobby" ? <div className="lobby-grid">
          <section className="panel form-panel">
            <span className="section-icon"><Users /></span>
            <h1>ห้องรอ</h1>
            <p>แชร์รหัสนี้ให้เพื่อนเข้าร่วม</p>
            <button className="room-code" onClick={async () => {
              try { await navigator.clipboard.writeText(room.code); setCopied(true); }
              catch { setCopied(false); }
            }} aria-label="คัดลอกรหัสห้อง">{room.code} {copied ? <Check size={20} /> : <Clipboard size={20} />}</button>
            {copied && <p className="copy-status" role="status">คัดลอกรหัสแล้ว</p>}
            <AvatarPicker avatar={roomAvatar} onChange={changeAvatar} busy={busy} />
            <Setup value={room.settings} disabled={!host || busy} onChange={(value) => void send({ action: "settings", settings: value })} />
            {host ? <button className="primary wide" onClick={() => void send({ action: "start" })} disabled={busy || room.players.length < 2}><Play size={18} /> เริ่มเกม</button>
              : <p className="copy-status">รอโฮสต์เริ่มเกม</p>}
            {host && room.players.length < 2 && <p className="copy-status">ต้องมีผู้เล่นอย่างน้อย 2 คน</p>}
          </section>
          <section className="panel scoreboard">
            <h2><Users size={20} /> ผู้เล่น <small>{room.players.length}/{CAPACITY}</small></h2>
            <ol>{room.players.map((p, i) => <li key={p.id}><span className="rank">{i + 1}</span>
              <Mascot avatar={p.avatar ?? defaultAvatar} /><span className="player-name">{p.name}{p.id === player.id && <small> คุณ</small>}</span>{p.id === room.hostId && <small>โฮสต์</small>}</li>)}</ol>
            <p className="lobby-rule"><Timer size={17} /> {ROUND_SIZE} ข้อ · {MATCH_MS / 1000} วินาที · ผู้รอดที่ได้แต้มสูงสุดชนะ</p>
          </section>
        </div> : room.phase === "playing" ? <div className="game-layout">
          <PlayStage question={room.question} stats={player} index={player.index} hearts={room.settings.hearts} feedback={room.feedback}
            startsAt={room.startsAt} endsAt={room.endsAt} now={clock} busy={busy} avatar={roomAvatar} onAvatar={changeAvatar} count={room.questionCount}
            onAnswer={(choice) => void send({ action: "answer", index: player.index, round: room.startsAt, choice })} />
          <Leaderboard players={room.players} playerId={player.id} count={room.questionCount} />
        </div> : <div className="lobby-grid">
          <section className="panel form-panel results">
            <span className="section-icon"><Trophy /></span>
            <h1>จบการแข่งขัน</h1>
            <p>{(() => {
              const ranked = room.players.filter((p) => !p.left && p.hearts > 0).sort(compareScores);
              if (!ranked.length) return "ไม่มีผู้รอดในรอบนี้";
              const winners = ranked.filter((p) => compareScores(ranked[0], p) === 0);
              return `${winners.length > 1 ? "ชนะร่วมกัน" : "ผู้ชนะ"} · ${winners.map((p) => p.name).join(", ")}`;
            })()}</p>
            <strong className="final-score">{player.score.toLocaleString("en-US")}</strong>
            <p>แต้มของคุณ · คอมโบสูงสุด {player.bestStreak}</p>
            {room.feedback && <p>คำตอบล่าสุดคือ {room.feedback.answer}</p>}
            {host ? <button className="primary wide" disabled={busy} onClick={() => void send({ action: "rematch" })}><Play size={18} /> กลับห้องเพื่อเล่นใหม่</button>
              : <p className="copy-status">รอโฮสต์เปิดรอบใหม่</p>}
          </section>
          <Leaderboard players={room.players} playerId={player.id} count={room.questionCount} finished />
        </div>}
      </>}
    </main>
    {home && <footer className="footer"><span>WORDRUN</span><span>ฝึกคำศัพท์ภาษาอังกฤษผ่านเกม</span></footer>}
  </>;
}

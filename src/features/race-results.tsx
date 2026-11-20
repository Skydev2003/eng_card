import { Crown, Flame, Flag, Medal, Target, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { defaultAvatar } from "@/game/adventure";
import type { PublicPlayer } from "@/game/room";
import { compareScores } from "@/game/rules";
import { compareDuelScores } from "@/game/duel";
import { Mascot } from "./run-scene";

function compareRunners(a: PublicPlayer, b: PublicPlayer) {
  return Number(b.hearts > 0) - Number(a.hearts > 0) || compareScores(a, b);
}

export function RaceResults({ runners, playerId, questionCount, solo = false, duel = false, children, notices }: {
  runners: PublicPlayer[]; playerId: string; questionCount: number; solo?: boolean; duel?: boolean; children: ReactNode; notices?: ReactNode;
}) {
  const compare = duel ? compareDuelScores : compareRunners;
  const ranked = runners.filter((runner) => !runner.left).sort(compare);
  const rankOf = (runner: PublicPlayer) => ranked.findIndex((candidate) => compare(candidate, runner) === 0) + 1;
  const leader = ranked[0];
  const self = ranked.find((runner) => runner.id === playerId);
  const winners = leader && (duel || leader.hearts) ? ranked.filter((runner) => compare(leader, runner) === 0) : [];
  const headline = solo ? (self?.hearts ? "จบรอบฝึก" : "มอนสเตอร์จับคุณได้!") : "จบการแข่งขัน";
  const winnerText = winners.length
    ? `${winners.length > 1 ? "ชนะร่วมกัน" : "ผู้ชนะ"} · ${winners.map((runner) => runner.name).join(", ")}`
    : "ไม่มีผู้รอดในรอบนี้";

  return <section className="trophy-board" aria-labelledby="race-title">
    <div className="trophy-banner"><Trophy size={22} /> {duel ? "ผลโหมดดวล" : "ผลการแข่งขัน"}</div>
    <div className="trophy-overview">
      <div className="trophy-art" aria-hidden="true">
        {solo || winners.length ? <Crown size={30} /> : <Flag size={28} />}
        {leader && <Mascot avatar={leader.avatar ?? defaultAvatar} />}
      </div>
      <div className="trophy-headline">
        <h1 id="race-title">{headline}</h1>
        <p>{solo ? `ตอบถูก ${self?.correct ?? 0} จาก ${questionCount} ข้อ` : winnerText}</p>
      </div>
      <div className="trophy-points"><span>แต้มของคุณ</span><strong>{(self?.score ?? 0).toLocaleString("en-US")}</strong></div>
    </div>
    {notices}
    {duel && <ol className="duel-podium" aria-label="โพเดียม">
      {ranked.slice(0, 3).map((runner) => <li key={runner.id} data-rank={rankOf(runner)}>
        <span className="trophy-rank" data-rank={rankOf(runner)}><Medal size={15} aria-hidden="true" />{rankOf(runner)}</span>
        <Mascot avatar={runner.avatar ?? defaultAvatar} />
        <strong>{runner.name}</strong>
        <small>{runner.score.toLocaleString("en-US")} แต้ม</small>
      </li>)}
    </ol>}
    <table className="trophy-table">
      <caption className="sr-only">ตารางคะแนนอันดับผู้เล่น</caption>
      <thead><tr>
        <th scope="col">อันดับ</th><th scope="col">นักวิ่ง</th>
        <th scope="col"><Target size={15} /> ถูก</th><th scope="col" className="trophy-combo"><Flame size={15} /> คอมโบ</th>
        <th scope="col">แต้ม</th>
      </tr></thead>
      <tbody>{ranked.map((runner) => {
        const rank = rankOf(runner);
        return <tr key={runner.id} className={runner.id === playerId ? "your-result" : undefined}>
          <td><span className="trophy-rank" data-rank={rank}>{rank <= 3 && <Medal size={15} aria-hidden="true" />}{rank}</span></td>
          <th scope="row"><span className="trophy-player"><Mascot avatar={runner.avatar ?? defaultAvatar} />
            <span><strong>{runner.name}</strong>{runner.id === playerId && <small>คุณ</small>}
              {!runner.hearts && <small>ตกรอบ</small>}</span>
          </span></th>
          <td>{runner.correct}</td><td className="trophy-combo">{runner.bestStreak}</td>
          <td className="trophy-score">{runner.score.toLocaleString("en-US")}</td>
        </tr>;
      })}</tbody>
    </table>
    <div className="trophy-actions">{children}</div>
  </section>;
}

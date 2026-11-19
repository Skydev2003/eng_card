import { Sparkles } from "lucide-react";
import { correctKey, visibleCorrect, type CorrectEvent } from "@/game/correct-events";

export function AnswerNotices({ events, now, playerId }: {
  events: CorrectEvent[]; now: number; playerId?: string;
}) {
  return <div className="answer-notices" role="log" aria-label="แจ้งเตือนคำตอบถูก" aria-live="polite">
    {visibleCorrect(events, now, playerId).map((event) => {
      const own = event.playerId === playerId;
      return <div className={`answer-notice${own ? " answer-notice-own" : ""}`} key={correctKey(event)}>
        <span className="notice-spark"><Sparkles size={17} /></span>
        <strong>{own ? "คุณตอบถูก!" : `${event.playerName} ตอบถูก!`}</strong>
        <b>+{event.points.toLocaleString("en-US")}</b>
      </div>;
    })}
  </div>;
}

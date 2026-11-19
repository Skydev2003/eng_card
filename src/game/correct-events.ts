export type CorrectEvent = { playerId: string; playerName: string; index: number; points: number; at: number };
export const NOTICE_MS = 5_500;

export function correctKey(event: CorrectEvent) {
  return `${event.playerId}:${event.index}:${event.at}`;
}

export function appendCorrect(events: CorrectEvent[], event: CorrectEvent) {
  if (events.some((previous) => previous.playerId === event.playerId && previous.index === event.index)) return events;
  const { playerId, playerName, index, points, at } = event;
  return [...events.slice(-17), { playerId, playerName, index, points, at }];
}

export function visibleCorrect(events: CorrectEvent[], now: number, selfId?: string) {
  const recent = events.filter(({ at }) => at > now - NOTICE_MS && at <= now + 1_000);
  const last = recent.slice(-3);
  const self = recent.findLast(({ playerId }) => playerId === selfId);
  if (self && !last.includes(self)) return [...last.slice(1), self].sort((a, b) => a.at - b.at);
  return last;
}

type LobbyMember = { id: string; left: boolean; ready?: boolean };

export function guestReadiness(players: LobbyMember[], hostId: string) {
  const guests = players.filter((player) => !player.left && player.id !== hostId);
  const ready = guests.filter((player) => player.ready).length;
  return { ready, total: guests.length, canStart: guests.length > 0 && ready === guests.length };
}

export function availableRunnerName(players: { name: string }[]) {
  const names = new Set(players.map(({ name }) => name));
  let number = 1;
  while (names.has(`นักวิ่ง ${number}`)) number++;
  return `นักวิ่ง ${number}`;
}

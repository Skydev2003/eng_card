import assert from "node:assert/strict";
import test from "node:test";
import { openDuelQuestion, recordDuelVote, revealDuelQuestion } from "../src/game/duel.ts";
import { initialStats } from "../src/game/rules.ts";

const runner = (id) => ({ ...initialStats(1), id, name: id, left: false });

test("three rivals vote once and share a reveal with speed points", () => {
  const players = ["A", "B", "C"].map(runner);
  const round = openDuelQuestion(0, 1_000, 5_000, 181_000);
  assert.equal(recordDuelVote(round, "A", 0, 999), false);
  assert.equal(recordDuelVote(round, "A", 0, 1_100), true);
  assert.equal(recordDuelVote(round, "A", 1, 1_200), false);
  assert.equal(revealDuelQuestion(round, players, 0, 1, 1_200), undefined);
  assert.equal(recordDuelVote(round, "B", 0, 3_500), true);
  assert.equal(recordDuelVote(round, "C", 1, 3_750), true);
  const results = revealDuelQuestion(round, players, 0, 1, 3_750);
  assert.deepEqual(results.map(({ points, stats, reason }) => [points, stats.hearts, reason]), [
    [119, 1, undefined], [110, 1, undefined], [0, 1, undefined],
  ]);
});

test("duels continue past question 40, keep timed-out rivals in play and honor match end", () => {
  let openedAt = 1_000;
  const endsAt = 181_000;
  for (let index = 0; index < 51; index++) {
    const round = openDuelQuestion(index, openedAt, 3_000, endsAt);
    assert.equal(round.index, index);
    const results = revealDuelQuestion(round, [runner("A")], 0, 1, round.deadline);
    assert.equal(results[0].reason, "timeout");
    assert.equal(results[0].stats.hearts, 1);
    openedAt = round.deadline + 200;
  }
  const last = openDuelQuestion(51, endsAt - 500, 3_000, endsAt);
  assert.equal(last.deadline, endsAt);
  assert.equal(recordDuelVote(last, "A", 0, endsAt), false);
});

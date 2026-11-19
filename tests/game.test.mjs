import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, ROUND_SIZE, initialStats, grade, compareScores } from '../src/game/rules.ts';

test('each category and difficulty can deliver a full deck of unambiguous questions', () => {
  for (const category of ['all', 'people', 'animals', 'objects', 'places', 'food']) {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const deck = buildDeck({ category, difficulty, hearts: 3 });
      assert.equal(deck.length, ROUND_SIZE);
      for (const [index, q] of deck.entries()) {
        assert.equal(new Set(q.options).size, 2);
        assert.ok(q.image.startsWith('/art/words/'));
        assert.notEqual(q.image, deck[index - 1]?.image);
      }
    }
  }
});

test('streak earns more points; mistakes reset speed and eliminate at zero', () => {
  const first = grade(initialStats(2), true);
  const second = grade(first, true);
  assert.ok(second.score - first.score > first.score);
  assert.ok(second.speed > first.speed);
  const wrong = grade(second, false);
  assert.equal(wrong.hearts, 1);
  assert.equal(wrong.streak, 0);
  assert.equal(grade(wrong, false).hearts, 0);
  assert.equal(grade(grade(wrong, false), true).score, second.score);
  assert.ok(compareScores(second, first) < 0);
});

test('the scene changes only at ten correct answers and caps at the final stage', async () => {
  const { runProgress, validAvatar } = await import('../src/game/adventure.ts');
  assert.equal(runProgress(9).stage.scene, 'forest');
  assert.equal(runProgress(10).stage.scene, 'river');
  assert.equal(runProgress(19).steps, 9);
  assert.equal(runProgress(20).stage.scene, 'ruins');
  assert.equal(runProgress(30).stage.scene, 'grove');
  assert.equal(runProgress(40).steps, 10);
  assert.equal(runProgress(40).distance, 4000);
  assert.equal(validAvatar({ mascot: 'bunny', palette: 'mint' }), true);
  assert.equal(validAvatar({ mascot: '__proto__', palette: 'mint' }), false);
});

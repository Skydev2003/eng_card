import { existsSync, readFileSync } from "node:fs";
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
        assert.ok(!Object.hasOwn(q, 'prompt'));
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

test('trail positions distinguish friends while keeping them inside the viewport', async () => {
  const { peerOffset, mascotArt, validAvatar } = await import('../src/game/adventure.ts');
  assert.ok(peerOffset(20, 10) > 0);
  assert.ok(peerOffset(0, 10) < 0);
  assert.ok(peerOffset(200, 0) <= 33);
  assert.equal(mascotArt('fox'), 'calico');
  assert.equal(validAvatar({ mascot: 'capybara', palette: 'mint' }), true);
});

test('the expanded catalog has distinct artwork and meaningful difficulty pools', async () => {
  const { vocabulary, wordsFor, distractorsFor } = await import('../src/game/vocabulary.ts');
  assert.ok(vocabulary.length >= 100);
  assert.equal(new Set(vocabulary.map((entry) => entry.image)).size, vocabulary.length);
  assert.equal(new Set(vocabulary.map((entry) => entry.word)).size, vocabulary.length);
  for (const entry of vocabulary) {
    assert.ok(existsSync(new URL('../public' + entry.image, import.meta.url)), entry.word);
  }
  const easy = wordsFor('all', 'easy');
  const hard = wordsFor('all', 'hard');
  assert.ok(easy.every((entry) => entry.tier === 1));
  assert.ok(hard.every((entry) => entry.tier >= 2 || entry.topic));
  assert.ok(easy.length >= 30 && hard.length >= 40);
  assert.ok(distractorsFor(vocabulary.find((entry) => entry.word === 'Cucumber'), 'hard')
    .some((entry) => entry.word === 'Zucchini'));
  const deck = buildDeck({ category: 'all', difficulty: 'hard', hearts: 3 });
  assert.equal(new Set(deck.map(question => question.image)).size, ROUND_SIZE);
});

test('correct answer notices retain points without sending the answer to other players', async () => {
  const { appendCorrect, visibleCorrect } = await import('../src/game/correct-events.ts');
  const event = { playerId: 'host', playerName: 'Host', index: 7, points: 150, at: 1000 };
  const events = appendCorrect([], event);
  assert.deepEqual(events, [{ ...event }]);
  assert.equal(appendCorrect(events, event).length, 1);
  assert.equal(visibleCorrect(events, 1100)[0].points, 150);
  assert.equal(visibleCorrect(events, 14000).length, 0);
  assert.ok(!Object.hasOwn(events[0], 'answer'));
});

test('each expired question takes exactly one heart and advances its own deadline', async () => {
  const { expireQuestions, chasePressure } = await import('../src/game/question-timer.ts');
  const runner = { ...grade(initialStats(3), true), index: 1, deadline: 6_000 };
  assert.equal(expireQuestions(runner, 5_999, 5_000, 40), runner);
  const one = expireQuestions(runner, 6_000, 5_000, 40);
  assert.equal(one.hearts, 2);
  assert.equal(one.index, 2);
  assert.equal(one.score, runner.score);
  assert.equal(one.streak, 0);
  assert.equal(one.deadline, 11_000);
  assert.equal(expireQuestions(one, 6_000, 5_000, 40), one);
  const gone = expireQuestions(runner, 16_000, 5_000, 40);
  assert.equal(gone.hearts, 0);
  assert.equal(gone.index, 4);
  assert.equal(expireQuestions(gone, 99_000, 5_000, 40), gone);
  assert.equal(expireQuestions({ ...runner, deadline: undefined }, 99_000, 5_000, 40).hearts, 3);
  assert.equal(chasePressure(6_000, 1_000, 5_000), 0);
  assert.equal(chasePressure(6_000, 3_500, 5_000), 0.5);
  assert.equal(chasePressure(6_000, 7_000, 5_000), 1);
});

test('only a lobby with guests, all of them ready, can start', async () => {
  const { guestReadiness, availableRunnerName } = await import('../src/game/lobby.ts');
  const host = { id: 'h', ready: false, left: false };
  const guest = { id: 'g', ready: false, left: false };
  assert.equal(guestReadiness([host], host.id).canStart, false);
  assert.equal(guestReadiness([host, guest], host.id).canStart, false);
  assert.deepEqual(guestReadiness([host, { ...guest, ready: true }], host.id),
    { ready: 1, total: 1, canStart: true });
  assert.equal(guestReadiness([host, { ...guest, ready: true, left: true }], host.id).canStart, false);
  assert.equal(availableRunnerName([{ name: 'นักวิ่ง 1' }, { name: 'นักวิ่ง 3' }]), 'นักวิ่ง 2');
});

test('new Oxford picture cards are unique and hard decks always use a close picture distractor', async () => {
  const { oxfordPictures } = await import('../src/game/oxford-pictures.ts');
  const { vocabulary, WORD_COUNT, closePictureOptions, wordsFor } = await import('../src/game/vocabulary.ts');
  const { publicQuestion } = await import('../src/game/rules.ts');
  assert.ok(oxfordPictures.length >= 500);
  assert.equal(WORD_COUNT, 105 + oxfordPictures.length);
  assert.equal(new Set(vocabulary.map(({ word }) => word.toLowerCase())).size, WORD_COUNT);
  const normal = new Set(wordsFor('all', 'normal'));
  const hard = new Set(wordsFor('all', 'hard').filter(word => closePictureOptions(word).length > 0));
  for (const word of vocabulary.filter(word => word.topic)) {
    assert.ok(normal.has(word) || hard.has(word), `${word.word} must appear in at least one deck`);
  }
  const credits = readFileSync(new URL('../public/art/words/oxford/credits.txt', import.meta.url), 'utf8');
  const credited = new Set([...credits.matchAll(/^(\d+) (?:\||\S)/gm)].map(match => match[1]));
  for (const [, , word, , id] of oxfordPictures) {
    assert.ok(credited.has(id), `${word} is missing an image credit or provenance entry`);
  }
  for (const [first, second] of [['Lorry', 'Truck'], ['Singer', 'Musician'], ['Across', 'Through']]) {
    assert.ok(!closePictureOptions(vocabulary.find(word => word.word === first)).some(word => word.word === second));
  }
  for (const category of ['all', 'people', 'animals', 'objects', 'places', 'food']) {
    const deck = buildDeck({ category, difficulty: 'hard', hearts: 3 });
    assert.ok(deck.some(question => question.image.includes('/oxford/')));
    for (const question of deck) {
      const entry = vocabulary.find(item => item.image === question.image);
      assert.ok(entry && (category === 'all' || entry.group === category));
      assert.ok(closePictureOptions(entry).some(item => item.word === question.options[1 - question.correct]));
      assert.deepEqual(publicQuestion(question), { image: entry.image, options: question.options });
    }
  }
});

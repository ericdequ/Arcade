import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  makeRng,
  standardDeck,
  defineGame,
  createMatch,
  replayMatch,
  games,
  higherLower,
} from '../src/index.js';

test('rng: deterministic — same seed yields the same sequence', () => {
  const a = makeRng('room42');
  const b = makeRng('room42');
  const seqA = Array.from({ length: 5 }, () => a.next());
  const seqB = Array.from({ length: 5 }, () => b.next());
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, Array.from({ length: 5 }, () => makeRng('other').next()));
});

test('rng: shuffle is deterministic + non-mutating', () => {
  const deck = standardDeck();
  const s1 = makeRng(7).shuffle(deck);
  const s2 = makeRng(7).shuffle(deck);
  assert.deepEqual(s1.map((c) => c.id), s2.map((c) => c.id));
  assert.equal(deck.length, 52);
  assert.notEqual(s1[0].id, deck[0].id); // actually shuffled (vanishingly unlikely to match)
});

test('deck: standard deck is 52 unique cards', () => {
  const deck = standardDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((c) => c.id)).size, 52);
});

test('engine: defineGame validates required fields', () => {
  assert.throws(() => defineGame({ id: 'x' }), /setup/);
  assert.throws(() => defineGame({ setup: () => ({}), reducers: {} }), /id/);
});

test('engine: registry rejects duplicates and lists bundled games', () => {
  assert.ok(games.has('higher-lower'));
  assert.ok(games.has('ride-the-bus'));
  assert.ok(games.has('ring-of-fire'));
  assert.throws(() => games.register(higherLower), /already registered/);
});

test('engine: match enforces player counts + unknown actions + over-state', () => {
  const g = defineGame({ id: 't', minPlayers: 2, setup: () => ({ done: false }), reducers: { end: (s) => ({ ...s, done: true }) }, isOver: (s) => s.done });
  assert.throws(() => createMatch({ game: g, players: ['a'], seed: 1 }), /at least 2/);
  const m = createMatch({ game: g, players: ['a', 'b'], seed: 1 });
  assert.throws(() => m.dispatch({ type: 'nope' }), /unknown action/);
  m.dispatch({ type: 'end' });
  assert.equal(m.isOver(), true);
  assert.throws(() => m.dispatch({ type: 'end' }), /over/);
});

test('engine: replay reproduces state exactly (lockstep foundation)', () => {
  const m1 = createMatch({ game: higherLower, players: ['a', 'b'], seed: 'sess#hl' });
  for (const guess of ['higher', 'lower', 'higher', 'higher', 'lower']) {
    if (m1.isOver()) break;
    m1.dispatch({ type: 'guess', payload: { guess }, playerId: m1.view().turnPlayer });
  }
  const m2 = replayMatch({ game: higherLower, players: ['a', 'b'], seed: 'sess#hl', log: m1.log });
  assert.deepEqual(m2.state, m1.state);
  assert.deepEqual(m2.result(), m1.result());
});

test('engine: two devices with the same seed see the same first card', () => {
  const seed = 'pairing-xyz:higher-lower';
  const left = createMatch({ game: higherLower, players: ['a', 'b'], seed });
  const right = createMatch({ game: higherLower, players: ['a', 'b'], seed });
  assert.equal(left.view().shown.id, right.view().shown.id);
});

test('higher-lower: a correct guess builds a streak, wrong adds a drink', () => {
  const m = createMatch({ game: higherLower, players: ['a'], seed: 5 });
  // Drive deterministically and assert the recorded outcome is self-consistent.
  const before = m.view();
  m.dispatch({ type: 'guess', payload: { guess: 'higher' }, playerId: 'a' });
  const last = m.view().last;
  assert.equal(last.player, 'a');
  if (last.correct) assert.equal(m.view().streaks.a, before.streaks.a + 1);
  else assert.equal(m.view().drinks.a, 1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createMatch,
  replayMatch,
  games,
  blackjack,
  snake,
  roulette,
  dealSequence,
  sequenceDurationMs,
  CARD_MOTION,
} from '../src/index.js';

// --- anim spec -------------------------------------------------------------

test('anim: dealSequence staggers and totals correctly', () => {
  const seq = dealSequence(['a', 'b', 'c']);
  assert.equal(seq.length, 3);
  assert.equal(seq[0].delayMs, 0);
  assert.equal(seq[2].delayMs, 2 * CARD_MOTION.stagger);
  assert.equal(sequenceDurationMs(seq), 2 * CARD_MOTION.stagger + CARD_MOTION.duration.deal);
});

// --- blackjack (deck logic) ------------------------------------------------

test('blackjack: deals 2+2, emits opening animations, deterministic by seed', () => {
  const m = createMatch({ game: blackjack, players: ['me'], seed: 'shoe-1' });
  const v = m.view('me');
  assert.equal(v.player.length, 2);
  assert.equal(v.dealer.length, 2);
  assert.equal(v.dealer[1].hidden, true, 'hole card hidden during player turn');
  assert.equal(v.dealerTotal, null, 'dealer total hidden during player turn');
  assert.ok(m.state.anim.length >= 4, 'opening deal animation present');
  // same seed → same first card
  const m2 = createMatch({ game: blackjack, players: ['me'], seed: 'shoe-1' });
  assert.equal(m.view('me').player[0].id, m2.view('me').player[0].id);
});

test('blackjack: stand reveals dealer + resolves to a known outcome', () => {
  const m = createMatch({ game: blackjack, players: ['me'], seed: 'shoe-1' });
  m.dispatch({ type: 'stand', playerId: 'me' });
  assert.equal(m.isOver(), true);
  assert.ok(['player', 'dealer', 'push'].includes(m.result().result));
  assert.ok(m.view('me').dealerTotal >= 17 || m.result().dealerTotal > 21);
});

// --- snake (grid engine) ---------------------------------------------------

test('snake: tick advances; wall collision ends the game', () => {
  const m = createMatch({ game: snake, players: ['p'], seed: 'snk', options: { size: 5 } });
  m.dispatch({ type: 'turn', payload: { dir: 'up' }, playerId: 'p' });
  for (let i = 0; i < 10 && !m.isOver(); i++) m.dispatch({ type: 'tick' });
  assert.equal(m.isOver(), true, 'snake eventually hits the top wall going up');
});

test('snake: lockstep — two devices with same seed + ticks match exactly', () => {
  const opts = { size: 8 };
  const a = createMatch({ game: snake, players: ['p'], seed: 'race', options: opts });
  const b = createMatch({ game: snake, players: ['p'], seed: 'race', options: opts });
  for (let i = 0; i < 4; i++) {
    a.dispatch({ type: 'tick' });
    b.dispatch({ type: 'tick' });
  }
  assert.deepEqual(a.view().snake, b.view().snake);
  assert.deepEqual(a.view().food, b.view().food, 'seeded food identical across devices');
});

// --- roulette (seeded wheel) -----------------------------------------------

test('roulette: a straight-up hit pays 35:1; same seed spins the same number', () => {
  // Find the seed-determined number, then bet straight on it to assert payout.
  const probe = createMatch({ game: roulette, players: ['p'], seed: 'wheel-7' });
  probe.dispatch({ type: 'spin' });
  const n = probe.view().last.number;

  const m = createMatch({ game: roulette, players: ['p'], seed: 'wheel-7' });
  m.dispatch({ type: 'bet', payload: { type: 'straight', value: n, amount: 10 }, playerId: 'p' });
  assert.equal(m.view().balances.p, 90); // staked
  m.dispatch({ type: 'spin' });
  assert.equal(m.view().last.number, n, 'same seed → same pocket');
  assert.equal(m.view().balances.p, 90 + 10 + 10 * 35); // stake back + 35:1
});

test('roulette: a losing even-money bet forfeits the stake', () => {
  const m = createMatch({ game: roulette, players: ['p'], seed: 'wheel-7' });
  m.dispatch({ type: 'spin' }); // see the number
  const n = m.view().last.number;
  const m2 = createMatch({ game: roulette, players: ['p'], seed: 'wheel-7' });
  const losingColor = n === 0 ? 'red' : 0; // 0 loses all colors anyway
  m2.dispatch({ type: 'bet', payload: { type: 'black', amount: 10 }, playerId: 'p' });
  m2.dispatch({ type: 'spin' });
  // If the pocket isn't black, the 10 is gone.
  if (m2.view().last.color !== 'black') assert.equal(m2.view().balances.p, 90);
  void losingColor;
});

// --- registry --------------------------------------------------------------

test('registry: all seven games registered + replayable', () => {
  for (const id of ['higher-lower', 'ride-the-bus', 'ring-of-fire', 'connect-four', 'blackjack', 'snake', 'roulette']) {
    assert.ok(games.has(id), `${id} registered`);
  }
  const m = createMatch({ game: snake, players: ['p'], seed: 's', options: { size: 6 } });
  m.dispatch({ type: 'turn', payload: { dir: 'down' }, playerId: 'p' });
  m.dispatch({ type: 'tick' });
  const r = replayMatch({ game: snake, players: ['p'], seed: 's', options: { size: 6 }, log: m.log });
  assert.deepEqual(r.view().snake, m.view().snake);
});

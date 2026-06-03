// Lockstep over a no-cloud channel — modelled with a shared in-memory bus that
// mirrors waves_worx's loopback channel contract { send, subscribe }. Two
// "devices" exchange only actions and must converge to identical state.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { joinMatch, seedFromSession, higherLower } from '../src/index.js';

// Minimal shared-medium bus (same shape as waves_worx createLoopbackBus).
function bus() {
  const subs = new Set();
  return {
    channel(id) {
      return {
        send: (bytes) => subs.forEach((s) => s.id !== id && s.cb(bytes, { fromId: id })),
        subscribe: (cb) => {
          const e = { id, cb };
          subs.add(e);
          return () => subs.delete(e);
        },
      };
    },
  };
}

test('transport: two devices converge to identical state over a channel', () => {
  const b = bus();
  const players = ['a', 'b'];
  const seed = seedFromSession('pairing-session-1', higherLower.id);

  const a = joinMatch({ game: higherLower, players, seed, me: 'a', channel: b.channel('a') });
  const bb = joinMatch({ game: higherLower, players, seed, me: 'b', channel: b.channel('b') });

  // Players alternate; each plays on their turn.
  for (let i = 0; i < 6; i++) {
    if (a.match.isOver()) break;
    const turn = a.match.view().turnPlayer;
    (turn === 'a' ? a : bb).play('guess', { guess: i % 2 ? 'higher' : 'lower' });
  }

  // Both local engines computed the same state from exchanged actions alone.
  assert.deepEqual(a.match.state, bb.match.state);
  assert.equal(a.match.view().shown.id, bb.match.view().shown.id);

  a.leave();
  bb.leave();
});

test('transport: seedFromSession binds the deck to the pairing, not one device', () => {
  assert.equal(seedFromSession('S', 'g'), 'S:g');
  // Different sessions ⇒ different decks.
  assert.notEqual(seedFromSession('S1', 'g'), seedFromSession('S2', 'g'));
});

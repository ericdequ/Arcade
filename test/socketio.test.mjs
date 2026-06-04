// Lockstep over a real socket.io relay — the cloud-optional path. Two clients
// connect to an ephemeral relay, exchange ONLY action frames, and must converge
// to byte-identical state, exactly like the no-cloud loopback channel does. The
// relay never decodes a frame; it only rebroadcasts within a room.
//
// Skips cleanly if socket.io / socket.io-client aren't installed (they're
// optionalDependencies), so the core suite stays green without a websocket stack.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { higherLower, joinMatch, seedFromSession } from '../src/index.js';
import { createRelay, socketChannel } from '../src/channels/socketio.js';

const hasSocketIo = await Promise.all([
  import('socket.io').then(() => true).catch(() => false),
  import('socket.io-client').then(() => true).catch(() => false),
]).then(([a, b]) => a && b);

test(
  'socketio transport: two clients converge over a relay',
  { skip: hasSocketIo ? false : 'socket.io optional deps not installed' },
  async () => {
    const { io, close } = await createRelay({ port: 0 });
    const { port } = io.httpServer.address();
    const url = `http://localhost:${port}`;
    const room = seedFromSession('pairing-session-1', higherLower.id);
    const players = ['a', 'b'];

    // A resolver queue per device: each remote action resolves one waiter, so we
    // can deterministically wait for a play to reach the peer before continuing.
    const waiters = { a: [], b: [] };
    const onRemote = (who) => () => waiters[who].shift()?.();
    const peerReceives = (who) => new Promise((res) => waiters[who].push(res));

    const ca = await socketChannel({ url, room });
    const cb = await socketChannel({ url, room });
    // Wait until both sockets are connected (and thus joined to the room).
    await Promise.all([ca, cb].map((c) => connected(c.socket)));

    const a = joinMatch({ game: higherLower, players, seed: room, me: 'a', channel: ca, onState: onRemote('a') });
    const b = joinMatch({ game: higherLower, players, seed: room, me: 'b', channel: cb, onState: onRemote('b') });

    for (let i = 0; i < 6; i += 1) {
      if (a.match.isOver()) break;
      const turn = a.match.view().turnPlayer;
      const actor = turn === 'a' ? a : b;
      const peer = turn === 'a' ? 'b' : 'a';
      const landed = peerReceives(peer);
      actor.play('guess', { guess: i % 2 ? 'higher' : 'lower' });
      await withTimeout(landed, 2000, 'remote action never arrived over relay');
    }

    assert.deepEqual(a.match.view(), b.match.view(), 'devices diverged across the relay');

    ca.close();
    cb.close();
    await close();
  },
);

function connected(socket) {
  if (socket.connected) return Promise.resolve();
  return new Promise((res) => socket.once('connect', res));
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms).unref?.()),
  ]);
}

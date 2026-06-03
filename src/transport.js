// =============================================================================
// Arcade — transport: lockstep multiplayer over a no-cloud channel
// =============================================================================
// Run a match across devices with NO server. Each device builds the SAME match
// (same game, players, seed) and exchanges only ACTIONS over a channel; because
// the engine is deterministic (seeded rng, ordered actions), every device
// computes identical state locally.
//
// `channel` is anything with { send(bytes), subscribe(cb) } — e.g. a
// waves_worx loopback/BLE/sound channel. The seed is derived from a shared
// value (a waves_worx pairing session id or room code), so no one device picks
// it. This module has NO hard dependency on waves_worx; it just speaks the same
// tiny channel contract, so Arcade is the natural test harness for waves_worx
// transports.
// =============================================================================

import { createMatch } from './engine.js';

const enc = (obj) => new TextEncoder().encode(JSON.stringify(obj));
const dec = (bytes) => JSON.parse(new TextDecoder().decode(bytes));

/**
 * Join a lockstep match over a channel.
 *
 * @param {object} opts
 * @param {object} opts.game
 * @param {string[]} opts.players          identical ordered list on every device
 * @param {string} opts.seed               shared seed (e.g. pairing session id)
 * @param {string} opts.me                 this device's player id
 * @param {{send:Function, subscribe:Function}} opts.channel
 * @param {object} [opts.options]
 * @param {(state:any, action:any) => void} [opts.onState]  called after each applied action
 * @returns {{ play:(type:string, payload?:any)=>void, match:object, leave:()=>void }}
 */
export function joinMatch({ game, players, seed, me, channel, options = {}, onState }) {
  const match = createMatch({ game, players, seed, options });

  // Apply an action locally + notify. Used for both local and remote actions.
  const applyAndNotify = (action) => {
    match.dispatch(action);
    onState?.(match.state, action);
  };

  const unsub = channel.subscribe((bytes, meta) => {
    const msg = dec(bytes);
    if (msg.kind !== 'arcade.action') return;
    // Ignore our own echoed actions (we already applied them locally).
    if (msg.action.playerId === me) return;
    applyAndNotify(msg.action);
  });

  return {
    match,
    /** Make a move: apply locally, broadcast to peers. */
    play(type, payload) {
      const action = { type, payload, playerId: me };
      applyAndNotify(action);
      channel.send(enc({ kind: 'arcade.action', action }));
    },
    leave() {
      unsub?.();
    },
  };
}

/**
 * Derive a match seed from a pairing session + game id, so peers that completed
 * a waves_worx handshake share a seed neither side chose alone.
 */
export const seedFromSession = (sessionId, gameId) => `${sessionId}:${gameId}`;

// =============================================================================
// Arcade — engine: the game contract, registry, and deterministic runtime
// =============================================================================
// A game is pure data + pure functions:
//   setup(ctx) → state           build the initial state from players + rng
//   reducers[action](state, payload, ctx) → nextState   one move
//   view(state, playerId) → playerView   what a player may see (hides secrets)
//   isOver / result               end + outcome
//
// Because the runtime owns a SEEDED rng and applies actions in order, every
// device that creates a match with the same seed and replays the same action
// log reaches byte-identical state — that's lockstep multiplayer with no
// server (see ./transport.js). "Add your own game" = call defineGame() and
// register it; people can clone the repo and drop a game in games/.
// =============================================================================

import { makeRng } from './rng.js';

/**
 * Define a game. Returns a frozen, validated descriptor.
 * @param {object} def
 */
export function defineGame(def) {
  for (const k of ['id', 'setup', 'reducers']) {
    if (!def[k]) throw new Error(`defineGame: "${k}" is required`);
  }
  return Object.freeze({
    id: def.id,
    title: def.title ?? def.id,
    minPlayers: def.minPlayers ?? 1,
    maxPlayers: def.maxPlayers ?? 8,
    setup: def.setup,
    reducers: Object.freeze({ ...def.reducers }),
    view: def.view ?? ((state) => state),
    isOver: def.isOver ?? (() => false),
    result: def.result ?? (() => null),
  });
}

/** Registry of games. The default export `games` is a shared instance. */
export class GameRegistry {
  constructor() {
    this._byId = new Map();
  }
  register(game) {
    if (this._byId.has(game.id)) throw new Error(`game already registered: ${game.id}`);
    this._byId.set(game.id, game);
    return game;
  }
  get(id) {
    return this._byId.get(id) ?? null;
  }
  has(id) {
    return this._byId.has(id);
  }
  list() {
    return [...this._byId.values()];
  }
}

export const games = new GameRegistry();

/**
 * Create a match. Deterministic: same (game, players, seed, options) + same
 * dispatched actions ⇒ identical state on every device.
 *
 * @param {object} opts
 * @param {object} opts.game     a defineGame() descriptor
 * @param {string[]} opts.players ordered player ids
 * @param {string|number} opts.seed
 * @param {object} [opts.options]
 */
export function createMatch({ game, players, seed, options = {} }) {
  if (!game) throw new Error('createMatch: game is required');
  if (!Array.isArray(players) || players.length < game.minPlayers) {
    throw new Error(`${game.id}: needs at least ${game.minPlayers} player(s)`);
  }
  if (players.length > game.maxPlayers) {
    throw new Error(`${game.id}: at most ${game.maxPlayers} player(s)`);
  }

  const rng = makeRng(seed);
  let state = game.setup({ players, rng, options });
  const log = [];

  const match = {
    game,
    players,
    seed,
    get state() {
      return state;
    },
    get log() {
      return log.slice();
    },
    view: (playerId) => game.view(state, playerId),
    isOver: () => game.isOver(state),
    result: () => game.result(state),

    /**
     * Apply an action. Records it to the log for replay / transport.
     * @param {{type:string, payload?:any, playerId?:string}} action
     */
    dispatch(action) {
      if (game.isOver(state)) throw new Error(`${game.id}: match is over`);
      const reducer = game.reducers[action.type];
      if (!reducer) throw new Error(`${game.id}: unknown action "${action.type}"`);
      state = reducer(state, action.payload, { rng, playerId: action.playerId, players });
      log.push({ type: action.type, payload: action.payload, playerId: action.playerId });
      return state;
    },
  };
  return match;
}

/**
 * Rebuild a match's state by replaying an action log (e.g. a late joiner, or a
 * peer verifying another's state). Same seed + same log ⇒ same state.
 */
export function replayMatch({ game, players, seed, options = {}, log = [] }) {
  const match = createMatch({ game, players, seed, options });
  for (const action of log) match.dispatch(action);
  return match;
}

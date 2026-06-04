// =============================================================================
// Arcade — a deterministic, pluggable party-game engine + a game catalog
// =============================================================================
// Two unified layers:
//   • ENGINE — playable, deterministic, multiplayer-ready games (defineGame +
//     a seeded match runtime + lockstep transport).
//   • CATALOG — manifests for browsing/launching every game, whether it's an
//     in-app engine game (engineId), a Scratch embed (iframe), or an app page
//     (route). One registry over BEV's bar games and RobotRic's arcade.
//
// Clone the repo, drop a defineGame() in src/games/ and a manifest in the
// catalog, and your game shows up everywhere — playable + multiplayer for free.
// =============================================================================

// Core
export { CARD_MOTION, collect, deal as dealAnim, dealSequence, flip, sequenceDurationMs,slide } from './anim.js';
export {
blackjackValue,
compareRanks, createDeck, deal, draw, drawCards, RANKS, shuffleDeck, standardDeck,   SUITS, } from './cards.js';
export { createMatch, defineGame, GameRegistry, games, replayMatch } from './engine.js';
export { cloneGrid, createGrid, dropToken, findDropRow, hasConnection, isGridFull } from './grid.js';
export { hashSeed,makeRng } from './rng.js';
export { joinMatch, seedFromSession } from './transport.js';

// Catalog
export { createCatalog, mergeCollections,normalizeGame } from './catalog.js';
export { robotricCatalog,robotricGames } from './catalog/robotric.js';

// Engine games — register the bundled set
import { games } from './engine.js';
import { blackjack } from './games/blackjack.js';
import { connectFour } from './games/connect-four.js';
import { higherLower } from './games/higher-lower.js';
import { rideTheBus } from './games/ride-the-bus.js';
import { ringOfFire } from './games/ring-of-fire.js';
import { roulette } from './games/roulette.js';
import { snake } from './games/snake.js';

games.register(higherLower);
games.register(ringOfFire);
games.register(rideTheBus);
games.register(connectFour);
games.register(blackjack);
games.register(snake);
games.register(roulette);

export { blackjack, connectFour, higherLower, rideTheBus, ringOfFire, roulette,snake };

// Default catalog — the playable engine games as manifests + RobotRic's arcade.
import { createCatalog, mergeCollections } from './catalog.js';
import { robotricGames } from './catalog/robotric.js';

const engineManifest = (game, extra = {}) => ({
  id: game.id,
  title: game.title,
  url: `/Arcade/${game.id}`,
  engineId: game.id,
  source: 'arcade',
  collection: 'arcade',
  tags: ['playable'],
  ...extra,
});

/** Manifests for every bundled playable game. */
export const engineGames = [higherLower, ringOfFire, rideTheBus, connectFour, blackjack, snake, roulette].map((g) => engineManifest(g));

/** The default catalog: playable engine games + RobotRic's games, deduped. */
export const catalog = createCatalog(mergeCollections(engineGames, robotricGames));

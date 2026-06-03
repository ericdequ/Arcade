// =============================================================================
// Arcade — a deterministic, pluggable party-game engine
// =============================================================================
// Games are pure data + pure functions; a seeded RNG makes every match
// reproducible and enables no-cloud lockstep multiplayer (./transport.js). Clone
// the repo and drop a defineGame() into src/games/ to add your own. Used to
// exercise waves_worx transports, BEV bar games, and RobotRic.
// =============================================================================

// Core
export { makeRng, hashSeed } from './rng.js';
export { buildDeck, standardDeck, shuffle, draw, deal, STANDARD_RANKS, STANDARD_SUITS } from './deck.js';
export { defineGame, GameRegistry, games, createMatch, replayMatch } from './engine.js';
export { joinMatch, seedFromSession } from './transport.js';

// Bundled games
import { games } from './engine.js';
import { higherLower } from './games/higher-lower.js';
import { ringOfFire } from './games/ring-of-fire.js';
import { rideTheBus } from './games/ride-the-bus.js';

games.register(higherLower);
games.register(ringOfFire);
games.register(rideTheBus);

export { higherLower, ringOfFire, rideTheBus };

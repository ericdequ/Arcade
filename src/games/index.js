// =============================================================================
// @ric/arcade/games — game descriptors only (no registry, no catalog)
// =============================================================================
// Import the whole set, or one game, without pulling the registry/catalog:
//
//   import { connectFour } from '@ric/arcade/games';            // all descriptors
//   import { connectFour } from '@ric/arcade/games/connect-four'; // just one
//
// Each game is a self-contained defineGame() descriptor — importing one only
// pulls the engine contract + the primitives it uses (cards/grid), nothing else.
// =============================================================================

export { higherLower } from './higher-lower.js';
export { rideTheBus } from './ride-the-bus.js';
export { ringOfFire } from './ring-of-fire.js';
export { connectFour } from './connect-four.js';

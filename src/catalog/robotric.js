// =============================================================================
// Arcade catalog — RobotRic games
// =============================================================================
// RobotRic's arcade as manifests. Playable ones are linked by `engineId` to the
// in-app engine games; Scratch projects are `iframe`; canvas/real-time games
// (Snake) and not-yet-built ones are `route` (an app page renders them).
// Unified from robotric's src/games/robotric.js (records) + the id aliasing it
// carried.
// =============================================================================

import { createCatalog } from '../catalog.js';

// Legacy RobotRic id → playable engine game id (where one exists).
const ENGINE = Object.freeze({
  RingOfFire: 'ring-of-fire',
  LLL: 'higher-lower', // "guess the card, higher/lower hints" → higher-lower engine
  CollapseFour: 'connect-four', // quantum dressing over connect-four
  RTB: 'ride-the-bus',
});

const ALIAS = Object.freeze({
  RingOfFire: 'ring-of-fire',
  CollapseFour: 'collapse-four',
  ScratchGames: 'scratch-games',
  CATPILR: 'catvolution',
  EEL: 'electric-eel',
  RTB: 'ride-da-bus',
  SS: 'shark-survival',
  WW: 'wavy-wake',
  MemeSus: 'meme-sus',
});

const SCRATCH = [
  { id: 'geos', title: 'Geometry Survival', iframe: 'https://scratch.mit.edu/projects/209256324/embed', instructions: 'Dodge falling triangles, grab power-ups, spacebar to shoot.' },
  { id: 'MemeSus', title: 'MemeSus', iframe: 'https://scratch.mit.edu/projects/215743508/embed', instructions: 'Scratch arcade chaos.' },
  { id: 'mewow', title: 'Me Wow', iframe: 'https://scratch.mit.edu/projects/222792883/embed', instructions: 'Scratch cat game.' },
  { id: 'pong', title: 'Pong', iframe: 'https://scratch.mit.edu/projects/202315549/embed', instructions: 'Classic Pong.' },
];

const ARCADE = [
  { id: 'RingOfFire', title: 'Ring of Fire', instructions: 'Kings Cup — draw, follow the card rule, keep going.' },
  { id: 'Snake', title: 'Snake', url: '/Arcade/Snake', instructions: 'Arrow keys to move, eat to grow, avoid walls + yourself.' },
  { id: 'LLL', title: 'LLL', instructions: 'Guess the card in three chances; higher/lower hints.' },
  { id: 'CollapseFour', title: 'CollapseFour', instructions: 'Connect four measured pieces — quantum connect four.' },
];

const DEV = [
  { id: 'CATPILR', title: 'Catvolution' },
  { id: 'EEL', title: 'Electric Eel' },
  { id: 'RTB', title: 'RideDaBus' },
  { id: 'SS', title: 'Shark Survival' },
  { id: 'WW', title: 'Wavy Wake' },
];

const tagsFor = (legacyId, collection) => {
  const h = `${legacyId}`.toLowerCase();
  const t = new Set([collection, 'robotric']);
  if (h.includes('ring') || h.includes('lll') || h.includes('rtb')) t.add('cards');
  if (h.includes('collapse')) t.add('quantum');
  if (h.includes('snake') || h.includes('cat')) t.add('grid');
  return [...t];
};

const toManifest = (game, { collection, status }) => {
  const legacyId = game.id;
  return {
    id: ALIAS[legacyId] || legacyId,
    title: game.title,
    url: game.url || (game.iframe ? `/Arcade/Scratch/${legacyId}` : `/Arcade/${ALIAS[legacyId] || legacyId}`),
    iframe: game.iframe || null,
    engineId: ENGINE[legacyId] || null,
    status,
    collection,
    source: 'robotric',
    instructions: game.instructions || '',
    tags: tagsFor(legacyId, collection),
    metadata: { legacyId },
  };
};

export const robotricGames = [
  ...SCRATCH.map((g) => toManifest(g, { collection: 'scratch', status: 'available' })),
  ...ARCADE.map((g) => toManifest(g, { collection: 'arcade', status: 'available' })),
  ...DEV.map((g) => toManifest(g, { collection: 'ourcade', status: 'development' })),
];

/** A catalog preloaded with RobotRic's games. */
export const robotricCatalog = () => createCatalog(robotricGames);

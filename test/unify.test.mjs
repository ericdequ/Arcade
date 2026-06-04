import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  standardDeck,
  createDeck,
  blackjackValue,
  compareRanks,
  createGrid,
  dropToken,
  hasConnection,
  isGridFull,
  normalizeGame,
  createCatalog,
  robotricGames,
  catalog,
  games,
  createMatch,
  connectFour,
} from '../src/index.js';

// --- cards (unified shape) -------------------------------------------------

test('cards: unified card carries both engine + robotric fields', () => {
  const deck = standardDeck();
  assert.equal(deck.length, 52);
  const ace = deck.find((c) => c.rank.id === 'ace');
  assert.equal(ace.rank.key, 'A'); // engine games key off this
  assert.equal(ace.value, 14); // engine high-card
  assert.equal(ace.numericValue, 11); // robotric blackjack
  assert.equal(typeof ace.isRed, 'boolean'); // engine
  assert.equal(typeof ace.suit.color, 'string'); // robotric
});

test('cards: multi-deck + blackjack + compareRanks', () => {
  assert.equal(createDeck({ decks: 2 }).length, 104);
  const ace = standardDeck().find((c) => c.rank.id === 'ace');
  const six = standardDeck().find((c) => c.rank.id === '6');
  assert.equal(blackjackValue([ace, six]), 17);
  assert.equal(blackjackValue([ace, six, six, six]), 19); // ace flexes 11→1
  assert.equal(compareRanks(ace, six), 1);
});

// --- grid ------------------------------------------------------------------

test('grid: drop is immutable + detects a connect-four', () => {
  let g = createGrid({ rows: 6, cols: 7 });
  const original = g;
  let last;
  for (let i = 0; i < 4; i++) {
    const r = dropToken(g, 0, 'X');
    g = r.grid;
    last = r;
  }
  assert.equal(original[5][0], null, 'original grid not mutated');
  assert.equal(hasConnection(g, last.row, last.col, 'X', 4), true);
});

test('grid: full column drop is a no-op; isGridFull works', () => {
  let g = createGrid({ rows: 1, cols: 1 });
  g = dropToken(g, 0, 'X').grid;
  assert.equal(isGridFull(g), true);
  assert.equal(dropToken(g, 0, 'O').row, -1);
});

// --- catalog ---------------------------------------------------------------

test('catalog: normalizeGame derives launch type', () => {
  assert.equal(normalizeGame({ id: 'a', title: 'A', engineId: 'x' }).launch, 'engine');
  assert.equal(normalizeGame({ id: 'b', title: 'B', iframe: 'http://x' }).launch, 'iframe');
  assert.equal(normalizeGame({ id: 'c', title: 'C' }).launch, 'route');
});

test('catalog: robotric games link to engine games where playable', () => {
  const cat = createCatalog(robotricGames);
  assert.equal(cat.get('ring-of-fire').engineId, 'ring-of-fire');
  assert.equal(cat.get('collapse-four').engineId, 'connect-four');
  assert.equal(cat.get('lll').engineId, 'higher-lower');
  assert.equal(cat.get('geos').launch, 'iframe');
  assert.equal(cat.get('snake').launch, 'route');
});

test('catalog: default catalog merges engine games + robotric, and every engineId resolves', () => {
  const playable = catalog.playable();
  assert.ok(playable.length >= 4);
  for (const m of playable) {
    assert.ok(games.has(m.engineId), `engineId ${m.engineId} (${m.id}) must resolve to a registered game`);
  }
});

// --- connect-four engine game ---------------------------------------------

test('connect-four: vertical four wins; turn + illegal moves enforced', () => {
  const m = createMatch({ game: connectFour, players: ['x', 'o'], seed: 0 });
  // x col0, o col1, x col0, o col1, x col0, o col1, x col0 → x wins vertically
  const order = [['x', 0], ['o', 1], ['x', 0], ['o', 1], ['x', 0], ['o', 1], ['x', 0]];
  for (const [p, col] of order) {
    if (m.isOver()) break;
    m.dispatch({ type: 'drop', payload: { col }, playerId: p });
  }
  assert.equal(m.result().winner, 'x');
  assert.equal(m.isOver(), true);
});

test('connect-four: a move out of turn is ignored', () => {
  const m = createMatch({ game: connectFour, players: ['x', 'o'], seed: 0 });
  const before = m.view().turnPlayer;
  m.dispatch({ type: 'drop', payload: { col: 0 }, playerId: 'o' }); // not o's turn
  assert.equal(m.view().turnPlayer, before, 'turn unchanged after illegal move');
});

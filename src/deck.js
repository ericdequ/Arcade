// =============================================================================
// Arcade — deck primitives (seedable)
// =============================================================================
// Generic card/deck helpers, taken from BEV's arcade and hardened to take an
// RNG so shuffles are deterministic across devices. One randomizer for every
// game keeps balancing and bug fixes in one place.
// =============================================================================

import { makeRng } from './rng.js';

const STANDARD_SUITS = Object.freeze([
  { key: 'spades', symbol: '♠', isRed: false, label: 'Spades' },
  { key: 'hearts', symbol: '♥', isRed: true, label: 'Hearts' },
  { key: 'diamonds', symbol: '♦', isRed: true, label: 'Diamonds' },
  { key: 'clubs', symbol: '♣', isRed: false, label: 'Clubs' },
]);

const STANDARD_RANKS = Object.freeze([
  { key: 'A', label: 'A', value: 14 },
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ key: String(n), label: String(n), value: n })),
  { key: 'J', label: 'J', value: 11 },
  { key: 'Q', label: 'Q', value: 12 },
  { key: 'K', label: 'K', value: 13 },
]);

/**
 * Build a deck from ranks × suits. `mapCard` shapes each card.
 * @param {{ranks?:Array, suits?:Array, mapCard?:Function}} [opts]
 */
export function buildDeck({ ranks = STANDARD_RANKS, suits = STANDARD_SUITS, mapCard = null } = {}) {
  const deck = [];
  ranks.forEach((rank, rankIndex) => {
    suits.forEach((suit, suitIndex) => {
      const base = { id: `${rank.key ?? rank}-${suit.key ?? suit}`, rank, suit };
      deck.push(typeof mapCard === 'function' ? mapCard(base, { rankIndex, suitIndex }) : base);
    });
  });
  return deck;
}

/** A standard 52-card deck (Ace high, value 14). */
export const standardDeck = (mapCard) => buildDeck({ mapCard });

/** Shuffle with an RNG (deterministic) — pass `makeRng(seed)` for reproducibility. */
export const shuffle = (items, rng = makeRng(0)) => rng.shuffle(items);

/** Draw the top card. Returns { card, deck } with a new array (pure). */
export function draw(deck) {
  if (!Array.isArray(deck) || deck.length === 0) return { card: null, deck: [] };
  const next = [...deck];
  const card = next.pop();
  return { card, deck: next };
}

/** Deal `count` cards each to `players`. Returns { hands, deck }. */
export function deal(deck, players, count) {
  const hands = {};
  let rest = [...deck];
  for (const p of players) hands[p] = [];
  for (let i = 0; i < count; i++) {
    for (const p of players) {
      const d = draw(rest);
      if (d.card) hands[p].push(d.card);
      rest = d.deck;
    }
  }
  return { hands, deck: rest };
}

export { STANDARD_RANKS, STANDARD_SUITS };

// =============================================================================
// Arcade — cards (unified deck primitives)
// =============================================================================
// One card shape serving both lineages: the @ric/arcade engine games (which key
// off `rank.value` / `suit.isRed` / `rank.key`) and RobotRic's card logic (which
// uses `rank.order` / `rank.numericValue` / `suit.color`). Every card carries
// all of them, so no game has to care which heritage it came from.
//
// Pair with the seeded rng (../rng.js) for deterministic, reproducible shuffles.
// =============================================================================

export const SUITS = Object.freeze([
  { id: 'spades', key: 'spades', label: 'Spades', symbol: '♠', color: 'black', isRed: false },
  { id: 'hearts', key: 'hearts', label: 'Hearts', symbol: '♥', color: 'red', isRed: true },
  { id: 'diamonds', key: 'diamonds', label: 'Diamonds', symbol: '♦', color: 'red', isRed: true },
  { id: 'clubs', key: 'clubs', label: 'Clubs', symbol: '♣', color: 'black', isRed: false },
]);

// order == value (Ace high); numericValue is the blackjack value.
const num = (id, order, numericValue = order) =>
  Object.freeze({ id: String(id), key: String(id), label: String(id), shortLabel: String(id), order, value: order, numericValue });
const face = (id, key, order) =>
  Object.freeze({ id, key, label: id[0].toUpperCase() + id.slice(1), shortLabel: key, order, value: order, numericValue: 10 });

export const RANKS = Object.freeze([
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => num(n, n)),
  face('jack', 'J', 11),
  face('queen', 'Q', 12),
  face('king', 'K', 13),
  Object.freeze({ id: 'ace', key: 'A', label: 'Ace', shortLabel: 'A', order: 14, value: 14, numericValue: 11 }),
]);

const slug = (...parts) =>
  parts.filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const normalizeSuit = (s) => (typeof s === 'string' ? { id: slug(s), key: slug(s), label: s, symbol: s, color: 'black', isRed: false } : s);
const normalizeRank = (r, i) => {
  if (typeof r === 'number') return { id: String(r), key: String(r), label: String(r), order: r, value: r, numericValue: r };
  if (typeof r === 'string') return { id: slug(r), key: r, label: r, order: i + 1, value: i + 1, numericValue: Number.parseInt(r, 10) || i + 1 };
  return r;
};

/**
 * Build a deck (ranks × suits × decks). Cards carry both `value`/`isRed`
 * (engine) and `order`/`numericValue`/`color` (RobotRic) fields.
 * @param {{suits?:Array, ranks?:Array, decks?:number, mapCard?:Function}} [opts]
 */
export function createDeck({ suits = SUITS, ranks = RANKS, decks = 1, mapCard = null } = {}) {
  if (!Number.isInteger(decks) || decks < 1) throw new TypeError('decks must be a positive integer');
  const ns = suits.map(normalizeSuit);
  const nr = ranks.map(normalizeRank);
  const cards = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of ns) {
      for (const rank of nr) {
        const base = slug(rank.id ?? rank.label, suit.id ?? suit.label);
        const card = {
          id: decks === 1 ? base : `${base}-${d + 1}`,
          deckIndex: d,
          suit,
          rank,
          label: `${rank.shortLabel || rank.label} ${suit.symbol || suit.label}`,
          value: rank.value ?? rank.order,
          order: rank.order,
          numericValue: rank.numericValue,
          isRed: suit.isRed ?? suit.color === 'red',
        };
        cards.push(mapCard ? mapCard(card, { deckIndex: d }) : card);
      }
    }
  }
  return cards;
}

/** A standard 52-card deck (Ace high). `mapCard` optionally reshapes. */
export const standardDeck = (mapCard) => createDeck({ mapCard });

/** Fisher–Yates shuffle with an injectable random fn (pass rng.next for determinism). */
export function shuffleDeck(deck, random = Math.random) {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Draw `count` from the top. Returns { drawn, remaining } (pure). */
export function drawCards(deck, count = 1) {
  if (!Number.isInteger(count) || count < 0) throw new TypeError('count must be a non-negative integer');
  return { drawn: deck.slice(0, count), remaining: deck.slice(count) };
}

/** Draw a single card. Returns { card, deck } (pure). */
export function draw(deck) {
  if (!Array.isArray(deck) || deck.length === 0) return { card: null, deck: [] };
  const next = [...deck];
  return { card: next.pop(), deck: next };
}

/** Deal `count` cards each to `players`. Returns { hands, deck }. */
export function deal(deck, players, count) {
  const hands = Object.fromEntries(players.map((p) => [p, []]));
  let rest = [...deck];
  for (let i = 0; i < count; i++) {
    for (const p of players) {
      const d = draw(rest);
      if (d.card) hands[p].push(d.card);
      rest = d.deck;
    }
  }
  return { hands, deck: rest };
}

/** -1 / 0 / 1 comparing two cards by rank order. */
export function compareRanks(a, b) {
  const ao = a?.rank?.order ?? a?.order ?? a?.value;
  const bo = b?.rank?.order ?? b?.order ?? b?.value;
  return ao === bo ? 0 : ao > bo ? 1 : -1;
}

/** Best blackjack total of a hand (aces flex 11→1). */
export function blackjackValue(cards) {
  let value = 0;
  let aces = 0;
  for (const c of cards) {
    value += c.numericValue ?? c.rank?.numericValue ?? 0;
    if (String(c.rank?.id ?? c.rank ?? '').toLowerCase() === 'ace') aces++;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

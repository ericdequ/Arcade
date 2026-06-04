// =============================================================================
// Arcade — card animation spec
// =============================================================================
// A shared, framework-agnostic vocabulary for card animations so every card
// game animates consistently ("best style"): deal, flip, slide, collect. It
// describes WHAT should animate (descriptors with timing/easing), not how to
// render it — feed the descriptors to CSS transitions, Web Animations, framer,
// or a canvas. Pairs with the seeded deck logic: the engine produces card
// moves; this turns them into smooth, staggered motion.
// =============================================================================

// Timing tokens (ms) + easings, tuned for a snappy-but-readable card feel.
export const CARD_MOTION = Object.freeze({
  duration: Object.freeze({ deal: 280, flip: 220, slide: 240, collect: 320 }),
  stagger: 70, // ms between consecutive cards in a deal
  ease: Object.freeze({
    deal: 'cubic-bezier(0.16, 1, 0.3, 1)', // expo-out settle
    flip: 'cubic-bezier(0.4, 0, 0.2, 1)',
    collect: 'cubic-bezier(0.55, 0, 0.45, 1)',
  }),
});

/** One animation descriptor: { type, cardId, durationMs, easing, delayMs, faceUp? }. */
const desc = (type, cardId, extra = {}) => ({
  type,
  cardId,
  durationMs: CARD_MOTION.duration[type] ?? 240,
  easing: CARD_MOTION.ease[type] ?? CARD_MOTION.ease.flip,
  delayMs: 0,
  ...extra,
});

/** Deal a card from the deck to a seat (optionally face-up). */
export const deal = (cardId, { to, faceUp = true, delayMs = 0 } = {}) => desc('deal', cardId, { to, faceUp, delayMs });
/** Flip a card over. */
export const flip = (cardId, { faceUp = true } = {}) => desc('flip', cardId, { faceUp });
/** Slide a card to a new position (e.g. discard pile). */
export const slide = (cardId, { to } = {}) => desc('slide', cardId, { to });
/** Sweep cards off the table at end of round. */
export const collect = (cardId, { to = 'discard' } = {}) => desc('collect', cardId, { to });

/**
 * Build a staggered deal sequence for a list of card ids — each card delayed
 * one stagger step after the previous, so a hand fans out smoothly.
 * @param {string[]} cardIds
 * @param {{to?:string, faceUp?:boolean, stagger?:number}} [opts]
 * @returns {Array<object>}
 */
export function dealSequence(cardIds, { to, faceUp = true, stagger = CARD_MOTION.stagger } = {}) {
  return cardIds.map((id, i) => deal(id, { to, faceUp, delayMs: i * stagger }));
}

/** Total wall-clock of a descriptor sequence (max delay + duration). */
export const sequenceDurationMs = (seq) => seq.reduce((m, d) => Math.max(m, d.delayMs + d.durationMs), 0);

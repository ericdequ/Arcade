// =============================================================================
// Arcade — seedable deterministic RNG
// =============================================================================
// The keystone of no-cloud multiplayer: a PRNG seeded from a shared value (a
// room code / pairing session) produces the SAME sequence on every device, so
// two phones shuffle the same deck without a server refereeing. Replacing each
// game's ad-hoc Math.random() with one seedable source also makes games
// reproducible — record the seed + actions and you can replay a match exactly.
//
// mulberry32: tiny, fast, good distribution for game use (not cryptographic).
// =============================================================================

/** FNV-1a hash of a string → uint32 seed. */
export function hashSeed(value) {
  let h = 2166136261 >>> 0;
  const s = String(value);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Create a deterministic RNG from a seed (string or uint32).
 * @param {string|number} seed
 */
export function makeRng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);

  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng = {
    /** float in [0, 1). */
    next,
    /** integer in [0, n). */
    int: (n) => Math.floor(next() * n),
    /** integer in [min, max] inclusive. */
    range: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** a random element (or null). */
    pick: (arr) => (arr.length ? arr[Math.floor(next() * arr.length)] : null),
    /** a new array, Fisher–Yates shuffled. Does not mutate the input. */
    shuffle: (arr) => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    /** fork a child RNG (independent stream) for sub-systems. */
    fork: (label) => makeRng((a ^ hashSeed(String(label))) >>> 0),
  };
  return rng;
}

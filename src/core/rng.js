/**
 * Seeded pseudo-random numbers. Daily puzzles are generated from a seed built
 * from the date, so the algorithm and the order of calls must stay stable —
 * changing either changes everyone's daily puzzles.
 */

/** FNV-1a 32-bit hash of a string. */
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @typedef {object} Rng
 * @property {() => number} next uniform float in [0, 1)
 * @property {(lo: number, hi: number) => number} int integer in [lo, hi], inclusive
 * @property {(p: number) => boolean} chance true with probability p
 * @property {<T>(arr: T[]) => T} pick a random element
 * @property {<T>(arr: T[]) => T[]} shuffle a shuffled copy (Fisher–Yates)
 */

/**
 * Mulberry32 generator.
 * @param {string | number} seed
 * @returns {Rng}
 */
export function makeRng(seed) {
  let a = typeof seed === 'string' ? hashStr(seed) : seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  return {
    next,
    int,
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

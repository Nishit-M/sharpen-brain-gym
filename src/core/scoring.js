/** Scoring and adaptive-difficulty rules shared by every game. */

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;
/** A score at or above this moves the game up a level. */
export const LEVEL_UP_AT = 80;
/** A score below this moves the game down a level. */
export const LEVEL_DOWN_BELOW = 50;

export const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** Normalise a raw game score to an integer 0–100. */
export const normaliseScore = (score) => clamp(Math.round(score));

/** The level to play next time, given this round's level and score. */
export function nextLevel(level, score) {
  if (score >= LEVEL_UP_AT) return Math.min(MAX_LEVEL, level + 1);
  if (score < LEVEL_DOWN_BELOW) return Math.max(MIN_LEVEL, level - 1);
  return level;
}

/** @returns {'good' | 'ok' | 'low'} colour band for a score */
export const band = (s) => (s >= 80 ? 'good' : s >= 50 ? 'ok' : 'low');

export const verdict = (s) =>
  s >= 95 ? 'Outstanding' : s >= 80 ? 'Great work' : s >= 60 ? 'Solid' : s >= 40 ? 'Keep at it' : 'Tough one';

export const average = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

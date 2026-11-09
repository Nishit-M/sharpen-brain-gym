import { SKILLS } from './skills.js';

/**
 * @typedef {object} GameResult
 * @property {number} score 0–100 (clamped and rounded when recorded)
 * @property {string} [summary] one-line result shown under the score
 * @property {Node} [details] optional extra content for the result screen
 */

/**
 * @typedef {object} GameContext
 * @property {number} level difficulty, 1–10
 * @property {boolean} daily whether this is the daily-workout round
 * @property {import('./rng.js').Rng} rng seeded RNG; use it for all randomness
 * @property {(result: GameResult) => void} finish call exactly once when the round ends
 */

/**
 * @typedef {object} Game
 * @property {string} id stable identifier; used in storage and URLs — never rename
 * @property {import('./skills.js').SkillId} skill
 * @property {string} name
 * @property {string} blurb
 * @property {string[]} howTo
 * @property {string} [tip]
 * @property {(level: number) => string} [levelInfo]
 * @property {(root: HTMLElement, ctx: GameContext) => (void | (() => void))} mount
 *   renders the game into root; may return a cleanup function (timers, key listeners)
 */

/**
 * Declares a game and validates its shape at load time.
 * @param {Game} game
 * @returns {Readonly<Game>}
 */
export function defineGame(game) {
  const problems = [];
  if (!game.id || !/^[a-z0-9]+$/.test(game.id)) problems.push('id must be lowercase letters/digits');
  if (!(game.skill in SKILLS)) problems.push(`unknown skill "${game.skill}"`);
  for (const k of ['name', 'blurb']) if (typeof game[k] !== 'string' || !game[k]) problems.push(`${k} is required`);
  if (!Array.isArray(game.howTo) || !game.howTo.length) problems.push('howTo must be a non-empty array');
  if (typeof game.mount !== 'function') problems.push('mount must be a function');
  if (problems.length) throw new Error(`Invalid game "${game.id}": ${problems.join('; ')}`);
  return Object.freeze(game);
}

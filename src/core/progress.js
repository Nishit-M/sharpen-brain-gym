import { addDays, today as systemToday } from './dates.js';
import { makeRng } from './rng.js';
import { MAX_LEVEL, MIN_LEVEL, nextLevel, normaliseScore } from './scoring.js';
import { SKILL_IDS } from './skills.js';
import { MAX_HISTORY, blankState, parseState } from './storage.js';

/**
 * The user's progress: levels, history, the daily workout and streaks.
 * @param {object} deps
 * @param {import('./registry.js').Registry} deps.registry
 * @param {import('./storage.js').StateStorage} deps.storage
 * @param {() => string} [deps.today] current local date (injectable for tests)
 * @param {() => number} [deps.now] current timestamp (injectable for tests)
 */
export function createProgress({ registry, storage, today = systemToday, now = Date.now }) {
  let state = storage.load();
  const persist = () => storage.save(state);

  /** @param {string} id */
  const getLevel = (id) => {
    const l = state.levels[id];
    return Number.isInteger(l) && l >= MIN_LEVEL && l <= MAX_LEVEL ? l : MIN_LEVEL;
  };

  /** One game per skill, chosen deterministically from the date. */
  function dailySet(date = today()) {
    const r = makeRng('daily|' + date);
    return SKILL_IDS.map((sk) => r.pick(registry.bySkill(sk)));
  }

  /** @returns {Record<string, number>} game id → score for that day's daily rounds */
  const dailyResults = (date = today()) => state.daily[date] || {};
  const isComplete = (d) => !!(state.daily[d] && state.daily[d]._c);
  const isInDailySet = (gameId, date = today()) => dailySet(date).some((g) => g.id === gameId);

  /** Consecutive completed days ending today (or yesterday, if today isn't done yet). */
  function streak() {
    let d = today();
    let n = 0;
    if (!isComplete(d)) d = addDays(d, -1);
    while (isComplete(d)) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }

  function bestStreak() {
    const days = Object.keys(state.daily).filter(isComplete).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const d of days) {
      run = prev && addDays(prev, 1) === d ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    return best;
  }

  /**
   * Records a finished round and adapts the game's level.
   * @param {import('./game.js').Game} game
   * @param {{ score: number }} result
   * @param {{ level: number, daily?: boolean, date?: string }} opts
   */
  function record(game, result, opts) {
    const score = normaliseScore(result.score);
    const lvl = opts.level;
    const d = opts.date || today();
    state.history.push({ d, g: game.id, s: game.skill, sc: score, l: lvl, t: now(), dy: !!opts.daily });
    if (state.history.length > MAX_HISTORY) state.history = state.history.slice(-MAX_HISTORY);
    const next = nextLevel(lvl, score);
    state.levels[game.id] = next;
    if (opts.daily) {
      const day = state.daily[d] || (state.daily[d] = {});
      day[game.id] = score;
      if (dailySet(d).every((g) => g.id in day)) day._c = 1;
    }
    persist();
    return { score, prev: lvl, next };
  }

  return {
    getLevel,
    dailySet,
    dailyResults,
    isInDailySet,
    streak,
    bestStreak,
    record,
    /** @returns {readonly import('./storage.js').HistoryEntry[]} */
    history: () => state.history,
    levels: () => state.levels,
    exportData: () => JSON.stringify(state, null, 1),
    /**
     * Replaces all progress with a backup.
     * @param {string} text
     * @throws {Error} on invalid input
     */
    importData(text) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('The file is not valid JSON');
      }
      state = parseState(parsed);
      persist();
    },
    reset() {
      state = blankState();
      persist();
    },
  };
}

/** @typedef {ReturnType<typeof createProgress>} Progress */

/** Pure aggregations over play history, used by the stats screen. */
import { addDays } from './dates.js';
import { average } from './scoring.js';

/** @typedef {import('./storage.js').HistoryEntry} HistoryEntry */

/**
 * Average of the last 10 scores and the trend against the 10 before.
 * @param {number[]} scores oldest first
 */
export function skillTrend(scores) {
  const recent = average(scores.slice(-10));
  const before = average(scores.slice(-20, -10));
  let trend = '';
  if (recent != null && before != null) {
    const delta = recent - before;
    trend = delta > 3 ? '▲ improving' : delta < -3 ? '▼ dipping' : '— steady';
  }
  return { recent, trend };
}

/** Heat level 0–4 for a number of games played in a day. */
export const heatLevel = (c) => (c === 0 ? 0 : c < 2 ? 1 : c < 4 ? 2 : c < 7 ? 3 : 4);

/**
 * Games played per day for the `days` days ending on `end`, oldest first.
 * @param {readonly HistoryEntry[]} history
 * @param {string} end YYYY-MM-DD
 * @param {number} days
 */
export function activity(history, end, days) {
  const counts = {};
  for (const h of history) counts[h.d] = (counts[h.d] || 0) + 1;
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(end, -i);
    const c = counts[d] || 0;
    out.push({ date: d, count: c, level: heatLevel(c) });
  }
  return out;
}

/**
 * @param {readonly HistoryEntry[]} history
 * @param {string} gameId
 */
export function gameSummary(history, gameId) {
  const sc = history.filter((h) => h.g === gameId).map((h) => h.sc);
  return {
    played: sc.length,
    best: sc.length ? Math.max(...sc) : null,
    recentAvg: sc.length ? Math.round(/** @type {number} */ (average(sc.slice(-5)))) : null,
  };
}

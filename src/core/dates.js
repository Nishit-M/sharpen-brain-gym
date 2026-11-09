/** Local-calendar dates as `YYYY-MM-DD` strings (the user's day, not UTC). */

const pad = (n) => String(n).padStart(2, '0');

/** @param {Date} [d] */
export const dateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => dateStr();

/**
 * @param {string} s a `YYYY-MM-DD` date
 * @param {number} n days to add (may be negative)
 */
export function addDays(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  return dateStr(new Date(y, m - 1, d + n));
}

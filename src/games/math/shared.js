/** Helpers shared by the math games. */
export const SYM = { '*': '×', '/': '÷', '-': '−', '+': '+' };
export const show = (s) => String(s).replace(/[*/+-]/g, (c) => SYM[c]);
/** Formats a result: integers as-is, otherwise 2 decimals. */
export const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

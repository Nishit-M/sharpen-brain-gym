/**
 * Persistence for the user's progress. Everything lives in one localStorage
 * key as JSON. The key and schema are a compatibility contract with existing
 * installs and backup files: bump SCHEMA_VERSION and add a migration rather
 * than changing the shape in place.
 */

export const STORAGE_KEY = 'sharpen.v1';
export const SCHEMA_VERSION = 1;
export const MAX_HISTORY = 5000;

/**
 * @typedef {object} HistoryEntry
 * @property {string} d date played (YYYY-MM-DD)
 * @property {string} g game id
 * @property {string} s skill id
 * @property {number} sc score 0–100
 * @property {number} l level played
 * @property {number} t timestamp (ms)
 * @property {boolean} dy daily round?
 */

/**
 * @typedef {object} State
 * @property {number} v schema version
 * @property {Record<string, number>} levels current level per game id
 * @property {HistoryEntry[]} history
 * @property {Record<string, Record<string, number>>} daily per date: game id → score, plus `_c: 1` once complete
 */

/** @returns {State} */
export const blankState = () => ({ v: SCHEMA_VERSION, levels: {}, history: [], daily: {} });

/**
 * Migrations keyed by the version they upgrade *from*, e.g.
 * `1: (s) => ({ ...s, v: 2, newField: [] })`.
 * @type {Record<number, (s: any) => any>}
 */
const MIGRATIONS = {};

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/**
 * Validates and upgrades parsed data to the current schema.
 * @param {unknown} data
 * @returns {State}
 * @throws {Error} when the data is not a recognisable Sharpen state
 */
export function parseState(data) {
  if (!isObject(data) || typeof data.v !== 'number') throw new Error('Not a Sharpen backup file');
  let s = /** @type {any} */ (data);
  while (s.v < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[s.v];
    if (!migrate) throw new Error(`No migration from schema v${s.v}`);
    s = migrate(s);
  }
  if (s.v !== SCHEMA_VERSION) throw new Error('This backup is from a newer version of Sharpen');
  if (!Array.isArray(s.history) || !isObject(s.levels) || !isObject(s.daily)) {
    throw new Error('Not a Sharpen backup file');
  }
  return { v: s.v, levels: s.levels, history: s.history, daily: s.daily };
}

/**
 * Wraps a Web Storage object. All access is guarded: private browsing modes
 * and full quotas must never crash the app; progress just isn't saved.
 * @param {Pick<Storage, 'getItem' | 'setItem'> | null | undefined} backend
 */
export function createStorage(backend) {
  return {
    /** @returns {State} */
    load() {
      try {
        const raw = backend?.getItem(STORAGE_KEY);
        if (raw) return parseState(JSON.parse(raw));
      } catch (err) {
        console.warn('[sharpen] could not load saved progress; starting fresh', err);
      }
      return blankState();
    },
    /** @param {State} state */
    save(state) {
      try {
        backend?.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch (err) {
        console.warn('[sharpen] could not save progress', err);
        return false;
      }
    },
  };
}

/** @typedef {ReturnType<typeof createStorage>} StateStorage */

/** localStorage, or null where it isn't accessible (e.g. blocked site data). */
export function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

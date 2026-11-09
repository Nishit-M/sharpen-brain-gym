import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProgress } from '../../src/core/progress.js';
import { createRegistry } from '../../src/core/registry.js';
import { MAX_HISTORY, STORAGE_KEY, createStorage, parseState } from '../../src/core/storage.js';
import { GAMES } from '../../src/games/index.js';

const registry = createRegistry(GAMES);

/** In-memory Web Storage stand-in. */
function memoryBackend(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = String(v)) };
}

function setup({ date = '2026-05-10', backend = memoryBackend() } = {}) {
  const clock = { date };
  const progress = createProgress({
    registry,
    storage: createStorage(backend),
    today: () => clock.date,
    now: () => 1000,
  });
  return { progress, backend, clock };
}

const finishDaily = (progress, date) => {
  for (const g of progress.dailySet(date)) progress.record(g, { score: 70 }, { level: 1, daily: true, date });
};

describe('progress', () => {
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));

  it('starts every game at level 1', () => {
    const { progress } = setup();
    expect(GAMES.every((g) => progress.getLevel(g.id) === 1)).toBe(true);
  });

  it('builds a daily set of one game per skill, stable per date', () => {
    const { progress } = setup();
    const set = progress.dailySet('2026-05-10');
    expect(set.map((g) => g.skill)).toEqual(['math', 'logic', 'memory', 'decision', 'spatial', 'critical']);
    expect(progress.dailySet('2026-05-10')).toEqual(set);
  });

  it('records a round, adapts level and persists', () => {
    const { progress, backend } = setup();
    const game = registry.byId('equation');
    const rec = progress.record(game, { score: 92.4 }, { level: 3 });
    expect(rec).toEqual({ score: 92, prev: 3, next: 4 });
    expect(progress.getLevel('equation')).toBe(4);
    const saved = JSON.parse(backend.data[STORAGE_KEY]);
    expect(saved.history[0]).toEqual({ d: '2026-05-10', g: 'equation', s: 'math', sc: 92, l: 3, t: 1000, dy: false });
  });

  it('marks the day complete only when the whole daily set is done', () => {
    const { progress } = setup();
    const [first, ...rest] = progress.dailySet();
    progress.record(first, { score: 60 }, { level: 1, daily: true });
    expect(progress.streak()).toBe(0);
    for (const g of rest) progress.record(g, { score: 60 }, { level: 1, daily: true });
    expect(progress.streak()).toBe(1);
    expect(progress.dailySet().every((g) => g.id in progress.dailyResults())).toBe(true);
  });

  it('counts streaks through yesterday and tracks the best run', () => {
    const { progress, clock } = setup();
    for (const d of ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-07', '2026-05-08']) finishDaily(progress, d);
    clock.date = '2026-05-09'; // today not done yet: streak still counts through yesterday
    expect(progress.streak()).toBe(2);
    clock.date = '2026-05-10'; // a missed day breaks it
    expect(progress.streak()).toBe(0);
    expect(progress.bestStreak()).toBe(3);
  });

  it('caps history length', () => {
    const full = Array.from({ length: MAX_HISTORY }, (_, i) => ({
      d: '2026-01-01',
      g: 'speed',
      s: 'math',
      sc: 50,
      l: 1,
      t: i,
      dy: false,
    }));
    const backend = memoryBackend({ [STORAGE_KEY]: JSON.stringify({ v: 1, levels: {}, history: full, daily: {} }) });
    const { progress } = setup({ backend });
    progress.record(registry.byId('speed'), { score: 60 }, { level: 1 });
    expect(progress.history()).toHaveLength(MAX_HISTORY);
    expect(progress.history()[0].t).toBe(1); // oldest entry dropped
    expect(progress.history().at(-1).t).toBe(1000);
  });

  it('ignores out-of-range stored levels', () => {
    const backend = memoryBackend({
      [STORAGE_KEY]: JSON.stringify({ v: 1, levels: { equation: 99, target: 4 }, history: [], daily: {} }),
    });
    const { progress } = setup({ backend });
    expect(progress.getLevel('equation')).toBe(1);
    expect(progress.getLevel('target')).toBe(4);
  });

  it('survives corrupt or unavailable storage', () => {
    const corrupt = setup({ backend: memoryBackend({ [STORAGE_KEY]: '{not json' }) });
    expect(corrupt.progress.history()).toEqual([]);

    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const { progress } = setup({ backend: throwing });
    expect(() => progress.record(registry.byId('bet'), { score: 90 }, { level: 1 })).not.toThrow();
  });

  it('round-trips export / import and rejects bad backups', () => {
    const a = setup();
    a.progress.record(registry.byId('pattern'), { score: 85 }, { level: 2 });
    const b = setup();
    b.progress.importData(a.progress.exportData());
    expect(b.progress.getLevel('pattern')).toBe(3);
    expect(b.progress.history()).toHaveLength(1);

    expect(() => b.progress.importData('nope')).toThrow(/JSON/);
    expect(() => b.progress.importData('{"v":1}')).toThrow(/Not a Sharpen/);
    expect(() => b.progress.importData('{"v":9,"levels":{},"history":[],"daily":{}}')).toThrow(/newer/);
    expect(b.progress.history()).toHaveLength(1); // failed import leaves data untouched
  });

  it('resets everything', () => {
    const { progress } = setup();
    progress.record(registry.byId('bag'), { score: 90 }, { level: 1 });
    progress.reset();
    expect(progress.history()).toEqual([]);
    expect(progress.getLevel('bag')).toBe(1);
  });
});

describe('parseState', () => {
  it('drops unknown top-level fields', () => {
    expect(parseState({ v: 1, levels: {}, history: [], daily: {}, extra: 1 })).toEqual({
      v: 1,
      levels: {},
      history: [],
      daily: {},
    });
  });
});

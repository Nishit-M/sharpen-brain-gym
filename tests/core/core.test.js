import { describe, expect, it } from 'vitest';
import { addDays, dateStr } from '../../src/core/dates.js';
import { defineGame } from '../../src/core/game.js';
import { createRegistry } from '../../src/core/registry.js';
import { hashStr, makeRng } from '../../src/core/rng.js';
import { band, clamp, nextLevel, normaliseScore, verdict } from '../../src/core/scoring.js';
import { activity, gameSummary, heatLevel, skillTrend } from '../../src/core/stats.js';
import { parseHash } from '../../src/app/router.js';
import { GAMES } from '../../src/games/index.js';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = makeRng('seed');
    const b = makeRng('seed');
    expect(Array.from({ length: 5 }, a.next)).toEqual(Array.from({ length: 5 }, b.next));
  });

  it('hashes strings with FNV-1a', () => {
    expect(hashStr('')).toBe(2166136261);
    expect(hashStr('a')).toBe(0xe40c292c);
  });

  it('keeps int() within bounds and covers them', () => {
    const r = makeRng(42);
    const seen = new Set();
    for (let i = 0; i < 2000; i++) {
      const v = r.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it('shuffles a copy without losing elements', () => {
    const src = [1, 2, 3, 4, 5, 6];
    const out = makeRng(1).shuffle(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(src);
  });
});

describe('dates', () => {
  it('formats local dates', () => {
    expect(dateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(addDays('2026-03-10', -10)).toBe('2026-02-28');
  });
});

describe('scoring', () => {
  it('adapts levels at the 80 / 50 thresholds and stays within 1–10', () => {
    expect(nextLevel(5, 80)).toBe(6);
    expect(nextLevel(5, 79)).toBe(5);
    expect(nextLevel(5, 50)).toBe(5);
    expect(nextLevel(5, 49)).toBe(4);
    expect(nextLevel(10, 100)).toBe(10);
    expect(nextLevel(1, 0)).toBe(1);
  });

  it('normalises scores', () => {
    expect(normaliseScore(-5)).toBe(0);
    expect(normaliseScore(140)).toBe(100);
    expect(normaliseScore(79.5)).toBe(80);
    expect(clamp(5, 0, 3)).toBe(3);
  });

  it('bands and verdicts', () => {
    expect([band(80), band(50), band(49)]).toEqual(['good', 'ok', 'low']);
    expect(verdict(95)).toBe('Outstanding');
    expect(verdict(10)).toBe('Tough one');
  });
});

describe('stats', () => {
  it('reports trend only with enough history', () => {
    expect(skillTrend([]).recent).toBeNull();
    expect(skillTrend([50, 60]).trend).toBe('');
    const rising = [...Array(10).fill(40), ...Array(10).fill(80)];
    expect(skillTrend(rising)).toEqual({ recent: 80, trend: '▲ improving' });
  });

  it('maps play counts to heat levels', () => {
    expect([0, 1, 2, 4, 7].map(heatLevel)).toEqual([0, 1, 2, 3, 4]);
  });

  it('counts activity per day, oldest first', () => {
    const h = [{ d: '2026-01-02' }, { d: '2026-01-02' }, { d: '2026-01-03' }];
    expect(activity(/** @type {any} */ (h), '2026-01-03', 3).map((x) => x.count)).toEqual([0, 2, 1]);
  });

  it('summarises a game', () => {
    const h = [10, 90, 50].map((sc) => ({ g: 'x', sc }));
    expect(gameSummary(/** @type {any} */ (h), 'x')).toEqual({ played: 3, best: 90, recentAvg: 50 });
    expect(gameSummary([], 'x')).toEqual({ played: 0, best: null, recentAvg: null });
  });
});

describe('defineGame / registry', () => {
  const valid = { id: 'demo', skill: 'math', name: 'Demo', blurb: 'b', howTo: ['x'], mount() {} };

  it('rejects malformed games', () => {
    expect(() => defineGame({ ...valid, id: 'Bad Id' })).toThrow(/id/);
    expect(() => defineGame({ ...valid, skill: 'cooking' })).toThrow(/skill/);
    expect(() => defineGame({ ...valid, howTo: [] })).toThrow(/howTo/);
  });

  it('rejects duplicate ids and empty skills', () => {
    expect(() => createRegistry([...GAMES, GAMES[0]])).toThrow(/Duplicate/);
    expect(() => createRegistry(GAMES.filter((g) => g.skill !== 'logic'))).toThrow(/logic/);
  });

  it('indexes the real catalogue: 18 games, 3 per skill', () => {
    const r = createRegistry(GAMES);
    expect(r.all).toHaveLength(18);
    for (const sk of ['math', 'logic', 'memory', 'decision', 'spatial', 'critical'])
      expect(r.bySkill(sk)).toHaveLength(3);
    expect(r.byId('equation')?.name).toBe('Equation Hunt');
    expect(r.byId('nope')).toBeUndefined();
  });
});

describe('router', () => {
  it('parses hash paths and queries', () => {
    expect(parseHash('').parts).toEqual([]);
    const m = parseHash('#/play/equation?daily=1');
    expect(m.parts).toEqual(['play', 'equation']);
    expect(m.query.get('daily')).toBe('1');
  });
});

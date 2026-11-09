/**
 * Regression guard for deterministic content. `fixtures/golden.json` was
 * recorded from the pre-refactor app. Daily puzzles are generated from seeds,
 * so any change to a generator, the RNG, or the order of RNG calls shows up
 * here as a diff — and would silently change everyone's daily puzzles.
 *
 * If a change is intentional, regenerate the fixture with
 *   UPDATE_GOLDEN=1 npx vitest run tests/games/golden.test.js
 * review the fixture diff, and say so in the commit.
 *
 * Intentional changes since the pre-refactor recording:
 * - paperfold@7–10: distractors with off-sheet holes are no longer offered
 *   (they rendered identical to other options).
 * - mentalmap@3/5/7/9: recorded with the "never end on a turn" fix; these
 *   levels hung forever before it.
 * - 2026-11-09: "Same or Mirror" (rotate) removed and Cube Fold added at the
 *   end of the spatial group, which reshuffles the daily set; deeper content
 *   in target, speed, pattern, validity, fallacy and baserate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { addDays } from '../../src/core/dates.js';
import { createProgress } from '../../src/core/progress.js';
import { createRegistry } from '../../src/core/registry.js';
import { makeRng } from '../../src/core/rng.js';
import { createStorage } from '../../src/core/storage.js';
import { GAMES } from '../../src/games/index.js';
import golden from '../fixtures/golden.json';

const registry = createRegistry(GAMES);
const UPDATE = !!process.env.UPDATE_GOLDEN;

/** The timer bar's width depends on wall-clock time, so it is not compared. */
const stable = (html) => html.replace(/(class="tb-fill" style="width: )[\d.]+%/g, '$1*%');

describe('golden output', () => {
  it('keeps the game catalogue order', () => {
    expect(GAMES.map((g) => g.id)).toEqual(golden.order);
  });

  it('picks the same daily set for 60 consecutive days', () => {
    const progress = createProgress({ registry, storage: createStorage(null) });
    let d = '2026-01-01';
    for (let i = 0; i < 60; i++) {
      expect(
        progress.dailySet(d).map((g) => g.id),
        d,
      ).toEqual(golden.daily[d]);
      d = addDays(d, 1);
    }
  });

  for (const game of GAMES) {
    it(`renders ${game.id} identically at every level`, () => {
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      for (let level = 1; level <= 10; level++) {
        const root = document.createElement('div');
        const ctx = { level, daily: true, rng: makeRng(`2026-03-14|${game.id}|${level}`), finish() {} };
        const cleanup = game.mount(root, ctx);
        const id = `${game.id}@${level}`;
        if (UPDATE) golden.mounts[id] = root.innerHTML;
        expect(stable(root.innerHTML), id).toBe(stable(golden.mounts[id]));
        if (cleanup) cleanup();
      }
    });
  }

  if (UPDATE) {
    it('writes the updated fixture', () => {
      fs.writeFileSync(path.resolve('tests/fixtures/golden.json'), JSON.stringify(golden, null, 1));
    });
  }
});

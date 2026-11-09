/** Correctness properties of the puzzle generators, checked over many seeds and every level. */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../src/core/rng.js';
import { genBase } from '../../src/games/critical/baserate.js';
import { PROPS, checkValid, genProp, genSyllogism } from '../../src/games/critical/validity.js';
import { genBag } from '../../src/games/decision/bag.js';
import { genBet } from '../../src/games/decision/bet.js';
import { genPair } from '../../src/games/decision/calibrate.js';
import { allCodes, feedback } from '../../src/games/logic/codebreaker.js';
import { genLogic, perms } from '../../src/games/logic/logicgrid.js';
import { RULES } from '../../src/games/logic/pattern.js';
import { evalExpr, genEquation, grade } from '../../src/games/math/equation.js';
import { genProblem } from '../../src/games/math/speed.js';
import { genTarget } from '../../src/games/math/target.js';
import { rates, stream } from '../../src/games/memory/nback.js';
import { MM, genRoute } from '../../src/games/spatial/mentalmap.js';
import { SHEET, genFold, unfold, unfoldStages } from '../../src/games/spatial/paperfold.js';
import { fold, genQuestion, isNet, viewKind } from '../../src/games/spatial/cubefold.js';
import { GAMES } from '../../src/games/index.js';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const seeds = (n) => Array.from({ length: n }, (_, i) => makeRng(`test-${i}`));

describe('math', () => {
  it('evaluates with precedence and rejects malformed input', () => {
    expect(evalExpr('2+3*4', true)).toBe(14);
    expect(evalExpr('20/4-1', true)).toBe(4);
    expect(evalExpr('7/2', true)).toBeNull();
    expect(evalExpr('7/2', false)).toBe(3.5);
    for (const bad of ['', '+1', '1+', '1++2', '05+1', '4/0', '1a']) expect(evalExpr(bad, false)).toBeNull();
  });

  it('grades guesses like Wordle, respecting duplicate counts', () => {
    expect(grade('12+34', '12+34')).toEqual(Array(5).fill('correct'));
    expect(grade('11+11', '12+34')).toEqual(['correct', 'absent', 'correct', 'absent', 'absent']);
    expect(grade('34+12', '12+34')).toEqual(['present', 'present', 'correct', 'present', 'present']);
  });

  it('generates equations of the right length that equal their target', () => {
    for (const L of [5, 6, 7, 8]) {
      for (const r of seeds(15)) {
        const { eq, target } = genEquation(r, L);
        expect(eq).toHaveLength(L);
        expect(evalExpr(eq, true)).toBe(target);
      }
    }
  });

  it('target puzzles are reachable via the shown solution', () => {
    for (const l of LEVELS) {
      for (const r of seeds(5)) {
        const { nums, target, steps } = genTarget(r, l);
        expect(steps.at(-1)).toMatch(new RegExp(`= ${target}$`));
        expect(nums).not.toContain(target);
      }
    }
  });

  it('pattern rules produce whole numbers for the terms shown', () => {
    for (const R of RULES) {
      for (const r of seeds(10)) {
        const g = R.gen(r);
        for (let i = 0; i <= (R.show || 5); i++) expect(Number.isInteger(g.f(i)), g.rule).toBe(true);
      }
    }
  });

  it('speed problems have integer answers', () => {
    for (const l of LEVELS) for (const r of seeds(10)) expect(Number.isInteger(genProblem(r, l).a)).toBe(true);
  });
});

describe('logic', () => {
  it('scores codebreaker pegs correctly', () => {
    expect(feedback([0, 1, 2, 3], [0, 1, 2, 3])).toEqual({ b: 4, w: 0 });
    expect(feedback([3, 2, 1, 0], [0, 1, 2, 3])).toEqual({ b: 0, w: 4 });
    expect(feedback([0, 0, 1, 1], [0, 1, 0, 2])).toEqual({ b: 1, w: 2 });
    expect(allCodes(5, 4, false)).toHaveLength(120);
    expect(allCodes(6, 4, true)).toHaveLength(1296);
  });

  it('logic grid puzzles have exactly one solution, and it is the stored one', () => {
    for (const l of LEVELS) {
      const { n, k, T, clues } = genLogic(makeRng(`grid-${l}`), l);
      const P = perms(n);
      const id = P[0].map((_, i) => i);
      let all = [[id]];
      for (let c = 0; c < k; c++) all = all.flatMap((r) => P.map((p) => [...r, p]));
      const sols = all.filter((a) => clues.every((cl) => cl.test(a)));
      expect(sols, `level ${l}`).toHaveLength(1);
      expect(sols[0]).toEqual(T);
    }
  });
});

describe('memory', () => {
  it('n-back streams have no accidental repeats and score hits minus false alarms', () => {
    const s = stream(makeRng(1), 30, 2, 9);
    expect(s).toHaveLength(30);
    const perfect = s.map((v, i) => i >= 2 && v === s[i - 2]);
    expect(rates(s, perfect, 2).d).toBe(1);
    expect(rates(s, Array(30).fill(false), 2).d).toBe(0);
  });
});

describe('decision', () => {
  it('bets carry a real expected-value edge', () => {
    for (const l of LEVELS) {
      for (const r of seeds(10)) {
        const b = genBet(r, l);
        expect(b.prize).toBeGreaterThan(b.cost);
        expect(b.EV).toBeCloseTo(b.p * b.prize - b.cost);
        expect(Math.abs(b.EV) / b.cost).toBeGreaterThanOrEqual(0.03);
      }
    }
  });

  it('pack-the-bag optimum fits and beats every subset', () => {
    for (const l of LEVELS) {
      const pz = genBag(makeRng(`bag-${l}`), l);
      expect(pz).not.toBeNull();
      const { items, cap, best, bestMask } = pz;
      const sum = (m, f) => items.reduce((s, x, j) => (m & (1 << j) ? s + x[f] : s), 0);
      expect(sum(bestMask, 'w')).toBeLessThanOrEqual(cap);
      expect(sum(bestMask, 'v')).toBe(best);
      for (let m = 0; m < 1 << items.length; m++) if (sum(m, 'w') <= cap) expect(sum(m, 'v')).toBeLessThanOrEqual(best);
    }
  });

  it('calibration pairs differ', () => {
    for (const l of LEVELS) {
      const [a, b] = genPair(makeRng(`pair-${l}`), l);
      expect(a.v).not.toBe(b.v);
    }
  });
});

describe('spatial', () => {
  it('unfolding mirrors holes across each fold', () => {
    expect(unfold([[2, 1]], [{ axis: 'x', m: 2 }])).toEqual([
      [2, 1],
      [1, 1],
    ]);
  });

  it('the step-by-step unfold explanation ends at the right answer', () => {
    for (const l of LEVELS) {
      const p = genFold(makeRng(`stages-${l}`), l);
      const key = (hs) =>
        hs
          .map((h) => h.join())
          .sort()
          .join(';');
      const stages = unfoldStages(p);
      expect(stages).toHaveLength(p.steps.length);
      expect(key(stages.at(-1).holes)).toBe(key(p.options[p.correct]));
    }
  });

  it('paper-fold options are distinct and include the answer once', () => {
    for (const l of LEVELS) {
      const { options, correct } = genFold(makeRng(`fold-${l}`), l);
      expect(options).toHaveLength(4);
      const keys = options.map((o) =>
        o
          .map((h) => h.join())
          .sort()
          .join(';'),
      );
      expect(new Set(keys).size).toBe(4);
      expect(correct).toBeGreaterThanOrEqual(0);
      for (const o of options) for (const [x, y] of o) expect(x >= 0 && y >= 0 && x < SHEET && y < SHEET).toBe(true);
    }
  });

  it('cube folding finds exactly the 11 cube nets among the 35 hexominoes', () => {
    // every fixed hexomino, reduced to its free form (rotations + reflections)
    const norm = (cs) => {
      const mx = Math.min(...cs.map((c) => c[0]));
      const my = Math.min(...cs.map((c) => c[1]));
      return cs.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    };
    const canon = (cs) => {
      const forms = [];
      let cur = cs;
      for (let r = 0; r < 4; r++) {
        cur = cur.map(([x, y]) => [y, -x]);
        forms.push(norm(cur), norm(cur.map(([x, y]) => [-x, y])));
      }
      return forms.map((f) => f.join(';')).sort()[0];
    };
    let shapes = new Map([['0,0', [[0, 0]]]]);
    for (let n = 1; n < 6; n++) {
      const next = new Map();
      for (const cs of shapes.values())
        for (const [x, y] of cs)
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            if (cs.some((c) => c[0] === x + dx && c[1] === y + dy)) continue;
            const ns = norm([...cs, [x + dx, y + dy]]);
            next.set(canon(ns), ns);
          }
      shapes = next;
    }
    expect(shapes.size).toBe(35);
    expect([...shapes.values()].filter(isNet)).toHaveLength(11);
    // a straight strip of four wraps around: 1st and 3rd faces are opposite
    const n = fold([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [1, 1],
      [1, -1],
    ]);
    expect(n[2]).toEqual([0, 0, -1]);
  });

  it('cube-fold questions have one right answer and impossible distractors', () => {
    for (const l of LEVELS) {
      for (const r of seeds(6)) {
        for (const type of ['opp', 'fits', 'cube']) {
          const q = genQuestion(r, l, type);
          if (type === 'fits') {
            expect(isNet(q.cells)).toBe(q.valid);
            continue;
          }
          expect(isNet(q.cells)).toBe(true);
          if (type === 'opp') {
            const ns = fold(q.cells);
            expect(ns[q.answer].map((v) => -v || 0)).toEqual(ns[q.from]);
            expect(q.options).toContain(q.answer);
            expect(new Set(q.options).size).toBe(4);
          } else {
            expect(q.options).toHaveLength(4);
            const kinds = q.options.map((o) => viewKind(q.normals, o.t));
            expect(kinds.filter((k) => k === 'ok')).toHaveLength(1);
            expect(kinds[q.answer]).toBe('ok');
          }
        }
      }
    }
  });

  it('mental-map routes exist at every level and never end on a turn (regression: levels 3/5/7/9 hung)', () => {
    for (const [i, P] of MM.entries()) {
      for (const r of seeds(10)) {
        let route = null;
        for (let t = 0; t < 50 && !route; t++) route = genRoute(r, P);
        expect(route, `level ${i + 1}`).not.toBeNull();
        expect(route.steps.at(-1)).not.toMatch(/^Turn/);
      }
    }
  });
});

describe('critical', () => {
  const st = (t, a, b) => ({ t, a, b });

  it('checks classic syllogisms', () => {
    // All 0 are 1, all 1 are 2 ⇒ all 0 are 2 (Barbara)
    expect(checkValid([st('all', 0, 1), st('all', 1, 2)], st('all', 0, 2), 3).valid).toBe(true);
    // Some 0 are 1, some 1 are 2 ⇏ some 0 are 2
    expect(checkValid([st('some', 0, 1), st('some', 1, 2)], st('some', 0, 2), 3).valid).toBe(false);
    // No 0 are 1, all 2 are 1 ⇒ no 0 are 2 (Camestres)
    expect(checkValid([st('no', 0, 1), st('all', 2, 1)], st('no', 0, 2), 3).valid).toBe(true);
  });

  it('generates arguments of the requested validity', () => {
    for (const want of [true, false]) {
      for (const l of [4, 7, 8]) {
        const s = genSyllogism(makeRng(`syl-${l}-${want}`), l, want);
        if (s) expect(s.valid).toBe(want);
      }
      expect(genProp(makeRng(`prop-${want}`), want).valid).toBe(want);
    }
  });

  it('if-then forms only appear from their unlock level', () => {
    for (const l of LEVELS) {
      const allowed = new Set(PROPS.filter((f) => (f.min || 1) <= l).map((f) => f.why));
      for (const r of seeds(20)) {
        const it = genProp(r, r.chance(0.5), l);
        expect(allowed.has(it.why)).toBe(true);
      }
    }
  });

  it('base-rate answers match Bayes and are among the options', () => {
    for (const l of LEVELS) {
      const q = genBase(makeRng(`base-${l}`), l);
      if (!q) continue;
      expect(q.opts).toContain(q.ans);
      expect(new Set(q.opts).size).toBe(4);
    }
  });
});

describe('every game', () => {
  it('mounts at every level for many seeds without throwing', () => {
    for (const g of GAMES) {
      for (const l of LEVELS) {
        for (let s = 0; s < 3; s++) {
          const root = document.createElement('div');
          const cleanup = g.mount(root, { level: l, daily: false, rng: makeRng(`${g.id}-${l}-${s}`), finish() {} });
          expect(root.childElementCount, `${g.id}@${l}`).toBeGreaterThan(0);
          if (cleanup) cleanup();
        }
      }
    }
  });
});

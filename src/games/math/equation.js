import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';
import { onKeys } from '../../ui/keys.js';
import { fmt, show } from './shared.js';

/** Evaluate a flat expression of digits and + - * / with normal precedence.
 *  Returns null if invalid. strict = every division must be exact. */
export function evalExpr(s, strict) {
  if (!/^[0-9+\-*/]+$/.test(s)) return null;
  const t = s.match(/\d+|[+\-*/]/g);
  if (!t || t.length % 2 === 0) return null;
  for (let i = 0; i < t.length; i++) {
    const isNum = /^\d+$/.test(t[i]);
    if ((i % 2 === 0) !== isNum) return null;
    if (isNum && t[i].length > 1 && t[i][0] === '0') return null;
  }
  const terms = [+t[0]],
    ops = [];
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i],
      n = +t[i + 1];
    if (op === '*') terms[terms.length - 1] *= n;
    else if (op === '/') {
      if (n === 0) return null;
      const q = terms[terms.length - 1] / n;
      if (strict && !Number.isInteger(q)) return null;
      terms[terms.length - 1] = q;
    } else {
      ops.push(op);
      terms.push(n);
    }
  }
  let v = terms[0];
  ops.forEach((op, i) => {
    v = op === '+' ? v + terms[i + 1] : v - terms[i + 1];
  });
  return v;
}

export function genEquation(rng, L) {
  const pool = ['+', '-', '*', '/', '+', '-', '*'];
  for (let tries = 0; tries < 20000; tries++) {
    const maxOps = Math.min(Math.floor((L - 1) / 2), L >= 7 ? 3 : 2);
    const nOps = rng.int(1, maxOps);
    const parts = Array(nOps + 1).fill(1);
    let rem = L - nOps - (nOps + 1),
      guard = 0;
    while (rem > 0 && guard++ < 60) {
      const i = rng.int(0, nOps);
      if (parts[i] < 3) {
        parts[i]++;
        rem--;
      }
    }
    if (rem > 0) continue;
    let s = '';
    parts.forEach((len, i) => {
      s += len === 1 ? rng.int(1, 9) : rng.int(10 ** (len - 1), 10 ** len - 1);
      if (i < nOps) s += rng.pick(pool);
    });
    if (s.length !== L) continue;
    if (/[*/]1(?!\d)/.test(s) || /(^|\D)1\*/.test(s)) continue; // avoid trivial ×1, ÷1
    const v = evalExpr(s, true);
    if (v === null || !Number.isInteger(v) || v < 1 || v > 999) continue;
    return { eq: s, target: v };
  }
  return { eq: '12+34', target: 46 };
}

export function grade(guess, ans) {
  const res = Array(ans.length).fill('absent'),
    left = {};
  for (let i = 0; i < ans.length; i++) {
    if (guess[i] === ans[i]) res[i] = 'correct';
    else left[ans[i]] = (left[ans[i]] || 0) + 1;
  }
  for (let i = 0; i < ans.length; i++) {
    if (res[i] !== 'correct' && left[guess[i]] > 0) {
      res[i] = 'present';
      left[guess[i]]--;
    }
  }
  return res;
}

const eqLen = (lvl) => (lvl <= 2 ? 5 : lvl <= 5 ? 6 : lvl <= 8 ? 7 : 8);

export default defineGame({
  id: 'equation',
  skill: 'math',
  name: 'Equation Hunt',
  blurb: 'Deduce the hidden equation that equals today’s target.',
  howTo: [
    'Every guess must be a valid equation that equals the target (normal order of operations: × and ÷ before + and −).',
    'Green = right character, right place. Gold = in the equation, wrong place. Grey = not in it.',
    'You have 6 guesses. Fewer guesses = higher score.',
    'Keyboard works too: digits, + − * /, Backspace, Enter.',
  ],
  levelInfo: (l) => `${eqLen(l)}-character equations`,
  tip: 'Use your first guess to cover many different digits and operators — information beats luck. Then reason about which operator could produce the target before trying digits.',
  mount(root, ctx) {
    const L = eqLen(ctx.level),
      MAX = 6;
    const { eq, target } = genEquation(ctx.rng, L);
    const rank = { absent: 1, present: 2, correct: 3 };
    let row = 0,
      cur = '',
      over = false;
    const rows = [],
      rowEls = [],
      keys = {},
      keyState = {};

    const msg = el('div', { class: 'msg' });
    const board = el('div', { class: 'eq-board' });
    for (let r = 0; r < MAX; r++) {
      const cells = Array.from({ length: L }, () => el('div', { class: 'tile' }));
      const rowEl = el('div', { class: 'eq-row', style: { '--cols': L } }, cells);
      rows.push(cells);
      rowEls.push(rowEl);
      board.append(rowEl);
    }
    const mk = (k, label, cls = '') =>
      (keys[k] = el('button', { class: 'key ' + cls, onclick: () => press(k) }, label));
    const pad = el(
      'div',
      { class: 'keypad' },
      el(
        'div',
        { class: 'krow' },
        '1234567890'.split('').map((d) => mk(d, d)),
      ),
      el(
        'div',
        { class: 'krow' },
        mk('+', '+'),
        mk('-', '−'),
        mk('*', '×'),
        mk('/', '÷'),
        mk('Backspace', '⌫', 'wide'),
        mk('Enter', 'Enter', 'wide primary'),
      ),
    );
    root.append(el('div', { class: 'target' }, 'Find the equation that equals', el('b', {}, target)), board, msg, pad);

    const say = (t) => {
      msg.textContent = t;
      rowEls[row].classList.remove('shake');
      void rowEls[row].offsetWidth;
      rowEls[row].classList.add('shake');
    };
    function paint() {
      rows[row].forEach((c, i) => {
        c.textContent = cur[i] ? show(cur[i]) : '';
        c.classList.toggle('filled', !!cur[i]);
      });
    }
    function press(k) {
      if (over) return;
      msg.textContent = '';
      if (k === 'Backspace') cur = cur.slice(0, -1);
      else if (k === 'Enter') return submit();
      else if (cur.length < L) cur += k;
      paint();
    }
    function submit() {
      if (cur.length < L) return say(`Use all ${L} characters`);
      const v = evalExpr(cur, false);
      if (v === null) return say('That isn’t a valid equation');
      if (Math.abs(v - target) > 1e-9) return say(`That equals ${fmt(v)}, not ${target}`);
      const res = grade(cur, eq),
        g = cur,
        r = row;
      res.forEach((st, i) => {
        setTimeout(() => rows[r][i].classList.add(st), i * 90);
        if (!keyState[g[i]] || rank[st] > rank[keyState[g[i]]]) {
          if (keyState[g[i]]) keys[g[i]].classList.remove(keyState[g[i]]);
          keyState[g[i]] = st;
          keys[g[i]].classList.add(st);
        }
      });
      const won = g === eq;
      row++;
      cur = '';
      if (won || row >= MAX) {
        over = true;
        const used = row;
        setTimeout(
          () =>
            ctx.finish({
              score: won ? [100, 100, 90, 80, 70, 60][used - 1] : 10,
              summary: won ? `Solved in ${used} of ${MAX} guesses.` : `Not this time. It was ${show(eq)} = ${target}.`,
            }),
          L * 90 + 700,
        );
      }
    }
    return onKeys((e) => {
      let k = e.key;
      if (k === 'x' || k === 'X') k = '*';
      if (/^[0-9+\-*/]$/.test(k) || k === 'Backspace' || k === 'Enter') {
        e.preventDefault();
        press(k);
      }
    });
  },
});

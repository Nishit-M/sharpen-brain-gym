import { defineGame } from '../../core/game.js';
import { clamp } from '../../core/scoring.js';
import { el } from '../../ui/dom.js';
import { onKeys } from '../../ui/keys.js';
import { timer } from '../../ui/timer.js';

export function genProblem(rng, lvl) {
  const r = (a, b) => rng.int(a, b);
  const add = (m) => {
    const a = r(1, m),
      b = r(1, m);
    return { q: `${a} + ${b}`, a: a + b };
  };
  const sub = (m) => {
    const a = r(3, m),
      b = r(1, a - 1);
    return { q: `${a} − ${b}`, a: a - b };
  };
  const mul = (m1, m2) => {
    const a = r(2, m1),
      b = r(2, m2);
    return { q: `${a} × ${b}`, a: a * b };
  };
  const div = (m1, m2) => {
    const b = r(2, m1),
      q = r(2, m2);
    return { q: `${b * q} ÷ ${b}`, a: q };
  };
  const pct = () => {
    const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 75]);
    const base = rng.pick([20, 40, 60, 80, 120, 160, 200, 240, 300, 400, 500, 600, 800]);
    const v = (p * base) / 100;
    return Number.isInteger(v) ? { q: `${p}% of ${base}`, a: v } : null;
  };
  const sq = () => {
    const a = r(11, 25);
    return { q: `${a}²`, a: a * a };
  };
  const combo = () => {
    const a = r(2, 12),
      b = r(2, 12),
      c = r(1, 50);
    return { q: `${a} × ${b} + ${c}`, a: a * b + c };
  };
  const table = [
    [() => add(10), () => sub(20)],
    [() => add(30), () => sub(40), () => mul(5, 5)],
    [() => add(60), () => sub(80), () => mul(9, 9)],
    [() => add(99), () => sub(99), () => mul(12, 9), () => div(9, 9)],
    [() => add(199), () => sub(199), () => mul(12, 12), () => div(12, 12)],
    [() => sub(299), () => mul(19, 9), () => div(12, 15), pct],
    [() => add(499), () => sub(499), () => mul(25, 9), () => div(15, 20), pct, sq],
    [() => sub(999), () => mul(30, 12), () => div(20, 25), pct, sq, combo],
    [() => mul(49, 19), () => div(25, 40), pct, sq, combo, () => add(999)],
    [() => mul(99, 19), () => mul(39, 29), () => div(30, 50), pct, sq, combo],
  ];
  let p;
  do {
    p = rng.pick(table[lvl - 1])();
  } while (!p);
  return p;
}

export default defineGame({
  id: 'speed',
  skill: 'math',
  name: 'Speed Calc',
  blurb: '60-second mental arithmetic sprint.',
  howTo: [
    'Solve as many problems as you can in 60 seconds.',
    'Just type the answer — it checks automatically once you’ve typed enough digits.',
    'Wrong answers cost a point. Press Skip (or Enter) to pass on a problem (counts as wrong).',
    '20 net correct = 100 points.',
  ],
  levelInfo: (l) =>
    [
      'add/subtract within 20',
      'within 50, small times tables',
      'within 100, times tables',
      '2-digit sums, division',
      'sums to 200, 12× tables',
      'percentages, 2-digit × 1-digit',
      'squares, bigger division',
      '3-term problems',
      'larger multiplication',
      '2-digit × 2-digit',
    ][l - 1],
  tip: 'Break problems apart: 47 × 6 = 40×6 + 7×6 = 240 + 42. For percentages, find 10% first and scale.',
  mount(root, ctx) {
    let p = genProblem(ctx.rng, ctx.level),
      input = '',
      correct = 0,
      wrong = 0,
      done = false;
    const tm = timer(60, finish);
    const qEl = el('div', { class: 'problem' }, p.q);
    const aEl = el('div', { class: 'answer' });
    const stat = el('div', { class: 'statline' });
    const updStat = () => {
      stat.innerHTML = '';
      stat.append(el('span', {}, 'Correct ', el('b', {}, correct)), el('span', {}, 'Wrong ', el('b', {}, wrong)));
    };
    const key = (k, label, cls = '') => el('button', { class: 'key ' + cls, onclick: () => press(k) }, label);
    const pad = el(
      'div',
      { class: 'keypad' },
      ['123', '456', '789'].map((rw) =>
        el(
          'div',
          { class: 'krow' },
          rw.split('').map((d) => key(d, d)),
        ),
      ),
      el('div', { class: 'krow' }, key('Backspace', '⌫'), key('0', '0'), key('Enter', 'Skip', 'primary')),
    );
    root.append(tm.node, stat, qEl, aEl, pad);
    updStat();

    function flash(cls) {
      aEl.classList.remove('wrong', 'right');
      void aEl.offsetWidth;
      aEl.classList.add(cls);
      setTimeout(() => aEl.classList.remove(cls), 250);
    }
    let lock = false;
    function next() {
      p = genProblem(ctx.rng, ctx.level);
      qEl.textContent = p.q;
      input = '';
      aEl.textContent = '';
      lock = false;
      updStat();
    }
    function press(k) {
      if (done || lock) return;
      if (k === 'Backspace') {
        input = input.slice(0, -1);
        aEl.textContent = input;
        return;
      }
      if (k === 'Enter') {
        wrong++;
        flash('wrong');
        next();
        return;
      }
      if (input.length >= 6) return;
      input += k;
      aEl.textContent = input;
      const ans = String(p.a);
      if (input === ans) {
        correct++;
        lock = true;
        flash('right');
        setTimeout(next, 120);
      } else if (input.length >= ans.length) {
        wrong++;
        lock = true;
        flash('wrong');
        setTimeout(next, 250);
      }
    }
    function finish() {
      done = true;
      ctx.finish({ score: clamp((correct - wrong) * 5), summary: `${correct} correct, ${wrong} wrong in 60 seconds.` });
    }
    const off = onKeys((e) => {
      if (/^[0-9]$/.test(e.key) || e.key === 'Backspace' || e.key === 'Enter') {
        e.preventDefault();
        press(e.key);
      }
    });
    return () => {
      tm.stop();
      off();
    };
  },
});

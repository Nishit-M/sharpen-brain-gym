import { defineGame } from '../../core/game.js';
import { clamp } from '../../core/scoring.js';
import { el } from '../../ui/dom.js';
import { timer } from '../../ui/timer.js';

export const GENS = [
  (r) => {
    const a = r.int(11, 99),
      b = r.int(3, 9);
    return { h: `${a} × ${b}`, v: a * b };
  },
  (r) => {
    const a = r.int(11, 99),
      b = r.int(11, 49);
    return { h: `${a} × ${b}`, v: a * b };
  },
  (r) => {
    const b = r.int(3, 19),
      a = r.int(1, b - 1);
    return { h: `${a}/${b}`, v: a / b };
  },
  (r) => {
    const p = r.int(3, 95),
      x = r.int(20, 900);
    return { h: `${p}% of ${x}`, v: (p * x) / 100 };
  },
  (r) => {
    const a = r.int(2, 9),
      b = r.int(2, a < 4 ? 12 : a < 7 ? 6 : 5);
    return { h: `${a}<sup>${b}</sup>`, v: a ** b };
  },
  (r) => {
    const a = r.int(100, 999),
      b = r.int(3, 29);
    return { h: `${a} ÷ ${b}`, v: a / b };
  },
  (r) => {
    const n = r.int(10, 200);
    return { h: `√${n}`, v: Math.sqrt(n) };
  },
];
export function genPair(rng, lvl) {
  const hi = Math.max(0.025, 0.3 - (lvl - 1) * 0.03),
    lo = hi / 3;
  const gen = rng.pick(GENS);
  for (let t = 0; t < 3000; t++) {
    const a = gen(rng),
      b = gen(rng);
    if (a.h === b.h || a.v === b.v) continue;
    const rd = Math.abs(a.v - b.v) / Math.max(a.v, b.v);
    if (rd >= lo && rd <= hi) return [a, b];
  }
  return [
    { h: '17 × 23', v: 391 },
    { h: '19 × 21', v: 399 },
  ];
}
export const CONF = [50, 60, 70, 80, 90, 99];
const nice = (v) => (Number.isInteger(v) ? v : v.toFixed(v < 10 ? 3 : 1));

export default defineGame({
  id: 'calibrate',
  skill: 'decision',
  name: 'Sure or Not',
  blurb: 'Pick the bigger value — and say how sure you are.',
  howTo: [
    'Choose which value is larger, then tap how confident you are (50% = pure guess).',
    'There’s a short timer: estimate, don’t calculate exactly.',
    'Scoring rewards honest confidence: being sure and wrong costs a lot; saying 60% when unsure is fine.',
    '12 questions. A blind guesser scores 0, a perfect, certain estimator 100.',
  ],
  levelInfo: (l) =>
    `values within ${Math.round(Math.max(0.025, 0.3 - (l - 1) * 0.03) * 100)}% of each other, ${l <= 5 ? 8 : 6}s each`,
  tip: 'Good decision-makers know what they don’t know. If your 90% answers are right only 70% of the time, you’re overconfident — slow down and dial it back.',
  mount(root, ctx) {
    const N = 12,
      secs = ctx.level <= 5 ? 8 : 6;
    const qs = Array.from({ length: N }, () => genPair(ctx.rng, ctx.level));
    const log = [];
    let i = 0,
      choice = null,
      tm = null,
      locked = false,
      pending = null;
    const info = el('div', { class: 'statline' });
    const timerBox = el('div');
    const vs = el('div', { class: 'vs' });
    const confBox = el('div', { class: 'conf' });
    const fb = el('div', { class: 'feedback' });
    root.append(
      timerBox,
      info,
      el('p', { class: 'muted small', style: { textAlign: 'center', margin: '0' } }, 'Which is larger?'),
      vs,
      confBox,
      fb,
    );

    function show() {
      const [a, b] = qs[i];
      choice = null;
      locked = false;
      info.innerHTML = '';
      info.append(el('span', {}, `Question ${i + 1} of ${N}`));
      vs.innerHTML = '';
      const ba = el('button', { class: 'btn', html: a.h, onclick: () => pick(0, ba, bb) });
      const bb = el('button', { class: 'btn', html: b.h, onclick: () => pick(1, bb, ba) });
      vs.append(ba, el('span', { class: 'muted' }, 'or'), bb);
      confBox.innerHTML = '';
      confBox.append(el('span', { class: 'muted small' }, 'Pick one, then rate your confidence'));
      fb.innerHTML = '';
      timerBox.innerHTML = '';
      tm = timer(secs, () => record(null));
      timerBox.append(tm.node);
    }
    function pick(c, btn, other) {
      if (locked) return;
      choice = c;
      btn.classList.add('sel');
      other.classList.remove('sel');
      confBox.innerHTML = '';
      CONF.forEach((p) => confBox.append(el('button', { class: 'btn small', onclick: () => record(p) }, p + '%')));
    }
    function record(conf) {
      if (locked) return;
      locked = true;
      tm.stop();
      const [a, b] = qs[i];
      const truth = a.v > b.v ? 0 : 1;
      const timedOut = conf == null || choice == null;
      const p = timedOut ? 0.5 : conf / 100;
      const correct = !timedOut && choice === truth;
      log.push({ p, correct, timedOut });
      fb.innerHTML = '';
      fb.append(
        el(
          'div',
          { class: timedOut ? 'bad' : correct ? 'good' : 'bad' },
          timedOut ? '⏱ Time’s up (counted as a 50% guess)' : correct ? '✓ Right' : '✗ Wrong',
        ),
        el('div', { class: 'muted', html: `${a.h} = ${nice(a.v)} · ${b.h} = ${nice(b.v)}` }),
      );
      confBox.innerHTML = '';
      pending = setTimeout(() => {
        i++;
        if (i >= N) finish();
        else show();
      }, 1600);
    }
    function finish() {
      const brier = log.reduce((s, x) => s + (x.p - (x.correct ? 1 : 0)) ** 2, 0) / N;
      const answered = log.filter((x) => !x.timedOut);
      const avgConf = answered.length ? answered.reduce((s, x) => s + x.p, 0) / answered.length : 0.5;
      const acc = answered.length ? answered.filter((x) => x.correct).length / answered.length : 0;
      let verdict = 'Well calibrated — your confidence matches your accuracy.';
      if (avgConf - acc > 0.1) verdict = 'Overconfident: you were surer than your results justified.';
      else if (acc - avgConf > 0.1) verdict = 'Underconfident: you knew more than you gave yourself credit for.';
      const buckets = CONF.map((c) => ({ c, xs: answered.filter((x) => Math.round(x.p * 100) === c) })).filter(
        (b) => b.xs.length,
      );
      ctx.finish({
        score: clamp((1 - brier / 0.25) * 100),
        summary: `Accuracy ${Math.round(acc * 100)}% at average confidence ${Math.round(avgConf * 100)}%. ${verdict}`,
        details: el(
          'div',
          { class: 'details' },
          el(
            'table',
            {},
            el('tr', {}, el('th', {}, 'You said'), el('th', {}, 'Answers'), el('th', {}, 'Actually right')),
            buckets.map((b) =>
              el(
                'tr',
                {},
                el('td', {}, b.c + '%'),
                el('td', {}, b.xs.length),
                el('td', {}, Math.round((b.xs.filter((x) => x.correct).length / b.xs.length) * 100) + '%'),
              ),
            ),
          ),
        ),
      });
    }
    show();
    return () => {
      if (tm) tm.stop();
      clearTimeout(pending);
    };
  },
});

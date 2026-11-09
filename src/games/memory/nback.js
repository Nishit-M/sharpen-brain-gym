import { defineGame } from '../../core/game.js';
import { clamp } from '../../core/scoring.js';
import { el } from '../../ui/dom.js';
import { onKeys } from '../../ui/keys.js';

export const NB = [
  { n: 1, dual: false, ms: 2500 },
  { n: 2, dual: false, ms: 2500 },
  { n: 3, dual: false, ms: 2500 },
  { n: 1, dual: true, ms: 2800 },
  { n: 2, dual: true, ms: 2800 },
  { n: 2, dual: true, ms: 2300 },
  { n: 3, dual: true, ms: 2800 },
  { n: 3, dual: true, ms: 2300 },
  { n: 4, dual: true, ms: 2800 },
  { n: 4, dual: true, ms: 2300 },
];
export const LETTERS = 'CHKLQRST';
export function stream(rng, len, n, size) {
  const s = [];
  for (let i = 0; i < len; i++) {
    if (i >= n && rng.chance(0.3)) s.push(s[i - n]);
    else {
      let v;
      do {
        v = rng.int(0, size - 1);
      } while (i >= n && v === s[i - n]);
      s.push(v);
    }
  }
  return s;
}
export function rates(s, resp, n) {
  let t = 0,
    h = 0,
    nt = 0,
    fa = 0;
  for (let i = n; i < s.length; i++) {
    if (s[i] === s[i - n]) {
      t++;
      if (resp[i]) h++;
    } else {
      nt++;
      if (resp[i]) fa++;
    }
  }
  return { t, h, nt, fa, d: (t ? h / t : 1) - (nt ? fa / nt : 0) };
}

export default defineGame({
  id: 'nback',
  skill: 'memory',
  name: 'N-Back',
  blurb: 'Does this match what you saw N steps ago?',
  howTo: [
    'A square lights up on the grid, one step at a time.',
    'Press “Position” (or key A) when the square is in the same place as N steps back.',
    'At higher levels a letter appears too — press “Letter” (or key L) when it matches the letter N steps back.',
    'Score = hit rate minus false-alarm rate, so don’t spam the buttons.',
  ],
  levelInfo: (l) => {
    const p = NB[l - 1];
    return `${p.n}-back, ${p.dual ? 'position + letter' : 'position only'}, ${(p.ms / 1000).toFixed(1)}s per step`;
  },
  tip: 'Keep a rolling “queue” in your head — rehearse the last N items as a little chant and update it every step. Accuracy first; speed comes later.',
  mount(root, ctx) {
    const P = NB[ctx.level - 1],
      len = 20 + P.n;
    const pos = stream(ctx.rng, len, P.n, 9);
    const let_ = P.dual ? stream(ctx.rng, len, P.n, LETTERS.length) : null;
    const rp = Array(len).fill(false),
      rl = Array(len).fill(false);
    let t = -1;
    const timers = [];
    const cells = Array.from({ length: 9 }, () => el('div', { class: 'cell' }));
    const grid = el('div', { class: 'grid', style: { '--n': 3 } }, cells);
    const info = el('div', { class: 'statline' });
    const bPos = el('button', { class: 'btn', onclick: () => respond('p') }, 'Position (A)');
    const bLet = P.dual ? el('button', { class: 'btn', onclick: () => respond('l') }, 'Letter (L)') : null;
    root.append(
      el('div', { class: 'rule' }, `${P.n}-BACK`),
      info,
      grid,
      el('div', { class: 'nb-buttons' }, bPos, bLet),
    );

    function respond(kind) {
      if (t < P.n) return;
      const arr = kind === 'p' ? rp : rl,
        s = kind === 'p' ? pos : let_,
        b = kind === 'p' ? bPos : bLet;
      if (!s || arr[t]) return;
      arr[t] = true;
      const hit = s[t] === s[t - P.n];
      b.classList.add(hit ? 'hit' : 'miss');
    }
    function step() {
      t++;
      cells.forEach((c) => {
        c.classList.remove('lit');
        c.textContent = '';
      });
      bPos.classList.remove('hit', 'miss');
      if (bLet) bLet.classList.remove('hit', 'miss');
      if (t >= len) return end();
      info.innerHTML = '';
      info.append(
        el('span', {}, `Step ${t + 1} of ${len}`),
        el('span', { class: 'muted' }, t < P.n ? 'Memorise…' : 'Match?'),
      );
      const c = cells[pos[t]];
      c.classList.add('lit');
      if (P.dual) c.textContent = LETTERS[let_[t]];
      timers.push(
        setTimeout(
          () => {
            c.classList.remove('lit');
            c.textContent = '';
          },
          Math.min(1000, P.ms - 500),
        ),
      );
      timers.push(setTimeout(step, P.ms));
    }
    function end() {
      const a = rates(pos, rp, P.n);
      const b = P.dual ? rates(let_, rl, P.n) : null;
      const d = b ? (a.d + b.d) / 2 : a.d;
      const row = (label, r) => el('tr', {}, el('td', {}, label), el('td', {}, `${r.h} / ${r.t}`), el('td', {}, r.fa));
      ctx.finish({
        score: clamp(d * 100),
        summary: `${P.n}-back${P.dual ? ' dual' : ''}: ${a.h + (b ? b.h : 0)} matches caught.`,
        details: el(
          'div',
          { class: 'details' },
          el(
            'table',
            {},
            el('tr', {}, el('th', {}, ''), el('th', {}, 'Matches caught'), el('th', {}, 'False alarms')),
            row('Position', a),
            b ? row('Letter', b) : null,
          ),
        ),
      });
    }
    timers.push(setTimeout(step, 800));
    const off = onKeys((e) => {
      const k = e.key.toLowerCase();
      if (k === 'a') respond('p');
      else if (k === 'l' && P.dual) respond('l');
    });
    return () => {
      timers.forEach(clearTimeout);
      off();
    };
  },
});

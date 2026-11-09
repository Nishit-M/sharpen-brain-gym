import { defineGame } from '../../core/game.js';
import { clamp } from '../../core/scoring.js';
import { el } from '../../ui/dom.js';
import { onKeys } from '../../ui/keys.js';
import { svg, key, norm } from './shared.js';

const rot90 = (cells) => cells.map(([x, y]) => [y, -x]);
const mirror = (cells) => cells.map(([x, y]) => [-x, y]);
export function genShape(rng, k) {
  for (let t = 0; t < 500; t++) {
    const cells = [[0, 0]],
      has = new Set(['0,0']);
    while (cells.length < k) {
      const [x, y] = rng.pick(cells);
      const [dx, dy] = rng.pick([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]);
      const kk = `${x + dx},${y + dy}`;
      if (!has.has(kk)) {
        has.add(kk);
        cells.push([x + dx, y + dy]);
      }
    }
    // must be chiral: its mirror image must not match any rotation of it
    const base = key(norm(cells));
    let m = mirror(cells),
      chiral = true;
    for (let r = 0; r < 4; r++) {
      if (key(norm(m)) === base) {
        chiral = false;
        break;
      }
      m = rot90(m);
    }
    if (chiral) return norm(cells);
  }
  return [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [3, 1],
  ];
}
export function shapeSvg(cells, angle) {
  const cx = cells.reduce((s, c) => s + c[0] + 0.5, 0) / cells.length;
  const cy = cells.reduce((s, c) => s + c[1] + 0.5, 0) / cells.length;
  const rects = cells
    .map(([x, y]) => `<rect x="${x - cx + 0.04}" y="${y - cy + 0.04}" width="0.92" height="0.92" rx="0.12"/>`)
    .join('');
  return svg('-3.2 -3.2 6.4 6.4', `<g class="mr-shape" transform="rotate(${angle})">${rects}</g>`, 'mr-svg');
}
const mrK = (l) => (l <= 3 ? 5 : l <= 6 ? 6 : l <= 8 ? 7 : 8);

export default defineGame({
  id: 'rotate',
  skill: 'spatial',
  name: 'Same or Mirror',
  blurb: 'Is the right shape a rotation of the left one, or its mirror image?',
  howTo: [
    'Two shapes appear. Mentally turn the right one to match the left.',
    'If it can match just by rotating, tap “Same”. If you’d have to flip it over, tap “Mirror”.',
    'Keys: S = Same, M = Mirror. 12 pairs. Accuracy matters most, but speed counts too.',
  ],
  levelInfo: (l) => `${mrK(l)}-square shapes, ${l <= 6 ? 'quarter-turn rotations' : 'any angle'}`,
  tip: 'Pick one distinctive feature — a lone square sticking out, or the longest arm — rotate just that in your mind, then check which side the next feature lands on.',
  mount(root, ctx) {
    const N = 12,
      L = ctx.level,
      anyAngle = L >= 7;
    const trials = Array.from({ length: N }, () => {
      const s = genShape(ctx.rng, mrK(L));
      const same = ctx.rng.chance(0.5);
      const ang = () => (anyAngle ? ctx.rng.int(0, 23) * 15 : ctx.rng.int(0, 3) * 90);
      const a0 = ang();
      let a1 = ang();
      while (a1 === a0) a1 = ang();
      return { s, other: same ? s : norm(mirror(s)), same, a0, a1 };
    });
    let i = 0,
      right = 0,
      t0 = 0,
      busy = false;
    const rts = [];
    const info = el('div', { class: 'statline' });
    const pair = el('div', { class: 'mr-pair' });
    const fb = el('div', { class: 'feedback' });
    const bSame = el('button', { class: 'btn primary', onclick: () => answer(true) }, 'Same (S)');
    const bMir = el('button', { class: 'btn', onclick: () => answer(false) }, 'Mirror (M)');
    root.append(info, pair, el('div', { class: 'nb-buttons' }, bSame, bMir), fb);

    function show() {
      const tr = trials[i];
      info.innerHTML = '';
      info.append(el('span', {}, `Pair ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
      pair.innerHTML = '';
      pair.append(shapeSvg(tr.s, tr.a0), shapeSvg(tr.other, tr.a1));
      fb.innerHTML = '';
      busy = false;
      t0 = performance.now();
    }
    function answer(same) {
      if (busy) return;
      busy = true;
      const tr = trials[i],
        ok = same === tr.same;
      if (ok) {
        right++;
        rts.push((performance.now() - t0) / 1000);
      }
      fb.innerHTML = '';
      fb.append(
        el(
          'div',
          { class: ok ? 'good' : 'bad' },
          ok ? '✓ Correct' : `✗ It was ${tr.same ? 'the same shape' : 'a mirror image'}`,
        ),
      );
      setTimeout(
        () => {
          i++;
          if (i >= N) finish();
          else show();
        },
        ok ? 450 : 1300,
      );
    }
    function finish() {
      const avg = rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
      const target = anyAngle ? 3.5 : 2.5;
      ctx.finish({
        score: clamp((right / N) * 100 - Math.max(0, avg - target) * 8),
        summary: `${right} of ${N} correct, ${avg ? avg.toFixed(1) + 's' : '—'} average on correct answers (target ≤ ${target}s).`,
      });
    }
    show();
    return onKeys((e) => {
      const k = e.key.toLowerCase();
      if (k === 's') answer(true);
      else if (k === 'm') answer(false);
    });
  },
});

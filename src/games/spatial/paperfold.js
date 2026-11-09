import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';
import { svg } from './shared.js';

export const SHEET = 4;
const pfFolds = (l) => (l <= 3 ? 1 : l <= 6 ? 2 : 3);
const pfPunches = (l) => (l >= 9 ? 2 : 1);
const hkey = (hs) =>
  hs
    .map((h) => h.join(','))
    .sort()
    .join(';');
const dedupe = (hs) => {
  const m = new Map();
  hs.forEach((h) => m.set(h.join(','), h));
  return [...m.values()];
};
export function unfold(holes, steps) {
  let hs = holes.slice();
  for (const st of steps.slice().reverse()) {
    hs = hs.concat(hs.map(([x, y]) => (st.axis === 'x' ? [2 * st.m - 1 - x, y] : [x, 2 * st.m - 1 - y])));
  }
  return dedupe(hs);
}
export function genFold(rng, lvl) {
  let reg = { x0: 0, x1: SHEET, y0: 0, y1: SHEET };
  const steps = [];
  for (let i = 0; i < pfFolds(lvl); i++) {
    const w = reg.x1 - reg.x0,
      h = reg.y1 - reg.y0,
      opts = [];
    if (w >= 2 && w % 2 === 0) opts.push('L', 'R');
    if (h >= 2 && h % 2 === 0) opts.push('T', 'B');
    const d = rng.pick(opts),
      before = { ...reg };
    const mx = reg.x0 + w / 2,
      my = reg.y0 + h / 2;
    if (d === 'L') {
      steps.push({ d, axis: 'x', m: mx, before });
      reg = { ...reg, x0: mx };
    }
    if (d === 'R') {
      steps.push({ d, axis: 'x', m: mx, before });
      reg = { ...reg, x1: mx };
    }
    if (d === 'T') {
      steps.push({ d, axis: 'y', m: my, before });
      reg = { ...reg, y0: my };
    }
    if (d === 'B') {
      steps.push({ d, axis: 'y', m: my, before });
      reg = { ...reg, y1: my };
    }
  }
  const cellsIn = [];
  for (let x = reg.x0; x < reg.x1; x++) for (let y = reg.y0; y < reg.y1; y++) cellsIn.push([x, y]);
  const punches = rng.shuffle(cellsIn).slice(0, Math.min(pfPunches(lvl), cellsIn.length));
  const answer = unfold(punches, steps);
  const ak = hkey(answer);
  // plausible wrong answers
  const cands = [];
  steps.forEach((_, i) =>
    cands.push(
      unfold(
        punches,
        steps.filter((__, j) => j !== i),
      ),
    ),
  );
  steps.forEach((st, i) =>
    cands.push(
      unfold(
        punches,
        steps.map((s, j) => (j === i ? { ...s, axis: s.axis === 'x' ? 'y' : 'x', m: SHEET / 2 } : s)),
      ),
    ),
  );
  cellsIn.forEach((c) => {
    if (!punches.some((p) => p.join() === c.join())) cands.push(unfold([c, ...punches.slice(1)], steps));
  });
  cands.push(
    answer.map(([x, y]) => [SHEET - 1 - x, y]),
    answer.map(([x, y]) => [x, SHEET - 1 - y]),
  );
  const seen = new Set([ak]),
    wrong = [];
  // A distractor with holes off the sheet would render as a duplicate of another option.
  const onSheet = (hs) => hs.every(([x, y]) => x >= 0 && y >= 0 && x < SHEET && y < SHEET);
  for (const c of rng.shuffle(cands.filter(onSheet))) {
    const k = hkey(c);
    if (!seen.has(k)) {
      seen.add(k);
      wrong.push(c);
    }
    if (wrong.length === 3) break;
  }
  while (wrong.length < 3) {
    const r = Array.from({ length: answer.length }, () => [rng.int(0, SHEET - 1), rng.int(0, SHEET - 1)]);
    const k = hkey(dedupe(r));
    if (!seen.has(k)) {
      seen.add(k);
      wrong.push(dedupe(r));
    }
  }
  const options = rng.shuffle([answer, ...wrong]);
  return { steps, reg, punches, options, correct: options.indexOf(answer) };
}
const frame = `<rect x="0" y="0" width="${SHEET}" height="${SHEET}" class="pf-ghost"/>`;
const rect = (r, cls) =>
  `<rect x="${r.x0}" y="${r.y0}" width="${r.x1 - r.x0}" height="${r.y1 - r.y0}" class="${cls}"/>`;
export function stepSvg(st) {
  const b = st.before;
  let flap, line, arrow;
  if (st.axis === 'x') {
    flap = st.d === 'L' ? { ...b, x1: st.m } : { ...b, x0: st.m };
    line = `<line x1="${st.m}" y1="${b.y0}" x2="${st.m}" y2="${b.y1}" class="pf-line"/>`;
    const y = (b.y0 + b.y1) / 2,
      from = (flap.x0 + flap.x1) / 2,
      to = 2 * st.m - from;
    arrow = `<path d="M${from} ${y} Q${st.m} ${y - 1} ${to} ${y}" class="pf-arrow" marker-end="url(#pfa)"/>`;
  } else {
    flap = st.d === 'T' ? { ...b, y1: st.m } : { ...b, y0: st.m };
    line = `<line x1="${b.x0}" y1="${st.m}" x2="${b.x1}" y2="${st.m}" class="pf-line"/>`;
    const x = (b.x0 + b.x1) / 2,
      from = (flap.y0 + flap.y1) / 2,
      to = 2 * st.m - from;
    arrow = `<path d="M${x} ${from} Q${x + 1} ${st.m} ${x} ${to}" class="pf-arrow" marker-end="url(#pfa)"/>`;
  }
  const defs = `<defs><marker id="pfa" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="pf-head"/></marker></defs>`;
  return svg('-0.2 -0.2 4.4 4.4', defs + frame + rect(b, 'pf-sheet') + rect(flap, 'pf-flap') + line + arrow, 'pf-svg');
}
const holesSvg = (r, holes) =>
  svg(
    '-0.2 -0.2 4.4 4.4',
    frame +
      rect(r, 'pf-sheet') +
      holes.map(([x, y]) => `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.27" class="pf-hole"/>`).join(''),
    'pf-svg',
  );

/** The unfolding, one fold at a time (last fold first). */
export function unfoldStages(p) {
  const out = [];
  let hs = p.punches;
  for (const st of p.steps.slice().reverse()) {
    hs = unfold(hs, [st]);
    out.push({ reg: st.before, holes: hs });
  }
  return out;
}

export default defineGame({
  id: 'paperfold',
  skill: 'spatial',
  name: 'Paper Fold',
  blurb: 'Fold the paper, punch a hole — where are the holes when it’s unfolded?',
  howTo: [
    'Follow the folds left to right: the shaded flap folds over along the dashed line, in the arrow’s direction.',
    'Then a hole is punched through every layer.',
    'Pick the sheet that shows where the holes end up once fully unfolded. 6 puzzles.',
  ],
  levelInfo: (l) =>
    `${pfFolds(l)} fold${pfFolds(l) > 1 ? 's' : ''}, ${pfPunches(l)} punch${pfPunches(l) > 1 ? 'es' : ''}`,
  tip: 'Unfold in reverse: undo the last fold first. Every unfold mirrors each hole across that fold line — so each fold doubles the number of holes.',
  mount(root, ctx) {
    const N = 6;
    const pz = Array.from({ length: N }, () => genFold(ctx.rng, ctx.level));
    let i = 0,
      right = 0,
      busy = false;
    const info = el('div', { class: 'statline' });
    const seq = el('div', { class: 'pf-seq' });
    const opts = el('div', { class: 'pf-opts' });
    const fb = el('div', { class: 'feedback' });
    root.append(
      info,
      seq,
      el('p', { class: 'muted small', style: { textAlign: 'center' } }, 'Which sheet shows the unfolded result?'),
      opts,
      fb,
    );

    function show() {
      const p = pz[i];
      busy = false;
      info.innerHTML = '';
      info.append(el('span', {}, `Puzzle ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
      seq.innerHTML = '';
      p.steps.forEach((st, j) =>
        seq.append(el('div', { class: 'pf-step' }, stepSvg(st), el('span', { class: 'muted small' }, `Fold ${j + 1}`))),
      );
      seq.append(
        el('div', { class: 'pf-step' }, holesSvg(p.reg, p.punches), el('span', { class: 'muted small' }, 'Punch')),
      );
      opts.innerHTML = '';
      p.options.forEach((o, j) =>
        opts.append(
          el(
            'button',
            { class: 'pf-opt', onclick: (e) => pick(j, e.currentTarget) },
            holesSvg({ x0: 0, x1: SHEET, y0: 0, y1: SHEET }, o),
            el('span', {}, 'ABCD'[j]),
          ),
        ),
      );
      fb.innerHTML = '';
    }
    function pick(j, btn) {
      if (busy) return;
      busy = true;
      const p = pz[i],
        ok = j === p.correct;
      if (ok) right++;
      btn.classList.add(ok ? 'right' : 'wrongpick');
      opts.children[p.correct].classList.add('right');
      fb.innerHTML = '';
      const stages = unfoldStages(p);
      fb.append(
        el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ The answer was ${'ABCD'[p.correct]}`),
        el(
          'div',
          { class: 'muted small' },
          'Unfolding it, last fold first — each unfold mirrors the holes across the fold line:',
        ),
        el(
          'div',
          { class: 'pf-seq' },
          el('div', { class: 'pf-step' }, holesSvg(p.reg, p.punches), el('span', { class: 'muted small' }, 'Punched')),
          stages.map((s, j) =>
            el(
              'div',
              { class: 'pf-step' },
              holesSvg(s.reg, s.holes),
              el('span', { class: 'muted small' }, `Unfold ${j + 1}`),
            ),
          ),
        ),
        el(
          'button',
          {
            class: 'btn primary',
            style: { marginTop: '8px' },
            onclick: () => {
              i++;
              if (i >= N) ctx.finish({ score: (right / N) * 100, summary: `${right} of ${N} folds solved.` });
              else show();
            },
          },
          i + 1 >= N ? 'See results' : 'Next →',
        ),
      );
    }
    show();
  },
});

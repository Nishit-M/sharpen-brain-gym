import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';
import { svg } from './shared.js';

/** Face symbols. Their rotation never matters — only which face they're on. */
export const SYMS = [
  { g: '●', c: '#e5484d' },
  { g: '■', c: '#3b82f6' },
  { g: '▲', c: '#16a34a' },
  { g: '★', c: '#f59e0b' },
  { g: '✚', c: '#8b5cf6' },
  { g: '◆', c: '#ec4899' },
];

const neg = (v) => v.map((c) => -c || 0);
const vkey = (v) => v.join(',');
/**
 * Folding a square across an edge, with the printed side outside. A frame is
 * the face's outward normal n plus where the net's right (u) and up (v)
 * directions point on that face.
 */
const MOVES = [
  [1, 0, (f) => ({ n: f.u, u: neg(f.n), v: f.v })],
  [-1, 0, (f) => ({ n: neg(f.u), u: f.n, v: f.v })],
  [0, -1, (f) => ({ n: f.v, u: f.u, v: neg(f.n) })],
  [0, 1, (f) => ({ n: neg(f.v), u: f.u, v: f.n })],
];

/**
 * Folds a net of [col, row] cells around a cube whose top face is cells[0].
 * @returns {number[][]} the outward normal each cell lands on
 */
export function fold(cells) {
  const idx = new Map(cells.map((c, i) => [c.join(), i]));
  const frames = Array(cells.length);
  frames[0] = { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
  const queue = [0];
  while (queue.length) {
    const i = queue.shift();
    const [c, r] = cells[i];
    for (const [dc, dr, make] of MOVES) {
      const j = idx.get(`${c + dc},${r + dr}`);
      if (j == null || frames[j]) continue;
      frames[j] = make(frames[i]);
      queue.push(j);
    }
  }
  return frames.map((f) => f.n);
}

/** True if the six cells fold into a closed cube (every cell on a different face). */
export const isNet = (cells) => cells.length === 6 && new Set(fold(cells).map(vkey)).size === 6;

/** Indices of two cells that would land on the same face, or null. */
export function overlap(cells) {
  const ns = fold(cells).map(vkey);
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) if (ns[i] === ns[j]) return [i, j];
  return null;
}

const has = (cells, c, r) => cells.some(([x, y]) => x === c && y === r);
export const hasBlock = (cells) =>
  cells.some(([c, r]) => has(cells, c + 1, r) && has(cells, c, r + 1) && has(cells, c + 1, r + 1));
function longestRun(cells) {
  let best = 0;
  for (const [c, r] of cells) {
    let h = 1;
    while (has(cells, c + h, r)) h++;
    let v = 1;
    while (has(cells, c, r + v)) v++;
    best = Math.max(best, h, v);
  }
  return best;
}

/** A random connected 6-square shape, shifted so its minimum column and row are 0. */
export function genHexomino(rng) {
  const cells = [[0, 0]];
  while (cells.length < 6) {
    const [c, r] = rng.pick(cells);
    const [dc, dr] = rng.pick(MOVES);
    if (!has(cells, c + dc, r + dr)) cells.push([c + dc, r + dr]);
  }
  const mc = Math.min(...cells.map((c) => c[0]));
  const mr = Math.min(...cells.map((c) => c[1]));
  return cells.map(([c, r]) => [c - mc, r - mr]);
}

/**
 * @param {boolean} valid whether the shape must fold into a cube
 * @param {boolean} [plausible] for invalid shapes: avoid giveaways (2×2 blocks, runs of 5+)
 */
export function genNet(rng, valid, plausible = false) {
  for (let t = 0; t < 2000; t++) {
    const cells = genHexomino(rng);
    if (isNet(cells) !== valid) continue;
    if (!valid && plausible && (hasBlock(cells) || longestRun(cells) > 4)) continue;
    return cells;
  }
  return valid
    ? [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [1, 2],
      ]
    : [
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ];
}

const det = (a, b, c) =>
  a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
const isOpp = (a, b) => a.every((x, i) => x === -b[i]);
/** Rotation-independent key for a corner view (top, left, right). */
const cyc = (t) => {
  const rots = [t, [t[1], t[2], t[0]], [t[2], t[0], t[1]]];
  return rots.map((x) => x.join()).sort()[0];
};

/**
 * Classifies a corner view (top, left, right) of a folded net: 'ok' if a real
 * cube shows it, 'opp' if two of the faces are opposite, 'mirror' if the
 * faces meet at a corner but in the reverse order.
 */
export function viewKind(normals, t) {
  const [a, b, c] = t.map((i) => normals[i]);
  if (isOpp(a, b) || isOpp(b, c) || isOpp(a, c)) return 'opp';
  // the view shows the +z, +x and +y faces as top, left and right: det = +1
  return det(a, b, c) === 1 ? 'ok' : 'mirror';
}

const QTYPES = (lvl) =>
  lvl <= 2
    ? ['opp', 'opp', 'opp', 'opp', 'opp', 'opp', 'opp', 'opp']
    : lvl <= 4
      ? ['opp', 'opp', 'opp', 'opp', 'opp', 'fits', 'fits', 'fits']
      : lvl <= 7
        ? ['opp', 'opp', 'opp', 'fits', 'fits', 'cube', 'cube', 'cube']
        : ['opp', 'opp', 'fits', 'fits', 'cube', 'cube', 'cube', 'cube'];

/** True if b sits two squares from a in a straight line with a square between: the easy case. */
function collinear(cells, a, b) {
  const [c1, r1] = cells[a];
  const [c2, r2] = cells[b];
  if (c1 === c2 && Math.abs(r1 - r2) === 2) return has(cells, c1, (r1 + r2) / 2);
  if (r1 === r2 && Math.abs(c1 - c2) === 2) return has(cells, (c1 + c2) / 2, r1);
  return false;
}

export function genQuestion(rng, lvl, type) {
  if (type === 'fits') {
    const valid = rng.chance(0.5);
    const cells = genNet(rng, valid, lvl >= 6);
    return { type, cells, valid, clash: valid ? null : overlap(cells), block: hasBlock(cells) };
  }
  const cells = genNet(rng, true);
  const sym = rng.shuffle([0, 1, 2, 3, 4, 5]);
  const normals = fold(cells);
  if (type === 'opp') {
    let from = 0;
    let to = 0;
    for (let t = 0; t < 20; t++) {
      from = rng.int(0, 5);
      to = normals.findIndex((n) => isOpp(n, normals[from]));
      if (lvl < 4 || !collinear(cells, from, to)) break;
    }
    const others = rng.shuffle([0, 1, 2, 3, 4, 5].filter((i) => i !== from && i !== to)).slice(0, 3);
    return { type, cells, sym, from, answer: to, options: rng.shuffle([to, ...others]) };
  }
  // cube: one true corner view and three impossible ones
  const axis = (k, s) => normals.findIndex((n) => n[k] === s);
  const sx = rng.chance(0.5) ? 1 : -1;
  const sy = rng.chance(0.5) ? 1 : -1;
  const sz = rng.chance(0.5) ? 1 : -1;
  const [X, Y, Z] = [axis(0, sx), axis(1, sy), axis(2, sz)];
  let right = sx * sy * sz === 1 ? [Z, X, Y] : [Z, Y, X];
  const turns = rng.int(0, 2);
  for (let k = 0; k < turns; k++) right = [right[1], right[2], right[0]];
  const pool = { mirror: [], opp: [] };
  for (let a = 0; a < 6; a++)
    for (let b = 0; b < 6; b++)
      for (let c = 0; c < 6; c++) {
        if (a === b || b === c || a === c) continue;
        const k = viewKind(normals, [a, b, c]);
        if (k !== 'ok') pool[k].push([a, b, c]);
      }
  const want = lvl >= 8 ? ['mirror', 'mirror', 'opp'] : ['mirror', 'opp', 'opp'];
  const seen = new Set([cyc(right)]);
  const wrong = [];
  for (const kind of want) {
    for (const t of rng.shuffle(pool[kind])) {
      if (seen.has(cyc(t))) continue;
      seen.add(cyc(t));
      wrong.push({ t, kind });
      break;
    }
  }
  const options = rng.shuffle([{ t: right, kind: 'ok' }, ...wrong]);
  return { type, cells, sym, normals, options, answer: options.findIndex((o) => o.kind === 'ok') };
}

const glyph = (s) => `<tspan style="fill:${SYMS[s].c}">${SYMS[s].g}</tspan>`;
const chipEl = (s) => el('span', { class: 'cf-glyph', style: { color: SYMS[s].c } }, SYMS[s].g);

/** The flat net. hl: cell index → css class. */
function netSvg(cells, sym, hl = {}) {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const body = cells
    .map(([c, r], i) => {
      const cls = 'cf-cell' + (hl[i] ? ' ' + hl[i] : '');
      const txt = sym ? `<text x="${c + 0.5}" y="${r + 0.53}" class="cf-sym">${glyph(sym[i])}</text>` : '';
      return `<rect x="${c + 0.04}" y="${r + 0.04}" width="0.92" height="0.92" rx="0.08" class="${cls}"/>${txt}`;
    })
    .join('');
  return svg(`-0.1 -0.1 ${w + 0.2} ${h + 0.2}`, body, 'cf-net');
}

/** An isometric cube showing three faces: top, left-front, right-front. */
function cubeSvg(sym, t) {
  const face = (pts, cls, cx, cy, s) =>
    `<polygon points="${pts}" class="cf-face ${cls}"/><text x="${cx}" y="${cy}" class="cf-sym cf-sym-sm">${glyph(sym[s])}</text>`;
  return svg(
    '-1 -1.1 2 2.2',
    face('0,-1 -0.866,-0.5 0,0 0.866,-0.5', 'top', 0, -0.47, t[0]) +
      face('-0.866,-0.5 -0.866,0.5 0,1 0,0', 'left', -0.433, 0.28, t[1]) +
      face('0.866,-0.5 0.866,0.5 0,1 0,0', 'right', 0.433, 0.28, t[2]),
    'cf-cube',
  );
}

export default defineGame({
  id: 'cubefold',
  skill: 'spatial',
  name: 'Cube Fold',
  blurb: 'Fold a flat net into a cube in your head.',
  howTo: [
    'Each puzzle shows a flat net of six squares. Imagine folding it up into a cube, printed side out.',
    'Questions ask which face ends up opposite another, whether a shape folds into a cube at all (from level 3), or which cube the net makes (from level 5).',
    'A symbol’s rotation doesn’t matter — only which face it is on. 8 puzzles.',
  ],
  levelInfo: (l) =>
    l <= 2
      ? 'opposite faces'
      : l <= 4
        ? 'opposite faces (no easy straight-line ones), does it fold?'
        : l <= 7
          ? 'opposite faces, does it fold?, which cube?'
          : 'mostly “which cube?” with mirror-image traps; tricky non-nets',
  tip: 'Squares two apart in a straight line are always opposite. For the rest, fold one square at a time from a fixed base and track where each lands. For corner views, check that no two shown faces are opposite, then check their clockwise order.',
  mount(root, ctx) {
    const N = 8;
    const qs = ctx.rng.shuffle(QTYPES(ctx.level)).map((type) => genQuestion(ctx.rng, ctx.level, type));
    let i = 0;
    let right = 0;
    let busy = false;
    const info = el('div', { class: 'statline' });
    const prompt = el('p', { class: 'cf-prompt' });
    const fig = el('div', { class: 'cf-fig' });
    const opts = el('div', { class: 'cf-opts' });
    const fb = el('div', { class: 'feedback' });
    root.append(info, prompt, fig, opts, fb);

    function show() {
      const q = qs[i];
      busy = false;
      info.replaceChildren(el('span', {}, `Puzzle ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
      fb.replaceChildren();
      opts.replaceChildren();
      opts.className = 'cf-opts';
      if (q.type === 'opp') {
        prompt.replaceChildren('Fold it into a cube. Which face ends up opposite ', chipEl(q.sym[q.from]), '?');
        fig.replaceChildren(netSvg(q.cells, q.sym, { [q.from]: 'cf-from' }));
        q.options.forEach((o) =>
          opts.append(
            el('button', { class: 'btn cf-choice', onclick: (e) => pick(o, e.currentTarget) }, chipEl(q.sym[o])),
          ),
        );
      } else if (q.type === 'fits') {
        prompt.replaceChildren('Can this shape be folded into a closed cube?');
        fig.replaceChildren(netSvg(q.cells, null));
        opts.append(
          el('button', { class: 'btn cf-wide', onclick: (e) => pick(true, e.currentTarget) }, 'Yes, it folds'),
          el('button', { class: 'btn cf-wide', onclick: (e) => pick(false, e.currentTarget) }, 'No'),
        );
      } else {
        prompt.replaceChildren('Which cube can be folded from this net?');
        fig.replaceChildren(netSvg(q.cells, q.sym));
        opts.className = 'cf-opts cubes';
        q.options.forEach((o, j) =>
          opts.append(
            el(
              'button',
              { class: 'pf-opt', onclick: (e) => pick(j, e.currentTarget) },
              cubeSvg(q.sym, o.t),
              el('span', {}, 'ABCD'[j]),
            ),
          ),
        );
      }
    }

    function explain(q, choice) {
      if (q.type === 'opp') {
        fig.replaceChildren(netSvg(q.cells, q.sym, { [q.from]: 'cf-from', [q.answer]: 'cf-to' }));
        return collinear(q.cells, q.from, q.answer)
          ? 'They’re two apart in a straight line — the square between them becomes a side, so they end up facing each other.'
          : 'Fold the squares around one at a time: the highlighted pair never touch, and each borders the other four faces, so they must be opposite.';
      }
      if (q.type === 'fits') {
        if (q.valid) return 'It folds: every square lands on a different face of the cube.';
        if (q.block) {
          return 'It can’t fold: four squares in a 2×2 block would all have to meet at one corner, but only three faces meet at a cube’s corner.';
        }
        fig.replaceChildren(
          netSvg(q.cells, null, q.clash ? { [q.clash[0]]: 'cf-clash', [q.clash[1]]: 'cf-clash' } : {}),
        );
        return 'It can’t fold: the two marked squares would land on the same face, leaving another face open.';
      }
      const t = q.options[q.answer].t;
      const order = [t[0], t[2], t[1]].map((s) => SYMS[q.sym[s]].g).join(' → ');
      const base = `The real cube has these three faces meeting at a corner, clockwise from the top: ${order}.`;
      const picked = q.options[choice];
      if (picked.kind === 'opp') {
        const [a, b, c] = picked.t.map((s) => q.normals[s]);
        const [x, y] = isOpp(a, b) ? [0, 1] : isOpp(b, c) ? [1, 2] : [0, 2];
        return `${SYMS[q.sym[picked.t[x]]].g} and ${SYMS[q.sym[picked.t[y]]].g} are opposite faces, so they can never be seen side by side. ${base}`;
      }
      if (picked.kind === 'mirror') {
        return `Close — those three faces do meet at a corner, but that cube is the mirror image (the order around the corner is reversed). ${base}`;
      }
      return base;
    }

    function pick(choice, btn) {
      if (busy) return;
      busy = true;
      const q = qs[i];
      const ok = q.type === 'fits' ? choice === q.valid : choice === q.answer;
      if (ok) right++;
      btn.classList.add(ok ? 'right' : 'wrongpick', ok ? 'hit' : 'miss');
      if (q.type === 'cube') opts.children[q.answer].classList.add('right');
      else if (q.type === 'opp') opts.children[q.options.indexOf(q.answer)].classList.add('hit');
      fb.replaceChildren(
        el(
          'div',
          { class: ok ? 'good' : 'bad' },
          ok
            ? '✓ Correct'
            : q.type === 'fits'
              ? `✗ It ${q.valid ? 'does' : 'doesn’t'} fold`
              : q.type === 'cube'
                ? `✗ The answer was ${'ABCD'[q.answer]}`
                : '✗ Not that one',
        ),
        el('div', { class: 'muted why' }, explain(q, choice)),
        el(
          'button',
          {
            class: 'btn primary',
            style: { marginTop: '8px' },
            onclick: () => {
              i++;
              if (i >= N) ctx.finish({ score: (right / N) * 100, summary: `${right} of ${N} cube puzzles solved.` });
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

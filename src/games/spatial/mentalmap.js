import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';

export const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]; // N E S W
export const ARROWS = ['▲', '►', '▼', '◄'];
export const ABS = ['up', 'right', 'down', 'left'];
export const MM = [
  { g: 5, n: 3, rel: false, seq: false },
  { g: 5, n: 4, rel: false, seq: false },
  { g: 5, n: 4, rel: true, seq: false },
  { g: 5, n: 5, rel: true, seq: false },
  { g: 6, n: 6, rel: true, seq: false },
  { g: 6, n: 5, rel: true, seq: true },
  { g: 6, n: 6, rel: true, seq: true },
  { g: 6, n: 7, rel: true, seq: true },
  { g: 7, n: 8, rel: true, seq: true },
  { g: 7, n: 9, rel: true, seq: true },
];
export function genRoute(rng, P) {
  for (let t = 0; t < 500; t++) {
    let x = rng.int(0, P.g - 1),
      y = rng.int(0, P.g - 1),
      f = rng.int(0, 3);
    const start = { x, y, f },
      steps = [],
      path = [[x, y]];
    let lastTurn = true,
      ok = true;
    for (let s = 0; s < P.n; s++) {
      // Never end on a turn: a route must finish with a move.
      if (P.rel && !lastTurn && s < P.n - 1) {
        const turn = rng.pick(['left', 'right', 'right', 'left', 'around']);
        f = (f + (turn === 'right' ? 1 : turn === 'left' ? 3 : 2)) % 4;
        steps.push(turn === 'around' ? 'Turn around' : `Turn ${turn}`);
        lastTurn = true;
        continue;
      }
      const dir = P.rel ? f : rng.int(0, 3);
      const maxK = [];
      for (let k = 1; k <= 3; k++) {
        const nx = x + DIRS[dir][0] * k,
          ny = y + DIRS[dir][1] * k;
        if (nx >= 0 && ny >= 0 && nx < P.g && ny < P.g) maxK.push(k);
      }
      if (!maxK.length) {
        ok = false;
        break;
      }
      const k = rng.pick(maxK);
      for (let j = 0; j < k; j++) {
        x += DIRS[dir][0];
        y += DIRS[dir][1];
        path.push([x, y]);
      }
      steps.push(P.rel ? `Forward ${k}` : `${ABS[dir][0].toUpperCase() + ABS[dir].slice(1)} ${k}`);
      lastTurn = false;
    }
    if (!ok || (x === start.x && y === start.y) || steps[steps.length - 1].startsWith('Turn')) continue;
    return { start, end: { x, y }, steps, path };
  }
  return null;
}

export default defineGame({
  id: 'mentalmap',
  skill: 'spatial',
  name: 'Mental Map',
  blurb: 'Follow the directions in your head and tap where you end up.',
  howTo: [
    'The arrow shows where you start and which way you face.',
    'Follow the directions without moving anything, then tap the square where you finish.',
    'From level 3, directions are relative: “turn left” depends on which way you’re facing. From level 6, each direction is shown once, then hidden.',
    '8 routes.',
  ],
  levelInfo: (l) => {
    const p = MM[l - 1];
    return `${p.g}×${p.g} grid, ${p.n} directions, ${p.rel ? 'relative turns' : 'up/down/left/right'}${p.seq ? ', shown one at a time' : ''}`;
  },
  tip: 'Keep two things updated as you go: your square and your facing. Say it under your breath (“row 3, facing east”). Turning around and then going left is the classic trap.',
  mount(root, ctx) {
    const P = MM[ctx.level - 1],
      N = 8;
    const routes = [];
    while (routes.length < N) {
      const r = genRoute(ctx.rng, P);
      if (r) routes.push(r);
    }
    let i = 0,
      right = 0,
      phase = 'show';
    const timers = [];
    const info = el('div', { class: 'statline' });
    const dirs = el('div', { class: 'mm-dirs' });
    const cells = [];
    const grid = el('div', { class: 'grid mm-grid', style: { '--n': P.g } });
    for (let y = 0; y < P.g; y++)
      for (let x = 0; x < P.g; x++) {
        const c = el('button', {
          class: 'cell',
          'aria-label': `Row ${y + 1}, column ${x + 1}`,
          onclick: () => tap(x, y),
        });
        cells.push(c);
        grid.append(c);
      }
    const fb = el('div', { class: 'feedback' });
    root.append(info, dirs, grid, fb);
    const cell = (x, y) => cells[y * P.g + x];

    function show() {
      const r = routes[i];
      info.innerHTML = '';
      info.append(el('span', {}, `Route ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
      cells.forEach((c) => {
        c.className = 'cell';
        c.textContent = '';
      });
      const s = cell(r.start.x, r.start.y);
      s.classList.add('mm-start');
      s.textContent = P.rel ? ARROWS[r.start.f] : '●';
      fb.innerHTML = '';
      dirs.innerHTML = '';
      if (!P.seq) {
        r.steps.forEach((t) => dirs.append(el('span', { class: 'mm-step' }, t)));
        phase = 'answer';
      } else {
        phase = 'show';
        r.steps.forEach((t, j) =>
          timers.push(
            setTimeout(() => {
              dirs.innerHTML = '';
              dirs.append(el('span', { class: 'mm-step big' }, `${j + 1}. ${t}`));
            }, j * 1600),
          ),
        );
        timers.push(
          setTimeout(() => {
            dirs.innerHTML = '';
            dirs.append(el('span', { class: 'muted' }, 'Where are you now? Tap the square.'));
            phase = 'answer';
          }, r.steps.length * 1600),
        );
      }
    }
    function tap(x, y) {
      if (phase !== 'answer') return;
      phase = 'done';
      const r = routes[i],
        ok = x === r.end.x && y === r.end.y;
      if (ok) right++;
      r.path.forEach(([px, py], j) => {
        if (j > 0) {
          const c = cell(px, py);
          c.classList.add('mm-path');
          c.textContent = j;
        }
      });
      cell(r.end.x, r.end.y).classList.add('ok');
      if (!ok) cell(x, y).classList.add('bad');
      if (P.seq) {
        dirs.innerHTML = '';
        r.steps.forEach((t) => dirs.append(el('span', { class: 'mm-step' }, t)));
      }
      fb.innerHTML = '';
      fb.append(
        el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Spot on' : '✗ Not quite — the numbered path shows the route'),
        el(
          'button',
          {
            class: 'btn primary',
            style: { marginTop: '8px' },
            onclick: () => {
              i++;
              if (i >= N)
                ctx.finish({ score: (right / N) * 100, summary: `${right} of ${N} routes followed correctly.` });
              else show();
            },
          },
          i + 1 >= N ? 'See results' : 'Next →',
        ),
      );
    }
    show();
    return () => timers.forEach(clearTimeout);
  },
});

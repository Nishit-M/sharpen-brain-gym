'use strict';
/* Spatial games: Same or Mirror (mental rotation), Paper Fold, Mental Map */
(() => {
  const { el, clamp } = Brain;
  const NS = 'http://www.w3.org/2000/svg';
  function svg(viewBox, inner, cls) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', viewBox);
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = inner;
    return s;
  }
  const key = cells => cells.map(c => c.join(',')).sort().join(';');
  function norm(cells) {
    const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
    return cells.map(([x, y]) => [x - mx, y - my]);
  }

  /* ---------------- Same or Mirror ---------------- */
  const rot90 = cells => cells.map(([x, y]) => [y, -x]);
  const mirror = cells => cells.map(([x, y]) => [-x, y]);
  function genShape(rng, k) {
    for (let t = 0; t < 500; t++) {
      const cells = [[0, 0]], has = new Set(['0,0']);
      while (cells.length < k) {
        const [x, y] = rng.pick(cells);
        const [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        const kk = `${x + dx},${y + dy}`;
        if (!has.has(kk)) { has.add(kk); cells.push([x + dx, y + dy]); }
      }
      // must be chiral: its mirror image must not match any rotation of it
      const base = key(norm(cells));
      let m = mirror(cells), chiral = true;
      for (let r = 0; r < 4; r++) { if (key(norm(m)) === base) { chiral = false; break; } m = rot90(m); }
      if (chiral) return norm(cells);
    }
    return [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1]];
  }
  function shapeSvg(cells, angle) {
    const cx = cells.reduce((s, c) => s + c[0] + 0.5, 0) / cells.length;
    const cy = cells.reduce((s, c) => s + c[1] + 0.5, 0) / cells.length;
    const rects = cells.map(([x, y]) => `<rect x="${x - cx + 0.04}" y="${y - cy + 0.04}" width="0.92" height="0.92" rx="0.12"/>`).join('');
    return svg('-3.2 -3.2 6.4 6.4', `<g class="mr-shape" transform="rotate(${angle})">${rects}</g>`, 'mr-svg');
  }
  const mrK = l => l <= 3 ? 5 : l <= 6 ? 6 : l <= 8 ? 7 : 8;

  Brain.register({
    id: 'rotate', skill: 'spatial', name: 'Same or Mirror',
    blurb: 'Is the right shape a rotation of the left one, or its mirror image?',
    howTo: [
      'Two shapes appear. Mentally turn the right one to match the left.',
      'If it can match just by rotating, tap “Same”. If you’d have to flip it over, tap “Mirror”.',
      'Keys: S = Same, M = Mirror. 12 pairs. Accuracy matters most, but speed counts too.',
    ],
    levelInfo: l => `${mrK(l)}-square shapes, ${l <= 6 ? 'quarter-turn rotations' : 'any angle'}`,
    tip: 'Pick one distinctive feature — a lone square sticking out, or the longest arm — rotate just that in your mind, then check which side the next feature lands on.',
    mount(root, ctx) {
      const N = 12, L = ctx.level, anyAngle = L >= 7;
      const trials = Array.from({ length: N }, () => {
        const s = genShape(ctx.rng, mrK(L));
        const same = ctx.rng.chance(0.5);
        const ang = () => anyAngle ? ctx.rng.int(0, 23) * 15 : ctx.rng.int(0, 3) * 90;
        const a0 = ang(); let a1 = ang(); while (a1 === a0) a1 = ang();
        return { s, other: same ? s : norm(mirror(s)), same, a0, a1 };
      });
      let i = 0, right = 0, t0 = 0, busy = false;
      const rts = [];
      const info = el('div', { class: 'statline' });
      const pair = el('div', { class: 'mr-pair' });
      const fb = el('div', { class: 'feedback' });
      const bSame = el('button', { class: 'btn primary', onclick: () => answer(true) }, 'Same (S)');
      const bMir = el('button', { class: 'btn', onclick: () => answer(false) }, 'Mirror (M)');
      root.append(info, pair, el('div', { class: 'nb-buttons' }, bSame, bMir), fb);

      function show() {
        const tr = trials[i];
        info.innerHTML = ''; info.append(el('span', {}, `Pair ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
        pair.innerHTML = '';
        pair.append(shapeSvg(tr.s, tr.a0), shapeSvg(tr.other, tr.a1));
        fb.innerHTML = ''; busy = false; t0 = performance.now();
      }
      function answer(same) {
        if (busy) return;
        busy = true;
        const tr = trials[i], ok = same === tr.same;
        if (ok) { right++; rts.push((performance.now() - t0) / 1000); }
        fb.innerHTML = ''; fb.append(el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ It was ${tr.same ? 'the same shape' : 'a mirror image'}`));
        setTimeout(() => { i++; if (i >= N) finish(); else show(); }, ok ? 450 : 1300);
      }
      function finish() {
        const avg = rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
        const target = anyAngle ? 3.5 : 2.5;
        ctx.finish({
          score: clamp(right / N * 100 - Math.max(0, avg - target) * 8),
          summary: `${right} of ${N} correct, ${avg ? avg.toFixed(1) + 's' : '—'} average on correct answers (target ≤ ${target}s).`,
        });
      }
      show();
      return Brain.onKeys(e => { const k = e.key.toLowerCase(); if (k === 's') answer(true); else if (k === 'm') answer(false); });
    },
  });

  /* ---------------- Paper Fold ---------------- */
  const SHEET = 4;
  const pfFolds = l => l <= 3 ? 1 : l <= 6 ? 2 : 3;
  const pfPunches = l => l >= 9 ? 2 : 1;
  const hkey = hs => hs.map(h => h.join(',')).sort().join(';');
  const dedupe = hs => { const m = new Map(); hs.forEach(h => m.set(h.join(','), h)); return [...m.values()]; };
  function unfold(holes, steps) {
    let hs = holes.slice();
    for (const st of steps.slice().reverse()) {
      hs = hs.concat(hs.map(([x, y]) => st.axis === 'x' ? [2 * st.m - 1 - x, y] : [x, 2 * st.m - 1 - y]));
    }
    return dedupe(hs);
  }
  function genFold(rng, lvl) {
    let reg = { x0: 0, x1: SHEET, y0: 0, y1: SHEET };
    const steps = [];
    for (let i = 0; i < pfFolds(lvl); i++) {
      const w = reg.x1 - reg.x0, h = reg.y1 - reg.y0, opts = [];
      if (w >= 2 && w % 2 === 0) opts.push('L', 'R');
      if (h >= 2 && h % 2 === 0) opts.push('T', 'B');
      const d = rng.pick(opts), before = { ...reg };
      const mx = reg.x0 + w / 2, my = reg.y0 + h / 2;
      if (d === 'L') { steps.push({ d, axis: 'x', m: mx, before }); reg = { ...reg, x0: mx }; }
      if (d === 'R') { steps.push({ d, axis: 'x', m: mx, before }); reg = { ...reg, x1: mx }; }
      if (d === 'T') { steps.push({ d, axis: 'y', m: my, before }); reg = { ...reg, y0: my }; }
      if (d === 'B') { steps.push({ d, axis: 'y', m: my, before }); reg = { ...reg, y1: my }; }
    }
    const cellsIn = [];
    for (let x = reg.x0; x < reg.x1; x++) for (let y = reg.y0; y < reg.y1; y++) cellsIn.push([x, y]);
    const punches = rng.shuffle(cellsIn).slice(0, Math.min(pfPunches(lvl), cellsIn.length));
    const answer = unfold(punches, steps);
    const ak = hkey(answer);
    // plausible wrong answers
    const cands = [];
    steps.forEach((_, i) => cands.push(unfold(punches, steps.filter((__, j) => j !== i))));
    steps.forEach((st, i) => cands.push(unfold(punches, steps.map((s, j) => j === i ? { ...s, axis: s.axis === 'x' ? 'y' : 'x', m: SHEET / 2 } : s))));
    cellsIn.forEach(c => { if (!punches.some(p => p.join() === c.join())) cands.push(unfold([c, ...punches.slice(1)], steps)); });
    cands.push(answer.map(([x, y]) => [SHEET - 1 - x, y]), answer.map(([x, y]) => [x, SHEET - 1 - y]));
    const seen = new Set([ak]), wrong = [];
    for (const c of rng.shuffle(cands)) { const k = hkey(c); if (!seen.has(k)) { seen.add(k); wrong.push(c); } if (wrong.length === 3) break; }
    while (wrong.length < 3) {
      const r = Array.from({ length: answer.length }, () => [rng.int(0, SHEET - 1), rng.int(0, SHEET - 1)]);
      const k = hkey(dedupe(r)); if (!seen.has(k)) { seen.add(k); wrong.push(dedupe(r)); }
    }
    const options = rng.shuffle([answer, ...wrong]);
    return { steps, reg, punches, options, correct: options.indexOf(answer) };
  }
  const frame = `<rect x="0" y="0" width="${SHEET}" height="${SHEET}" class="pf-ghost"/>`;
  const rect = (r, cls) => `<rect x="${r.x0}" y="${r.y0}" width="${r.x1 - r.x0}" height="${r.y1 - r.y0}" class="${cls}"/>`;
  function stepSvg(st) {
    const b = st.before;
    let flap, line, arrow;
    if (st.axis === 'x') {
      flap = st.d === 'L' ? { ...b, x1: st.m } : { ...b, x0: st.m };
      line = `<line x1="${st.m}" y1="${b.y0}" x2="${st.m}" y2="${b.y1}" class="pf-line"/>`;
      const y = (b.y0 + b.y1) / 2, from = (flap.x0 + flap.x1) / 2, to = 2 * st.m - from;
      arrow = `<path d="M${from} ${y} Q${st.m} ${y - 1} ${to} ${y}" class="pf-arrow" marker-end="url(#pfa)"/>`;
    } else {
      flap = st.d === 'T' ? { ...b, y1: st.m } : { ...b, y0: st.m };
      line = `<line x1="${b.x0}" y1="${st.m}" x2="${b.x1}" y2="${st.m}" class="pf-line"/>`;
      const x = (b.x0 + b.x1) / 2, from = (flap.y0 + flap.y1) / 2, to = 2 * st.m - from;
      arrow = `<path d="M${x} ${from} Q${x + 1} ${st.m} ${x} ${to}" class="pf-arrow" marker-end="url(#pfa)"/>`;
    }
    const defs = `<defs><marker id="pfa" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="pf-head"/></marker></defs>`;
    return svg('-0.2 -0.2 4.4 4.4', defs + frame + rect(b, 'pf-sheet') + rect(flap, 'pf-flap') + line + arrow, 'pf-svg');
  }
  const holesSvg = (r, holes) => svg('-0.2 -0.2 4.4 4.4', frame + rect(r, 'pf-sheet') + holes.map(([x, y]) => `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.27" class="pf-hole"/>`).join(''), 'pf-svg');

  Brain.register({
    id: 'paperfold', skill: 'spatial', name: 'Paper Fold',
    blurb: 'Fold the paper, punch a hole — where are the holes when it’s unfolded?',
    howTo: [
      'Follow the folds left to right: the shaded flap folds over along the dashed line, in the arrow’s direction.',
      'Then a hole is punched through every layer.',
      'Pick the sheet that shows where the holes end up once fully unfolded. 6 puzzles.',
    ],
    levelInfo: l => `${pfFolds(l)} fold${pfFolds(l) > 1 ? 's' : ''}, ${pfPunches(l)} punch${pfPunches(l) > 1 ? 'es' : ''}`,
    tip: 'Unfold in reverse: undo the last fold first. Every unfold mirrors each hole across that fold line — so each fold doubles the number of holes.',
    mount(root, ctx) {
      const N = 6;
      const pz = Array.from({ length: N }, () => genFold(ctx.rng, ctx.level));
      let i = 0, right = 0, busy = false;
      const info = el('div', { class: 'statline' });
      const seq = el('div', { class: 'pf-seq' });
      const opts = el('div', { class: 'pf-opts' });
      const fb = el('div', { class: 'feedback' });
      root.append(info, seq, el('p', { class: 'muted small', style: { textAlign: 'center' } }, 'Which sheet shows the unfolded result?'), opts, fb);

      function show() {
        const p = pz[i];
        busy = false;
        info.innerHTML = ''; info.append(el('span', {}, `Puzzle ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
        seq.innerHTML = '';
        p.steps.forEach((st, j) => seq.append(el('div', { class: 'pf-step' }, stepSvg(st), el('span', { class: 'muted small' }, `Fold ${j + 1}`))));
        seq.append(el('div', { class: 'pf-step' }, holesSvg(p.reg, p.punches), el('span', { class: 'muted small' }, 'Punch')));
        opts.innerHTML = '';
        p.options.forEach((o, j) => opts.append(el('button', { class: 'pf-opt', onclick: e => pick(j, e.currentTarget) },
          holesSvg({ x0: 0, x1: SHEET, y0: 0, y1: SHEET }, o), el('span', {}, 'ABCD'[j]))));
        fb.innerHTML = '';
      }
      function pick(j, btn) {
        if (busy) return;
        busy = true;
        const p = pz[i], ok = j === p.correct;
        if (ok) right++;
        btn.classList.add(ok ? 'right' : 'wrongpick');
        opts.children[p.correct].classList.add('right');
        fb.innerHTML = ''; fb.append(el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ The answer was ${'ABCD'[p.correct]}`),
          el('button', { class: 'btn primary', style: { marginTop: '8px' }, onclick: () => { i++; if (i >= N) ctx.finish({ score: right / N * 100, summary: `${right} of ${N} folds solved.` }); else show(); } }, i + 1 >= N ? 'See results' : 'Next →'));
      }
      show();
    },
  });

  /* ---------------- Mental Map ---------------- */
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W
  const ARROWS = ['▲', '►', '▼', '◄'];
  const ABS = ['up', 'right', 'down', 'left'];
  const MM = [
    { g: 5, n: 3, rel: false, seq: false }, { g: 5, n: 4, rel: false, seq: false }, { g: 5, n: 4, rel: true, seq: false },
    { g: 5, n: 5, rel: true, seq: false }, { g: 6, n: 6, rel: true, seq: false }, { g: 6, n: 5, rel: true, seq: true },
    { g: 6, n: 6, rel: true, seq: true }, { g: 6, n: 7, rel: true, seq: true }, { g: 7, n: 8, rel: true, seq: true },
    { g: 7, n: 9, rel: true, seq: true },
  ];
  function genRoute(rng, P) {
    for (let t = 0; t < 500; t++) {
      let x = rng.int(0, P.g - 1), y = rng.int(0, P.g - 1), f = rng.int(0, 3);
      const start = { x, y, f }, steps = [], path = [[x, y]];
      let lastTurn = true, ok = true;
      for (let s = 0; s < P.n; s++) {
        if (P.rel && !lastTurn) {
          const turn = rng.pick(['left', 'right', 'right', 'left', 'around']);
          f = (f + (turn === 'right' ? 1 : turn === 'left' ? 3 : 2)) % 4;
          steps.push(turn === 'around' ? 'Turn around' : `Turn ${turn}`);
          lastTurn = true;
          continue;
        }
        const dir = P.rel ? f : rng.int(0, 3);
        const maxK = []; for (let k = 1; k <= 3; k++) { const nx = x + DIRS[dir][0] * k, ny = y + DIRS[dir][1] * k; if (nx >= 0 && ny >= 0 && nx < P.g && ny < P.g) maxK.push(k); }
        if (!maxK.length) { ok = false; break; }
        const k = rng.pick(maxK);
        for (let j = 0; j < k; j++) { x += DIRS[dir][0]; y += DIRS[dir][1]; path.push([x, y]); }
        steps.push(P.rel ? `Forward ${k}` : `${ABS[dir][0].toUpperCase() + ABS[dir].slice(1)} ${k}`);
        lastTurn = false;
      }
      if (!ok || (x === start.x && y === start.y) || steps[steps.length - 1].startsWith('Turn')) continue;
      return { start, end: { x, y }, steps, path };
    }
    return null;
  }

  Brain.register({
    id: 'mentalmap', skill: 'spatial', name: 'Mental Map',
    blurb: 'Follow the directions in your head and tap where you end up.',
    howTo: [
      'The arrow shows where you start and which way you face.',
      'Follow the directions without moving anything, then tap the square where you finish.',
      'From level 3, directions are relative: “turn left” depends on which way you’re facing. From level 6, each direction is shown once, then hidden.',
      '8 routes.',
    ],
    levelInfo: l => { const p = MM[l - 1]; return `${p.g}×${p.g} grid, ${p.n} directions, ${p.rel ? 'relative turns' : 'up/down/left/right'}${p.seq ? ', shown one at a time' : ''}`; },
    tip: 'Keep two things updated as you go: your square and your facing. Say it under your breath (“row 3, facing east”). Turning around and then going left is the classic trap.',
    mount(root, ctx) {
      const P = MM[ctx.level - 1], N = 8;
      const routes = [];
      while (routes.length < N) { const r = genRoute(ctx.rng, P); if (r) routes.push(r); }
      let i = 0, right = 0, phase = 'show', timers = [];
      const info = el('div', { class: 'statline' });
      const dirs = el('div', { class: 'mm-dirs' });
      const cells = [];
      const grid = el('div', { class: 'grid mm-grid', style: { '--n': P.g } });
      for (let y = 0; y < P.g; y++) for (let x = 0; x < P.g; x++) {
        const c = el('button', { class: 'cell', 'aria-label': `Row ${y + 1}, column ${x + 1}`, onclick: () => tap(x, y) });
        cells.push(c); grid.append(c);
      }
      const fb = el('div', { class: 'feedback' });
      root.append(info, dirs, grid, fb);
      const cell = (x, y) => cells[y * P.g + x];

      function show() {
        const r = routes[i];
        info.innerHTML = ''; info.append(el('span', {}, `Route ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
        cells.forEach(c => { c.className = 'cell'; c.textContent = ''; });
        const s = cell(r.start.x, r.start.y);
        s.classList.add('mm-start'); s.textContent = P.rel ? ARROWS[r.start.f] : '●';
        fb.innerHTML = '';
        dirs.innerHTML = '';
        if (!P.seq) {
          r.steps.forEach(t => dirs.append(el('span', { class: 'mm-step' }, t)));
          phase = 'answer';
        } else {
          phase = 'show';
          r.steps.forEach((t, j) => timers.push(setTimeout(() => { dirs.innerHTML = ''; dirs.append(el('span', { class: 'mm-step big' }, `${j + 1}. ${t}`)); }, j * 1600)));
          timers.push(setTimeout(() => { dirs.innerHTML = ''; dirs.append(el('span', { class: 'muted' }, 'Where are you now? Tap the square.')); phase = 'answer'; }, r.steps.length * 1600));
        }
      }
      function tap(x, y) {
        if (phase !== 'answer') return;
        phase = 'done';
        const r = routes[i], ok = x === r.end.x && y === r.end.y;
        if (ok) right++;
        r.path.forEach(([px, py], j) => { if (j > 0) { const c = cell(px, py); c.classList.add('mm-path'); c.textContent = j; } });
        cell(r.end.x, r.end.y).classList.add('ok');
        if (!ok) cell(x, y).classList.add('bad');
        if (P.seq) { dirs.innerHTML = ''; r.steps.forEach(t => dirs.append(el('span', { class: 'mm-step' }, t))); }
        fb.innerHTML = ''; fb.append(el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Spot on' : '✗ Not quite — the numbered path shows the route'),
          el('button', { class: 'btn primary', style: { marginTop: '8px' }, onclick: () => { i++; if (i >= N) ctx.finish({ score: right / N * 100, summary: `${right} of ${N} routes followed correctly.` }); else show(); } }, i + 1 >= N ? 'See results' : 'Next →'));
      }
      show();
      return () => timers.forEach(clearTimeout);
    },
  });
})();

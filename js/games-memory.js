'use strict';
/* Memory & focus games: N-Back, Grid Recall, Focus Filter */
(() => {
  const { el, clamp } = Brain;

  /* ---------------- N-Back ---------------- */
  const NB = [
    { n: 1, dual: false, ms: 2500 }, { n: 2, dual: false, ms: 2500 }, { n: 3, dual: false, ms: 2500 },
    { n: 1, dual: true, ms: 2800 }, { n: 2, dual: true, ms: 2800 }, { n: 2, dual: true, ms: 2300 },
    { n: 3, dual: true, ms: 2800 }, { n: 3, dual: true, ms: 2300 }, { n: 4, dual: true, ms: 2800 }, { n: 4, dual: true, ms: 2300 },
  ];
  const LETTERS = 'CHKLQRST';
  function stream(rng, len, n, size) {
    const s = [];
    for (let i = 0; i < len; i++) {
      if (i >= n && rng.chance(0.3)) s.push(s[i - n]);
      else { let v; do { v = rng.int(0, size - 1); } while (i >= n && v === s[i - n]); s.push(v); }
    }
    return s;
  }
  function rates(s, resp, n) {
    let t = 0, h = 0, nt = 0, fa = 0;
    for (let i = n; i < s.length; i++) {
      if (s[i] === s[i - n]) { t++; if (resp[i]) h++; } else { nt++; if (resp[i]) fa++; }
    }
    return { t, h, nt, fa, d: (t ? h / t : 1) - (nt ? fa / nt : 0) };
  }

  Brain.register({
    id: 'nback', skill: 'memory', name: 'N-Back',
    blurb: 'Does this match what you saw N steps ago?',
    howTo: [
      'A square lights up on the grid, one step at a time.',
      'Press “Position” (or key A) when the square is in the same place as N steps back.',
      'At higher levels a letter appears too — press “Letter” (or key L) when it matches the letter N steps back.',
      'Score = hit rate minus false-alarm rate, so don’t spam the buttons.',
    ],
    levelInfo: l => { const p = NB[l - 1]; return `${p.n}-back, ${p.dual ? 'position + letter' : 'position only'}, ${(p.ms / 1000).toFixed(1)}s per step`; },
    tip: 'Keep a rolling “queue” in your head — rehearse the last N items as a little chant and update it every step. Accuracy first; speed comes later.',
    mount(root, ctx) {
      const P = NB[ctx.level - 1], len = 20 + P.n;
      const pos = stream(ctx.rng, len, P.n, 9);
      const let_ = P.dual ? stream(ctx.rng, len, P.n, LETTERS.length) : null;
      const rp = Array(len).fill(false), rl = Array(len).fill(false);
      let t = -1, timers = [];
      const cells = Array.from({ length: 9 }, () => el('div', { class: 'cell' }));
      const grid = el('div', { class: 'grid', style: { '--n': 3 } }, cells);
      const info = el('div', { class: 'statline' });
      const bPos = el('button', { class: 'btn', onclick: () => respond('p') }, 'Position (A)');
      const bLet = P.dual ? el('button', { class: 'btn', onclick: () => respond('l') }, 'Letter (L)') : null;
      root.append(el('div', { class: 'rule' }, `${P.n}-BACK`), info, grid, el('div', { class: 'nb-buttons' }, bPos, bLet));

      function respond(kind) {
        if (t < P.n) return;
        const arr = kind === 'p' ? rp : rl, s = kind === 'p' ? pos : let_, b = kind === 'p' ? bPos : bLet;
        if (!s || arr[t]) return;
        arr[t] = true;
        const hit = s[t] === s[t - P.n];
        b.classList.add(hit ? 'hit' : 'miss');
      }
      function step() {
        t++;
        cells.forEach(c => { c.classList.remove('lit'); c.textContent = ''; });
        bPos.classList.remove('hit', 'miss'); if (bLet) bLet.classList.remove('hit', 'miss');
        if (t >= len) return end();
        info.innerHTML = ''; info.append(el('span', {}, `Step ${t + 1} of ${len}`), el('span', { class: 'muted' }, t < P.n ? 'Memorise…' : 'Match?'));
        const c = cells[pos[t]];
        c.classList.add('lit');
        if (P.dual) c.textContent = LETTERS[let_[t]];
        timers.push(setTimeout(() => { c.classList.remove('lit'); c.textContent = ''; }, Math.min(1000, P.ms - 500)));
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
          details: el('div', { class: 'details' }, el('table', {}, el('tr', {}, el('th', {}, ''), el('th', {}, 'Matches caught'), el('th', {}, 'False alarms')), row('Position', a), b ? row('Letter', b) : null)),
        });
      }
      timers.push(setTimeout(step, 800));
      const off = Brain.onKeys(e => { const k = e.key.toLowerCase(); if (k === 'a') respond('p'); else if (k === 'l' && P.dual) respond('l'); });
      return () => { timers.forEach(clearTimeout); off(); };
    },
  });

  /* ---------------- Grid Recall ---------------- */
  Brain.register({
    id: 'gridrecall', skill: 'memory', name: 'Grid Recall',
    blurb: 'Memorise the lit squares, then tap them back.',
    howTo: [
      'Some squares light up briefly. Then tap all of them, in any order.',
      'Get it right and the next pattern is one square bigger; miss and it shrinks by one.',
      '8 rounds. Score = rounds passed.',
    ],
    levelInfo: l => { const s = l <= 3 ? 4 : l <= 7 ? 5 : 6; return `${s}×${s} grid, starting with ${2 + l} squares`; },
    tip: 'Don’t memorise squares one by one — see the shape. Group them into chunks (“an L in the corner, a pair in the middle”). Chunking is how memory experts beat their span.',
    mount(root, ctx) {
      const size = ctx.level <= 3 ? 4 : ctx.level <= 7 ? 5 : 6, ROUNDS = 8;
      let count = Math.min(size * size - 3, 2 + ctx.level), round = 0, wins = 0, best = 0, target = new Set(), found = new Set(), phase = 'wait', timers = [];
      const info = el('div', { class: 'statline' });
      const msg = el('div', { class: 'msg' });
      const cells = Array.from({ length: size * size }, (_, i) => el('button', { class: 'cell', 'aria-label': 'Square ' + (i + 1), onclick: () => tap(i) }));
      root.append(info, el('div', { class: 'grid', style: { '--n': size } }, cells), msg);

      function startRound() {
        round++;
        found = new Set();
        cells.forEach(c => c.className = 'cell');
        msg.textContent = ''; msg.className = 'msg';
        target = new Set(ctx.rng.shuffle([...Array(size * size).keys()]).slice(0, count));
        info.innerHTML = ''; info.append(el('span', {}, `Round ${round} of ${ROUNDS}`), el('span', {}, el('b', {}, count), ' squares'));
        phase = 'show';
        target.forEach(i => cells[i].classList.add('lit'));
        timers.push(setTimeout(() => { cells.forEach(c => c.classList.remove('lit')); phase = 'input'; msg.className = 'msg good'; msg.textContent = 'Your turn'; }, 700 + count * 150));
      }
      function tap(i) {
        if (phase !== 'input' || found.has(i)) return;
        if (target.has(i)) {
          found.add(i); cells[i].classList.add('ok');
          if (found.size === target.size) { wins++; best = Math.max(best, count); count = Math.min(size * size - 2, count + 1); nextRound(true); }
        } else {
          cells[i].classList.add('bad');
          target.forEach(j => { if (!found.has(j)) cells[j].classList.add('miss'); });
          count = Math.max(2, count - 1);
          nextRound(false);
        }
      }
      function nextRound(ok) {
        phase = 'wait';
        msg.className = 'msg' + (ok ? ' good' : ''); msg.textContent = ok ? '✓ Perfect' : '✗ Missed — shaded squares were in the pattern';
        timers.push(setTimeout(() => {
          if (round >= ROUNDS) return ctx.finish({ score: wins / ROUNDS * 100, summary: `${wins} of ${ROUNDS} rounds. Biggest pattern recalled: ${best || '—'} squares.` });
          startRound();
        }, ok ? 700 : 1500));
      }
      timers.push(setTimeout(startRound, 600));
      return () => timers.forEach(clearTimeout);
    },
  });

  /* ---------------- Focus Filter (Stroop + rule switching) ---------------- */
  const COLORS = [
    { name: 'RED', c: '#e5484d' }, { name: 'BLUE', c: '#3b82f6' },
    { name: 'GREEN', c: '#16a34a' }, { name: 'PURPLE', c: '#9b5cf6' },
  ];
  Brain.register({
    id: 'focus', skill: 'memory', name: 'Focus Filter',
    blurb: 'Name the ink colour, not the word. Ignore the distraction.',
    howTo: [
      'A colour word appears printed in a colour. Tap the button for the INK colour (keys 1–4 work too).',
      'From level 5, the rule sometimes flips to WORD — then answer what the word says. Watch the rule badge!',
      '45 seconds. Each wrong answer cancels out two right ones.',
    ],
    levelInfo: l => `${Math.round(Math.min(0.85, 0.45 + l * 0.05) * 100)}% conflicting words${l >= 5 ? ', rule switching' : ''}${l >= 9 ? ', shuffled buttons' : ''}`,
    tip: 'Let your eyes go slightly soft on the word and focus on the colour of the letters. Accuracy first: a slow right answer beats a fast wrong one.',
    mount(root, ctx) {
      const L = ctx.level, incP = Math.min(0.85, 0.45 + L * 0.05);
      const switching = L >= 5, shuffleBtns = L >= 9;
      let order = [0, 1, 2, 3], trial = null, rule = 'INK', correct = 0, wrong = 0, done = false;
      const log = [];
      const tm = Brain.timer(45, end);
      const ruleEl = el('div', { class: 'rule' });
      const word = el('div', { class: 'stroop' });
      const stat = el('div', { class: 'statline' });
      const btnBox = el('div', { class: 'choice-grid' });
      root.append(tm.node, stat, ruleEl, word, btnBox);

      function drawButtons() {
        btnBox.innerHTML = '';
        order.forEach((ci, pos) => btnBox.append(el('button', { class: 'btn', onclick: () => answer(ci) }, `${COLORS[ci].name}`, el('span', { class: 'muted small' }, ` ${pos + 1}`))));
      }
      function next() {
        const prevRule = rule;
        if (switching && ctx.rng.chance(0.3)) rule = rule === 'INK' ? 'WORD' : 'INK';
        const w = ctx.rng.int(0, 3);
        let ink = w;
        const inc = ctx.rng.chance(incP);
        if (inc) { do { ink = ctx.rng.int(0, 3); } while (ink === w); }
        trial = { w, ink, inc, sw: rule !== prevRule, t0: performance.now() };
        if (shuffleBtns) { order = ctx.rng.shuffle(order); drawButtons(); }
        ruleEl.textContent = rule === 'INK' ? 'Match the INK colour' : 'Match the WORD';
        ruleEl.className = 'rule' + (rule === 'WORD' ? ' word' : '');
        word.textContent = COLORS[w].name;
        word.style.color = COLORS[ink].c;
        stat.innerHTML = ''; stat.append(el('span', {}, 'Correct ', el('b', {}, correct)), el('span', {}, 'Wrong ', el('b', {}, wrong)));
      }
      function answer(ci) {
        if (done || !trial) return;
        const want = rule === 'INK' ? trial.ink : trial.w;
        const ok = ci === want;
        log.push({ ok, rt: performance.now() - trial.t0, inc: trial.inc, sw: trial.sw });
        ok ? correct++ : wrong++;
        word.classList.remove('flash-good', 'flash-bad'); void word.offsetWidth; word.classList.add(ok ? 'flash-good' : 'flash-bad');
        next();
      }
      function end() {
        done = true;
        const mean = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
        const okRt = f => mean(log.filter(x => x.ok && f(x)).map(x => x.rt));
        const rows = [['Matching words', okRt(x => !x.inc)], ['Conflicting words', okRt(x => x.inc)]];
        if (switching) rows.push(['Right after a rule switch', okRt(x => x.sw)]);
        ctx.finish({
          score: clamp((correct - 2 * wrong) / 35 * 100),
          summary: `${correct} correct, ${wrong} wrong.`,
          details: el('div', { class: 'details' }, el('table', {}, el('tr', {}, el('th', {}, 'Average response time'), el('th', {}, '')),
            rows.map(([k, v]) => el('tr', {}, el('td', {}, k), el('td', {}, v == null ? '—' : v + ' ms')))),
            el('p', { class: 'muted small' }, 'The gap between matching and conflicting words is your “interference cost”. Training shrinks it.')),
        });
      }
      drawButtons(); next();
      const off = Brain.onKeys(e => { if (/^[1-4]$/.test(e.key)) answer(order[+e.key - 1]); });
      return () => { tm.stop(); off(); };
    },
  });
})();

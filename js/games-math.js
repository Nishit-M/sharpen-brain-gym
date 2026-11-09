'use strict';
/* Math games: Equation Hunt, Make the Target, Speed Calc */
(() => {
  const { el, clamp } = Brain;
  const SYM = { '*': '×', '/': '÷', '-': '−', '+': '+' };
  const show = s => String(s).replace(/[*/+-]/g, c => SYM[c]);
  const fmt = v => Number.isInteger(v) ? String(v) : v.toFixed(2);

  /** Evaluate a flat expression of digits and + - * / with normal precedence.
   *  Returns null if invalid. strict = every division must be exact. */
  function evalExpr(s, strict) {
    if (!/^[0-9+\-*/]+$/.test(s)) return null;
    const t = s.match(/\d+|[+\-*/]/g);
    if (!t || t.length % 2 === 0) return null;
    for (let i = 0; i < t.length; i++) {
      const isNum = /^\d+$/.test(t[i]);
      if ((i % 2 === 0) !== isNum) return null;
      if (isNum && t[i].length > 1 && t[i][0] === '0') return null;
    }
    const terms = [+t[0]], ops = [];
    for (let i = 1; i < t.length; i += 2) {
      const op = t[i], n = +t[i + 1];
      if (op === '*') terms[terms.length - 1] *= n;
      else if (op === '/') {
        if (n === 0) return null;
        const q = terms[terms.length - 1] / n;
        if (strict && !Number.isInteger(q)) return null;
        terms[terms.length - 1] = q;
      } else { ops.push(op); terms.push(n); }
    }
    let v = terms[0];
    ops.forEach((op, i) => { v = op === '+' ? v + terms[i + 1] : v - terms[i + 1]; });
    return v;
  }

  function genEquation(rng, L) {
    const pool = ['+', '-', '*', '/', '+', '-', '*'];
    for (let tries = 0; tries < 20000; tries++) {
      const maxOps = Math.min(Math.floor((L - 1) / 2), L >= 7 ? 3 : 2);
      const nOps = rng.int(1, maxOps);
      const parts = Array(nOps + 1).fill(1);
      let rem = L - nOps - (nOps + 1), guard = 0;
      while (rem > 0 && guard++ < 60) { const i = rng.int(0, nOps); if (parts[i] < 3) { parts[i]++; rem--; } }
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

  function grade(guess, ans) {
    const res = Array(ans.length).fill('absent'), left = {};
    for (let i = 0; i < ans.length; i++) {
      if (guess[i] === ans[i]) res[i] = 'correct';
      else left[ans[i]] = (left[ans[i]] || 0) + 1;
    }
    for (let i = 0; i < ans.length; i++) {
      if (res[i] !== 'correct' && left[guess[i]] > 0) { res[i] = 'present'; left[guess[i]]--; }
    }
    return res;
  }

  const eqLen = lvl => lvl <= 2 ? 5 : lvl <= 5 ? 6 : lvl <= 8 ? 7 : 8;

  Brain.register({
    id: 'equation', skill: 'math', name: 'Equation Hunt',
    blurb: 'Deduce the hidden equation that equals today’s target.',
    howTo: [
      'Every guess must be a valid equation that equals the target (normal order of operations: × and ÷ before + and −).',
      'Green = right character, right place. Gold = in the equation, wrong place. Grey = not in it.',
      'You have 6 guesses. Fewer guesses = higher score.',
      'Keyboard works too: digits, + − * /, Backspace, Enter.',
    ],
    levelInfo: l => `${eqLen(l)}-character equations`,
    tip: 'Use your first guess to cover many different digits and operators — information beats luck. Then reason about which operator could produce the target before trying digits.',
    mount(root, ctx) {
      const L = eqLen(ctx.level), MAX = 6;
      const { eq, target } = genEquation(ctx.rng, L);
      const rank = { absent: 1, present: 2, correct: 3 };
      let row = 0, cur = '', over = false;
      const rows = [], rowEls = [], keys = {}, keyState = {};

      const msg = el('div', { class: 'msg' });
      const board = el('div', { class: 'eq-board' });
      for (let r = 0; r < MAX; r++) {
        const cells = Array.from({ length: L }, () => el('div', { class: 'tile' }));
        const rowEl = el('div', { class: 'eq-row', style: { '--cols': L } }, cells);
        rows.push(cells); rowEls.push(rowEl); board.append(rowEl);
      }
      const mk = (k, label, cls = '') => (keys[k] = el('button', { class: 'key ' + cls, onclick: () => press(k) }, label));
      const pad = el('div', { class: 'keypad' },
        el('div', { class: 'krow' }, '1234567890'.split('').map(d => mk(d, d))),
        el('div', { class: 'krow' }, mk('+', '+'), mk('-', '−'), mk('*', '×'), mk('/', '÷'), mk('Backspace', '⌫', 'wide'), mk('Enter', 'Enter', 'wide primary')));
      root.append(el('div', { class: 'target' }, 'Find the equation that equals', el('b', {}, target)), board, msg, pad);

      const say = t => { msg.textContent = t; rowEls[row].classList.remove('shake'); void rowEls[row].offsetWidth; rowEls[row].classList.add('shake'); };
      function paint() { rows[row].forEach((c, i) => { c.textContent = cur[i] ? show(cur[i]) : ''; c.classList.toggle('filled', !!cur[i]); }); }
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
        const res = grade(cur, eq), g = cur, r = row;
        res.forEach((st, i) => {
          setTimeout(() => rows[r][i].classList.add(st), i * 90);
          if (!keyState[g[i]] || rank[st] > rank[keyState[g[i]]]) {
            if (keyState[g[i]]) keys[g[i]].classList.remove(keyState[g[i]]);
            keyState[g[i]] = st; keys[g[i]].classList.add(st);
          }
        });
        const won = g === eq;
        row++; cur = '';
        if (won || row >= MAX) {
          over = true;
          const used = row;
          setTimeout(() => ctx.finish({
            score: won ? [100, 100, 90, 80, 70, 60][used - 1] : 10,
            summary: won ? `Solved in ${used} of ${MAX} guesses.` : `Not this time. It was ${show(eq)} = ${target}.`,
          }), L * 90 + 700);
        }
      }
      return Brain.onKeys(e => {
        let k = e.key;
        if (k === 'x' || k === 'X') k = '*';
        if (/^[0-9+\-*/]$/.test(k) || k === 'Backspace' || k === 'Enter') { e.preventDefault(); press(k); }
      });
    },
  });

  /* ---------------- Make the Target ---------------- */
  function genTarget(rng, lvl) {
    const count = lvl <= 3 ? 4 : lvl <= 7 ? 5 : 6;
    const [lo, hi] = lvl <= 2 ? [10, 60] : lvl <= 4 ? [30, 150] : lvl <= 6 ? [100, 400] : [100, 999];
    for (let tries = 0; tries < 5000; tries++) {
      const nLarge = lvl <= 2 ? rng.int(0, 1) : rng.int(1, 2);
      const large = rng.shuffle([25, 50, 75, 100]).slice(0, nLarge);
      const small = Array.from({ length: count - nLarge }, () => rng.int(1, 10));
      const nums = rng.shuffle([...large, ...small]);
      const k = rng.int(Math.min(3, count), count);
      const use = rng.shuffle(nums).slice(0, k);
      let v = use[0];
      const steps = [];
      for (let i = 1; i < k; i++) {
        const b = use[i], opts = ['+'];
        if (v - b > 0) opts.push('-');
        if (b - v > 0) opts.push('r-');
        if (v > 1 && b > 1 && v * b <= 2000) opts.push('*', '*');
        if (b > 1 && v % b === 0) opts.push('/');
        if (v > 1 && b % v === 0 && b !== v) opts.push('r/');
        const op = rng.pick(opts);
        let n;
        if (op === '+') { n = v + b; steps.push(`${v} + ${b} = ${n}`); }
        else if (op === '-') { n = v - b; steps.push(`${v} − ${b} = ${n}`); }
        else if (op === 'r-') { n = b - v; steps.push(`${b} − ${v} = ${n}`); }
        else if (op === '*') { n = v * b; steps.push(`${v} × ${b} = ${n}`); }
        else if (op === '/') { n = v / b; steps.push(`${v} ÷ ${b} = ${n}`); }
        else { n = b / v; steps.push(`${b} ÷ ${v} = ${n}`); }
        v = n;
      }
      if (v < lo || v > hi || nums.includes(v)) continue;
      return { nums, target: v, steps };
    }
    return { nums: [2, 3, 5, 7], target: 31, steps: ['2 × 3 = 6', '6 × 5 = 30', '30 + 7 = 37'] };
  }

  Brain.register({
    id: 'target', skill: 'math', name: 'Make the Target',
    blurb: 'Combine the numbers with + − × ÷ to hit the target.',
    howTo: [
      'Tap a number, an operator, then another number to combine them into a new number.',
      'Each number can be used once. You don’t have to use them all.',
      'Results must be whole positive numbers. Undo anytime.',
      'Hit the target exactly for full marks; faster is better. Otherwise, closest wins partial credit.',
    ],
    levelInfo: l => { const c = l <= 3 ? 4 : l <= 7 ? 5 : 6; return `${c} numbers, targets up to ${l <= 2 ? 60 : l <= 4 ? 150 : l <= 6 ? 400 : 999}`; },
    tip: 'Work backwards: find a multiple of a big number near the target (e.g. 4 × 25 = 100), then fix the remainder with the small numbers.',
    mount(root, ctx) {
      const { nums, target, steps: solution } = genTarget(ctx.rng, ctx.level);
      const limit = ctx.level <= 3 ? 150 : ctx.level <= 6 ? 120 : 100;
      let tiles = nums.map((v, i) => ({ v, id: i, made: false }));
      let steps = [], history = [], sel = null, op = null, nextId = 100;
      let closest = Math.min(...nums.map(n => Math.abs(n - target)));
      const tm = Brain.timer(limit, () => end(false));
      const tileBox = el('div', { class: 'num-tiles' });
      const opBtns = {};
      const ops = el('div', { class: 'ops' }, ['+', '-', '*', '/'].map(o => (opBtns[o] = el('button', { class: 'op', onclick: () => pickOp(o) }, SYM[o]))));
      const stepList = el('ul', { class: 'steps' });
      const msg = el('div', { class: 'msg' });
      root.append(tm.node, el('div', { class: 'big-target' }, el('span', { class: 'muted' }, 'Target'), el('b', {}, target)), tileBox, ops, msg, stepList,
        el('div', { class: 'toolbar' },
          el('button', { class: 'btn', onclick: undo }, '↶ Undo'),
          el('button', { class: 'btn', onclick: resetAll }, 'Reset'),
          el('button', { class: 'btn', onclick: () => end(false) }, 'I’m done')));

      function render() {
        tileBox.innerHTML = '';
        tiles.forEach(t => tileBox.append(el('button', { class: 'num' + (t.made ? ' made' : '') + (sel === t.id ? ' sel' : ''), onclick: () => pickTile(t.id) }, t.v)));
        Object.entries(opBtns).forEach(([o, b]) => b.classList.toggle('sel', op === o));
        stepList.innerHTML = '';
        steps.forEach(s => stepList.append(el('li', {}, s)));
      }
      function pickTile(id) {
        msg.textContent = '';
        if (sel === null || op === null) { sel = sel === id ? null : id; render(); return; }
        if (id === sel) { sel = null; op = null; render(); return; }
        const a = tiles.find(t => t.id === sel), b = tiles.find(t => t.id === id);
        let v;
        if (op === '+') v = a.v + b.v;
        else if (op === '-') v = a.v - b.v;
        else if (op === '*') v = a.v * b.v;
        else v = a.v / b.v;
        if (v <= 0) { msg.textContent = 'Result must be positive'; return; }
        if (!Number.isInteger(v)) { msg.textContent = `${a.v} ÷ ${b.v} isn’t a whole number`; return; }
        history.push({ tiles: tiles.slice(), steps: steps.slice() });
        const idx = tiles.indexOf(b);
        tiles = tiles.filter(t => t !== a && t !== b);
        tiles.splice(Math.min(idx, tiles.length), 0, { v, id: nextId++, made: true });
        steps.push(`${a.v} ${SYM[op]} ${b.v} = ${v}`);
        closest = Math.min(closest, Math.abs(v - target));
        sel = null; op = null;
        render();
        if (v === target) end(true);
      }
      function pickOp(o) { if (sel === null) { msg.textContent = 'Pick a number first'; return; } op = op === o ? null : o; render(); }
      function undo() { const h = history.pop(); if (!h) return; tiles = h.tiles; steps = h.steps; sel = op = null; render(); }
      function resetAll() { if (!history.length) return; const h = history[0]; history = []; tiles = h.tiles; steps = h.steps; sel = op = null; render(); }
      function end(hit) {
        tm.stop();
        const t = tm.elapsed();
        const details = el('div', { class: 'details' }, el('b', {}, 'One way to make ' + target + ':'), el('ul', {}, solution.map(s => el('li', {}, s))));
        if (hit) ctx.finish({ score: t <= 30 ? 100 : Math.max(70, 100 - (t - 30) / (limit - 30) * 30), summary: `Made ${target} in ${Math.round(t)}s.`, details });
        else ctx.finish({ score: Math.max(0, 60 - closest * 8), summary: closest === 0 ? 'Target reached.' : `Closest you got: ${closest} away from ${target}.`, details });
      }
      render();
      return () => tm.stop();
    },
  });

  /* ---------------- Speed Calc ---------------- */
  function genProblem(rng, lvl) {
    const r = (a, b) => rng.int(a, b);
    const add = m => { const a = r(1, m), b = r(1, m); return { q: `${a} + ${b}`, a: a + b }; };
    const sub = m => { const a = r(3, m), b = r(1, a - 1); return { q: `${a} − ${b}`, a: a - b }; };
    const mul = (m1, m2) => { const a = r(2, m1), b = r(2, m2); return { q: `${a} × ${b}`, a: a * b }; };
    const div = (m1, m2) => { const b = r(2, m1), q = r(2, m2); return { q: `${b * q} ÷ ${b}`, a: q }; };
    const pct = () => { const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 75]); const base = rng.pick([20, 40, 60, 80, 120, 160, 200, 240, 300, 400, 500, 600, 800]); const v = p * base / 100; return Number.isInteger(v) ? { q: `${p}% of ${base}`, a: v } : null; };
    const sq = () => { const a = r(11, 25); return { q: `${a}²`, a: a * a }; };
    const combo = () => { const a = r(2, 12), b = r(2, 12), c = r(1, 50); return { q: `${a} × ${b} + ${c}`, a: a * b + c }; };
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
    do { p = rng.pick(table[lvl - 1])(); } while (!p);
    return p;
  }

  Brain.register({
    id: 'speed', skill: 'math', name: 'Speed Calc',
    blurb: '60-second mental arithmetic sprint.',
    howTo: [
      'Solve as many problems as you can in 60 seconds.',
      'Just type the answer — it checks automatically once you’ve typed enough digits.',
      'Wrong answers cost a point. Press Skip (or Enter) to pass on a problem (counts as wrong).',
      '20 net correct = 100 points.',
    ],
    levelInfo: l => ['add/subtract within 20', 'within 50, small times tables', 'within 100, times tables', '2-digit sums, division', 'sums to 200, 12× tables', 'percentages, 2-digit × 1-digit', 'squares, bigger division', '3-term problems', 'larger multiplication', '2-digit × 2-digit'][l - 1],
    tip: 'Break problems apart: 47 × 6 = 40×6 + 7×6 = 240 + 42. For percentages, find 10% first and scale.',
    mount(root, ctx) {
      let p = genProblem(ctx.rng, ctx.level), input = '', correct = 0, wrong = 0, done = false;
      const tm = Brain.timer(60, finish);
      const qEl = el('div', { class: 'problem' }, p.q);
      const aEl = el('div', { class: 'answer' });
      const stat = el('div', { class: 'statline' });
      const updStat = () => { stat.innerHTML = ''; stat.append(el('span', {}, 'Correct ', el('b', {}, correct)), el('span', {}, 'Wrong ', el('b', {}, wrong))); };
      const key = (k, label, cls = '') => el('button', { class: 'key ' + cls, onclick: () => press(k) }, label);
      const pad = el('div', { class: 'keypad' },
        ['123', '456', '789'].map(rw => el('div', { class: 'krow' }, rw.split('').map(d => key(d, d)))),
        el('div', { class: 'krow' }, key('Backspace', '⌫'), key('0', '0'), key('Enter', 'Skip', 'primary')));
      root.append(tm.node, stat, qEl, aEl, pad);
      updStat();

      function flash(cls) { aEl.classList.remove('wrong', 'right'); void aEl.offsetWidth; aEl.classList.add(cls); setTimeout(() => aEl.classList.remove(cls), 250); }
      let lock = false;
      function next() { p = genProblem(ctx.rng, ctx.level); qEl.textContent = p.q; input = ''; aEl.textContent = ''; lock = false; updStat(); }
      function press(k) {
        if (done || lock) return;
        if (k === 'Backspace') { input = input.slice(0, -1); aEl.textContent = input; return; }
        if (k === 'Enter') { wrong++; flash('wrong'); next(); return; }
        if (input.length >= 6) return;
        input += k; aEl.textContent = input;
        const ans = String(p.a);
        if (input === ans) { correct++; lock = true; flash('right'); setTimeout(next, 120); }
        else if (input.length >= ans.length) { wrong++; lock = true; flash('wrong'); setTimeout(next, 250); }
      }
      function finish() {
        done = true;
        ctx.finish({ score: clamp((correct - wrong) * 5), summary: `${correct} correct, ${wrong} wrong in 60 seconds.` });
      }
      const off = Brain.onKeys(e => { if (/^[0-9]$/.test(e.key) || e.key === 'Backspace' || e.key === 'Enter') { e.preventDefault(); press(e.key); } });
      return () => { tm.stop(); off(); };
    },
  });
})();

'use strict';
/* Logic games: Codebreaker, Logic Grid, Pattern Next */
(() => {
  const { el } = Brain;

  /* ---------------- Codebreaker ---------------- */
  const PEG = ['#e5484d', '#3b82f6', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#0d9488', '#78716c'];
  const CB = [
    { c: 5, len: 4, rep: false }, { c: 5, len: 4, rep: false }, { c: 6, len: 4, rep: false }, { c: 6, len: 4, rep: false },
    { c: 6, len: 4, rep: true }, { c: 6, len: 4, rep: true }, { c: 7, len: 4, rep: true }, { c: 7, len: 4, rep: true },
    { c: 8, len: 5, rep: true }, { c: 8, len: 5, rep: true },
  ];
  function allCodes(c, len, rep) {
    const out = [];
    const rec = pre => {
      if (pre.length === len) { out.push(pre); return; }
      for (let i = 0; i < c; i++) if (rep || !pre.includes(i)) rec([...pre, i]);
    };
    rec([]);
    return out;
  }
  function feedback(g, s) {
    let b = 0; const cg = {}, cs = {};
    for (let i = 0; i < g.length; i++) {
      if (g[i] === s[i]) b++;
      else { cg[g[i]] = (cg[g[i]] || 0) + 1; cs[s[i]] = (cs[s[i]] || 0) + 1; }
    }
    let w = 0;
    for (const k in cg) w += Math.min(cg[k], cs[k] || 0);
    return { b, w };
  }

  Brain.register({
    id: 'codebreaker', skill: 'logic', name: 'Codebreaker',
    blurb: 'Crack the hidden colour code using peg clues.',
    howTo: [
      'Fill a row with colours and submit a guess.',
      '● Black peg = right colour in the right spot. ○ White peg = right colour, wrong spot. (Pegs are not in order.)',
      'The counter shows how many codes are still possible given all your clues.',
      'Crack it in 10 guesses — fewer is better.',
    ],
    levelInfo: l => { const p = CB[l - 1]; return `${p.len} pegs, ${p.c} colours, ${p.rep ? 'repeats allowed' : 'no repeats'}`; },
    tip: 'Only play guesses that could still be the answer given every clue so far — the results screen tells you how many of yours were. Each guess should split the remaining possibilities as evenly as possible.',
    mount(root, ctx) {
      const P = CB[ctx.level - 1], MAX = 10;
      const secret = Array.from({ length: P.len }, () => 0);
      {
        const pool = ctx.rng.shuffle([...Array(P.c).keys()]);
        for (let i = 0; i < P.len; i++) secret[i] = P.rep ? ctx.rng.int(0, P.c - 1) : pool[i];
      }
      let remaining = allCodes(P.c, P.len, P.rep);
      let cur = [], guesses = 0, consistent = 0, over = false;
      const rowsEl = el('div', { class: 'cb-rows' });
      const curPegs = el('div', { class: 'cb-pegs' });
      const curRow = el('div', { class: 'cb-row current' }, el('span', { class: 'muted small' }, '1'), curPegs);
      const msg = el('div', { class: 'msg' });
      const submitBtn = el('button', { class: 'btn primary', onclick: submit }, 'Submit guess');
      const pegEl = (ci, extra = {}) => el(extra.tag || 'span', { class: 'peg on', style: { background: PEG[ci] }, ...extra.props }, ci + 1);
      const palette = el('div', { class: 'palette' }, Array.from({ length: P.c }, (_, i) => pegEl(i, { tag: 'button', props: { 'aria-label': 'Colour ' + (i + 1), onclick: () => add(i) } })));
      root.append(el('div', { class: 'statline' }, el('span', {}, 'Possible codes: ', el('b', { id: 'cb-left' }, remaining.length)), el('span', {}, `${P.len} pegs · ${P.c} colours${P.rep ? ' · repeats on' : ''}`)),
        rowsEl, curRow, msg, palette,
        el('div', { class: 'toolbar' }, el('button', { class: 'btn', onclick: () => { cur.pop(); draw(); } }, '⌫ Back'), submitBtn));
      const leftEl = root.querySelector('#cb-left');

      function draw() {
        curPegs.innerHTML = '';
        for (let i = 0; i < P.len; i++) {
          curPegs.append(cur[i] != null
            ? pegEl(cur[i], { tag: 'button', props: { onclick: () => { cur.splice(i, 1); draw(); } } })
            : el('span', { class: 'peg' }));
        }
        submitBtn.disabled = cur.length < P.len;
      }
      function add(ci) {
        if (over || cur.length >= P.len) return;
        if (!P.rep && cur.includes(ci)) { msg.textContent = 'No repeated colours at this level'; return; }
        msg.textContent = '';
        cur.push(ci); draw();
      }
      function submit() {
        if (over || cur.length < P.len) return;
        const g = cur.slice();
        const key = g.join();
        if (remaining.some(c => c.join() === key)) consistent++;
        const fb = feedback(g, secret);
        remaining = remaining.filter(c => { const f = feedback(g, c); return f.b === fb.b && f.w === fb.w; });
        guesses++;
        const fbEl = el('div', { class: 'cb-fb', title: `${fb.b} black, ${fb.w} white` },
          [...Array(fb.b).fill('b'), ...Array(fb.w).fill('w'), ...Array(P.len - fb.b - fb.w).fill('')].map(t => el('span', { class: 'fbp ' + t })));
        rowsEl.append(el('div', { class: 'cb-row' }, el('span', { class: 'muted small' }, guesses), el('div', { class: 'cb-pegs' }, g.map(ci => pegEl(ci))), fbEl,
          el('span', { class: 'cb-left' }, remaining.length + ' left')));
        leftEl.textContent = remaining.length;
        cur = [];
        curRow.firstChild.textContent = guesses + 1;
        draw();
        if (fb.b === P.len || guesses >= MAX) {
          over = true;
          const won = fb.b === P.len;
          curRow.remove();
          const details = el('div', { class: 'details' },
            el('p', {}, 'The code: ', el('span', { class: 'cb-pegs', style: { display: 'inline-flex', verticalAlign: 'middle' } }, secret.map(ci => pegEl(ci)))),
            el('p', {}, `${consistent} of ${guesses} guesses were consistent with all earlier clues.`));
          setTimeout(() => ctx.finish({
            score: won ? (guesses <= 4 ? 100 : Math.max(40, 100 - (guesses - 4) * 10)) : 10,
            summary: won ? `Cracked in ${guesses} guess${guesses > 1 ? 'es' : ''}.` : 'The code held out this time.',
            details,
          }), 600);
        }
      }
      draw();
      return Brain.onKeys(e => {
        if (/^[1-8]$/.test(e.key) && +e.key <= P.c) add(+e.key - 1);
        else if (e.key === 'Backspace') { cur.pop(); draw(); }
        else if (e.key === 'Enter') { e.preventDefault(); submit(); }
      });
    },
  });

  /* ---------------- Logic Grid ---------------- */
  const NAMES = ['Asha', 'Ben', 'Chen', 'Dev', 'Eva', 'Farah', 'Gus', 'Hana', 'Ivan', 'Jia'];
  const NAME_CAT = { label: 'Name', pos: v => `is ${v}`, neg: v => `is not ${v}`, subj: v => v };
  const CATS = [
    { label: 'Pet', vals: ['cat', 'dog', 'parrot', 'fish', 'rabbit', 'turtle'], pos: v => `owns the ${v}`, neg: v => `does not own the ${v}`, subj: v => `the ${v} owner` },
    { label: 'Drink', vals: ['tea', 'coffee', 'juice', 'milk', 'cocoa', 'lemonade'], pos: v => `drinks ${v}`, neg: v => `does not drink ${v}`, subj: v => `the ${v} drinker` },
    { label: 'Colour', vals: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'], pos: v => `likes ${v}`, neg: v => `does not like ${v}`, subj: v => `the person who likes ${v}` },
    { label: 'City', vals: ['Paris', 'Tokyo', 'Cairo', 'Lima', 'Oslo', 'Delhi'], pos: v => `lives in ${v}`, neg: v => `does not live in ${v}`, subj: v => `the person from ${v}` },
    { label: 'Hobby', vals: ['chess', 'tennis', 'painting', 'guitar', 'hiking', 'baking'], pos: v => `enjoys ${v}`, neg: v => `does not enjoy ${v}`, subj: v => `the ${v} fan` },
  ];
  const LG = l => l <= 3 ? { n: 3, k: 2 } : l <= 6 ? { n: 4, k: 2 } : l <= 8 ? { n: 4, k: 3 } : { n: 5, k: 2 };
  function perms(n) {
    const out = [], a = [...Array(n).keys()];
    const rec = k => {
      if (k === n) { out.push(a.slice()); return; }
      for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; rec(k + 1); [a[k], a[i]] = [a[i], a[k]]; }
    };
    rec(0);
    return out;
  }
  const cap = s => s[0].toUpperCase() + s.slice(1);

  function genLogic(rng, lvl) {
    const { n, k } = LG(lvl);
    const P = perms(n), id = P[0].map((_, i) => i);
    let all = [[id]];
    for (let c = 0; c < k; c++) { const nx = []; for (const r of all) for (const p of P) nx.push([...r, p]); all = nx; }
    const cats = [NAME_CAT, ...rng.shuffle(CATS).slice(0, k)];
    const labels = [rng.shuffle(NAMES).slice(0, n), ...cats.slice(1).map(c => rng.shuffle(c.vals).slice(0, n))];
    const T = [id, ...Array.from({ length: k }, () => rng.shuffle(id))];
    const val = (a, c, p) => a[c][p];
    const who = (a, c, v) => a[c].indexOf(v);
    const L = (c, v) => labels[c][v];
    const subj = (c, v) => cats[c].subj(L(c, v));
    const hard = lvl >= 4;

    function randClue() {
      const roll = rng.next();
      const type = roll < (hard ? 0.15 : 0.35) ? 'same' : roll < (hard ? 0.62 : 0.8) ? 'diff' : 'either';
      const c1 = rng.int(0, k);
      let c2 = rng.int(0, k); while (c2 === c1) c2 = rng.int(0, k);
      const p = rng.int(0, n - 1);
      let q = rng.int(0, n - 1); while (q === p) q = rng.int(0, n - 1);
      const v1 = val(T, c1, p);
      if (type === 'same') {
        const v2 = val(T, c2, p);
        return { key: `s${c1}.${v1}.${c2}.${v2}`, test: a => val(a, c2, who(a, c1, v1)) === v2, text: `${cap(subj(c1, v1))} ${cats[c2].pos(L(c2, v2))}.` };
      }
      if (type === 'diff') {
        const v2 = val(T, c2, q);
        return { key: `d${c1}.${v1}.${c2}.${v2}`, test: a => val(a, c2, who(a, c1, v1)) !== v2, text: `${cap(subj(c1, v1))} ${cats[c2].neg(L(c2, v2))}.` };
      }
      let vA = val(T, c2, p), vB = val(T, c2, q);
      if (rng.chance(0.5)) [vA, vB] = [vB, vA];
      const text = c2 === 0
        ? `${cap(subj(c1, v1))} is either ${L(0, vA)} or ${L(0, vB)}.`
        : `${cap(subj(c1, v1))} either ${cats[c2].pos(L(c2, vA))} or ${cats[c2].pos(L(c2, vB))}.`;
      return { key: `e${c1}.${v1}.${c2}.${Math.min(vA, vB)}.${Math.max(vA, vB)}`, test: a => { const x = val(a, c2, who(a, c1, v1)); return x === vA || x === vB; }, text };
    }

    let cands = all, clues = [], seen = new Set(), guard = 0;
    while (cands.length > 1 && guard++ < 2000) {
      const cl = randClue();
      if (seen.has(cl.key)) continue;
      seen.add(cl.key);
      const nx = cands.filter(cl.test);
      if (nx.length === cands.length) continue;
      clues.push(cl); cands = nx;
    }
    const unique = cs => { let cnt = 0; for (const a of all) { if (cs.every(c => c.test(a))) { if (++cnt > 1) return false; } } return cnt === 1; };
    for (const cl of rng.shuffle(clues.slice())) {
      const others = clues.filter(x => x !== cl);
      if (unique(others)) clues = others;
    }
    return { n, k, cats, labels, T, clues: rng.shuffle(clues) };
  }

  Brain.register({
    id: 'logicgrid', skill: 'logic', name: 'Logic Grid',
    blurb: 'Use the clues to work out who has what.',
    howTo: [
      'Each person has exactly one item from each category, and no two people share an item.',
      'Tap an option once to cross it out (✗), twice to mark it as the answer (✓), again to clear.',
      'Tap a clue to strike it through once you’ve used it.',
      'Press Check when every person has a ✓ in every category. You get 3 checks.',
    ],
    levelInfo: l => { const { n, k } = LG(l); return `${n} people, ${k} categories`; },
    tip: 'When a clue rules something out, ask what else it forces. If only one option is left in a row, it’s the answer — and that answer is then crossed off for everyone else.',
    mount(root, ctx) {
      const pz = genLogic(ctx.rng, ctx.level);
      const { n, k, cats, labels, T, clues } = pz;
      const marks = Array.from({ length: n }, () => Array.from({ length: k }, () => Array(n).fill(0))); // 0 none, 1 x, 2 yes
      let checks = 0;
      const msg = el('div', { class: 'msg' });
      const people = el('div', { class: 'people' });
      root.append(el('h4', {}, 'Clues'),
        el('ol', { class: 'clues' }, clues.map(c => el('li', { onclick: e => e.currentTarget.classList.toggle('struck') }, c.text))),
        people, msg,
        el('div', { class: 'toolbar' }, el('button', { class: 'btn primary', onclick: check }, 'Check answers')));

      function draw() {
        people.innerHTML = '';
        for (let p = 0; p < n; p++) {
          people.append(el('div', { class: 'person' }, el('h4', {}, labels[0][p]),
            Array.from({ length: k }, (_, ci) => el('div', { class: 'attr' }, el('span', { class: 'attr-label' }, cats[ci + 1].label),
              labels[ci + 1].map((lab, v) => el('button', {
                class: 'opt' + (marks[p][ci][v] === 1 ? ' x' : marks[p][ci][v] === 2 ? ' yes' : ''),
                onclick: () => { marks[p][ci][v] = (marks[p][ci][v] + 1) % 3; draw(); },
              }, lab))))));
        }
      }
      function check() {
        let missing = 0, wrong = 0;
        for (let p = 0; p < n; p++) for (let ci = 0; ci < k; ci++) {
          const yes = marks[p][ci].map((m, v) => m === 2 ? v : -1).filter(v => v >= 0);
          if (yes.length !== 1) missing++;
          else if (yes[0] !== T[ci + 1][p]) wrong++;
        }
        if (missing) { msg.textContent = `Mark exactly one ✓ per category for everyone (${missing} still open).`; return; }
        checks++;
        const solution = el('div', { class: 'details' }, el('table', {},
          el('tr', {}, cats.map(c => el('th', {}, c.label))),
          Array.from({ length: n }, (_, p) => el('tr', {}, cats.map((c, ci) => el('td', {}, labels[ci][T[ci][p]]))))));
        if (wrong === 0) return ctx.finish({ score: [100, 75, 50][checks - 1], summary: `Solved on check ${checks} of 3.`, details: solution });
        if (checks >= 3) return ctx.finish({ score: 15, summary: 'Out of checks. Here’s the solution:', details: solution });
        msg.textContent = `${wrong} answer${wrong > 1 ? 's are' : ' is'} wrong. ${3 - checks} check${3 - checks > 1 ? 's' : ''} left.`;
      }
      draw();
    },
  });

  /* ---------------- Pattern Next ---------------- */
  const RULES = [
    { min: 1, gen: r => { const a = r.int(1, 20), d = r.int(2, 9); return { f: i => a + d * i, rule: `Add ${d} each time` }; } },
    { min: 1, gen: r => { const a = r.int(60, 120), d = r.int(2, 9); return { f: i => a - d * i, rule: `Subtract ${d} each time` }; } },
    { min: 2, gen: r => { const a = r.int(1, 5), m = r.int(2, 3); return { f: i => a * m ** i, rule: `Multiply by ${m} each time` }; } },
    { min: 3, gen: r => { const s = r.int(1, 5), c = r.int(0, 5); return { f: i => (s + i) ** 2 + c, rule: c ? `Square numbers plus ${c} (${s}²+${c}, ${s + 1}²+${c}, …)` : `Square numbers (${s}², ${s + 1}², …)` }; } },
    { min: 3, show: 6, gen: r => { const a = r.int(1, 15), x = r.int(2, 9); let y = r.int(1, 9); while (y === x) y = r.int(1, 9); return { f: i => a + Math.ceil(i / 2) * x + Math.floor(i / 2) * y, rule: `Alternately add ${x} and ${y}` }; } },
    { min: 4, gen: r => { const a = r.int(1, 10), d = r.int(1, 5), s = r.int(1, 3); return { f: i => a + d * i + s * i * (i - 1) / 2, rule: `The gap grows by ${s} each step (+${d}, +${d + s}, +${d + 2 * s}, …)` }; } },
    { min: 5, show: 6, gen: r => { const a = r.int(1, 5), b = r.int(a, 8); const s = [a, b]; for (let i = 2; i < 10; i++) s.push(s[i - 1] + s[i - 2]); return { f: i => s[i], rule: 'Each term is the sum of the two before it' }; } },
    { min: 6, gen: r => { let c = r.int(-3, 3); if (c === 0) c = 1; const a = c < 0 ? r.int(4, 8) : r.int(2, 6); const s = [a]; for (let i = 1; i < 10; i++) s.push(s[i - 1] * 2 + c); return { f: i => s[i], rule: `Double, then ${c > 0 ? 'add ' + c : 'subtract ' + -c}` }; } },
    { min: 6, show: 6, gen: r => { const a = r.int(1, 6), kk = r.int(1, 6); const s = [a]; for (let i = 1; i < 10; i++) s.push(i % 2 ? s[i - 1] * 2 : s[i - 1] + kk); return { f: i => s[i], rule: `Alternately ×2 and +${kk}` }; } },
    { min: 7, show: 7, gen: r => { const a = r.int(1, 20), d1 = r.int(2, 6), b = r.int(30, 60), d2 = -r.int(2, 6); return { f: i => i % 2 === 0 ? a + d1 * (i / 2) : b + d2 * ((i - 1) / 2), rule: `Two interleaved sequences: one goes +${d1}, the other ${d2}` }; } },
    { min: 7, gen: r => { const s = r.int(1, 6); return { f: i => (s + i) * (s + i + 1) / 2, rule: 'Triangular numbers (gaps grow by 1: n(n+1)/2)' }; } },
    { min: 8, gen: r => { const s = r.int(1, 4); return { f: i => (s + i) ** 3, rule: `Cube numbers (${s}³, ${s + 1}³, …)` }; } },
    { min: 8, gen: r => { const a = r.int(1, 10), d = r.int(1, 4); return { f: i => a + d * (2 ** i - 1), rule: `The gap doubles each time (+${d}, +${2 * d}, +${4 * d}, …)` }; } },
    { min: 9, gen: r => { const pr = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61]; const o = r.int(0, 8); return { f: i => pr[o + i], rule: 'Prime numbers' }; } },
    { min: 9, gen: r => { const s = [r.int(10, 40)]; const ds = x => String(x).split('').reduce((t, d) => t + +d, 0); for (let i = 1; i < 10; i++) s.push(s[i - 1] + ds(s[i - 1])); return { f: i => s[i], rule: 'Add the sum of the digits each time (e.g. 23 → 23+2+3 = 28)' }; } },
    { min: 10, show: 6, gen: r => { const s = [r.int(1, 2), r.int(2, 3)]; for (let i = 2; i < 10; i++) s.push(s[i - 1] * s[i - 2]); return { f: i => s[i], rule: 'Each term is the product of the two before it' }; } },
    { min: 10, gen: r => { const a = r.int(2, 5); return { f: i => (i + 1) * (a + i), rule: `n × (n+${a - 1}): 1×${a}, 2×${a + 1}, 3×${a + 2}, …` }; } },
  ];

  Brain.register({
    id: 'pattern', skill: 'logic', name: 'Pattern Next',
    blurb: 'Spot the rule and give the next number.',
    howTo: [
      'Each round shows a sequence of numbers. Type the next one.',
      'After each answer you’ll see the hidden rule.',
      '6 sequences per game. Score = share correct.',
    ],
    levelInfo: l => `rules up to tier ${l} (${RULES.filter(r => r.min <= l).length} rule types)`,
    tip: 'Write the differences between terms. If they aren’t constant, take differences of differences, or check ratios. Alternating patterns show up when every other term behaves.',
    mount(root, ctx) {
      const pool = RULES.filter(r => r.min <= ctx.level);
      const weighted = pool.flatMap(r => r.min >= ctx.level - 3 ? [r, r, r] : [r]);
      const qs = [], used = new Set();
      for (let tries = 0; qs.length < 6 && tries < 200; tries++) {
        const R = ctx.rng.pick(weighted);
        if (used.has(R) && used.size < pool.length) continue;
        used.add(R);
        const g = R.gen(ctx.rng), show = R.show || 5;
        const seq = Array.from({ length: show }, (_, i) => g.f(i));
        qs.push({ seq, ans: g.f(show), rule: g.rule });
      }
      let qi = 0, correct = 0, answered = false;
      const prog = el('div', { class: 'statline' });
      const seqEl = el('div', { class: 'seq' });
      const input = el('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'Next number', placeholder: '?' });
      const btn = el('button', { class: 'btn primary', onclick: act }, 'Answer');
      const fb = el('div', { class: 'feedback' });
      root.append(prog, seqEl, el('div', { class: 'answer-row' }, input, btn), fb);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); act(); } });

      function show() {
        const q = qs[qi];
        prog.innerHTML = ''; prog.append(el('span', {}, `Sequence ${qi + 1} of ${qs.length}`), el('span', {}, 'Correct ', el('b', {}, correct)));
        seqEl.innerHTML = ''; q.seq.forEach(v => seqEl.append(el('span', {}, v))); seqEl.append(el('span', { class: 'q' }, '?'));
        input.value = ''; input.disabled = false; fb.innerHTML = ''; btn.textContent = 'Answer'; answered = false;
        input.focus();
      }
      function act() {
        if (answered) { qi++; if (qi >= qs.length) return ctx.finish({ score: correct / qs.length * 100, summary: `${correct} of ${qs.length} patterns cracked.` }); return show(); }
        const v = input.value.trim().replace(/[−–]/g, '-');
        if (!/^-?\d+$/.test(v)) { fb.innerHTML = ''; fb.append(el('span', { class: 'bad' }, 'Enter a whole number')); return; }
        const q = qs[qi], ok = +v === q.ans;
        if (ok) correct++;
        answered = true; input.disabled = true;
        seqEl.lastChild.textContent = q.ans;
        fb.innerHTML = '';
        fb.append(el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ It was ${q.ans}`), el('div', { class: 'muted' }, 'Rule: ' + q.rule));
        btn.textContent = qi + 1 >= qs.length ? 'See results' : 'Next →';
        btn.focus();
      }
      show();
    },
  });
})();

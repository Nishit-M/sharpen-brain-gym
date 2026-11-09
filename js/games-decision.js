'use strict';
/* Decision games: Bet or Pass, Pack the Bag, Sure or Not (calibration) */
(() => {
  const { el, clamp } = Brain;

  /* ---------------- Bet or Pass ---------------- */
  const EVENTS = [
    { min: 4, text: 'Roll a die — win on a 6', p: 1 / 6 },
    { min: 4, text: 'Roll a die — win on 5 or 6', p: 2 / 6 },
    { min: 4, text: 'Roll a die — win on an even number', p: 1 / 2 },
    { min: 4, text: 'Roll a die — win on anything but a 1', p: 5 / 6 },
    { min: 4, text: 'Flip 2 coins — win if both are heads', p: 1 / 4 },
    { min: 4, text: 'Flip 3 coins — win if at least one is heads', p: 7 / 8 },
    { min: 5, text: 'Flip 3 coins — win if all three match', p: 2 / 8 },
    { min: 5, text: 'Draw a card — win on a heart', p: 13 / 52 },
    { min: 6, text: 'Draw a card — win on a face card (J, Q, K)', p: 12 / 52 },
    { min: 6, text: 'Draw a card — win on an ace', p: 4 / 52 },
    { min: 7, text: 'Roll two dice — win if the total is 7', p: 6 / 36 },
    { min: 7, text: 'Roll two dice — win on a double', p: 6 / 36 },
    { min: 7, text: 'Roll two dice — win if the total is 8 or more', p: 15 / 36 },
    { min: 8, text: 'Roll two dice — win if at least one shows a 6', p: 11 / 36 },
    { min: 8, text: 'Roll two dice — win if the total is between 5 and 9', p: 24 / 36 },
    { min: 8, text: 'Draw a card — win on a heart or a face card', p: 22 / 52 },
    { min: 9, text: 'Flip 4 coins — win on exactly 2 heads', p: 6 / 16 },
    { min: 9, text: 'Roll two dice — win if the total is 10 or more', p: 6 / 36 },
    { min: 10, text: 'Roll a die twice — win if the second is higher', p: 15 / 36 },
    { min: 10, text: 'Flip 4 coins — win on at least 3 heads', p: 5 / 16 },
  ];
  function genBet(rng, lvl) {
    const maxEdge = 0.34 - lvl * 0.027;
    for (let tries = 0; tries < 500; tries++) {
      let ev;
      const evs = EVENTS.filter(e => e.min <= lvl);
      if (lvl <= 3 || !evs.length || rng.chance(lvl <= 6 ? 0.4 : 0.15)) { const pc = rng.int(2, 18) * 5; ev = { text: `${pc}% chance to win`, p: pc / 100 }; }
      else ev = rng.pick(evs);
      const cost = rng.int(4, 20) * 5;
      const edge = (rng.chance(0.5) ? 1 : -1) * (maxEdge / 2 + rng.next() * maxEdge / 2);
      const prize = Math.round(cost * (1 + edge) / ev.p);
      if (prize <= cost) continue;
      const EV = ev.p * prize - cost;
      if (Math.abs(EV) / cost < 0.03) continue;
      return { ...ev, cost, prize, EV };
    }
    return { text: '50% chance to win', p: 0.5, cost: 50, prize: 120, EV: 10 };
  }
  const pct = p => (p * 100).toFixed(p * 100 % 1 ? 1 : 0) + '%';

  Brain.register({
    id: 'bet', skill: 'decision', name: 'Bet or Pass',
    blurb: 'Take good bets, skip bad ones. Think in expected value.',
    howTo: [
      'Each offer: pay the cost to play; if you win you receive the prize.',
      'Take the bet only when it pays on average: chance × prize > cost.',
      'You’ll see what actually happened — but you’re scored on the decision, not the luck.',
      '10 offers per game.',
    ],
    levelInfo: l => (l <= 3 ? 'odds given as %' : l <= 6 ? 'dice, coins and cards' : 'two dice and combined events') + `, edges ±${Math.round((0.34 - l * 0.027) * 50)}–${Math.round((0.34 - l * 0.027) * 100)}%`,
    tip: 'Expected value = chance × prize − cost. A good bet can lose and a bad bet can win — judge decisions by their EV, not by the outcome you happened to get.',
    mount(root, ctx) {
      const N = 10;
      const bets = Array.from({ length: N }, () => genBet(ctx.rng, ctx.level));
      let i = 0, right = 0, bank = 1000;
      const info = el('div', { class: 'statline' });
      const card = el('div', { class: 'bet-card' });
      const fb = el('div', { class: 'feedback' });
      const btns = el('div', { class: 'actions' });
      root.append(info, card, btns, fb);

      function show() {
        const b = bets[i];
        info.innerHTML = ''; info.append(el('span', {}, `Offer ${i + 1} of ${N}`), el('span', {}, 'Coins ', el('b', {}, bank)));
        card.innerHTML = '';
        card.append(el('div', { class: 'bet-event' }, b.text),
          el('div', { class: 'bet-terms' }, el('div', {}, el('span', { class: 'muted small' }, 'Cost to play'), el('b', {}, b.cost)), el('div', {}, el('span', { class: 'muted small' }, 'Prize if you win'), el('b', {}, b.prize))));
        fb.innerHTML = '';
        btns.innerHTML = '';
        btns.append(el('button', { class: 'btn primary', onclick: () => decide(true) }, 'Bet'), el('button', { class: 'btn', onclick: () => decide(false) }, 'Pass'));
      }
      function decide(take) {
        const b = bets[i];
        const good = b.EV > 0, ok = take === good;
        if (ok) right++;
        let outcome = 'You passed.';
        if (take) {
          const won = ctx.rng.next() < b.p;
          bank += (won ? b.prize : 0) - b.cost;
          outcome = won ? `You won ${b.prize}!` : `You lost ${b.cost}.`;
        }
        fb.innerHTML = '';
        fb.append(el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Good decision' : '✗ Wrong call'),
          el('div', {}, `Chance ${pct(b.p)} × ${b.prize} = ${(b.p * b.prize).toFixed(1)} vs cost ${b.cost} → EV ${b.EV > 0 ? '+' : ''}${b.EV.toFixed(1)} (${good ? 'worth taking' : 'skip it'})`),
          el('div', { class: 'muted' }, outcome));
        btns.innerHTML = '';
        btns.append(el('button', { class: 'btn primary', onclick: () => { i++; if (i >= N) finish(); else show(); } }, i + 1 >= N ? 'See results' : 'Next offer →'));
        info.lastChild.lastChild.textContent = bank;
      }
      function finish() {
        ctx.finish({ score: right / N * 100, summary: `${right} of ${N} good decisions. Coins: ${bank} (started with 1000).`,
          details: el('p', { class: 'details muted' }, 'Your coin total includes luck; your score does not. Over many bets, good decisions win out.') });
      }
      show();
    },
  });

  /* ---------------- Pack the Bag ---------------- */
  const ITEMS = ['🔦 Torch', '🧭 Compass', '⛺ Tent', '🍫 Snacks', '💧 Water', '🧥 Jacket', '📷 Camera', '🩹 First aid', '🔋 Power bank', '🗺️ Map', '🧤 Gloves', '🔪 Knife', '📚 Book', '🧴 Sunscreen', '🪢 Rope', '☕ Stove'];
  const bagN = l => [5, 5, 6, 6, 7, 7, 8, 8, 9, 9][l - 1];
  function genBag(rng, lvl) {
    const n = bagN(lvl);
    for (let tries = 0; tries < 300; tries++) {
      const names = rng.shuffle(ITEMS).slice(0, n);
      const items = names.map(nm => { const w = rng.int(1, 9); return { nm, w, v: w * rng.int(3, 9) + rng.int(0, 12) }; });
      const totalW = items.reduce((s, x) => s + x.w, 0);
      const cap = Math.round(totalW * (0.4 + rng.next() * 0.15));
      let best = 0, bestMask = 0;
      for (let m = 0; m < 1 << n; m++) {
        let w = 0, v = 0;
        for (let j = 0; j < n; j++) if (m & (1 << j)) { w += items[j].w; v += items[j].v; }
        if (w <= cap && v > best) { best = v; bestMask = m; }
      }
      // greedy by value/weight
      const order = items.map((x, j) => j).sort((a, b) => items[b].v / items[b].w - items[a].v / items[a].w);
      let gw = 0, gv = 0;
      for (const j of order) if (gw + items[j].w <= cap) { gw += items[j].w; gv += items[j].v; }
      if (lvl >= 3 && gv === best) continue; // make the obvious strategy fall short
      return { items, cap, best, bestMask };
    }
    return null;
  }

  Brain.register({
    id: 'bag', skill: 'decision', name: 'Pack the Bag',
    blurb: 'Pick the most valuable gear that fits the weight limit.',
    howTo: [
      'Tap items to pack or unpack them. Stay within the weight limit.',
      'Maximise the total value, then press Pack it.',
      'Only the best possible combination scores 100 — every 5% short costs 20 points.',
    ],
    levelInfo: l => `${bagN(l)} items${l >= 3 ? ', simple “best ratio first” won’t be optimal' : ''}`,
    tip: 'Start with the best value-per-kg items, then look at the leftover capacity: swapping one item for two lighter ones (or vice versa) often fills the gap better.',
    mount(root, ctx) {
      const pz = genBag(ctx.rng, ctx.level) || genBag(Brain.makeRng(Date.now()), ctx.level);
      const { items, cap, best, bestMask } = pz;
      const limit = ctx.level <= 6 ? 90 : 75;
      const on = new Set();
      const tm = Brain.timer(limit, () => submit(true));
      const info = el('div', { class: 'statline' });
      const capFill = el('div', { class: 'cap-fill' });
      const grid = el('div', { class: 'items' });
      const packBtn = el('button', { class: 'btn primary', onclick: () => submit(false) }, 'Pack it');
      root.append(tm.node, info, el('div', { class: 'cap' }, capFill), grid, el('div', { class: 'toolbar' }, packBtn));

      const totals = () => { let w = 0, v = 0; on.forEach(j => { w += items[j].w; v += items[j].v; }); return { w, v }; };
      function draw() {
        const { w, v } = totals();
        info.innerHTML = ''; info.append(el('span', {}, 'Weight ', el('b', {}, `${w} / ${cap} kg`)), el('span', {}, 'Value ', el('b', {}, v)));
        capFill.style.width = Math.min(100, w / cap * 100) + '%';
        capFill.classList.toggle('over', w > cap);
        packBtn.disabled = w > cap || on.size === 0;
        grid.innerHTML = '';
        items.forEach((it, j) => grid.append(el('button', { class: 'item' + (on.has(j) ? ' on' : ''), onclick: () => { on.has(j) ? on.delete(j) : on.add(j); draw(); } },
          el('span', { class: 'nm' }, it.nm), el('span', { class: 'wv' }, `${it.w} kg · value ${it.v}`), el('span', { class: 'wv' }, `${(it.v / it.w).toFixed(1)} per kg`))));
      }
      function submit(timeout) {
        tm.stop();
        const { w, v } = totals();
        const val = w > cap ? 0 : v;
        const bestList = items.filter((_, j) => bestMask & (1 << j)).map(x => x.nm);
        ctx.finish({
          score: val === best ? 100 : clamp(100 - (best - val) / best * 400),
          summary: (timeout ? 'Time’s up. ' : '') + (w > cap ? 'Over the weight limit — nothing counts.' : `You packed value ${val} of a possible ${best}.`),
          details: el('div', { class: 'details' }, el('b', {}, `Best pack (value ${best}): `), bestList.join(', ')),
        });
      }
      draw();
      return () => tm.stop();
    },
  });

  /* ---------------- Sure or Not (confidence calibration) ---------------- */
  const GENS = [
    r => { const a = r.int(11, 99), b = r.int(3, 9); return { h: `${a} × ${b}`, v: a * b }; },
    r => { const a = r.int(11, 99), b = r.int(11, 49); return { h: `${a} × ${b}`, v: a * b }; },
    r => { const b = r.int(3, 19), a = r.int(1, b - 1); return { h: `${a}/${b}`, v: a / b }; },
    r => { const p = r.int(3, 95), x = r.int(20, 900); return { h: `${p}% of ${x}`, v: p * x / 100 }; },
    r => { const a = r.int(2, 9), b = r.int(2, a < 4 ? 12 : a < 7 ? 6 : 5); return { h: `${a}<sup>${b}</sup>`, v: a ** b }; },
    r => { const a = r.int(100, 999), b = r.int(3, 29); return { h: `${a} ÷ ${b}`, v: a / b }; },
    r => { const n = r.int(10, 200); return { h: `√${n}`, v: Math.sqrt(n) }; },
  ];
  function genPair(rng, lvl) {
    const hi = Math.max(0.025, 0.3 - (lvl - 1) * 0.03), lo = hi / 3;
    const gen = rng.pick(GENS);
    for (let t = 0; t < 3000; t++) {
      const a = gen(rng), b = gen(rng);
      if (a.h === b.h || a.v === b.v) continue;
      const rd = Math.abs(a.v - b.v) / Math.max(a.v, b.v);
      if (rd >= lo && rd <= hi) return [a, b];
    }
    return [{ h: '17 × 23', v: 391 }, { h: '19 × 21', v: 399 }];
  }
  const CONF = [50, 60, 70, 80, 90, 99];
  const nice = v => Number.isInteger(v) ? v : v.toFixed(v < 10 ? 3 : 1);

  Brain.register({
    id: 'calibrate', skill: 'decision', name: 'Sure or Not',
    blurb: 'Pick the bigger value — and say how sure you are.',
    howTo: [
      'Choose which value is larger, then tap how confident you are (50% = pure guess).',
      'There’s a short timer: estimate, don’t calculate exactly.',
      'Scoring rewards honest confidence: being sure and wrong costs a lot; saying 60% when unsure is fine.',
      '12 questions. A blind guesser scores 0, a perfect, certain estimator 100.',
    ],
    levelInfo: l => `values within ${Math.round(Math.max(0.025, 0.3 - (l - 1) * 0.03) * 100)}% of each other, ${l <= 5 ? 8 : 6}s each`,
    tip: 'Good decision-makers know what they don’t know. If your 90% answers are right only 70% of the time, you’re overconfident — slow down and dial it back.',
    mount(root, ctx) {
      const N = 12, secs = ctx.level <= 5 ? 8 : 6;
      const qs = Array.from({ length: N }, () => genPair(ctx.rng, ctx.level));
      const log = [];
      let i = 0, choice = null, tm = null, locked = false, pending = null;
      const info = el('div', { class: 'statline' });
      const timerBox = el('div');
      const vs = el('div', { class: 'vs' });
      const confBox = el('div', { class: 'conf' });
      const fb = el('div', { class: 'feedback' });
      root.append(timerBox, info, el('p', { class: 'muted small', style: { textAlign: 'center', margin: '0' } }, 'Which is larger?'), vs, confBox, fb);

      function show() {
        const [a, b] = qs[i];
        choice = null; locked = false;
        info.innerHTML = ''; info.append(el('span', {}, `Question ${i + 1} of ${N}`));
        vs.innerHTML = '';
        const ba = el('button', { class: 'btn', html: a.h, onclick: () => pick(0, ba, bb) });
        const bb = el('button', { class: 'btn', html: b.h, onclick: () => pick(1, bb, ba) });
        vs.append(ba, el('span', { class: 'muted' }, 'or'), bb);
        confBox.innerHTML = ''; confBox.append(el('span', { class: 'muted small' }, 'Pick one, then rate your confidence'));
        fb.innerHTML = '';
        timerBox.innerHTML = '';
        tm = Brain.timer(secs, () => record(null));
        timerBox.append(tm.node);
      }
      function pick(c, btn, other) {
        if (locked) return;
        choice = c; btn.classList.add('sel'); other.classList.remove('sel');
        confBox.innerHTML = '';
        CONF.forEach(p => confBox.append(el('button', { class: 'btn small', onclick: () => record(p) }, p + '%')));
      }
      function record(conf) {
        if (locked) return;
        locked = true; tm.stop();
        const [a, b] = qs[i];
        const truth = a.v > b.v ? 0 : 1;
        const timedOut = conf == null || choice == null;
        const p = timedOut ? 0.5 : conf / 100;
        const correct = !timedOut && choice === truth;
        log.push({ p, correct, timedOut });
        fb.innerHTML = '';
        fb.append(el('div', { class: timedOut ? 'bad' : correct ? 'good' : 'bad' }, timedOut ? '⏱ Time’s up (counted as a 50% guess)' : correct ? '✓ Right' : '✗ Wrong'),
          el('div', { class: 'muted', html: `${a.h} = ${nice(a.v)} · ${b.h} = ${nice(b.v)}` }));
        confBox.innerHTML = '';
        pending = setTimeout(() => { i++; if (i >= N) finish(); else show(); }, 1600);
      }
      function finish() {
        const brier = log.reduce((s, x) => s + (x.p - (x.correct ? 1 : 0)) ** 2, 0) / N;
        const answered = log.filter(x => !x.timedOut);
        const avgConf = answered.length ? answered.reduce((s, x) => s + x.p, 0) / answered.length : 0.5;
        const acc = answered.length ? answered.filter(x => x.correct).length / answered.length : 0;
        let verdict = 'Well calibrated — your confidence matches your accuracy.';
        if (avgConf - acc > 0.1) verdict = 'Overconfident: you were surer than your results justified.';
        else if (acc - avgConf > 0.1) verdict = 'Underconfident: you knew more than you gave yourself credit for.';
        const buckets = CONF.map(c => ({ c, xs: answered.filter(x => Math.round(x.p * 100) === c) })).filter(b => b.xs.length);
        ctx.finish({
          score: clamp((1 - brier / 0.25) * 100),
          summary: `Accuracy ${Math.round(acc * 100)}% at average confidence ${Math.round(avgConf * 100)}%. ${verdict}`,
          details: el('div', { class: 'details' }, el('table', {}, el('tr', {}, el('th', {}, 'You said'), el('th', {}, 'Answers'), el('th', {}, 'Actually right')),
            buckets.map(b => el('tr', {}, el('td', {}, b.c + '%'), el('td', {}, b.xs.length), el('td', {}, Math.round(b.xs.filter(x => x.correct).length / b.xs.length * 100) + '%'))))),
        });
      }
      show();
      return () => { if (tm) tm.stop(); clearTimeout(pending); };
    },
  });
})();

'use strict';
/* Critical-thinking games: Valid or Not, Fallacy Spotter, Base Rate */
(() => {
  const { el } = Brain;

  /* ---------------- Valid or Not ---------------- */
  // Categorical syllogisms checked by brute force over all models (regions of a Venn diagram).
  const REAL = ['artists', 'pilots', 'doctors', 'runners', 'chefs', 'poets', 'teachers', 'singers', 'golfers', 'coders', 'farmers', 'lawyers'];
  const NONSENSE = ['wugs', 'blickets', 'daxes', 'florps', 'zibs', 'grums', 'toves', 'quarks'];
  const TYPES = ['all', 'no', 'some', 'somenot'];
  function holds(st, model, nT) {
    // model: bitmask over regions (region r = bitmask of terms it belongs to)
    for (let r = 0; r < 1 << nT; r++) {
      if (!(model & (1 << r))) continue;
      const inA = !!(r & (1 << st.a)), inB = !!(r & (1 << st.b));
      if (st.t === 'all' && inA && !inB) return false;
      if (st.t === 'no' && inA && inB) return false;
      if (st.t === 'some' && inA && inB) return true;
      if (st.t === 'somenot' && inA && !inB) return true;
    }
    return st.t === 'all' || st.t === 'no';
  }
  const MODELS = {};
  function modelsFor(nT) {
    // every world in which each term has at least one member
    if (MODELS[nT]) return MODELS[nT];
    const out = [];
    for (let m = 1; m < 1 << (1 << nT); m++) {
      let ok = true;
      for (let t = 0; t < nT && ok; t++) { let found = false; for (let r = 0; r < 1 << nT; r++) if ((m & (1 << r)) && (r & (1 << t))) { found = true; break; } ok = found; }
      if (ok) out.push(m);
    }
    return (MODELS[nT] = out);
  }
  function checkValid(prem, concl, nT) {
    let any = false, counter = null;
    for (const m of modelsFor(nT)) {
      if (!prem.every(p => holds(p, m, nT))) continue;
      any = true;
      if (!holds(concl, m, nT)) { counter = m; break; }
    }
    return { consistent: any, valid: any && counter === null, counter };
  }
  const sing = w => w.endsWith('es') && /(x|sh|ch|s)es$/.test(w) ? w.slice(0, -2) : w.slice(0, -1);
  function stText(st, T) {
    const A = T[st.a], B = T[st.b];
    return { all: `All ${A} are ${B}.`, no: `No ${A} are ${B}.`, some: `Some ${A} are ${B}.`, somenot: `Some ${A} are not ${B}.` }[st.t];
  }
  function counterText(m, T, nT) {
    const parts = [];
    for (let r = 1; r < 1 << nT; r++) {
      if (!(m & (1 << r))) continue;
      const ins = T.filter((_, t) => r & (1 << t)), outs = T.filter((_, t) => !(r & (1 << t)));
      parts.push(`something that is ${ins.map(sing).join(' + ')}${outs.length ? ` (not ${outs.map(sing).join(', ')})` : ''}`);
    }
    return 'All premises can be true while the conclusion is false — imagine a world with only: ' + parts.join('; ') + '.';
  }
  function genSyllogism(rng, lvl, wantValid) {
    const nT = lvl >= 8 ? 4 : 3;
    const words = rng.shuffle(lvl >= 7 ? NONSENSE : REAL).slice(0, nT);
    for (let t = 0; t < 400; t++) {
      // chain: term0-term1, term1-term2, (term2-term3); conclusion about term0 and last term
      const prem = [];
      for (let i = 0; i < nT - 1; i++) {
        const flip = rng.chance(0.35);
        prem.push({ t: rng.pick(TYPES), a: flip ? i + 1 : i, b: flip ? i : i + 1 });
      }
      const cf = rng.chance(0.3);
      const concl = { t: rng.pick(TYPES), a: cf ? nT - 1 : 0, b: cf ? 0 : nT - 1 };
      const r = checkValid(prem, concl, nT);
      if (!r.consistent || r.valid !== wantValid) continue;
      return {
        lines: [...rng.shuffle(prem).map(p => stText(p, words)), 'Therefore: ' + stText(concl, words)],
        valid: r.valid,
        why: r.valid ? 'Valid: there is no way to make the premises true and the conclusion false.' : counterText(r.counter, words, nT),
      };
    }
    return null;
  }
  const CLAUSES = ['the light is on', 'the door is locked', 'the oven is hot', 'the shop is open', 'the road is wet', 'the dog is barking', 'the battery is charged', 'the window is open', 'the train is late', 'the printer is jammed'];
  const negC = c => c.replace(' is ', ' is not ');
  const capS = s => s[0].toUpperCase() + s.slice(1);
  const PROPS = [
    { name: 'Modus ponens', valid: true, f: (p, q) => [`If ${p}, then ${q}.`, `${capS(p)}.`, `Therefore: ${q}.`], why: 'Valid (modus ponens): the “if” part happened, so the “then” part must follow.' },
    { name: 'Modus tollens', valid: true, f: (p, q) => [`If ${p}, then ${q}.`, `${capS(negC(q))}.`, `Therefore: ${negC(p)}.`], why: 'Valid (modus tollens): if P always brings Q, and there’s no Q, there can’t have been P.' },
    { name: 'Affirming the consequent', valid: false, f: (p, q) => [`If ${p}, then ${q}.`, `${capS(q)}.`, `Therefore: ${p}.`], why: 'Invalid (affirming the consequent): Q could be true for some other reason.' },
    { name: 'Denying the antecedent', valid: false, f: (p, q) => [`If ${p}, then ${q}.`, `${capS(negC(p))}.`, `Therefore: ${negC(q)}.`], why: 'Invalid (denying the antecedent): Q might still happen without P.' },
    { name: 'Disjunctive syllogism', valid: true, f: (p, q) => [`Either ${p} or ${q} (or both).`, `${capS(negC(p))}.`, `Therefore: ${q}.`], why: 'Valid: one of the two must be true, and it isn’t the first.' },
    { name: 'Affirming a disjunct', valid: false, f: (p, q) => [`Either ${p} or ${q} (or both).`, `${capS(p)}.`, `Therefore: ${negC(q)}.`], why: 'Invalid: “or both” is allowed, so the first being true says nothing about the second.' },
    { name: 'Hypothetical chain', valid: true, f: (p, q, r) => [`If ${p}, then ${q}.`, `If ${q}, then ${r}.`, `Therefore: if ${p}, then ${r}.`], why: 'Valid (chain): P leads to Q and Q leads to R, so P leads to R.' },
    { name: 'Converse', valid: false, f: (p, q) => [`If ${p}, then ${q}.`, `Therefore: if ${q}, then ${p}.`], why: 'Invalid (converse): “if P then Q” does not mean “if Q then P”.' },
  ];
  function genProp(rng, wantValid) {
    const form = rng.pick(PROPS.filter(f => f.valid === wantValid));
    const [p, q, r] = rng.shuffle(CLAUSES);
    return { lines: form.f(p, q, r), valid: form.valid, why: form.why };
  }

  Brain.register({
    id: 'validity', skill: 'critical', name: 'Valid or Not',
    blurb: 'Does the conclusion really follow from the premises?',
    howTo: [
      'Assume the premises are true, even if they sound silly or false in real life.',
      'Valid = the conclusion MUST be true if the premises are. Invalid = it could still be false.',
      'Whether the conclusion sounds true is irrelevant — that’s the trap. 12 arguments.',
    ],
    levelInfo: l => l <= 3 ? 'mostly if-then arguments' : l <= 6 ? 'if-then arguments and syllogisms with real words' : l <= 7 ? 'nonsense words (no gut feeling to lean on)' : 'chains of 3 premises, nonsense words',
    tip: 'To test validity, try to build a counterexample: a world where every premise is true but the conclusion is false. If you can, it’s invalid. Watch out for “Some A are B” — it never tells you about all of them.',
    mount(root, ctx) {
      const N = 12, L = ctx.level;
      const items = [];
      while (items.length < N) {
        const want = ctx.rng.chance(0.5);
        const useSyl = L >= 4 && ctx.rng.chance(L >= 7 ? 0.75 : 0.5);
        const it = useSyl ? genSyllogism(ctx.rng, L, want) : genProp(ctx.rng, want);
        if (it) items.push(it);
      }
      let i = 0, right = 0, busy = false;
      const info = el('div', { class: 'statline' });
      const card = el('div', { class: 'arg-card' });
      const btns = el('div', { class: 'nb-buttons' },
        el('button', { class: 'btn primary', onclick: () => answer(true) }, 'Valid (V)'),
        el('button', { class: 'btn', onclick: () => answer(false) }, 'Invalid (I)'));
      const fb = el('div', { class: 'feedback' });
      root.append(info, card, btns, fb);

      function show() {
        const it = items[i];
        busy = false;
        info.innerHTML = ''; info.append(el('span', {}, `Argument ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
        card.innerHTML = '';
        it.lines.forEach(l => card.append(el('p', { class: l.startsWith('Therefore') ? 'concl' : '' }, l)));
        fb.innerHTML = '';
        btns.style.display = '';
      }
      function answer(v) {
        if (busy) return;
        busy = true;
        const it = items[i], ok = v === it.valid;
        if (ok) right++;
        btns.style.display = 'none';
        fb.innerHTML = '';
        fb.append(el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ It’s ${it.valid ? 'valid' : 'invalid'}`), el('div', { class: 'muted why' }, it.why),
          el('button', { class: 'btn primary', style: { marginTop: '8px' }, onclick: next }, i + 1 >= N ? 'See results' : 'Next →'));
      }
      function next() { i++; if (i >= N) ctx.finish({ score: right / N * 100, summary: `${right} of ${N} arguments judged correctly.` }); else show(); }
      show();
      return Brain.onKeys(e => { const k = e.key.toLowerCase(); if (k === 'v') answer(true); else if (k === 'i') answer(false); });
    },
  });

  /* ---------------- Fallacy Spotter ---------------- */
  const FALLACIES = {
    adhom:     { min: 1, name: 'Personal attack', def: 'Attacking the person making the argument instead of the argument itself.' },
    straw:     { min: 1, name: 'Straw man', def: 'Misrepresenting someone’s position as a weaker or extreme version, then attacking that.' },
    dilemma:   { min: 1, name: 'False choice', def: 'Presenting only two options when more exist.' },
    slope:     { min: 1, name: 'Slippery slope', def: 'Claiming one step will inevitably lead to an extreme outcome, without showing why.' },
    bandwagon: { min: 1, name: 'Bandwagon', def: 'Arguing something is true or good because many people believe or do it.' },
    authority: { min: 1, name: 'Irrelevant authority', def: 'Relying on someone’s authority in an area outside their expertise.' },
    hasty:     { min: 4, name: 'Hasty generalisation', def: 'Drawing a broad conclusion from too few or unrepresentative examples.' },
    posthoc:   { min: 4, name: 'False cause', def: 'Assuming that because B followed A (or goes along with A), A caused B.' },
    circular:  { min: 4, name: 'Circular reasoning', def: 'The conclusion is assumed in the premise — the argument goes in a circle.' },
    emotion:   { min: 4, name: 'Appeal to emotion', def: 'Using feelings (fear, pity, pride) in place of evidence.' },
    herring:   { min: 7, name: 'Red herring', def: 'Changing the subject to something irrelevant to dodge the actual issue.' },
    sunk:      { min: 7, name: 'Sunk cost', def: 'Continuing something because of what’s already been invested, rather than future value.' },
    gambler:   { min: 7, name: 'Gambler’s fallacy', def: 'Believing independent random events “balance out” — past results change future odds.' },
    whatabout: { min: 7, name: 'Whataboutism', def: 'Deflecting criticism by pointing to someone else’s wrongdoing.' },
    nature:    { min: 7, name: 'Appeal to nature', def: 'Assuming something is good because it is “natural” (or bad because it isn’t).' },
  };
  const ARGS = [
    ['adhom', 'Rahul says we should cut office energy use, but he drives a huge car, so his proposal is nonsense.'],
    ['adhom', 'Why listen to her budget plan? She failed maths in school.'],
    ['adhom', 'The study on sugar was written by someone who’s obviously never been fit a day in their life. Ignore it.'],
    ['straw', 'Meera wants more cycle lanes. So she wants to ban cars completely and make everyone cycle to work in the rain?'],
    ['straw', 'You think we should test the app more before launch? So you’re saying we should never ship anything.'],
    ['straw', 'He argues for a shorter school day. Clearly he doesn’t care about children’s education at all.'],
    ['dilemma', 'Either we hire five new people this month or the company collapses.'],
    ['dilemma', 'You’re either with us on this plan or you’re against the team.'],
    ['dilemma', 'If you don’t study engineering or medicine, you’ll have no career.'],
    ['slope', 'If we let staff work from home on Fridays, soon nobody will come in at all and the office will close.'],
    ['slope', 'If I skip the gym today, I’ll skip tomorrow, then all month, and I’ll end up never exercising again.'],
    ['slope', 'Allow one phone in class and next thing students will be streaming movies during exams.'],
    ['bandwagon', 'Millions of people use this crypto app, so it must be a safe investment.'],
    ['bandwagon', 'Everyone in my building is buying an air purifier, so they obviously work.'],
    ['bandwagon', 'This diet is trending everywhere — it has to be effective.'],
    ['authority', 'A famous cricketer says this mutual fund is the best one, so I’m putting all my savings in it.'],
    ['authority', 'My dentist told me the stock market will crash next month, so I’m selling everything.'],
    ['authority', 'A Nobel-winning physicist said this herbal tea cures colds, so it must.'],
    ['hasty', 'I met two rude people from that city, so people there are rude.'],
    ['hasty', 'My first two online orders from this store were late, so they never deliver on time.'],
    ['hasty', 'My grandfather smoked and lived to 95, so smoking can’t be that harmful.'],
    ['posthoc', 'I wore my lucky shirt and we won the match. The shirt works.'],
    ['posthoc', 'Ice-cream sales and drowning deaths rise together, so ice cream causes drowning.'],
    ['posthoc', 'Since the new manager arrived, sales went up. She must be the reason.'],
    ['circular', 'This news channel is trustworthy because it says it only reports the truth.'],
    ['circular', 'He’s the best candidate because no one is better than him.'],
    ['circular', 'Reading is important because it’s essential to read.'],
    ['emotion', 'Think of the poor puppies — you have to buy this premium pet insurance.'],
    ['emotion', 'If you really loved your family, you’d buy the most expensive car seat.'],
    ['emotion', 'How can you vote against this bill? Imagine how ashamed your children would be.'],
    ['herring', 'Asked why the project is late, the manager said, “Let’s not forget how hard everyone worked at last year’s festival.”'],
    ['herring', 'Sure, the restaurant failed its hygiene check — but have you seen how nice the new menu design is?'],
    ['herring', 'When asked about rising fees, the principal talked about the school’s new logo.'],
    ['sunk', 'I’ve already paid for the whole year at this gym I hate, so I have to keep going.'],
    ['sunk', 'We’ve spent ₹20 lakh on this failing software project — we can’t stop now and waste it.'],
    ['sunk', 'The movie is terrible, but we paid for tickets, so let’s sit through the last hour.'],
    ['gambler', 'The coin has landed heads five times in a row, so tails is due next.'],
    ['gambler', 'This lottery number hasn’t come up in years — it’s bound to win soon.'],
    ['gambler', 'We’ve had three girls, so our next baby is almost certainly a boy.'],
    ['whatabout', 'You say I shouldn’t litter? You left the lights on all night last week!'],
    ['whatabout', 'Why criticise our company’s pollution when other companies pollute more?'],
    ['whatabout', 'Yes, I was late, but you were late twice last month.'],
    ['nature', 'This supplement is all-natural, so it can’t have side effects.'],
    ['nature', 'Humans didn’t evolve to use phones, so they must be bad for us.'],
    ['nature', 'Medicine is chemicals; herbs are natural, so herbs are always the better treatment.'],
  ];

  Brain.register({
    id: 'fallacy', skill: 'critical', name: 'Fallacy Spotter',
    blurb: 'Name the flaw in the reasoning.',
    howTo: [
      'Read the short argument. Pick the reasoning error it commits.',
      'After each answer you’ll see the definition — that’s how you learn them.',
      '10 arguments. New fallacy types unlock at levels 4 and 7.',
    ],
    levelInfo: l => `${Object.values(FALLACIES).filter(f => f.min <= l).length} fallacy types`,
    tip: 'Ask two questions of any argument: “Is this actually about the claim?” (catches personal attacks, red herrings, whataboutism) and “Does the evidence really reach that far?” (catches generalisations, false cause, slippery slopes).',
    mount(root, ctx) {
      const N = 10;
      const avail = Object.keys(FALLACIES).filter(k => FALLACIES[k].min <= ctx.level);
      const pool = ctx.rng.shuffle(ARGS.filter(a => avail.includes(a[0])));
      const qs = pool.slice(0, N).map(([f, text]) => {
        const others = ctx.rng.shuffle(avail.filter(k => k !== f)).slice(0, 3);
        return { f, text, opts: ctx.rng.shuffle([f, ...others]) };
      });
      let i = 0, right = 0, busy = false;
      const info = el('div', { class: 'statline' });
      const card = el('div', { class: 'arg-card' });
      const opts = el('div', { class: 'choice-grid' });
      const fb = el('div', { class: 'feedback' });
      root.append(info, card, opts, fb);

      function show() {
        const q = qs[i];
        busy = false;
        info.innerHTML = ''; info.append(el('span', {}, `Argument ${i + 1} of ${qs.length}`), el('span', {}, 'Correct ', el('b', {}, right)));
        card.innerHTML = ''; card.append(el('p', {}, '“' + q.text + '”'));
        opts.innerHTML = '';
        q.opts.forEach(k => opts.append(el('button', { class: 'btn', onclick: e => pick(k, e.currentTarget) }, FALLACIES[k].name)));
        fb.innerHTML = '';
      }
      function pick(k, btn) {
        if (busy) return;
        busy = true;
        const q = qs[i], ok = k === q.f;
        if (ok) right++;
        btn.classList.add(ok ? 'hit' : 'miss');
        [...opts.children].forEach((b, j) => { if (q.opts[j] === q.f) b.classList.add('hit'); });
        fb.innerHTML = '';
        fb.append(el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ It’s ${FALLACIES[q.f].name}`),
          el('div', { class: 'muted why' }, el('b', {}, FALLACIES[q.f].name + ': '), FALLACIES[q.f].def),
          el('button', { class: 'btn primary', style: { marginTop: '8px' }, onclick: () => { i++; if (i >= qs.length) ctx.finish({ score: right / qs.length * 100, summary: `${right} of ${qs.length} fallacies spotted.` }); else show(); } }, i + 1 >= qs.length ? 'See results' : 'Next →'));
      }
      show();
    },
  });

  /* ---------------- Base Rate ---------------- */
  const SCEN = [
    { min: 1, setup: (p, s, f) => `${p}% of people have a rare condition. A test catches ${s}% of people who have it, but also wrongly flags ${f}% of healthy people.`, q: 'Someone tests positive. How likely is it they actually have the condition?', pos: 'have the condition', neg: 'are healthy', unit: 'people' },
    { min: 3, setup: (p, s, f) => `${p}% of emails are spam. The filter catches ${s}% of spam, but also flags ${f}% of genuine emails.`, q: 'An email gets flagged. How likely is it to really be spam?', pos: 'are spam', neg: 'are genuine', unit: 'emails' },
    { min: 5, setup: (p, s, f) => `${p}% of card payments are fraud. The bank’s alarm triggers on ${s}% of fraud, and on ${f}% of honest payments.`, q: 'The alarm goes off on a payment. How likely is it to be fraud?', pos: 'are fraud', neg: 'are honest', unit: 'payments' },
    { min: 6, setup: (p, s, f) => `${p}% of parts from a factory are faulty. A scanner rejects ${s}% of faulty parts and ${f}% of good parts.`, q: 'A part gets rejected. How likely is it to really be faulty?', pos: 'are faulty', neg: 'are good', unit: 'parts' },
    { min: 8, setup: (p, s, f) => `In a city, ${p}% of taxis are blue and the rest are green. A witness identifies colours correctly ${s}% of the time (so mistakes ${f}% of green taxis for blue).`, q: 'The witness says the taxi was blue. How likely is it that it really was blue?', pos: 'are blue', neg: 'are green', unit: 'taxis' },
  ];
  function genBase(rng, lvl) {
    for (let t = 0; t < 500; t++) {
      const sc = rng.pick(SCEN.filter(s => s.min <= lvl));
      const p = rng.pick(lvl <= 3 ? [1, 2, 5, 10] : [1, 2, 3, 5, 8, 10, 15, 20]);
      let s = rng.pick([70, 80, 90, 95, 99]);
      let f = rng.pick([1, 2, 5, 10, 20]);
      if (sc.unit === 'taxis') { s = rng.pick([70, 80, 90]); f = 100 - s; }
      const post = p * s / (p * s + (100 - p) * f) * 100;
      const ans = Math.round(post);
      if (ans < 2 || ans > 97) continue;
      // options: correct, the test accuracy (classic error), and two others, all well separated
      const opts = [ans, s];
      const cand = rng.shuffle([5, 10, 15, 25, 35, 50, 65, 75, 85, 95, 100 - f, Math.round(post / 2), Math.min(99, Math.round(post * 2))]);
      for (const c of cand) { if (opts.length >= 4) break; if (opts.every(o => Math.abs(o - c) >= 8) && c > 0 && c < 100) opts.push(c); }
      if (opts.length < 4 || Math.abs(ans - s) < 8) continue;
      const pop = 1000;
      const sick = pop * p / 100, tp = sick * s / 100, fp = (pop - sick) * f / 100;
      const r1 = x => Math.round(x * 10) / 10;
      return {
        text: sc.setup(p, s, f), q: sc.q, ans, opts: rng.shuffle(opts),
        why: `Picture ${pop} ${sc.unit}: ${r1(sick)} ${sc.pos} → ${r1(tp)} flagged. ${r1(pop - sick)} ${sc.neg} → ${r1(fp)} wrongly flagged. So ${r1(tp)} out of ${r1(tp + fp)} flagged are real ≈ ${ans}%.`,
      };
    }
    return null;
  }

  Brain.register({
    id: 'baserate', skill: 'critical', name: 'Base Rate',
    blurb: 'A test says yes — but how likely is it really?',
    howTo: [
      'Each problem describes how common something is, and how accurate a test or detector is.',
      'Pick the closest answer for how likely a positive result is to be real.',
      'You won’t need exact maths — think in counts of people. 8 problems.',
    ],
    levelInfo: l => `${SCEN.filter(s => s.min <= l).length} scenario types`,
    tip: 'Turn percentages into counts: “out of 1,000 people…”. When the thing is rare, false alarms from the huge healthy group usually outnumber the true cases — so a positive result is often less certain than the test’s accuracy suggests.',
    mount(root, ctx) {
      const N = 8;
      const qs = [];
      while (qs.length < N) { const q = genBase(ctx.rng, ctx.level); if (q) qs.push(q); }
      let i = 0, right = 0, busy = false;
      const info = el('div', { class: 'statline' });
      const card = el('div', { class: 'arg-card' });
      const opts = el('div', { class: 'choice-grid' });
      const fb = el('div', { class: 'feedback' });
      root.append(info, card, opts, fb);

      function show() {
        const q = qs[i];
        busy = false;
        info.innerHTML = ''; info.append(el('span', {}, `Problem ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
        card.innerHTML = ''; card.append(el('p', {}, q.text), el('p', { class: 'concl' }, q.q));
        opts.innerHTML = '';
        q.opts.forEach(o => opts.append(el('button', { class: 'btn', onclick: e => pick(o, e.currentTarget) }, `about ${o}%`)));
        fb.innerHTML = '';
      }
      function pick(o, btn) {
        if (busy) return;
        busy = true;
        const q = qs[i], ok = o === q.ans;
        if (ok) right++;
        btn.classList.add(ok ? 'hit' : 'miss');
        [...opts.children].forEach((b, j) => { if (q.opts[j] === q.ans) b.classList.add('hit'); });
        fb.innerHTML = '';
        fb.append(el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ About ${q.ans}%`), el('div', { class: 'muted why' }, q.why),
          el('button', { class: 'btn primary', style: { marginTop: '8px' }, onclick: () => { i++; if (i >= N) ctx.finish({ score: right / N * 100, summary: `${right} of ${N} problems answered correctly.` }); else show(); } }, i + 1 >= N ? 'See results' : 'Next →'));
      }
      show();
    },
  });
})();

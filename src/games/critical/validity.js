import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';
import { onKeys } from '../../ui/keys.js';

// Categorical syllogisms checked by brute force over all models (regions of a Venn diagram).
export const REAL = [
  'artists',
  'pilots',
  'doctors',
  'runners',
  'chefs',
  'poets',
  'teachers',
  'singers',
  'golfers',
  'coders',
  'farmers',
  'lawyers',
];
export const NONSENSE = ['wugs', 'blickets', 'daxes', 'florps', 'zibs', 'grums', 'toves', 'quarks'];
export const TYPES = ['all', 'no', 'some', 'somenot'];
export function holds(st, model, nT) {
  // model: bitmask over regions (region r = bitmask of terms it belongs to)
  for (let r = 0; r < 1 << nT; r++) {
    if (!(model & (1 << r))) continue;
    const inA = !!(r & (1 << st.a)),
      inB = !!(r & (1 << st.b));
    if (st.t === 'all' && inA && !inB) return false;
    if (st.t === 'no' && inA && inB) return false;
    if (st.t === 'some' && inA && inB) return true;
    if (st.t === 'somenot' && inA && !inB) return true;
  }
  return st.t === 'all' || st.t === 'no';
}
const MODELS = {}; // memo: number of terms → valid models
export function modelsFor(nT) {
  // every world in which each term has at least one member
  if (MODELS[nT]) return MODELS[nT];
  const out = [];
  for (let m = 1; m < 1 << (1 << nT); m++) {
    let ok = true;
    for (let t = 0; t < nT && ok; t++) {
      let found = false;
      for (let r = 0; r < 1 << nT; r++)
        if (m & (1 << r) && r & (1 << t)) {
          found = true;
          break;
        }
      ok = found;
    }
    if (ok) out.push(m);
  }
  return (MODELS[nT] = out);
}
export function checkValid(prem, concl, nT) {
  let any = false,
    counter = null;
  for (const m of modelsFor(nT)) {
    if (!prem.every((p) => holds(p, m, nT))) continue;
    any = true;
    if (!holds(concl, m, nT)) {
      counter = m;
      break;
    }
  }
  return { consistent: any, valid: any && counter === null, counter };
}
const sing = (w) => (w.endsWith('es') && /(x|sh|ch|s)es$/.test(w) ? w.slice(0, -2) : w.slice(0, -1));
export function stText(st, T) {
  const A = T[st.a],
    B = T[st.b];
  return {
    all: `All ${A} are ${B}.`,
    no: `No ${A} are ${B}.`,
    some: `Some ${A} are ${B}.`,
    somenot: `Some ${A} are not ${B}.`,
  }[st.t];
}
export function counterText(m, T, nT) {
  const parts = [];
  for (let r = 1; r < 1 << nT; r++) {
    if (!(m & (1 << r))) continue;
    const ins = T.filter((_, t) => r & (1 << t)),
      outs = T.filter((_, t) => !(r & (1 << t)));
    parts.push(
      `something that is ${ins.map(sing).join(' + ')}${outs.length ? ` (not ${outs.map(sing).join(', ')})` : ''}`,
    );
  }
  return (
    'All premises can be true while the conclusion is false — imagine a world with only: ' + parts.join('; ') + '.'
  );
}
export function genSyllogism(rng, lvl, wantValid) {
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
      lines: [...rng.shuffle(prem).map((p) => stText(p, words)), 'Therefore: ' + stText(concl, words)],
      valid: r.valid,
      why: r.valid
        ? 'Valid: there is no way to make the premises true and the conclusion false.'
        : counterText(r.counter, words, nT),
    };
  }
  return null;
}
export const CLAUSES = [
  'the light is on',
  'the door is locked',
  'the oven is hot',
  'the shop is open',
  'the road is wet',
  'the dog is barking',
  'the battery is charged',
  'the window is open',
  'the train is late',
  'the printer is jammed',
];
const negC = (c) => c.replace(' is ', ' is not ');
const capS = (s) => s[0].toUpperCase() + s.slice(1);
export const PROPS = [
  {
    name: 'Modus ponens',
    valid: true,
    f: (p, q) => [`If ${p}, then ${q}.`, `${capS(p)}.`, `Therefore: ${q}.`],
    why: 'Valid (modus ponens): the “if” part happened, so the “then” part must follow.',
  },
  {
    name: 'Modus tollens',
    valid: true,
    f: (p, q) => [`If ${p}, then ${q}.`, `${capS(negC(q))}.`, `Therefore: ${negC(p)}.`],
    why: 'Valid (modus tollens): if P always brings Q, and there’s no Q, there can’t have been P.',
  },
  {
    name: 'Affirming the consequent',
    valid: false,
    f: (p, q) => [`If ${p}, then ${q}.`, `${capS(q)}.`, `Therefore: ${p}.`],
    why: 'Invalid (affirming the consequent): Q could be true for some other reason.',
  },
  {
    name: 'Denying the antecedent',
    valid: false,
    f: (p, q) => [`If ${p}, then ${q}.`, `${capS(negC(p))}.`, `Therefore: ${negC(q)}.`],
    why: 'Invalid (denying the antecedent): Q might still happen without P.',
  },
  {
    name: 'Disjunctive syllogism',
    valid: true,
    f: (p, q) => [`Either ${p} or ${q} (or both).`, `${capS(negC(p))}.`, `Therefore: ${q}.`],
    why: 'Valid: one of the two must be true, and it isn’t the first.',
  },
  {
    name: 'Affirming a disjunct',
    valid: false,
    f: (p, q) => [`Either ${p} or ${q} (or both).`, `${capS(p)}.`, `Therefore: ${negC(q)}.`],
    why: 'Invalid: “or both” is allowed, so the first being true says nothing about the second.',
  },
  {
    name: 'Hypothetical chain',
    valid: true,
    f: (p, q, r) => [`If ${p}, then ${q}.`, `If ${q}, then ${r}.`, `Therefore: if ${p}, then ${r}.`],
    why: 'Valid (chain): P leads to Q and Q leads to R, so P leads to R.',
  },
  {
    name: 'Converse',
    valid: false,
    f: (p, q) => [`If ${p}, then ${q}.`, `Therefore: if ${q}, then ${p}.`],
    why: 'Invalid (converse): “if P then Q” does not mean “if Q then P”.',
  },
];
export function genProp(rng, wantValid) {
  const form = rng.pick(PROPS.filter((f) => f.valid === wantValid));
  const [p, q, r] = rng.shuffle(CLAUSES);
  return { lines: form.f(p, q, r), valid: form.valid, why: form.why };
}

export default defineGame({
  id: 'validity',
  skill: 'critical',
  name: 'Valid or Not',
  blurb: 'Does the conclusion really follow from the premises?',
  howTo: [
    'Assume the premises are true, even if they sound silly or false in real life.',
    'Valid = the conclusion MUST be true if the premises are. Invalid = it could still be false.',
    'Whether the conclusion sounds true is irrelevant — that’s the trap. 12 arguments.',
  ],
  levelInfo: (l) =>
    l <= 3
      ? 'mostly if-then arguments'
      : l <= 6
        ? 'if-then arguments and syllogisms with real words'
        : l <= 7
          ? 'nonsense words (no gut feeling to lean on)'
          : 'chains of 3 premises, nonsense words',
  tip: 'To test validity, try to build a counterexample: a world where every premise is true but the conclusion is false. If you can, it’s invalid. Watch out for “Some A are B” — it never tells you about all of them.',
  mount(root, ctx) {
    const N = 12,
      L = ctx.level;
    const items = [];
    while (items.length < N) {
      const want = ctx.rng.chance(0.5);
      const useSyl = L >= 4 && ctx.rng.chance(L >= 7 ? 0.75 : 0.5);
      const it = useSyl ? genSyllogism(ctx.rng, L, want) : genProp(ctx.rng, want);
      if (it) items.push(it);
    }
    let i = 0,
      right = 0,
      busy = false;
    const info = el('div', { class: 'statline' });
    const card = el('div', { class: 'arg-card' });
    const btns = el(
      'div',
      { class: 'nb-buttons' },
      el('button', { class: 'btn primary', onclick: () => answer(true) }, 'Valid (V)'),
      el('button', { class: 'btn', onclick: () => answer(false) }, 'Invalid (I)'),
    );
    const fb = el('div', { class: 'feedback' });
    root.append(info, card, btns, fb);

    function show() {
      const it = items[i];
      busy = false;
      info.innerHTML = '';
      info.append(el('span', {}, `Argument ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
      card.innerHTML = '';
      it.lines.forEach((l) => card.append(el('p', { class: l.startsWith('Therefore') ? 'concl' : '' }, l)));
      fb.innerHTML = '';
      btns.style.display = '';
    }
    function answer(v) {
      if (busy) return;
      busy = true;
      const it = items[i],
        ok = v === it.valid;
      if (ok) right++;
      btns.style.display = 'none';
      fb.innerHTML = '';
      fb.append(
        el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ It’s ${it.valid ? 'valid' : 'invalid'}`),
        el('div', { class: 'muted why' }, it.why),
        el(
          'button',
          { class: 'btn primary', style: { marginTop: '8px' }, onclick: next },
          i + 1 >= N ? 'See results' : 'Next →',
        ),
      );
    }
    function next() {
      i++;
      if (i >= N) ctx.finish({ score: (right / N) * 100, summary: `${right} of ${N} arguments judged correctly.` });
      else show();
    }
    show();
    return onKeys((e) => {
      const k = e.key.toLowerCase();
      if (k === 'v') answer(true);
      else if (k === 'i') answer(false);
    });
  },
});

import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';

export const NAMES = ['Asha', 'Ben', 'Chen', 'Dev', 'Eva', 'Farah', 'Gus', 'Hana', 'Ivan', 'Jia'];
export const NAME_CAT = { label: 'Name', pos: (v) => `is ${v}`, neg: (v) => `is not ${v}`, subj: (v) => v };
export const CATS = [
  {
    label: 'Pet',
    vals: ['cat', 'dog', 'parrot', 'fish', 'rabbit', 'turtle'],
    pos: (v) => `owns the ${v}`,
    neg: (v) => `does not own the ${v}`,
    subj: (v) => `the ${v} owner`,
  },
  {
    label: 'Drink',
    vals: ['tea', 'coffee', 'juice', 'milk', 'cocoa', 'lemonade'],
    pos: (v) => `drinks ${v}`,
    neg: (v) => `does not drink ${v}`,
    subj: (v) => `the ${v} drinker`,
  },
  {
    label: 'Colour',
    vals: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'],
    pos: (v) => `likes ${v}`,
    neg: (v) => `does not like ${v}`,
    subj: (v) => `the person who likes ${v}`,
  },
  {
    label: 'City',
    vals: ['Paris', 'Tokyo', 'Cairo', 'Lima', 'Oslo', 'Delhi'],
    pos: (v) => `lives in ${v}`,
    neg: (v) => `does not live in ${v}`,
    subj: (v) => `the person from ${v}`,
  },
  {
    label: 'Hobby',
    vals: ['chess', 'tennis', 'painting', 'guitar', 'hiking', 'baking'],
    pos: (v) => `enjoys ${v}`,
    neg: (v) => `does not enjoy ${v}`,
    subj: (v) => `the ${v} fan`,
  },
];
export const LG = (l) => (l <= 3 ? { n: 3, k: 2 } : l <= 6 ? { n: 4, k: 2 } : l <= 8 ? { n: 4, k: 3 } : { n: 5, k: 2 });
export function perms(n) {
  const out = [],
    a = [...Array(n).keys()];
  const rec = (k) => {
    if (k === n) {
      out.push(a.slice());
      return;
    }
    for (let i = k; i < n; i++) {
      [a[k], a[i]] = [a[i], a[k]];
      rec(k + 1);
      [a[k], a[i]] = [a[i], a[k]];
    }
  };
  rec(0);
  return out;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function genLogic(rng, lvl) {
  const { n, k } = LG(lvl);
  const P = perms(n),
    id = P[0].map((_, i) => i);
  let all = [[id]];
  for (let c = 0; c < k; c++) {
    const nx = [];
    for (const r of all) for (const p of P) nx.push([...r, p]);
    all = nx;
  }
  const cats = [NAME_CAT, ...rng.shuffle(CATS).slice(0, k)];
  const labels = [rng.shuffle(NAMES).slice(0, n), ...cats.slice(1).map((c) => rng.shuffle(c.vals).slice(0, n))];
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
    let c2 = rng.int(0, k);
    while (c2 === c1) c2 = rng.int(0, k);
    const p = rng.int(0, n - 1);
    let q = rng.int(0, n - 1);
    while (q === p) q = rng.int(0, n - 1);
    const v1 = val(T, c1, p);
    if (type === 'same') {
      const v2 = val(T, c2, p);
      return {
        key: `s${c1}.${v1}.${c2}.${v2}`,
        test: (a) => val(a, c2, who(a, c1, v1)) === v2,
        text: `${cap(subj(c1, v1))} ${cats[c2].pos(L(c2, v2))}.`,
      };
    }
    if (type === 'diff') {
      const v2 = val(T, c2, q);
      return {
        key: `d${c1}.${v1}.${c2}.${v2}`,
        test: (a) => val(a, c2, who(a, c1, v1)) !== v2,
        text: `${cap(subj(c1, v1))} ${cats[c2].neg(L(c2, v2))}.`,
      };
    }
    let vA = val(T, c2, p),
      vB = val(T, c2, q);
    if (rng.chance(0.5)) [vA, vB] = [vB, vA];
    const text =
      c2 === 0
        ? `${cap(subj(c1, v1))} is either ${L(0, vA)} or ${L(0, vB)}.`
        : `${cap(subj(c1, v1))} either ${cats[c2].pos(L(c2, vA))} or ${cats[c2].pos(L(c2, vB))}.`;
    return {
      key: `e${c1}.${v1}.${c2}.${Math.min(vA, vB)}.${Math.max(vA, vB)}`,
      test: (a) => {
        const x = val(a, c2, who(a, c1, v1));
        return x === vA || x === vB;
      },
      text,
    };
  }

  let cands = all,
    clues = [];
  const seen = new Set();
  let guard = 0;
  while (cands.length > 1 && guard++ < 2000) {
    const cl = randClue();
    if (seen.has(cl.key)) continue;
    seen.add(cl.key);
    const nx = cands.filter(cl.test);
    if (nx.length === cands.length) continue;
    clues.push(cl);
    cands = nx;
  }
  const unique = (cs) => {
    let cnt = 0;
    for (const a of all) {
      if (cs.every((c) => c.test(a))) {
        if (++cnt > 1) return false;
      }
    }
    return cnt === 1;
  };
  for (const cl of rng.shuffle(clues.slice())) {
    const others = clues.filter((x) => x !== cl);
    if (unique(others)) clues = others;
  }
  return { n, k, cats, labels, T, clues: rng.shuffle(clues) };
}

export default defineGame({
  id: 'logicgrid',
  skill: 'logic',
  name: 'Logic Grid',
  blurb: 'Use the clues to work out who has what.',
  howTo: [
    'Each person has exactly one item from each category, and no two people share an item.',
    'Tap an option once to cross it out (✗), twice to mark it as the answer (✓), again to clear.',
    'Tap a clue to strike it through once you’ve used it.',
    'Press Check when every person has a ✓ in every category. You get 3 checks.',
  ],
  levelInfo: (l) => {
    const { n, k } = LG(l);
    return `${n} people, ${k} categories`;
  },
  tip: 'When a clue rules something out, ask what else it forces. If only one option is left in a row, it’s the answer — and that answer is then crossed off for everyone else.',
  mount(root, ctx) {
    const pz = genLogic(ctx.rng, ctx.level);
    const { n, k, cats, labels, T, clues } = pz;
    const marks = Array.from({ length: n }, () => Array.from({ length: k }, () => Array(n).fill(0))); // 0 none, 1 x, 2 yes
    let checks = 0;
    const msg = el('div', { class: 'msg' });
    const people = el('div', { class: 'people' });
    root.append(
      el('h4', {}, 'Clues'),
      el(
        'ol',
        { class: 'clues' },
        clues.map((c) => el('li', { onclick: (e) => e.currentTarget.classList.toggle('struck') }, c.text)),
      ),
      people,
      msg,
      el('div', { class: 'toolbar' }, el('button', { class: 'btn primary', onclick: check }, 'Check answers')),
    );

    function draw() {
      people.innerHTML = '';
      for (let p = 0; p < n; p++) {
        people.append(
          el(
            'div',
            { class: 'person' },
            el('h4', {}, labels[0][p]),
            Array.from({ length: k }, (_, ci) =>
              el(
                'div',
                { class: 'attr' },
                el('span', { class: 'attr-label' }, cats[ci + 1].label),
                labels[ci + 1].map((lab, v) =>
                  el(
                    'button',
                    {
                      class: 'opt' + (marks[p][ci][v] === 1 ? ' x' : marks[p][ci][v] === 2 ? ' yes' : ''),
                      onclick: () => {
                        marks[p][ci][v] = (marks[p][ci][v] + 1) % 3;
                        draw();
                      },
                    },
                    lab,
                  ),
                ),
              ),
            ),
          ),
        );
      }
    }
    function check() {
      let missing = 0,
        wrong = 0;
      for (let p = 0; p < n; p++)
        for (let ci = 0; ci < k; ci++) {
          const yes = marks[p][ci].map((m, v) => (m === 2 ? v : -1)).filter((v) => v >= 0);
          if (yes.length !== 1) missing++;
          else if (yes[0] !== T[ci + 1][p]) wrong++;
        }
      if (missing) {
        msg.textContent = `Mark exactly one ✓ per category for everyone (${missing} still open).`;
        return;
      }
      checks++;
      const solution = el(
        'div',
        { class: 'details' },
        el(
          'table',
          {},
          el(
            'tr',
            {},
            cats.map((c) => el('th', {}, c.label)),
          ),
          Array.from({ length: n }, (_, p) =>
            el(
              'tr',
              {},
              cats.map((c, ci) => el('td', {}, labels[ci][T[ci][p]])),
            ),
          ),
        ),
      );
      if (wrong === 0)
        return ctx.finish({
          score: [100, 75, 50][checks - 1],
          summary: `Solved on check ${checks} of 3.`,
          details: solution,
        });
      if (checks >= 3)
        return ctx.finish({ score: 15, summary: 'Out of checks. Here’s the solution:', details: solution });
      msg.textContent = `${wrong} answer${wrong > 1 ? 's are' : ' is'} wrong. ${3 - checks} check${3 - checks > 1 ? 's' : ''} left.`;
    }
    draw();
  },
});

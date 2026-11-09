import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';

export const RULES = [
  {
    min: 1,
    gen: (r) => {
      const a = r.int(1, 20),
        d = r.int(2, 9);
      return { f: (i) => a + d * i, rule: `Add ${d} each time` };
    },
  },
  {
    min: 1,
    gen: (r) => {
      const a = r.int(60, 120),
        d = r.int(2, 9);
      return { f: (i) => a - d * i, rule: `Subtract ${d} each time` };
    },
  },
  {
    min: 2,
    gen: (r) => {
      const a = r.int(1, 5),
        m = r.int(2, 3);
      return { f: (i) => a * m ** i, rule: `Multiply by ${m} each time` };
    },
  },
  {
    min: 3,
    gen: (r) => {
      const s = r.int(1, 5),
        c = r.int(0, 5);
      return {
        f: (i) => (s + i) ** 2 + c,
        rule: c ? `Square numbers plus ${c} (${s}²+${c}, ${s + 1}²+${c}, …)` : `Square numbers (${s}², ${s + 1}², …)`,
      };
    },
  },
  {
    min: 3,
    show: 6,
    gen: (r) => {
      const a = r.int(1, 15),
        x = r.int(2, 9);
      let y = r.int(1, 9);
      while (y === x) y = r.int(1, 9);
      return { f: (i) => a + Math.ceil(i / 2) * x + Math.floor(i / 2) * y, rule: `Alternately add ${x} and ${y}` };
    },
  },
  {
    min: 4,
    gen: (r) => {
      const a = r.int(1, 10),
        d = r.int(1, 5),
        s = r.int(1, 3);
      return {
        f: (i) => a + d * i + (s * i * (i - 1)) / 2,
        rule: `The gap grows by ${s} each step (+${d}, +${d + s}, +${d + 2 * s}, …)`,
      };
    },
  },
  {
    min: 5,
    show: 6,
    gen: (r) => {
      const a = r.int(1, 5),
        b = r.int(a, 8);
      const s = [a, b];
      for (let i = 2; i < 10; i++) s.push(s[i - 1] + s[i - 2]);
      return { f: (i) => s[i], rule: 'Each term is the sum of the two before it' };
    },
  },
  {
    min: 6,
    gen: (r) => {
      let c = r.int(-3, 3);
      if (c === 0) c = 1;
      const a = c < 0 ? r.int(4, 8) : r.int(2, 6);
      const s = [a];
      for (let i = 1; i < 10; i++) s.push(s[i - 1] * 2 + c);
      return { f: (i) => s[i], rule: `Double, then ${c > 0 ? 'add ' + c : 'subtract ' + -c}` };
    },
  },
  {
    min: 6,
    show: 6,
    gen: (r) => {
      const a = r.int(1, 6),
        kk = r.int(1, 6);
      const s = [a];
      for (let i = 1; i < 10; i++) s.push(i % 2 ? s[i - 1] * 2 : s[i - 1] + kk);
      return { f: (i) => s[i], rule: `Alternately ×2 and +${kk}` };
    },
  },
  {
    min: 7,
    show: 7,
    gen: (r) => {
      const a = r.int(1, 20),
        d1 = r.int(2, 6),
        b = r.int(30, 60),
        d2 = -r.int(2, 6);
      return {
        f: (i) => (i % 2 === 0 ? a + d1 * (i / 2) : b + d2 * ((i - 1) / 2)),
        rule: `Two interleaved sequences: one goes +${d1}, the other ${d2}`,
      };
    },
  },
  {
    min: 7,
    gen: (r) => {
      const s = r.int(1, 6);
      return { f: (i) => ((s + i) * (s + i + 1)) / 2, rule: 'Triangular numbers (gaps grow by 1: n(n+1)/2)' };
    },
  },
  {
    min: 8,
    gen: (r) => {
      const s = r.int(1, 4);
      return { f: (i) => (s + i) ** 3, rule: `Cube numbers (${s}³, ${s + 1}³, …)` };
    },
  },
  {
    min: 8,
    gen: (r) => {
      const a = r.int(1, 10),
        d = r.int(1, 4);
      return { f: (i) => a + d * (2 ** i - 1), rule: `The gap doubles each time (+${d}, +${2 * d}, +${4 * d}, …)` };
    },
  },
  {
    min: 9,
    gen: (r) => {
      const pr = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61];
      const o = r.int(0, 8);
      return { f: (i) => pr[o + i], rule: 'Prime numbers' };
    },
  },
  {
    min: 9,
    gen: (r) => {
      const s = [r.int(10, 40)];
      const ds = (x) =>
        String(x)
          .split('')
          .reduce((t, d) => t + +d, 0);
      for (let i = 1; i < 10; i++) s.push(s[i - 1] + ds(s[i - 1]));
      return { f: (i) => s[i], rule: 'Add the sum of the digits each time (e.g. 23 → 23+2+3 = 28)' };
    },
  },
  {
    min: 10,
    show: 6,
    gen: (r) => {
      const s = [r.int(1, 2), r.int(2, 3)];
      for (let i = 2; i < 10; i++) s.push(s[i - 1] * s[i - 2]);
      return { f: (i) => s[i], rule: 'Each term is the product of the two before it' };
    },
  },
  {
    min: 10,
    gen: (r) => {
      const a = r.int(2, 5);
      return { f: (i) => (i + 1) * (a + i), rule: `n × (n+${a - 1}): 1×${a}, 2×${a + 1}, 3×${a + 2}, …` };
    },
  },
];

export default defineGame({
  id: 'pattern',
  skill: 'logic',
  name: 'Pattern Next',
  blurb: 'Spot the rule and give the next number.',
  howTo: [
    'Each round shows a sequence of numbers. Type the next one.',
    'After each answer you’ll see the hidden rule.',
    '6 sequences per game. Score = share correct.',
  ],
  levelInfo: (l) => `rules up to tier ${l} (${RULES.filter((r) => r.min <= l).length} rule types)`,
  tip: 'Write the differences between terms. If they aren’t constant, take differences of differences, or check ratios. Alternating patterns show up when every other term behaves.',
  mount(root, ctx) {
    const pool = RULES.filter((r) => r.min <= ctx.level);
    const weighted = pool.flatMap((r) => (r.min >= ctx.level - 3 ? [r, r, r] : [r]));
    const qs = [],
      used = new Set();
    for (let tries = 0; qs.length < 6 && tries < 200; tries++) {
      const R = ctx.rng.pick(weighted);
      if (used.has(R) && used.size < pool.length) continue;
      used.add(R);
      const g = R.gen(ctx.rng),
        show = R.show || 5;
      const seq = Array.from({ length: show }, (_, i) => g.f(i));
      qs.push({ seq, ans: g.f(show), rule: g.rule });
    }
    let qi = 0,
      correct = 0,
      answered = false;
    const prog = el('div', { class: 'statline' });
    const seqEl = el('div', { class: 'seq' });
    const input = el('input', {
      type: 'text',
      inputmode: 'numeric',
      autocomplete: 'off',
      'aria-label': 'Next number',
      placeholder: '?',
    });
    const btn = el('button', { class: 'btn primary', onclick: act }, 'Answer');
    const fb = el('div', { class: 'feedback' });
    root.append(prog, seqEl, el('div', { class: 'answer-row' }, input, btn), fb);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        act();
      }
    });

    function show() {
      const q = qs[qi];
      prog.innerHTML = '';
      prog.append(
        el('span', {}, `Sequence ${qi + 1} of ${qs.length}`),
        el('span', {}, 'Correct ', el('b', {}, correct)),
      );
      seqEl.innerHTML = '';
      q.seq.forEach((v) => seqEl.append(el('span', {}, v)));
      seqEl.append(el('span', { class: 'q' }, '?'));
      input.value = '';
      input.disabled = false;
      fb.innerHTML = '';
      btn.textContent = 'Answer';
      answered = false;
      input.focus();
    }
    function act() {
      if (answered) {
        qi++;
        if (qi >= qs.length)
          return ctx.finish({
            score: (correct / qs.length) * 100,
            summary: `${correct} of ${qs.length} patterns cracked.`,
          });
        return show();
      }
      const v = input.value.trim().replace(/[−–]/g, '-');
      if (!/^-?\d+$/.test(v)) {
        fb.innerHTML = '';
        fb.append(el('span', { class: 'bad' }, 'Enter a whole number'));
        return;
      }
      const q = qs[qi],
        ok = +v === q.ans;
      if (ok) correct++;
      answered = true;
      input.disabled = true;
      seqEl.lastChild.textContent = q.ans;
      fb.innerHTML = '';
      fb.append(
        el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ It was ${q.ans}`),
        el('div', { class: 'muted' }, 'Rule: ' + q.rule),
      );
      btn.textContent = qi + 1 >= qs.length ? 'See results' : 'Next →';
      btn.focus();
    }
    show();
  },
});

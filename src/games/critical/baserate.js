import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';

export const SCEN = [
  {
    min: 1,
    setup: (p, s, f) =>
      `${p}% of people have a rare condition. A test catches ${s}% of people who have it, but also wrongly flags ${f}% of healthy people.`,
    q: 'Someone tests positive. How likely is it they actually have the condition?',
    pos: 'have the condition',
    neg: 'are healthy',
    unit: 'people',
  },
  {
    min: 3,
    setup: (p, s, f) =>
      `${p}% of emails are spam. The filter catches ${s}% of spam, but also flags ${f}% of genuine emails.`,
    q: 'An email gets flagged. How likely is it to really be spam?',
    pos: 'are spam',
    neg: 'are genuine',
    unit: 'emails',
  },
  {
    min: 5,
    setup: (p, s, f) =>
      `${p}% of card payments are fraud. The bank’s alarm triggers on ${s}% of fraud, and on ${f}% of honest payments.`,
    q: 'The alarm goes off on a payment. How likely is it to be fraud?',
    pos: 'are fraud',
    neg: 'are honest',
    unit: 'payments',
  },
  {
    min: 6,
    setup: (p, s, f) =>
      `${p}% of parts from a factory are faulty. A scanner rejects ${s}% of faulty parts and ${f}% of good parts.`,
    q: 'A part gets rejected. How likely is it to really be faulty?',
    pos: 'are faulty',
    neg: 'are good',
    unit: 'parts',
  },
  {
    min: 8,
    setup: (p, s, f) =>
      `In a city, ${p}% of taxis are blue and the rest are green. A witness identifies colours correctly ${s}% of the time (so mistakes ${f}% of green taxis for blue).`,
    q: 'The witness says the taxi was blue. How likely is it that it really was blue?',
    pos: 'are blue',
    neg: 'are green',
    unit: 'taxis',
  },
];
export function genBase(rng, lvl) {
  for (let t = 0; t < 500; t++) {
    const sc = rng.pick(SCEN.filter((s) => s.min <= lvl));
    const p = rng.pick(lvl <= 3 ? [1, 2, 5, 10] : [1, 2, 3, 5, 8, 10, 15, 20]);
    let s = rng.pick([70, 80, 90, 95, 99]);
    let f = rng.pick([1, 2, 5, 10, 20]);
    if (sc.unit === 'taxis') {
      s = rng.pick([70, 80, 90]);
      f = 100 - s;
    }
    const post = ((p * s) / (p * s + (100 - p) * f)) * 100;
    const ans = Math.round(post);
    if (ans < 2 || ans > 97) continue;
    // options: correct, the test accuracy (classic error), and two others, all well separated
    const opts = [ans, s];
    const cand = rng.shuffle([
      5,
      10,
      15,
      25,
      35,
      50,
      65,
      75,
      85,
      95,
      100 - f,
      Math.round(post / 2),
      Math.min(99, Math.round(post * 2)),
    ]);
    for (const c of cand) {
      if (opts.length >= 4) break;
      if (opts.every((o) => Math.abs(o - c) >= 8) && c > 0 && c < 100) opts.push(c);
    }
    if (opts.length < 4 || Math.abs(ans - s) < 8) continue;
    const pop = 1000;
    const sick = (pop * p) / 100,
      tp = (sick * s) / 100,
      fp = ((pop - sick) * f) / 100;
    const r1 = (x) => Math.round(x * 10) / 10;
    return {
      text: sc.setup(p, s, f),
      q: sc.q,
      ans,
      opts: rng.shuffle(opts),
      why: `Picture ${pop} ${sc.unit}: ${r1(sick)} ${sc.pos} → ${r1(tp)} flagged. ${r1(pop - sick)} ${sc.neg} → ${r1(fp)} wrongly flagged. So ${r1(tp)} out of ${r1(tp + fp)} flagged are real ≈ ${ans}%.`,
    };
  }
  return null;
}

export default defineGame({
  id: 'baserate',
  skill: 'critical',
  name: 'Base Rate',
  blurb: 'A test says yes — but how likely is it really?',
  howTo: [
    'Each problem describes how common something is, and how accurate a test or detector is.',
    'Pick the closest answer for how likely a positive result is to be real.',
    'You won’t need exact maths — think in counts of people. 8 problems.',
  ],
  levelInfo: (l) => `${SCEN.filter((s) => s.min <= l).length} scenario types`,
  tip: 'Turn percentages into counts: “out of 1,000 people…”. When the thing is rare, false alarms from the huge healthy group usually outnumber the true cases — so a positive result is often less certain than the test’s accuracy suggests.',
  mount(root, ctx) {
    const N = 8;
    const qs = [];
    while (qs.length < N) {
      const q = genBase(ctx.rng, ctx.level);
      if (q) qs.push(q);
    }
    let i = 0,
      right = 0,
      busy = false;
    const info = el('div', { class: 'statline' });
    const card = el('div', { class: 'arg-card' });
    const opts = el('div', { class: 'choice-grid' });
    const fb = el('div', { class: 'feedback' });
    root.append(info, card, opts, fb);

    function show() {
      const q = qs[i];
      busy = false;
      info.innerHTML = '';
      info.append(el('span', {}, `Problem ${i + 1} of ${N}`), el('span', {}, 'Correct ', el('b', {}, right)));
      card.innerHTML = '';
      card.append(el('p', {}, q.text), el('p', { class: 'concl' }, q.q));
      opts.innerHTML = '';
      q.opts.forEach((o) =>
        opts.append(el('button', { class: 'btn', onclick: (e) => pick(o, e.currentTarget) }, `about ${o}%`)),
      );
      fb.innerHTML = '';
    }
    function pick(o, btn) {
      if (busy) return;
      busy = true;
      const q = qs[i],
        ok = o === q.ans;
      if (ok) right++;
      btn.classList.add(ok ? 'hit' : 'miss');
      [...opts.children].forEach((b, j) => {
        if (q.opts[j] === q.ans) b.classList.add('hit');
      });
      fb.innerHTML = '';
      fb.append(
        el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ About ${q.ans}%`),
        el('div', { class: 'muted why' }, q.why),
        el(
          'button',
          {
            class: 'btn primary',
            style: { marginTop: '8px' },
            onclick: () => {
              i++;
              if (i >= N)
                ctx.finish({ score: (right / N) * 100, summary: `${right} of ${N} problems answered correctly.` });
              else show();
            },
          },
          i + 1 >= N ? 'See results' : 'Next →',
        ),
      );
    }
    show();
  },
});

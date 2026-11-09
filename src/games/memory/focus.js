import { defineGame } from '../../core/game.js';
import { clamp } from '../../core/scoring.js';
import { el } from '../../ui/dom.js';
import { onKeys } from '../../ui/keys.js';
import { timer } from '../../ui/timer.js';

export const COLORS = [
  { name: 'RED', c: '#e5484d' },
  { name: 'BLUE', c: '#3b82f6' },
  { name: 'GREEN', c: '#16a34a' },
  { name: 'PURPLE', c: '#9b5cf6' },
];
export default defineGame({
  id: 'focus',
  skill: 'memory',
  name: 'Focus Filter',
  blurb: 'Name the ink colour, not the word. Ignore the distraction.',
  howTo: [
    'A colour word appears printed in a colour. Tap the button for the INK colour (keys 1–4 work too).',
    'From level 5, the rule sometimes flips to WORD — then answer what the word says. Watch the rule badge!',
    '45 seconds. Each wrong answer cancels out two right ones.',
  ],
  levelInfo: (l) =>
    `${Math.round(Math.min(0.85, 0.45 + l * 0.05) * 100)}% conflicting words${l >= 5 ? ', rule switching' : ''}${l >= 9 ? ', shuffled buttons' : ''}`,
  tip: 'Let your eyes go slightly soft on the word and focus on the colour of the letters. Accuracy first: a slow right answer beats a fast wrong one.',
  mount(root, ctx) {
    const L = ctx.level,
      incP = Math.min(0.85, 0.45 + L * 0.05);
    const switching = L >= 5,
      shuffleBtns = L >= 9;
    let order = [0, 1, 2, 3],
      trial = null,
      rule = 'INK',
      correct = 0,
      wrong = 0,
      done = false;
    const log = [];
    const tm = timer(45, end);
    const ruleEl = el('div', { class: 'rule' });
    const word = el('div', { class: 'stroop' });
    const stat = el('div', { class: 'statline' });
    const btnBox = el('div', { class: 'choice-grid' });
    root.append(tm.node, stat, ruleEl, word, btnBox);

    function drawButtons() {
      btnBox.innerHTML = '';
      order.forEach((ci, pos) =>
        btnBox.append(
          el(
            'button',
            { class: 'btn', onclick: () => answer(ci) },
            `${COLORS[ci].name}`,
            el('span', { class: 'muted small' }, ` ${pos + 1}`),
          ),
        ),
      );
    }
    function next() {
      const prevRule = rule;
      if (switching && ctx.rng.chance(0.3)) rule = rule === 'INK' ? 'WORD' : 'INK';
      const w = ctx.rng.int(0, 3);
      let ink = w;
      const inc = ctx.rng.chance(incP);
      if (inc) {
        do {
          ink = ctx.rng.int(0, 3);
        } while (ink === w);
      }
      trial = { w, ink, inc, sw: rule !== prevRule, t0: performance.now() };
      if (shuffleBtns) {
        order = ctx.rng.shuffle(order);
        drawButtons();
      }
      ruleEl.textContent = rule === 'INK' ? 'Match the INK colour' : 'Match the WORD';
      ruleEl.className = 'rule' + (rule === 'WORD' ? ' word' : '');
      word.textContent = COLORS[w].name;
      word.style.color = COLORS[ink].c;
      stat.innerHTML = '';
      stat.append(el('span', {}, 'Correct ', el('b', {}, correct)), el('span', {}, 'Wrong ', el('b', {}, wrong)));
    }
    function answer(ci) {
      if (done || !trial) return;
      const want = rule === 'INK' ? trial.ink : trial.w;
      const ok = ci === want;
      log.push({ ok, rt: performance.now() - trial.t0, inc: trial.inc, sw: trial.sw });
      ok ? correct++ : wrong++;
      word.classList.remove('flash-good', 'flash-bad');
      void word.offsetWidth;
      word.classList.add(ok ? 'flash-good' : 'flash-bad');
      next();
    }
    function end() {
      done = true;
      const mean = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
      const okRt = (f) => mean(log.filter((x) => x.ok && f(x)).map((x) => x.rt));
      const rows = [
        ['Matching words', okRt((x) => !x.inc)],
        ['Conflicting words', okRt((x) => x.inc)],
      ];
      if (switching) rows.push(['Right after a rule switch', okRt((x) => x.sw)]);
      ctx.finish({
        score: clamp(((correct - 2 * wrong) / 35) * 100),
        summary: `${correct} correct, ${wrong} wrong.`,
        details: el(
          'div',
          { class: 'details' },
          el(
            'table',
            {},
            el('tr', {}, el('th', {}, 'Average response time'), el('th', {}, '')),
            rows.map(([k, v]) => el('tr', {}, el('td', {}, k), el('td', {}, v == null ? '—' : v + ' ms'))),
          ),
          el(
            'p',
            { class: 'muted small' },
            'The gap between matching and conflicting words is your “interference cost”. Training shrinks it.',
          ),
        ),
      });
    }
    drawButtons();
    next();
    const off = onKeys((e) => {
      if (/^[1-4]$/.test(e.key)) answer(order[+e.key - 1]);
    });
    return () => {
      tm.stop();
      off();
    };
  },
});

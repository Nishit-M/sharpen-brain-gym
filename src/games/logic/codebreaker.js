import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';
import { onKeys } from '../../ui/keys.js';

export const PEG = ['#e5484d', '#3b82f6', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#0d9488', '#78716c'];
export const CB = [
  { c: 5, len: 4, rep: false },
  { c: 5, len: 4, rep: false },
  { c: 6, len: 4, rep: false },
  { c: 6, len: 4, rep: false },
  { c: 6, len: 4, rep: true },
  { c: 6, len: 4, rep: true },
  { c: 7, len: 4, rep: true },
  { c: 7, len: 4, rep: true },
  { c: 8, len: 5, rep: true },
  { c: 8, len: 5, rep: true },
];
export function allCodes(c, len, rep) {
  const out = [];
  const rec = (pre) => {
    if (pre.length === len) {
      out.push(pre);
      return;
    }
    for (let i = 0; i < c; i++) if (rep || !pre.includes(i)) rec([...pre, i]);
  };
  rec([]);
  return out;
}
export function feedback(g, s) {
  let b = 0;
  const cg = {},
    cs = {};
  for (let i = 0; i < g.length; i++) {
    if (g[i] === s[i]) b++;
    else {
      cg[g[i]] = (cg[g[i]] || 0) + 1;
      cs[s[i]] = (cs[s[i]] || 0) + 1;
    }
  }
  let w = 0;
  for (const k in cg) w += Math.min(cg[k], cs[k] || 0);
  return { b, w };
}

export default defineGame({
  id: 'codebreaker',
  skill: 'logic',
  name: 'Codebreaker',
  blurb: 'Crack the hidden colour code using peg clues.',
  howTo: [
    'Fill a row with colours and submit a guess.',
    '● Black peg = right colour in the right spot. ○ White peg = right colour, wrong spot. (Pegs are not in order.)',
    'The counter shows how many codes are still possible given all your clues.',
    'Crack it in 10 guesses — fewer is better.',
  ],
  levelInfo: (l) => {
    const p = CB[l - 1];
    return `${p.len} pegs, ${p.c} colours, ${p.rep ? 'repeats allowed' : 'no repeats'}`;
  },
  tip: 'Only play guesses that could still be the answer given every clue so far — the results screen tells you how many of yours were. Each guess should split the remaining possibilities as evenly as possible.',
  mount(root, ctx) {
    const P = CB[ctx.level - 1],
      MAX = 10;
    const secret = Array.from({ length: P.len }, () => 0);
    {
      const pool = ctx.rng.shuffle([...Array(P.c).keys()]);
      for (let i = 0; i < P.len; i++) secret[i] = P.rep ? ctx.rng.int(0, P.c - 1) : pool[i];
    }
    let remaining = allCodes(P.c, P.len, P.rep);
    let cur = [],
      guesses = 0,
      consistent = 0,
      over = false;
    const rowsEl = el('div', { class: 'cb-rows' });
    const curPegs = el('div', { class: 'cb-pegs' });
    const curRow = el('div', { class: 'cb-row current' }, el('span', { class: 'muted small' }, '1'), curPegs);
    const msg = el('div', { class: 'msg' });
    const submitBtn = el('button', { class: 'btn primary', onclick: submit }, 'Submit guess');
    const pegEl = (ci, extra = {}) =>
      el(extra.tag || 'span', { class: 'peg on', style: { background: PEG[ci] }, ...extra.props }, ci + 1);
    const palette = el(
      'div',
      { class: 'palette' },
      Array.from({ length: P.c }, (_, i) =>
        pegEl(i, { tag: 'button', props: { 'aria-label': 'Colour ' + (i + 1), onclick: () => add(i) } }),
      ),
    );
    root.append(
      el(
        'div',
        { class: 'statline' },
        el('span', {}, 'Possible codes: ', el('b', { id: 'cb-left' }, remaining.length)),
        el('span', {}, `${P.len} pegs · ${P.c} colours${P.rep ? ' · repeats on' : ''}`),
      ),
      rowsEl,
      curRow,
      msg,
      palette,
      el(
        'div',
        { class: 'toolbar' },
        el(
          'button',
          {
            class: 'btn',
            onclick: () => {
              cur.pop();
              draw();
            },
          },
          '⌫ Back',
        ),
        submitBtn,
      ),
    );
    const leftEl = root.querySelector('#cb-left');

    function draw() {
      curPegs.innerHTML = '';
      for (let i = 0; i < P.len; i++) {
        curPegs.append(
          cur[i] != null
            ? pegEl(cur[i], {
                tag: 'button',
                props: {
                  onclick: () => {
                    cur.splice(i, 1);
                    draw();
                  },
                },
              })
            : el('span', { class: 'peg' }),
        );
      }
      submitBtn.disabled = cur.length < P.len;
    }
    function add(ci) {
      if (over || cur.length >= P.len) return;
      if (!P.rep && cur.includes(ci)) {
        msg.textContent = 'No repeated colours at this level';
        return;
      }
      msg.textContent = '';
      cur.push(ci);
      draw();
    }
    function submit() {
      if (over || cur.length < P.len) return;
      const g = cur.slice();
      const key = g.join();
      if (remaining.some((c) => c.join() === key)) consistent++;
      const fb = feedback(g, secret);
      remaining = remaining.filter((c) => {
        const f = feedback(g, c);
        return f.b === fb.b && f.w === fb.w;
      });
      guesses++;
      const fbEl = el(
        'div',
        { class: 'cb-fb', title: `${fb.b} black, ${fb.w} white` },
        [...Array(fb.b).fill('b'), ...Array(fb.w).fill('w'), ...Array(P.len - fb.b - fb.w).fill('')].map((t) =>
          el('span', { class: 'fbp ' + t }),
        ),
      );
      rowsEl.append(
        el(
          'div',
          { class: 'cb-row' },
          el('span', { class: 'muted small' }, guesses),
          el(
            'div',
            { class: 'cb-pegs' },
            g.map((ci) => pegEl(ci)),
          ),
          fbEl,
          el('span', { class: 'cb-left' }, remaining.length + ' left'),
        ),
      );
      leftEl.textContent = remaining.length;
      cur = [];
      curRow.firstChild.textContent = guesses + 1;
      draw();
      if (fb.b === P.len || guesses >= MAX) {
        over = true;
        const won = fb.b === P.len;
        curRow.remove();
        const details = el(
          'div',
          { class: 'details' },
          el(
            'p',
            {},
            'The code: ',
            el(
              'span',
              { class: 'cb-pegs', style: { display: 'inline-flex', verticalAlign: 'middle' } },
              secret.map((ci) => pegEl(ci)),
            ),
          ),
          el('p', {}, `${consistent} of ${guesses} guesses were consistent with all earlier clues.`),
        );
        setTimeout(
          () =>
            ctx.finish({
              score: won ? (guesses <= 4 ? 100 : Math.max(40, 100 - (guesses - 4) * 10)) : 10,
              summary: won ? `Cracked in ${guesses} guess${guesses > 1 ? 'es' : ''}.` : 'The code held out this time.',
              details,
            }),
          600,
        );
      }
    }
    draw();
    return onKeys((e) => {
      if (/^[1-8]$/.test(e.key) && +e.key <= P.c) add(+e.key - 1);
      else if (e.key === 'Backspace') {
        cur.pop();
        draw();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
  },
});

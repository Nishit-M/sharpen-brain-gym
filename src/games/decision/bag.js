import { defineGame } from '../../core/game.js';
import { makeRng } from '../../core/rng.js';
import { clamp } from '../../core/scoring.js';
import { el } from '../../ui/dom.js';
import { timer } from '../../ui/timer.js';

export const ITEMS = [
  '🔦 Torch',
  '🧭 Compass',
  '⛺ Tent',
  '🍫 Snacks',
  '💧 Water',
  '🧥 Jacket',
  '📷 Camera',
  '🩹 First aid',
  '🔋 Power bank',
  '🗺️ Map',
  '🧤 Gloves',
  '🔪 Knife',
  '📚 Book',
  '🧴 Sunscreen',
  '🪢 Rope',
  '☕ Stove',
];
const bagN = (l) => [5, 5, 6, 6, 7, 7, 8, 8, 9, 9][l - 1];
export function genBag(rng, lvl) {
  const n = bagN(lvl);
  for (let tries = 0; tries < 300; tries++) {
    const names = rng.shuffle(ITEMS).slice(0, n);
    const items = names.map((nm) => {
      const w = rng.int(1, 9);
      return { nm, w, v: w * rng.int(3, 9) + rng.int(0, 12) };
    });
    const totalW = items.reduce((s, x) => s + x.w, 0);
    const cap = Math.round(totalW * (0.4 + rng.next() * 0.15));
    let best = 0,
      bestMask = 0;
    for (let m = 0; m < 1 << n; m++) {
      let w = 0,
        v = 0;
      for (let j = 0; j < n; j++)
        if (m & (1 << j)) {
          w += items[j].w;
          v += items[j].v;
        }
      if (w <= cap && v > best) {
        best = v;
        bestMask = m;
      }
    }
    // greedy by value/weight
    const order = items.map((x, j) => j).sort((a, b) => items[b].v / items[b].w - items[a].v / items[a].w);
    let gw = 0,
      gv = 0;
    for (const j of order)
      if (gw + items[j].w <= cap) {
        gw += items[j].w;
        gv += items[j].v;
      }
    if (lvl >= 3 && gv === best) continue; // make the obvious strategy fall short
    return { items, cap, best, bestMask };
  }
  return null;
}

export default defineGame({
  id: 'bag',
  skill: 'decision',
  name: 'Pack the Bag',
  blurb: 'Pick the most valuable gear that fits the weight limit.',
  howTo: [
    'Tap items to pack or unpack them. Stay within the weight limit.',
    'Maximise the total value, then press Pack it.',
    'Only the best possible combination scores 100 — every 5% short costs 20 points.',
  ],
  levelInfo: (l) => `${bagN(l)} items${l >= 3 ? ', simple “best ratio first” won’t be optimal' : ''}`,
  tip: 'Start with the best value-per-kg items, then look at the leftover capacity: swapping one item for two lighter ones (or vice versa) often fills the gap better.',
  mount(root, ctx) {
    const pz = genBag(ctx.rng, ctx.level) || genBag(makeRng(Date.now()), ctx.level);
    const { items, cap, best, bestMask } = pz;
    const limit = ctx.level <= 6 ? 90 : 75;
    const on = new Set();
    const tm = timer(limit, () => submit(true));
    const info = el('div', { class: 'statline' });
    const capFill = el('div', { class: 'cap-fill' });
    const grid = el('div', { class: 'items' });
    const packBtn = el('button', { class: 'btn primary', onclick: () => submit(false) }, 'Pack it');
    root.append(tm.node, info, el('div', { class: 'cap' }, capFill), grid, el('div', { class: 'toolbar' }, packBtn));

    const totals = () => {
      let w = 0,
        v = 0;
      on.forEach((j) => {
        w += items[j].w;
        v += items[j].v;
      });
      return { w, v };
    };
    function draw() {
      const { w, v } = totals();
      info.innerHTML = '';
      info.append(el('span', {}, 'Weight ', el('b', {}, `${w} / ${cap} kg`)), el('span', {}, 'Value ', el('b', {}, v)));
      capFill.style.width = Math.min(100, (w / cap) * 100) + '%';
      capFill.classList.toggle('over', w > cap);
      packBtn.disabled = w > cap || on.size === 0;
      grid.innerHTML = '';
      items.forEach((it, j) =>
        grid.append(
          el(
            'button',
            {
              class: 'item' + (on.has(j) ? ' on' : ''),
              onclick: () => {
                on.has(j) ? on.delete(j) : on.add(j);
                draw();
              },
            },
            el('span', { class: 'nm' }, it.nm),
            el('span', { class: 'wv' }, `${it.w} kg · value ${it.v}`),
            el('span', { class: 'wv' }, `${(it.v / it.w).toFixed(1)} per kg`),
          ),
        ),
      );
    }
    function submit(timeout) {
      tm.stop();
      const { w, v } = totals();
      const val = w > cap ? 0 : v;
      const bestList = items.filter((_, j) => bestMask & (1 << j)).map((x) => x.nm);
      ctx.finish({
        score: val === best ? 100 : clamp(100 - ((best - val) / best) * 400),
        summary:
          (timeout ? 'Time’s up. ' : '') +
          (w > cap ? 'Over the weight limit — nothing counts.' : `You packed value ${val} of a possible ${best}.`),
        details: el('div', { class: 'details' }, el('b', {}, `Best pack (value ${best}): `), bestList.join(', ')),
      });
    }
    draw();
    return () => tm.stop();
  },
});

import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';
import { timer } from '../../ui/timer.js';
import { SYM } from './shared.js';

export function genTarget(rng, lvl) {
  const count = lvl <= 3 ? 4 : lvl <= 7 ? 5 : 6;
  const [lo, hi] = lvl <= 2 ? [10, 60] : lvl <= 4 ? [30, 150] : lvl <= 6 ? [100, 400] : [100, 999];
  for (let tries = 0; tries < 5000; tries++) {
    const nLarge = lvl <= 2 ? rng.int(0, 1) : rng.int(1, 2);
    const large = rng.shuffle([25, 50, 75, 100]).slice(0, nLarge);
    const small = Array.from({ length: count - nLarge }, () => rng.int(1, 10));
    const nums = rng.shuffle([...large, ...small]);
    const k = rng.int(Math.min(3, count), count);
    const use = rng.shuffle(nums).slice(0, k);
    let v = use[0];
    const steps = [];
    for (let i = 1; i < k; i++) {
      const b = use[i],
        opts = ['+'];
      if (v - b > 0) opts.push('-');
      if (b - v > 0) opts.push('r-');
      if (v > 1 && b > 1 && v * b <= 2000) opts.push('*', '*');
      if (b > 1 && v % b === 0) opts.push('/');
      if (v > 1 && b % v === 0 && b !== v) opts.push('r/');
      const op = rng.pick(opts);
      let n;
      if (op === '+') {
        n = v + b;
        steps.push(`${v} + ${b} = ${n}`);
      } else if (op === '-') {
        n = v - b;
        steps.push(`${v} − ${b} = ${n}`);
      } else if (op === 'r-') {
        n = b - v;
        steps.push(`${b} − ${v} = ${n}`);
      } else if (op === '*') {
        n = v * b;
        steps.push(`${v} × ${b} = ${n}`);
      } else if (op === '/') {
        n = v / b;
        steps.push(`${v} ÷ ${b} = ${n}`);
      } else {
        n = b / v;
        steps.push(`${b} ÷ ${v} = ${n}`);
      }
      v = n;
    }
    if (v < lo || v > hi || nums.includes(v)) continue;
    return { nums, target: v, steps };
  }
  return { nums: [2, 3, 5, 7], target: 31, steps: ['2 × 3 = 6', '6 × 5 = 30', '30 + 7 = 37'] };
}

export default defineGame({
  id: 'target',
  skill: 'math',
  name: 'Make the Target',
  blurb: 'Combine the numbers with + − × ÷ to hit the target.',
  howTo: [
    'Tap a number, an operator, then another number to combine them into a new number.',
    'Each number can be used once. You don’t have to use them all.',
    'Results must be whole positive numbers. Undo anytime.',
    'Hit the target exactly for full marks; faster is better. Otherwise, closest wins partial credit.',
  ],
  levelInfo: (l) => {
    const c = l <= 3 ? 4 : l <= 7 ? 5 : 6;
    return `${c} numbers, targets up to ${l <= 2 ? 60 : l <= 4 ? 150 : l <= 6 ? 400 : 999}`;
  },
  tip: 'Work backwards: find a multiple of a big number near the target (e.g. 4 × 25 = 100), then fix the remainder with the small numbers.',
  mount(root, ctx) {
    const { nums, target, steps: solution } = genTarget(ctx.rng, ctx.level);
    const limit = ctx.level <= 3 ? 150 : ctx.level <= 6 ? 120 : 100;
    let tiles = nums.map((v, i) => ({ v, id: i, made: false }));
    let steps = [],
      history = [],
      sel = null,
      op = null,
      nextId = 100;
    let closest = Math.min(...nums.map((n) => Math.abs(n - target)));
    const tm = timer(limit, () => end(false));
    const tileBox = el('div', { class: 'num-tiles' });
    const opBtns = {};
    const ops = el(
      'div',
      { class: 'ops' },
      ['+', '-', '*', '/'].map((o) => (opBtns[o] = el('button', { class: 'op', onclick: () => pickOp(o) }, SYM[o]))),
    );
    const stepList = el('ul', { class: 'steps' });
    const msg = el('div', { class: 'msg' });
    root.append(
      tm.node,
      el('div', { class: 'big-target' }, el('span', { class: 'muted' }, 'Target'), el('b', {}, target)),
      tileBox,
      ops,
      msg,
      stepList,
      el(
        'div',
        { class: 'toolbar' },
        el('button', { class: 'btn', onclick: undo }, '↶ Undo'),
        el('button', { class: 'btn', onclick: resetAll }, 'Reset'),
        el('button', { class: 'btn', onclick: () => end(false) }, 'I’m done'),
      ),
    );

    function render() {
      tileBox.innerHTML = '';
      tiles.forEach((t) =>
        tileBox.append(
          el(
            'button',
            { class: 'num' + (t.made ? ' made' : '') + (sel === t.id ? ' sel' : ''), onclick: () => pickTile(t.id) },
            t.v,
          ),
        ),
      );
      Object.entries(opBtns).forEach(([o, b]) => b.classList.toggle('sel', op === o));
      stepList.innerHTML = '';
      steps.forEach((s) => stepList.append(el('li', {}, s)));
    }
    function pickTile(id) {
      msg.textContent = '';
      if (sel === null || op === null) {
        sel = sel === id ? null : id;
        render();
        return;
      }
      if (id === sel) {
        sel = null;
        op = null;
        render();
        return;
      }
      const a = tiles.find((t) => t.id === sel),
        b = tiles.find((t) => t.id === id);
      let v;
      if (op === '+') v = a.v + b.v;
      else if (op === '-') v = a.v - b.v;
      else if (op === '*') v = a.v * b.v;
      else v = a.v / b.v;
      if (v <= 0) {
        msg.textContent = 'Result must be positive';
        return;
      }
      if (!Number.isInteger(v)) {
        msg.textContent = `${a.v} ÷ ${b.v} isn’t a whole number`;
        return;
      }
      history.push({ tiles: tiles.slice(), steps: steps.slice() });
      const idx = tiles.indexOf(b);
      tiles = tiles.filter((t) => t !== a && t !== b);
      tiles.splice(Math.min(idx, tiles.length), 0, { v, id: nextId++, made: true });
      steps.push(`${a.v} ${SYM[op]} ${b.v} = ${v}`);
      closest = Math.min(closest, Math.abs(v - target));
      sel = null;
      op = null;
      render();
      if (v === target) end(true);
    }
    function pickOp(o) {
      if (sel === null) {
        msg.textContent = 'Pick a number first';
        return;
      }
      op = op === o ? null : o;
      render();
    }
    function undo() {
      const h = history.pop();
      if (!h) return;
      tiles = h.tiles;
      steps = h.steps;
      sel = op = null;
      render();
    }
    function resetAll() {
      if (!history.length) return;
      const h = history[0];
      history = [];
      tiles = h.tiles;
      steps = h.steps;
      sel = op = null;
      render();
    }
    function end(hit) {
      tm.stop();
      const t = tm.elapsed();
      const details = el(
        'div',
        { class: 'details' },
        el('b', {}, 'One way to make ' + target + ':'),
        el(
          'ul',
          {},
          solution.map((s) => el('li', {}, s)),
        ),
      );
      if (hit)
        ctx.finish({
          score: t <= 30 ? 100 : Math.max(70, 100 - ((t - 30) / (limit - 30)) * 30),
          summary: `Made ${target} in ${Math.round(t)}s.`,
          details,
        });
      else
        ctx.finish({
          score: Math.max(0, 60 - closest * 8),
          summary: closest === 0 ? 'Target reached.' : `Closest you got: ${closest} away from ${target}.`,
          details,
        });
    }
    render();
    return () => tm.stop();
  },
});

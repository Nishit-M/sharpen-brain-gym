import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';

export default defineGame({
  id: 'gridrecall',
  skill: 'memory',
  name: 'Grid Recall',
  blurb: 'Memorise the lit squares, then tap them back.',
  howTo: [
    'Some squares light up briefly. Then tap all of them, in any order.',
    'Get it right and the next pattern is one square bigger; miss and it shrinks by one.',
    '8 rounds. Score = rounds passed.',
  ],
  levelInfo: (l) => {
    const s = l <= 3 ? 4 : l <= 7 ? 5 : 6;
    return `${s}×${s} grid, starting with ${2 + l} squares`;
  },
  tip: 'Don’t memorise squares one by one — see the shape. Group them into chunks (“an L in the corner, a pair in the middle”). Chunking is how memory experts beat their span.',
  mount(root, ctx) {
    const size = ctx.level <= 3 ? 4 : ctx.level <= 7 ? 5 : 6,
      ROUNDS = 8;
    let count = Math.min(size * size - 3, 2 + ctx.level),
      round = 0,
      wins = 0,
      best = 0,
      target = new Set(),
      found = new Set(),
      phase = 'wait';
    const timers = [];
    const info = el('div', { class: 'statline' });
    const msg = el('div', { class: 'msg' });
    const cells = Array.from({ length: size * size }, (_, i) =>
      el('button', { class: 'cell', 'aria-label': 'Square ' + (i + 1), onclick: () => tap(i) }),
    );
    root.append(info, el('div', { class: 'grid', style: { '--n': size } }, cells), msg);

    function startRound() {
      round++;
      found = new Set();
      cells.forEach((c) => (c.className = 'cell'));
      msg.textContent = '';
      msg.className = 'msg';
      target = new Set(ctx.rng.shuffle([...Array(size * size).keys()]).slice(0, count));
      info.innerHTML = '';
      info.append(el('span', {}, `Round ${round} of ${ROUNDS}`), el('span', {}, el('b', {}, count), ' squares'));
      phase = 'show';
      target.forEach((i) => cells[i].classList.add('lit'));
      timers.push(
        setTimeout(
          () => {
            cells.forEach((c) => c.classList.remove('lit'));
            phase = 'input';
            msg.className = 'msg good';
            msg.textContent = 'Your turn';
          },
          700 + count * 150,
        ),
      );
    }
    function tap(i) {
      if (phase !== 'input' || found.has(i)) return;
      if (target.has(i)) {
        found.add(i);
        cells[i].classList.add('ok');
        if (found.size === target.size) {
          wins++;
          best = Math.max(best, count);
          count = Math.min(size * size - 2, count + 1);
          nextRound(true);
        }
      } else {
        cells[i].classList.add('bad');
        target.forEach((j) => {
          if (!found.has(j)) cells[j].classList.add('miss');
        });
        count = Math.max(2, count - 1);
        nextRound(false);
      }
    }
    function nextRound(ok) {
      phase = 'wait';
      msg.className = 'msg' + (ok ? ' good' : '');
      msg.textContent = ok ? '✓ Perfect' : '✗ Missed — shaded squares were in the pattern';
      timers.push(
        setTimeout(
          () => {
            if (round >= ROUNDS)
              return ctx.finish({
                score: (wins / ROUNDS) * 100,
                summary: `${wins} of ${ROUNDS} rounds. Biggest pattern recalled: ${best || '—'} squares.`,
              });
            startRound();
          },
          ok ? 700 : 1500,
        ),
      );
    }
    timers.push(setTimeout(startRound, 600));
    return () => timers.forEach(clearTimeout);
  },
});

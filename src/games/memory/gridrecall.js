import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';

export default defineGame({
  id: 'gridrecall',
  skill: 'memory',
  name: 'Grid Recall',
  blurb: 'Memorise the lit squares, then tap them back.',
  howTo: [
    'Some squares light up briefly. Then tap all of them, in any order.',
    'From level 4, every other round is a SEQUENCE round: squares light one at a time, and you tap them back in the same order.',
    'Get it right and the next pattern is one square bigger; miss and it shrinks by one.',
    '8 rounds. Score = rounds passed.',
  ],
  levelInfo: (l) => {
    const s = l <= 3 ? 4 : l <= 7 ? 5 : 6;
    return `${s}×${s} grid, starting with ${2 + l} squares${l >= 4 ? ', sequence rounds' : ''}`;
  },
  tip: 'Don’t memorise squares one by one — see the shape. Group them into chunks (“an L in the corner, a pair in the middle”). Chunking is how memory experts beat their span.',
  mount(root, ctx) {
    const size = ctx.level <= 3 ? 4 : ctx.level <= 7 ? 5 : 6,
      ROUNDS = 8;
    const seqRounds = ctx.level >= 4;
    let count = Math.min(size * size - 3, 2 + ctx.level),
      seqCount = Math.max(3, ctx.level - 1),
      order = [],
      isSeq = false,
      seqWins = 0,
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
      isSeq = seqRounds && round % 2 === 0;
      const n = isSeq ? seqCount : count;
      order = ctx.rng.shuffle([...Array(size * size).keys()]).slice(0, n);
      target = new Set(order);
      info.innerHTML = '';
      info.append(
        el('span', {}, `Round ${round} of ${ROUNDS}`),
        el('span', {}, isSeq ? el('b', { class: 'gr-seq' }, 'IN ORDER · ') : '', el('b', {}, n), ' squares'),
      );
      phase = 'show';
      const yourTurn = () => {
        cells.forEach((c) => c.classList.remove('lit'));
        phase = 'input';
        msg.className = 'msg good';
        msg.textContent = isSeq ? 'Your turn — same order' : 'Your turn';
      };
      if (!isSeq) {
        target.forEach((i) => cells[i].classList.add('lit'));
        timers.push(setTimeout(yourTurn, 700 + count * 150));
        return;
      }
      order.forEach((i, j) => {
        timers.push(setTimeout(() => cells[i].classList.add('lit'), j * 650));
        timers.push(setTimeout(() => cells[i].classList.remove('lit'), j * 650 + 500));
      });
      timers.push(setTimeout(yourTurn, order.length * 650 + 200));
    }
    function fail(i) {
      cells[i].classList.add('bad');
      order.forEach((j, k) => {
        if (!found.has(j)) {
          cells[j].classList.add('miss');
          if (isSeq) cells[j].textContent = k + 1;
        }
      });
      if (isSeq) seqCount = Math.max(2, seqCount - 1);
      else count = Math.max(2, count - 1);
      nextRound(false);
    }
    function tap(i) {
      if (phase !== 'input' || found.has(i)) return;
      const want = isSeq ? order[found.size] === i : target.has(i);
      if (!want) return fail(i);
      found.add(i);
      cells[i].classList.add('ok');
      if (isSeq) cells[i].textContent = found.size;
      if (found.size < target.size) return;
      wins++;
      if (isSeq) {
        seqWins++;
        seqCount = Math.min(9, seqCount + 1);
      } else {
        best = Math.max(best, count);
        count = Math.min(size * size - 2, count + 1);
      }
      nextRound(true);
    }
    function nextRound(ok) {
      phase = 'wait';
      msg.className = 'msg' + (ok ? ' good' : '');
      msg.textContent = ok
        ? '✓ Perfect'
        : isSeq
          ? '✗ Wrong square — the numbers show the order'
          : '✗ Missed — shaded squares were in the pattern';
      timers.push(
        setTimeout(
          () => {
            if (round >= ROUNDS)
              return ctx.finish({
                score: (wins / ROUNDS) * 100,
                summary:
                  `${wins} of ${ROUNDS} rounds. Biggest pattern recalled: ${best || '—'} squares.` +
                  (seqRounds ? ` Sequence rounds: ${seqWins} of ${ROUNDS / 2}.` : ''),
              });
            cells.forEach((c) => (c.textContent = ''));
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

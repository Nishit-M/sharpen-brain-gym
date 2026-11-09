import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';

export const EVENTS = [
  { min: 4, text: 'Roll a die — win on a 6', p: 1 / 6 },
  { min: 4, text: 'Roll a die — win on 5 or 6', p: 2 / 6 },
  { min: 4, text: 'Roll a die — win on an even number', p: 1 / 2 },
  { min: 4, text: 'Roll a die — win on anything but a 1', p: 5 / 6 },
  { min: 4, text: 'Flip 2 coins — win if both are heads', p: 1 / 4 },
  { min: 4, text: 'Flip 3 coins — win if at least one is heads', p: 7 / 8 },
  { min: 5, text: 'Flip 3 coins — win if all three match', p: 2 / 8 },
  { min: 5, text: 'Draw a card — win on a heart', p: 13 / 52 },
  { min: 6, text: 'Draw a card — win on a face card (J, Q, K)', p: 12 / 52 },
  { min: 6, text: 'Draw a card — win on an ace', p: 4 / 52 },
  { min: 7, text: 'Roll two dice — win if the total is 7', p: 6 / 36 },
  { min: 7, text: 'Roll two dice — win on a double', p: 6 / 36 },
  { min: 7, text: 'Roll two dice — win if the total is 8 or more', p: 15 / 36 },
  { min: 8, text: 'Roll two dice — win if at least one shows a 6', p: 11 / 36 },
  { min: 8, text: 'Roll two dice — win if the total is between 5 and 9', p: 24 / 36 },
  { min: 8, text: 'Draw a card — win on a heart or a face card', p: 22 / 52 },
  { min: 9, text: 'Flip 4 coins — win on exactly 2 heads', p: 6 / 16 },
  { min: 9, text: 'Roll two dice — win if the total is 10 or more', p: 6 / 36 },
  { min: 10, text: 'Roll a die twice — win if the second is higher', p: 15 / 36 },
  { min: 10, text: 'Flip 4 coins — win on at least 3 heads', p: 5 / 16 },
];
export function genBet(rng, lvl) {
  const maxEdge = 0.34 - lvl * 0.027;
  for (let tries = 0; tries < 500; tries++) {
    let ev;
    const evs = EVENTS.filter((e) => e.min <= lvl);
    if (lvl <= 3 || !evs.length || rng.chance(lvl <= 6 ? 0.4 : 0.15)) {
      const pc = rng.int(2, 18) * 5;
      ev = { text: `${pc}% chance to win`, p: pc / 100 };
    } else ev = rng.pick(evs);
    const cost = rng.int(4, 20) * 5;
    const edge = (rng.chance(0.5) ? 1 : -1) * (maxEdge / 2 + (rng.next() * maxEdge) / 2);
    const prize = Math.round((cost * (1 + edge)) / ev.p);
    if (prize <= cost) continue;
    const EV = ev.p * prize - cost;
    if (Math.abs(EV) / cost < 0.03) continue;
    return { ...ev, cost, prize, EV };
  }
  return { text: '50% chance to win', p: 0.5, cost: 50, prize: 120, EV: 10 };
}
const pct = (p) => (p * 100).toFixed((p * 100) % 1 ? 1 : 0) + '%';

export default defineGame({
  id: 'bet',
  skill: 'decision',
  name: 'Bet or Pass',
  blurb: 'Take good bets, skip bad ones. Think in expected value.',
  howTo: [
    'Each offer: pay the cost to play; if you win you receive the prize.',
    'Take the bet only when it pays on average: chance × prize > cost.',
    'You’ll see what actually happened — but you’re scored on the decision, not the luck.',
    '10 offers per game.',
  ],
  levelInfo: (l) =>
    (l <= 3 ? 'odds given as %' : l <= 6 ? 'dice, coins and cards' : 'two dice and combined events') +
    `, edges ±${Math.round((0.34 - l * 0.027) * 50)}–${Math.round((0.34 - l * 0.027) * 100)}%`,
  tip: 'Expected value = chance × prize − cost. A good bet can lose and a bad bet can win — judge decisions by their EV, not by the outcome you happened to get.',
  mount(root, ctx) {
    const N = 10;
    const bets = Array.from({ length: N }, () => genBet(ctx.rng, ctx.level));
    let i = 0,
      right = 0,
      bank = 1000;
    const info = el('div', { class: 'statline' });
    const card = el('div', { class: 'bet-card' });
    const fb = el('div', { class: 'feedback' });
    const btns = el('div', { class: 'actions' });
    root.append(info, card, btns, fb);

    function show() {
      const b = bets[i];
      info.innerHTML = '';
      info.append(el('span', {}, `Offer ${i + 1} of ${N}`), el('span', {}, 'Coins ', el('b', {}, bank)));
      card.innerHTML = '';
      card.append(
        el('div', { class: 'bet-event' }, b.text),
        el(
          'div',
          { class: 'bet-terms' },
          el('div', {}, el('span', { class: 'muted small' }, 'Cost to play'), el('b', {}, b.cost)),
          el('div', {}, el('span', { class: 'muted small' }, 'Prize if you win'), el('b', {}, b.prize)),
        ),
      );
      fb.innerHTML = '';
      btns.innerHTML = '';
      btns.append(
        el('button', { class: 'btn primary', onclick: () => decide(true) }, 'Bet'),
        el('button', { class: 'btn', onclick: () => decide(false) }, 'Pass'),
      );
    }
    function decide(take) {
      const b = bets[i];
      const good = b.EV > 0,
        ok = take === good;
      if (ok) right++;
      let outcome = 'You passed.';
      if (take) {
        const won = ctx.rng.next() < b.p;
        bank += (won ? b.prize : 0) - b.cost;
        outcome = won ? `You won ${b.prize}!` : `You lost ${b.cost}.`;
      }
      fb.innerHTML = '';
      fb.append(
        el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Good decision' : '✗ Wrong call'),
        el(
          'div',
          {},
          `Chance ${pct(b.p)} × ${b.prize} = ${(b.p * b.prize).toFixed(1)} vs cost ${b.cost} → EV ${b.EV > 0 ? '+' : ''}${b.EV.toFixed(1)} (${good ? 'worth taking' : 'skip it'})`,
        ),
        el('div', { class: 'muted' }, outcome),
      );
      btns.innerHTML = '';
      btns.append(
        el(
          'button',
          {
            class: 'btn primary',
            onclick: () => {
              i++;
              if (i >= N) finish();
              else show();
            },
          },
          i + 1 >= N ? 'See results' : 'Next offer →',
        ),
      );
      info.lastChild.lastChild.textContent = bank;
    }
    function finish() {
      ctx.finish({
        score: (right / N) * 100,
        summary: `${right} of ${N} good decisions. Coins: ${bank} (started with 1000).`,
        details: el(
          'p',
          { class: 'details muted' },
          'Your coin total includes luck; your score does not. Over many bets, good decisions win out.',
        ),
      });
    }
    show();
  },
});

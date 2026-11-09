/** Play: intro → game → result, for one game in daily or practice mode. */
import { progress, registry } from '../app/services.js';
import { today } from '../core/dates.js';
import { makeRng } from '../core/rng.js';
import { band, verdict } from '../core/scoring.js';
import { chip, header } from '../ui/components.js';
import { el } from '../ui/dom.js';

export const matchPlay = ({ parts }) => parts[0] === 'play' && !!registry.byId(parts[1]);

/**
 * Seed for a round. Daily rounds are deterministic per date, game and level so
 * a replay after a reload shows the same puzzle; practice rounds are random.
 */
export const roundSeed = (daily, date, gameId, level) =>
  daily ? `${date}|${gameId}|${level}` : `${Date.now()}|${Math.random()}`;

/** @type {import('../app/router.js').Screen} */
export function playScreen(outlet, { parts, query }, router) {
  const game = /** @type {import('../core/game.js').Game} */ (registry.byId(parts[1]));
  const date = today();
  let daily = query.get('daily') === '1';
  let note = null;
  if (daily && game.id in progress.dailyResults(date)) {
    daily = false;
    note = 'You already played this one today — this round is practice.';
  }
  if (daily && !progress.isInDailySet(game.id, date)) daily = false;

  const level = progress.getLevel(game.id);
  const seed = roundSeed(daily, date, game.id, level);
  let gameCleanup = null;
  const stopGame = () => {
    if (gameCleanup) gameCleanup();
    gameCleanup = null;
  };

  const stage = el('section', { class: 'card stage' });
  outlet.append(
    header(),
    el(
      'main',
      { class: 'wrap' },
      el(
        'div',
        { class: 'game-head' },
        el('a', { href: '#/', class: 'back', 'aria-label': 'Back to home' }, '←'),
        el(
          'div',
          { class: 'gh-title' },
          el('div', { class: 'eyebrow' }, chip(game.skill), daily ? ' Daily workout' : ' Practice'),
          el('h1', {}, game.name),
        ),
        el('span', { class: 'lvl big' }, 'Level ' + level),
      ),
      stage,
    ),
  );

  function intro() {
    stage.replaceChildren(
      ...[
        note ? el('div', { class: 'note' }, note) : null,
        el('p', { class: 'lead' }, game.blurb),
        el('h4', {}, 'How to play'),
        el(
          'ul',
          { class: 'howto' },
          game.howTo.map((t) => el('li', {}, t)),
        ),
        game.levelInfo ? el('p', { class: 'muted small' }, `Level ${level}: ${game.levelInfo(level)}`) : null,
        el('button', { class: 'btn primary big', onclick: start }, 'Start'),
      ].filter(Boolean),
    );
  }

  function start() {
    const body = el('div', { class: 'game-body game-' + game.id });
    stage.replaceChildren(body);
    let finished = false;
    /** @type {import('../core/game.js').GameContext} */
    const ctx = {
      level,
      daily,
      rng: makeRng(seed),
      finish(res) {
        if (finished) return;
        finished = true;
        stopGame();
        showResult(res);
      },
    };
    try {
      gameCleanup = game.mount(body, ctx) || null;
    } catch (err) {
      console.error(`[sharpen] game "${game.id}" failed at level ${level}`, err);
      stopGame();
      stage.replaceChildren(
        el('div', { class: 'note', role: 'alert' }, 'Sorry — this game hit a problem and could not start.'),
        el('div', { class: 'actions' }, el('a', { class: 'btn primary', href: '#/' }, 'Home')),
      );
    }
  }

  function showResult(res) {
    const rec = progress.record(game, res, { level, daily, date });
    const doneNow = progress.dailyResults(date);
    const nextDaily = daily ? progress.dailySet(date).find((g) => !(g.id in doneNow)) : null;

    let lvlMsg;
    if (rec.next > rec.prev) lvlMsg = el('div', { class: 'lvl-msg up' }, `▲ Level up! Next time: level ${rec.next}`);
    else if (rec.next < rec.prev)
      lvlMsg = el('div', { class: 'lvl-msg down' }, `▼ Next time eases to level ${rec.next}`);
    else lvlMsg = el('div', { class: 'lvl-msg' }, `Staying at level ${rec.next} (80+ levels up)`);

    let primary;
    if (!daily) primary = el('button', { class: 'btn primary', onclick: () => router.render() }, 'Play again');
    else if (nextDaily) {
      primary = el('a', { class: 'btn primary', href: `#/play/${nextDaily.id}?daily=1` }, `Next: ${nextDaily.name} →`);
    } else primary = el('a', { class: 'btn primary', href: '#/' }, 'Workout complete 🎉');

    stage.replaceChildren(
      el(
        'div',
        { class: 'result' },
        el('div', { class: 'ring ' + band(rec.score), style: { '--p': rec.score } }, el('span', {}, rec.score)),
        el('h2', {}, verdict(rec.score)),
        el('p', { class: 'summary' }, res.summary || ''),
        res.details || null,
        lvlMsg,
        game.tip ? el('div', { class: 'tip' }, el('b', {}, 'Coach’s tip: '), game.tip) : null,
        el('div', { class: 'actions' }, primary, el('a', { class: 'btn', href: '#/' }, 'Home')),
      ),
    );
  }

  intro();
  return stopGame;
}

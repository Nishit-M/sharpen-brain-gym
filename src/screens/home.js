/** Home: today's workout (one game per skill) and the free-practice catalogue. */
import { progress, registry } from '../app/services.js';
import { today } from '../core/dates.js';
import { band } from '../core/scoring.js';
import { SKILLS, SKILL_IDS } from '../core/skills.js';
import { chip, header } from '../ui/components.js';
import { el } from '../ui/dom.js';

/** @type {import('../app/router.js').Screen} */
export function homeScreen(outlet) {
  const date = today();
  const set = progress.dailySet(date);
  const done = progress.dailyResults(date);
  const nDone = set.filter((g) => g.id in done).length;
  const pretty = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const rows = set.map((g) => {
    const sc = done[g.id];
    const isDone = sc != null;
    return el(
      isDone ? 'div' : 'a',
      { class: 'daily-row' + (isDone ? ' done' : ''), href: isDone ? null : `#/play/${g.id}?daily=1` },
      el('span', { class: `dot sk-${g.skill}` }, SKILLS[g.skill].icon),
      el(
        'div',
        { class: 'dr-text' },
        el('b', {}, g.name),
        el('span', { class: 'muted' }, SKILLS[g.skill].name + ' · Level ' + progress.getLevel(g.id)),
      ),
      isDone ? el('span', { class: 'score-pill ' + band(sc) }, sc) : el('span', { class: 'btn small primary' }, 'Play'),
    );
  });

  const hero = el(
    'section',
    { class: 'card hero' },
    el(
      'div',
      { class: 'hero-top' },
      el('div', {}, el('div', { class: 'eyebrow' }, pretty), el('h1', {}, "Today's workout")),
      el(
        'div',
        { class: 'streak', title: 'Days in a row with the full workout done' },
        el('span', { class: 'flame' }, '🔥'),
        el('b', {}, progress.streak()),
        el('span', {}, 'day streak'),
      ),
    ),
    el(
      'div',
      { class: 'progress' },
      el('div', { class: 'progress-fill', style: { width: (nDone / set.length) * 100 + '%' } }),
    ),
    el(
      'div',
      { class: 'muted small' },
      nDone === set.length
        ? 'Workout complete — great work. Come back tomorrow, or keep practicing below.'
        : `${nDone} of ${set.length} done · one game per skill, same puzzles all day`,
    ),
    el('div', { class: 'daily-list' }, rows),
  );

  const practice = SKILL_IDS.map((sk) =>
    el(
      'section',
      { class: 'skill-group' },
      el('h3', {}, chip(sk)),
      el(
        'div',
        { class: 'game-grid' },
        registry
          .bySkill(sk)
          .map((g) =>
            el(
              'a',
              { class: 'game-card', href: `#/play/${g.id}` },
              el(
                'div',
                { class: 'gc-top' },
                el('b', {}, g.name),
                el('span', { class: 'lvl' }, 'Lv ' + progress.getLevel(g.id)),
              ),
              el('span', { class: 'muted small' }, g.blurb),
            ),
          ),
      ),
    ),
  );

  outlet.append(
    header('home'),
    el(
      'main',
      { class: 'wrap' },
      hero,
      el('h2', { class: 'section-title' }, 'Free practice'),
      el(
        'p',
        { class: 'muted small' },
        'Unlimited play. Each game adapts: score 80+ to level up, under 50 to ease off.',
      ),
      practice,
    ),
  );
}

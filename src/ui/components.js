/** Small presentational pieces shared across screens. */
import { SKILLS } from '../core/skills.js';
import { el, svg } from './dom.js';

/** @param {'home' | 'stats'} [active] */
export function header(active) {
  return el(
    'header',
    { class: 'topbar' },
    el('a', { href: '#/', class: 'brand' }, el('span', { class: 'logo' }, '✦'), 'Sharpen'),
    el(
      'nav',
      {},
      el('a', { href: '#/', class: active === 'home' ? 'on' : '' }, 'Today'),
      el('a', { href: '#/stats', class: active === 'stats' ? 'on' : '' }, 'Stats'),
    ),
  );
}

/** @param {import('../core/skills.js').SkillId} skill */
export const chip = (skill) => el('span', { class: `chip sk-${skill}` }, SKILLS[skill].icon, ' ', SKILLS[skill].name);

/**
 * Score trend line (0–100) with a reference line at 80.
 * @param {number[]} scores
 */
export function sparkline(scores) {
  const w = 140;
  const h = 36;
  if (scores.length < 2) {
    return el('span', { class: 'muted small' }, scores.length ? 'Play more to see a trend' : 'No games yet');
  }
  const y = (s) => (h - 2 - (s / 100) * (h - 4)).toFixed(1);
  const pts = scores.map((s, i) => `${((i / (scores.length - 1)) * (w - 4) + 2).toFixed(1)},${y(s)}`).join(' ');
  const ref = h - 2 - 0.8 * (h - 4);
  return svg(
    `0 0 ${w} ${h}`,
    `<line x1="0" x2="${w}" y1="${ref}" y2="${ref}" class="spark-ref"/><polyline points="${pts}" class="spark-line"/>`,
    'spark',
  );
}

/**
 * Full-card error message with a way home.
 * @param {string} title
 * @param {string} message
 */
export function errorCard(title, message) {
  return el(
    'main',
    { class: 'wrap' },
    el(
      'section',
      { class: 'card', role: 'alert' },
      el('h2', {}, title),
      el('p', { class: 'muted' }, message),
      el('div', { class: 'actions left' }, el('a', { class: 'btn primary', href: '#/' }, 'Back to home')),
    ),
  );
}

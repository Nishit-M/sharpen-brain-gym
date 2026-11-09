/** Stats: streaks, per-skill trends, activity heatmap, per-game table, backup. */
import { progress, registry } from '../app/services.js';
import { today } from '../core/dates.js';
import { activity, gameSummary, skillTrend } from '../core/stats.js';
import { SKILL_IDS } from '../core/skills.js';
import { chip, header, sparkline } from '../ui/components.js';
import { el } from '../ui/dom.js';

const HEATMAP_DAYS = 84; // 12 weeks

function downloadBackup() {
  const url = URL.createObjectURL(new Blob([progress.exportData()], { type: 'application/json' }));
  const a = el('a', { href: url, download: `sharpen-backup-${today()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** @type {import('../app/router.js').Screen} */
export function statsScreen(outlet, _match, router) {
  const hist = progress.history();
  const tiles = [
    ['Current streak', progress.streak() + ' days'],
    ['Best streak', progress.bestStreak() + ' days'],
    ['Games played', hist.length],
    ['Active days', new Set(hist.map((h) => h.d)).size],
  ];

  const skillCards = SKILL_IDS.map((sk) => {
    const sc = hist.filter((h) => h.s === sk).map((h) => h.sc);
    const { recent, trend } = skillTrend(sc);
    return el(
      'div',
      { class: `skill-card sk-border-${sk}` },
      el('div', { class: 'sc-top' }, chip(sk), el('span', { class: 'muted small' }, trend)),
      el(
        'div',
        { class: 'sc-score' },
        recent == null ? '—' : Math.round(recent),
        el('span', { class: 'muted small' }, ' avg of last 10'),
      ),
      sparkline(sc.slice(-20)),
    );
  });

  const cells = activity(hist, today(), HEATMAP_DAYS).map(({ date, count, level }) =>
    el('div', { class: `hm h${level}`, title: `${date}: ${count} game${count === 1 ? '' : 's'}` }),
  );

  const rows = registry.all.map((g) => {
    const s = gameSummary(hist, g.id);
    return el(
      'tr',
      {},
      el('td', {}, el('span', { class: `dot tiny sk-${g.skill}` }), g.name),
      el('td', {}, progress.getLevel(g.id)),
      el('td', {}, s.played),
      el('td', {}, s.best ?? '—'),
      el('td', {}, s.recentAvg ?? '—'),
    );
  });

  const fileInput = el('input', {
    type: 'file',
    accept: 'application/json,.json',
    class: 'hidden',
    onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        progress.importData(await f.text());
        router.render();
      } catch (err) {
        alert('Could not import: ' + err.message);
      }
    },
  });

  const resetAll = () => {
    if (confirm('Erase all progress, levels and streaks? This cannot be undone.')) {
      progress.reset();
      router.render();
    }
  };

  outlet.append(
    header('stats'),
    el(
      'main',
      { class: 'wrap' },
      el('h1', { class: 'page-title' }, 'Your progress'),
      el(
        'div',
        { class: 'tiles' },
        tiles.map(([k, v]) =>
          el('div', { class: 'tile-stat' }, el('span', { class: 'muted small' }, k), el('b', {}, v)),
        ),
      ),
      el('h2', { class: 'section-title' }, 'Skills'),
      el('div', { class: 'skill-cards' }, skillCards),
      el('h2', { class: 'section-title' }, 'Last 12 weeks'),
      el(
        'div',
        { class: 'card' },
        el('div', { class: 'heatmap' }, cells),
        el(
          'div',
          { class: 'muted small hm-legend' },
          'Less ',
          [0, 1, 2, 3, 4].map((i) => el('span', { class: `hm h${i}` })),
          ' More',
        ),
      ),
      el('h2', { class: 'section-title' }, 'Games'),
      el(
        'div',
        { class: 'card table-wrap' },
        el(
          'table',
          { class: 'gtable' },
          el(
            'thead',
            {},
            el(
              'tr',
              {},
              ['Game', 'Level', 'Played', 'Best', 'Recent avg'].map((t) => el('th', {}, t)),
            ),
          ),
          el('tbody', {}, rows),
        ),
      ),
      el('h2', { class: 'section-title' }, 'Your data'),
      el(
        'div',
        { class: 'card' },
        el(
          'p',
          { class: 'muted small' },
          'Progress is saved only in this browser. Export a backup to move it to another device.',
        ),
        el(
          'div',
          { class: 'actions left' },
          el('button', { class: 'btn', onclick: downloadBackup }, 'Export backup'),
          el('button', { class: 'btn', onclick: () => fileInput.click() }, 'Import backup'),
          el('button', { class: 'btn danger', onclick: resetAll }, 'Reset all'),
          fileInput,
        ),
      ),
    ),
  );
}

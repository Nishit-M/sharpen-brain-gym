'use strict';
/* App shell: routing, home (daily set + practice), play screen, results, stats. */
(() => {
  const { el, SKILLS } = Brain;
  const app = document.getElementById('app');
  let cleanup = null;

  function route() {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const h = location.hash.slice(1) || '/';
    const [path, query] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const q = new URLSearchParams(query || '');
    app.innerHTML = '';
    window.scrollTo(0, 0);
    if (parts[0] === 'play' && Brain.byId(parts[1])) return playScreen(Brain.byId(parts[1]), q.get('daily') === '1');
    if (parts[0] === 'stats') return statsScreen();
    return homeScreen();
  }
  window.addEventListener('hashchange', route);

  function header(active) {
    return el('header', { class: 'topbar' },
      el('a', { href: '#/', class: 'brand' }, el('span', { class: 'logo' }, '✦'), 'Sharpen'),
      el('nav', {},
        el('a', { href: '#/', class: active === 'home' ? 'on' : '' }, 'Today'),
        el('a', { href: '#/stats', class: active === 'stats' ? 'on' : '' }, 'Stats')));
  }

  const chip = skill => el('span', { class: `chip sk-${skill}` }, SKILLS[skill].icon, ' ', SKILLS[skill].name);

  /* ---------------- Home ---------------- */
  function homeScreen() {
    const date = Brain.today();
    const set = Brain.dailySet(date);
    const done = Brain.dailyResults(date);
    const nDone = set.filter(g => g.id in done).length;
    const pretty = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    const rows = set.map(g => {
      const sc = done[g.id];
      const isDone = sc != null;
      return el(isDone ? 'div' : 'a', { class: 'daily-row' + (isDone ? ' done' : ''), href: isDone ? null : `#/play/${g.id}?daily=1` },
        el('span', { class: `dot sk-${g.skill}` }, SKILLS[g.skill].icon),
        el('div', { class: 'dr-text' }, el('b', {}, g.name), el('span', { class: 'muted' }, SKILLS[g.skill].name + ' · Level ' + Brain.getLevel(g.id))),
        isDone ? el('span', { class: 'score-pill ' + band(sc) }, sc) : el('span', { class: 'btn small primary' }, 'Play'));
    });

    app.append(header('home'),
      el('main', { class: 'wrap' },
        el('section', { class: 'card hero' },
          el('div', { class: 'hero-top' },
            el('div', {}, el('div', { class: 'eyebrow' }, pretty), el('h1', {}, "Today's workout")),
            el('div', { class: 'streak', title: 'Days in a row with the full workout done' }, el('span', { class: 'flame' }, '🔥'), el('b', {}, Brain.streak()), el('span', {}, 'day streak'))),
          el('div', { class: 'progress' }, el('div', { class: 'progress-fill', style: { width: (nDone / set.length * 100) + '%' } })),
          el('div', { class: 'muted small' }, nDone === set.length
            ? 'Workout complete — great work. Come back tomorrow, or keep practicing below.'
            : `${nDone} of ${set.length} done · one game per skill, same puzzles all day`),
          el('div', { class: 'daily-list' }, rows)),
        el('h2', { class: 'section-title' }, 'Free practice'),
        el('p', { class: 'muted small' }, 'Unlimited play. Each game adapts: score 80+ to level up, under 50 to ease off.'),
        Object.keys(SKILLS).map(sk => el('section', { class: 'skill-group' },
          el('h3', {}, chip(sk)),
          el('div', { class: 'game-grid' }, Brain.games.filter(g => g.skill === sk).map(g =>
            el('a', { class: 'game-card', href: `#/play/${g.id}` },
              el('div', { class: 'gc-top' }, el('b', {}, g.name), el('span', { class: 'lvl' }, 'Lv ' + Brain.getLevel(g.id))),
              el('span', { class: 'muted small' }, g.blurb))))))));
  }

  const band = s => s >= 80 ? 'good' : s >= 50 ? 'ok' : 'low';
  const verdict = s => s >= 95 ? 'Outstanding' : s >= 80 ? 'Great work' : s >= 60 ? 'Solid' : s >= 40 ? 'Keep at it' : 'Tough one';

  /* ---------------- Play ---------------- */
  function playScreen(game, daily) {
    const date = Brain.today();
    let note = null;
    if (daily && game.id in Brain.dailyResults(date)) { daily = false; note = 'You already played this one today — this round is practice.'; }
    if (daily && !Brain.dailySet(date).some(g => g.id === game.id)) daily = false;
    const level = Brain.getLevel(game.id);
    const seed = daily ? `${date}|${game.id}|${level}` : `${Date.now()}|${Math.random()}`;
    let gameCleanup = null;
    cleanup = () => { if (gameCleanup) gameCleanup(); gameCleanup = null; };

    const stage = el('section', { class: 'card stage' });
    app.append(header(),
      el('main', { class: 'wrap' },
        el('div', { class: 'game-head' },
          el('a', { href: '#/', class: 'back', 'aria-label': 'Back to home' }, '←'),
          el('div', { class: 'gh-title' }, el('div', { class: 'eyebrow' }, chip(game.skill), daily ? ' Daily workout' : ' Practice'), el('h1', {}, game.name)),
          el('span', { class: 'lvl big' }, 'Level ' + level)),
        stage));

    function intro() {
      stage.innerHTML = '';
      stage.append(
        note ? el('div', { class: 'note' }, note) : null,
        el('p', { class: 'lead' }, game.blurb),
        el('h4', {}, 'How to play'),
        el('ul', { class: 'howto' }, game.howTo.map(t => el('li', {}, t))),
        game.levelInfo ? el('p', { class: 'muted small' }, `Level ${level}: ${game.levelInfo(level)}`) : null,
        el('button', { class: 'btn primary big', onclick: start }, 'Start'));
    }

    function start() {
      stage.innerHTML = '';
      const body = el('div', { class: 'game-body game-' + game.id });
      stage.append(body);
      let finished = false;
      const ctx = {
        level, daily, rng: Brain.makeRng(seed),
        finish(res) {
          if (finished) return;
          finished = true;
          if (gameCleanup) { gameCleanup(); gameCleanup = null; }
          showResult(res);
        },
      };
      gameCleanup = game.mount(body, ctx) || null;
    }

    function showResult(res) {
      const rec = Brain.record(game, res, { level, daily, date });
      const set = Brain.dailySet(date);
      const doneNow = Brain.dailyResults(date);
      const nextDaily = daily ? set.find(g => !(g.id in doneNow)) : null;
      let lvlMsg;
      if (rec.next > rec.prev) lvlMsg = el('div', { class: 'lvl-msg up' }, `▲ Level up! Next time: level ${rec.next}`);
      else if (rec.next < rec.prev) lvlMsg = el('div', { class: 'lvl-msg down' }, `▼ Next time eases to level ${rec.next}`);
      else lvlMsg = el('div', { class: 'lvl-msg' }, `Staying at level ${rec.next} (80+ levels up)`);

      stage.innerHTML = '';
      stage.append(el('div', { class: 'result' },
        el('div', { class: 'ring ' + band(rec.score), style: { '--p': rec.score } }, el('span', {}, rec.score)),
        el('h2', {}, verdict(rec.score)),
        el('p', { class: 'summary' }, res.summary || ''),
        res.details || null,
        lvlMsg,
        game.tip ? el('div', { class: 'tip' }, el('b', {}, 'Coach’s tip: '), game.tip) : null,
        el('div', { class: 'actions' },
          daily
            ? (nextDaily
              ? el('a', { class: 'btn primary', href: `#/play/${nextDaily.id}?daily=1` }, `Next: ${nextDaily.name} →`)
              : el('a', { class: 'btn primary', href: '#/' }, 'Workout complete 🎉'))
            : el('button', { class: 'btn primary', onclick: () => { cleanup(); route(); } }, 'Play again'),
          el('a', { class: 'btn', href: '#/' }, 'Home'))));
    }

    intro();
  }

  /* ---------------- Stats ---------------- */
  function sparkline(scores) {
    const w = 140, hgt = 36;
    if (scores.length < 2) return el('span', { class: 'muted small' }, scores.length ? 'Play more to see a trend' : 'No games yet');
    const pts = scores.map((s, i) => `${(i / (scores.length - 1) * (w - 4) + 2).toFixed(1)},${(hgt - 2 - s / 100 * (hgt - 4)).toFixed(1)}`).join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
    svg.setAttribute('class', 'spark');
    svg.innerHTML = `<line x1="0" x2="${w}" y1="${hgt - 2 - 0.8 * (hgt - 4)}" y2="${hgt - 2 - 0.8 * (hgt - 4)}" class="spark-ref"/><polyline points="${pts}" class="spark-line"/>`;
    return svg;
  }

  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

  function statsScreen() {
    const hist = Brain.history();
    const days = new Set(hist.map(h => h.d));
    const tiles = [
      ['Current streak', Brain.streak() + ' days'],
      ['Best streak', Brain.bestStreak() + ' days'],
      ['Games played', hist.length],
      ['Active days', days.size],
    ];

    const skillCards = Object.keys(SKILLS).map(sk => {
      const sc = hist.filter(h => h.s === sk).map(h => h.sc);
      const last10 = sc.slice(-10), prev10 = sc.slice(-20, -10);
      const a = avg(last10), p = avg(prev10);
      let trend = '';
      if (a != null && p != null) trend = a - p > 3 ? '▲ improving' : a - p < -3 ? '▼ dipping' : '— steady';
      return el('div', { class: `skill-card sk-border-${sk}` },
        el('div', { class: 'sc-top' }, chip(sk), el('span', { class: 'muted small' }, trend)),
        el('div', { class: 'sc-score' }, a == null ? '—' : Math.round(a), el('span', { class: 'muted small' }, ' avg of last 10')),
        sparkline(sc.slice(-20)));
    });

    // activity heatmap: last 12 weeks
    const counts = {};
    hist.forEach(h => { counts[h.d] = (counts[h.d] || 0) + 1; });
    const end = Brain.today();
    const cells = [];
    for (let i = 83; i >= 0; i--) {
      const d = Brain.addDays(end, -i);
      const c = counts[d] || 0;
      const lvl = c === 0 ? 0 : c < 2 ? 1 : c < 4 ? 2 : c < 7 ? 3 : 4;
      cells.push(el('div', { class: `hm h${lvl}`, title: `${d}: ${c} game${c === 1 ? '' : 's'}` }));
    }

    const rows = Brain.games.map(g => {
      const sc = hist.filter(h => h.g === g.id).map(h => h.sc);
      return el('tr', {},
        el('td', {}, el('span', { class: `dot tiny sk-${g.skill}` }), g.name),
        el('td', {}, Brain.getLevel(g.id)),
        el('td', {}, sc.length),
        el('td', {}, sc.length ? Math.max(...sc) : '—'),
        el('td', {}, sc.length ? Math.round(avg(sc.slice(-5))) : '—'));
    });

    const fileInput = el('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      try { Brain.importData(await f.text()); route(); } catch (err) { alert('Could not import: ' + err.message); }
    } });

    app.append(header('stats'),
      el('main', { class: 'wrap' },
        el('h1', { class: 'page-title' }, 'Your progress'),
        el('div', { class: 'tiles' }, tiles.map(([k, v]) => el('div', { class: 'tile-stat' }, el('span', { class: 'muted small' }, k), el('b', {}, v)))),
        el('h2', { class: 'section-title' }, 'Skills'),
        el('div', { class: 'skill-cards' }, skillCards),
        el('h2', { class: 'section-title' }, 'Last 12 weeks'),
        el('div', { class: 'card' }, el('div', { class: 'heatmap' }, cells),
          el('div', { class: 'muted small hm-legend' }, 'Less ', [0, 1, 2, 3, 4].map(i => el('span', { class: `hm h${i}` })), ' More')),
        el('h2', { class: 'section-title' }, 'Games'),
        el('div', { class: 'card table-wrap' }, el('table', { class: 'gtable' },
          el('thead', {}, el('tr', {}, ['Game', 'Level', 'Played', 'Best', 'Recent avg'].map(t => el('th', {}, t)))),
          el('tbody', {}, rows))),
        el('h2', { class: 'section-title' }, 'Your data'),
        el('div', { class: 'card' },
          el('p', { class: 'muted small' }, 'Progress is saved only in this browser. Export a backup to move it to another device.'),
          el('div', { class: 'actions left' },
            el('button', { class: 'btn', onclick: () => {
              const a = el('a', { href: URL.createObjectURL(new Blob([Brain.exportData()], { type: 'application/json' })), download: `sharpen-backup-${Brain.today()}.json` });
              document.body.append(a); a.click(); a.remove();
            } }, 'Export backup'),
            el('button', { class: 'btn', onclick: () => fileInput.click() }, 'Import backup'),
            el('button', { class: 'btn danger', onclick: () => { if (confirm('Erase all progress, levels and streaks? This cannot be undone.')) { Brain.reset(); route(); } } }, 'Reset all'),
            fileInput))));
  }

  route();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();

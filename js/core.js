'use strict';
/* Core: game registry, seeded RNG, persistence, adaptive levels, daily set, UI helpers. */
const Brain = (() => {
  const SKILLS = {
    math:     { name: 'Math',      icon: '±' },
    logic:    { name: 'Logic',     icon: '◆' },
    memory:   { name: 'Memory',    icon: '◉' },
    decision: { name: 'Decisions', icon: '⚖' },
    spatial:  { name: 'Spatial',   icon: '⬢' },
    critical: { name: 'Critical',  icon: '?' },
  };

  const games = [];
  const register = g => games.push(g);
  const byId = id => games.find(g => g.id === id);

  /* ---------- seeded RNG ---------- */
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function makeRng(seed) {
    let a = typeof seed === 'string' ? hashStr(seed) : seed >>> 0;
    const next = () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
    return {
      next, int,
      chance: p => next() < p,
      pick: arr => arr[Math.floor(next() * arr.length)],
      shuffle(arr) {
        const a2 = arr.slice();
        for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; }
        return a2;
      },
    };
  }

  /* ---------- dates ---------- */
  const pad = n => String(n).padStart(2, '0');
  const dateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dateStr();
  function addDays(s, n) { const [y, m, d] = s.split('-').map(Number); return dateStr(new Date(y, m - 1, d + n)); }

  /* ---------- persistence ---------- */
  const KEY = 'sharpen.v1';
  const blank = () => ({ v: 1, levels: {}, history: [], daily: {} });
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) { /* storage unavailable */ }
    return blank();
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

  const getLevel = id => state.levels[id] || 1;

  /* ---------- daily set ---------- */
  function dailySet(date = today()) {
    const r = makeRng('daily|' + date);
    return Object.keys(SKILLS).map(sk => r.pick(games.filter(g => g.skill === sk)));
  }
  const dailyResults = (date = today()) => state.daily[date] || {};
  const isComplete = d => !!(state.daily[d] && state.daily[d]._c);
  function streak() {
    let d = today(), n = 0;
    if (!isComplete(d)) d = addDays(d, -1);
    while (isComplete(d)) { n++; d = addDays(d, -1); }
    return n;
  }
  function bestStreak() {
    const days = Object.keys(state.daily).filter(isComplete).sort();
    let best = 0, run = 0, prev = null;
    for (const d of days) { run = prev && addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
    return best;
  }

  /* ---------- recording + adaptive difficulty ---------- */
  function record(game, result, opts) {
    const score = Math.max(0, Math.min(100, Math.round(result.score)));
    const lvl = opts.level;
    const d = opts.date || today();
    state.history.push({ d, g: game.id, s: game.skill, sc: score, l: lvl, t: Date.now(), dy: !!opts.daily });
    if (state.history.length > 5000) state.history = state.history.slice(-5000);
    let next = lvl;
    if (score >= 80) next = Math.min(10, lvl + 1);
    else if (score < 50) next = Math.max(1, lvl - 1);
    state.levels[game.id] = next;
    if (opts.daily) {
      const day = state.daily[d] || (state.daily[d] = {});
      day[game.id] = score;
      if (dailySet(d).every(g => g.id in day)) day._c = 1;
    }
    save();
    return { score, prev: lvl, next };
  }

  /* ---------- backup ---------- */
  const exportData = () => JSON.stringify(state, null, 1);
  function importData(text) {
    const s = JSON.parse(text);
    if (!s || s.v !== 1 || !Array.isArray(s.history)) throw new Error('Not a Sharpen backup file');
    state = s; save();
  }
  function reset() { state = blank(); save(); }

  /* ---------- UI helpers ---------- */
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? n.style.setProperty(sk, sv) : (n.style[sk] = sv);
      }
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'value') n.value = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
    return n;
  }

  /** Countdown timer with a visual bar. Returns { node, stop(), elapsed() }. */
  function timer(seconds, onEnd) {
    const fill = el('div', { class: 'tb-fill' });
    const label = el('span', { class: 'tb-label' });
    const node = el('div', { class: 'timebar' }, el('div', { class: 'tb-track' }, fill), label);
    const start = performance.now();
    let stopped = false, raf;
    const elapsed = () => (performance.now() - start) / 1000;
    function tick() {
      if (stopped) return;
      const left = Math.max(0, seconds - elapsed());
      fill.style.width = (left / seconds * 100) + '%';
      node.classList.toggle('low', left < Math.min(10, seconds * 0.2));
      label.textContent = Math.ceil(left) + 's';
      if (left <= 0) { stopped = true; onEnd && onEnd(); return; }
      raf = requestAnimationFrame(tick);
    }
    tick();
    return { node, elapsed, stop() { stopped = true; cancelAnimationFrame(raf); } };
  }

  /** Keydown listener that ignores modified keys; returns a remover. */
  function onKeys(handler) {
    const fn = e => { if (e.ctrlKey || e.metaKey || e.altKey) return; handler(e); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }

  const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

  return {
    SKILLS, games, register, byId, makeRng, today, addDays, dateStr,
    getLevel, dailySet, dailyResults, streak, bestStreak, record,
    history: () => state.history, levels: () => state.levels,
    exportData, importData, reset, el, timer, onKeys, clamp,
  };
})();

import { el } from './dom.js';

/**
 * Countdown timer with a visual bar.
 * @param {number} seconds
 * @param {() => void} [onEnd] called once when time runs out (not when stopped)
 * @returns {{ node: HTMLElement, elapsed: () => number, stop: () => void }}
 */
export function timer(seconds, onEnd) {
  const fill = el('div', { class: 'tb-fill' });
  const label = el('span', { class: 'tb-label' });
  const node = el('div', { class: 'timebar' }, el('div', { class: 'tb-track' }, fill), label);
  const start = performance.now();
  let stopped = false;
  let raf;
  const elapsed = () => (performance.now() - start) / 1000;

  function tick() {
    if (stopped) return;
    const left = Math.max(0, seconds - elapsed());
    fill.style.width = (left / seconds) * 100 + '%';
    node.classList.toggle('low', left < Math.min(10, seconds * 0.2));
    label.textContent = Math.ceil(left) + 's';
    if (left <= 0) {
      stopped = true;
      onEnd?.();
      return;
    }
    raf = requestAnimationFrame(tick);
  }
  tick();

  return {
    node,
    elapsed,
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
    },
  };
}

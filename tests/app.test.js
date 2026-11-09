/** End-to-end flow through the real screens and router in jsdom. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => {} }));

async function boot(hash = '#/') {
  vi.resetModules();
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  location.hash = hash;
  await import('../src/main.js');
  return document.getElementById('app');
}

const go = async (hash) => {
  location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};

describe('app', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('renders the home screen with six daily games and all 18 practice games', async () => {
    const app = await boot();
    expect(app.querySelector('h1')?.textContent).toBe("Today's workout");
    expect(app.querySelectorAll('.daily-row')).toHaveLength(6);
    expect(app.querySelectorAll('.game-card')).toHaveLength(18);
  });

  it('falls back to home for unknown routes and games', async () => {
    const app = await boot('#/play/not-a-game');
    expect(app.querySelector('h1')?.textContent).toBe("Today's workout");
  });

  it('plays a practice round of Pattern Next to the result screen and saves it', async () => {
    const app = await boot('#/play/pattern');
    expect(app.querySelector('h1')?.textContent).toBe('Pattern Next');
    /** @type {HTMLButtonElement} */ (app.querySelector('.btn.primary.big')).click();

    for (let i = 0; i < 6; i++) {
      const input = /** @type {HTMLInputElement} */ (app.querySelector('.answer-row input'));
      input.value = '0';
      const btn = /** @type {HTMLButtonElement} */ (app.querySelector('.answer-row .btn'));
      btn.click(); // answer
      btn.click(); // next / see results
    }

    expect(app.querySelector('.result')).not.toBeNull();
    const saved = JSON.parse(localStorage.getItem('sharpen.v1') ?? '{}');
    expect(saved.history).toHaveLength(1);
    expect(saved.history[0].g).toBe('pattern');
  });

  it('renders stats', async () => {
    const app = await boot();
    await go('#/stats');
    expect(app.querySelector('h1')?.textContent).toBe('Your progress');
    expect(app.querySelectorAll('.hm')).toHaveLength(84 + 5);
    expect(app.querySelectorAll('.gtable tbody tr')).toHaveLength(18);
  });
});

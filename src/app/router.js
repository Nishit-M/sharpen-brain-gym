/**
 * Hash router (`#/path/segments?query`). Hash routing keeps the app working
 * from any static host and sub-path (e.g. GitHub Pages) with no server rewrites.
 *
 * A screen renders into the outlet and may return a cleanup function, which
 * runs before the next screen renders.
 */

/**
 * @typedef {object} RouteMatch
 * @property {string[]} parts path segments
 * @property {URLSearchParams} query
 */

/**
 * @typedef {(outlet: HTMLElement, match: RouteMatch, router: Router) => (void | (() => void))} Screen
 * @typedef {{ match: (m: RouteMatch) => boolean, screen: Screen }} Route
 * @typedef {ReturnType<typeof createRouter>} Router
 */

/** @param {string} hash */
export function parseHash(hash) {
  const h = hash.replace(/^#/, '') || '/';
  const [path, query] = h.split('?');
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(query || '') };
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.outlet
 * @param {Route[]} opts.routes checked in order
 * @param {Screen} opts.fallback rendered when no route matches
 * @param {(outlet: HTMLElement, err: unknown) => void} opts.onError renders a screen-level error
 */
export function createRouter({ outlet, routes, fallback, onError }) {
  let cleanup = null;

  function runCleanup() {
    if (!cleanup) return;
    try {
      cleanup();
    } catch (err) {
      console.error('[sharpen] screen cleanup failed', err);
    }
    cleanup = null;
  }

  const router = {
    /** Re-renders the current route (e.g. after data changes). */
    render() {
      runCleanup();
      const match = parseHash(location.hash);
      outlet.replaceChildren();
      window.scrollTo(0, 0);
      const route = routes.find((r) => r.match(match));
      try {
        cleanup = (route ? route.screen : fallback)(outlet, match, router) || null;
      } catch (err) {
        console.error('[sharpen] screen failed to render', err);
        outlet.replaceChildren();
        onError(outlet, err);
      }
    },
    start() {
      window.addEventListener('hashchange', router.render);
      router.render();
    },
  };
  return router;
}

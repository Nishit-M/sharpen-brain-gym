/**
 * Document keydown listener that ignores Ctrl/Cmd/Alt combinations (so browser
 * shortcuts keep working).
 * @param {(e: KeyboardEvent) => void} handler
 * @returns {() => void} removes the listener
 */
export function onKeys(handler) {
  const fn = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    handler(e);
  };
  document.addEventListener('keydown', fn);
  return () => document.removeEventListener('keydown', fn);
}

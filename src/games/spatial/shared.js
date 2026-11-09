/** Helpers shared by the spatial games. */
export { svg } from '../../ui/dom.js';

/** Canonical string for a set of cells, independent of order. */
export const key = (cells) =>
  cells
    .map((c) => c.join(','))
    .sort()
    .join(';');

/** Translates cells so the minimum x and y are 0. */
export function norm(cells) {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]);
}

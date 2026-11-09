# Sharpen — Daily Brain Gym

A daily brain workout you can install as an app (PWA). There are 18 games across 6 skills. Each game adapts its difficulty to you, and a stats page tracks your progress.

| Skill             | Games                                        |
| ----------------- | -------------------------------------------- |
| Math              | Equation Hunt · Make the Target · Speed Calc |
| Logic             | Codebreaker · Logic Grid · Pattern Next      |
| Memory & focus    | N-Back · Grid Recall · Focus Filter          |
| Decisions         | Bet or Pass · Pack the Bag · Sure or Not     |
| Spatial           | Same or Mirror · Paper Fold · Mental Map     |
| Critical thinking | Valid or Not · Fallacy Spotter · Base Rate   |

- **Daily workout:** one game per skill, chosen by date. Everyone gets the same puzzles all day. Your streak counts the days you finish the full set.
- **Free practice:** unlimited play of any game.
- **Adaptive:** each game has its own level from 1 to 10. A score of 80 or more moves you up a level; a score under 50 moves you down.
- **Private and offline:** no backend, no account. Progress stays in the browser (export/import a backup from **Stats**). After the first visit the app works offline.

## Development

Requires Node 20.19+ (see `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173 with hot reload
```

| Script             | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `npm run dev`      | Vite dev server                                         |
| `npm run build`    | Production build to `dist/` (minified, hashed, with SW) |
| `npm run preview`  | Serve the production build at http://localhost:4173     |
| `npm test`         | Unit, regression and integration tests (Vitest + jsdom) |
| `npm run coverage` | Tests with a coverage report                            |
| `npm run lint`     | ESLint                                                  |
| `npm run format`   | Prettier (write); `format:check` verifies only          |
| `npm run check`    | Everything CI runs: lint, format check, test, build     |

## Deployment

`.github/workflows/ci.yml` runs lint, format check, tests and build on every push and pull request. On `main` it publishes `dist/` to GitHub Pages. In the repository settings, **Pages → Source** must be set to **GitHub Actions**.

The build uses a relative base path and hash routing, so `dist/` also works on any static host and at any sub-path.

## Project structure

```
index.html              HTML shell (Vite entry)
public/                 static files copied as-is (icon)
src/
  main.js               entry: styles, routes, service worker
  app/                  wiring: router, service singletons, PWA registration
  core/                 pure logic, no DOM: RNG, dates, scoring, storage, progress, stats, game contract
  ui/                   DOM helpers (el, svg), timer, keyboard, shared components
  screens/              home, play, stats
  games/
    index.js            the game catalogue (order matters, see below)
    <skill>/<game>.js   one file per game; puzzle generators are named exports
  styles/               tokens, base, screens, games, responsive
tests/
  core/                 storage, progress, streaks, scoring, registry, router
  games/                generator correctness + golden regression snapshot
  app.test.js           end-to-end flows through the real screens
```

Dependencies only point downward: `screens → app/ui/core`, `games → ui/core`, and `core` imports nothing from the other layers. Progress logic takes its storage and clock as parameters, so tests can run it without a browser.

## Adding a game

1. Create `src/games/<skill>/<id>.js` that exports `defineGame({ id, skill, name, blurb, howTo, tip, levelInfo, mount })`.
   - `mount(root, ctx)` renders into `root`. Use `ctx.rng` for **all** randomness so daily puzzles stay deterministic. Call `ctx.finish({ score: 0–100, summary, details })` exactly once. Return a cleanup function if you start timers or key listeners.
   - Export puzzle generators as named functions and test them in `tests/games/logic.test.js`.
2. Add it to `src/games/index.js` **at the end of its skill group**. The daily workout picks by index, so reordering or inserting in the middle reshuffles everyone's daily set.
3. Run `UPDATE_GOLDEN=1 npx vitest run tests/games/golden.test.js` to record the new game's snapshot.

## Compatibility contracts

These must not change without a migration, because existing installs and backup files depend on them:

- **Storage key and schema:** `sharpen.v1`, schema `v: 1` (`src/core/storage.js`). To change the shape, bump `SCHEMA_VERSION` and add a migration.
- **Game ids:** they are stored in history and levels.
- **Seeded generation:** the RNG, the seed formats, and the order of RNG calls in each generator. `tests/games/golden.test.js` fails if any of these change.

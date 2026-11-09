# Sharpen — Daily Brain Gym

A daily brain workout you can install as an app (PWA). There are 18 games across 6 skills. Each game adapts its difficulty to you, and a stats page tracks your progress.

| Skill | Games |
|---|---|
| Math | Equation Hunt · Make the Target · Speed Calc |
| Logic | Codebreaker · Logic Grid · Pattern Next |
| Memory & focus | N-Back · Grid Recall · Focus Filter |
| Decisions | Bet or Pass · Pack the Bag · Sure or Not |
| Spatial | Same or Mirror · Paper Fold · Mental Map |
| Critical thinking | Valid or Not · Fallacy Spotter · Base Rate |

**Daily workout:** one game per skill, chosen by date. Everyone gets the same puzzles all day, and your streak counts the days you finish all four.
**Free practice:** unlimited play of any game.
**Adaptive:** each game has its own level from 1 to 10. A score of 80 or more moves you up a level; a score under 50 moves you down.

## Run locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## Use it on your phone

The app is plain static files with no build step and no backend. Host the folder on any static host (GitHub Pages, Netlify, Cloudflare Pages), open it on your phone, and choose **Add to Home Screen** (iOS) or **Install app** (Android). After the first visit it works offline.

Progress is saved in the browser's localStorage. To move it to another device, use **Stats → Export / Import backup**.

## Structure

- `js/core.js` — game registry, seeded RNG, storage, adaptive levels, daily set, UI helpers
- `js/app.js` — routing, home, play/result screens, stats
- `js/games-*.js` — the games; each calls `Brain.register({ id, skill, name, howTo, tip, mount(root, ctx) })` and ends by calling `ctx.finish({ score: 0-100, summary, details })`
- `sw.js`, `manifest.json`, `icon.svg` — PWA support

Adding a game means writing one `Brain.register` call; it then appears in practice and in the daily rotation automatically.

/** Entry point: styles, routes, offline support. */
import './styles/index.css';

import { createRouter } from './app/router.js';
import { setupPwa } from './app/pwa.js';
import { homeScreen } from './screens/home.js';
import { matchPlay, playScreen } from './screens/play.js';
import { statsScreen } from './screens/stats.js';
import { errorCard, header } from './ui/components.js';

const outlet = document.getElementById('app');
if (!outlet) throw new Error('#app element missing from index.html');

const router = createRouter({
  outlet,
  routes: [
    { match: matchPlay, screen: playScreen },
    { match: ({ parts }) => parts[0] === 'stats', screen: statsScreen },
  ],
  fallback: homeScreen,
  onError: (out) =>
    out.append(header(), errorCard('Something went wrong', 'This page could not be shown. Your progress is safe.')),
});

router.start();
setupPwa();

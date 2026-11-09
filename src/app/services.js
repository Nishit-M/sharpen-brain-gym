/** Application singletons, wired once from the pure core modules. */
import { createProgress } from '../core/progress.js';
import { createRegistry } from '../core/registry.js';
import { browserStorage, createStorage } from '../core/storage.js';
import { GAMES } from '../games/index.js';

export const registry = createRegistry(GAMES);
export const progress = createProgress({ registry, storage: createStorage(browserStorage()) });

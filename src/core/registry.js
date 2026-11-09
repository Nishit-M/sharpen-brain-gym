import { SKILL_IDS } from './skills.js';

/**
 * Indexes a list of games. Order is significant: within a skill, the daily
 * workout picks by index, so append new games at the end of their skill.
 * @param {readonly import('./game.js').Game[]} games
 */
export function createRegistry(games) {
  const byIdMap = new Map();
  for (const g of games) {
    if (byIdMap.has(g.id)) throw new Error(`Duplicate game id "${g.id}"`);
    byIdMap.set(g.id, g);
  }
  const bySkillMap = new Map(SKILL_IDS.map((sk) => [sk, games.filter((g) => g.skill === sk)]));
  for (const [sk, list] of bySkillMap) if (!list.length) throw new Error(`Skill "${sk}" has no games`);

  return Object.freeze({
    all: games,
    /** @param {string} id */
    byId: (id) => byIdMap.get(id),
    /** @param {import('./skills.js').SkillId} skill */
    bySkill: (skill) => bySkillMap.get(skill) ?? [],
  });
}

/** @typedef {ReturnType<typeof createRegistry>} Registry */

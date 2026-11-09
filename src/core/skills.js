/**
 * The six trained skills. Key order matters: it is the order of the daily
 * workout and of the skill sections on the home and stats screens.
 */
export const SKILLS = Object.freeze({
  math: { name: 'Math', icon: '±' },
  logic: { name: 'Logic', icon: '◆' },
  memory: { name: 'Memory', icon: '◉' },
  decision: { name: 'Decisions', icon: '⚖' },
  spatial: { name: 'Spatial', icon: '⬢' },
  critical: { name: 'Critical', icon: '?' },
});

/** @typedef {keyof typeof SKILLS} SkillId */

export const SKILL_IDS = /** @type {SkillId[]} */ (Object.keys(SKILLS));

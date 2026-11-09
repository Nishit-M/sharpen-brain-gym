/**
 * The game catalogue.
 *
 * ORDER MATTERS. The daily workout picks one game per skill by index into
 * this list, so reordering or inserting in the middle reshuffles everyone's
 * daily set. Add new games at the end of their skill group.
 */
import equation from './math/equation.js';
import speed from './math/speed.js';
import target from './math/target.js';

import codebreaker from './logic/codebreaker.js';
import logicgrid from './logic/logicgrid.js';
import pattern from './logic/pattern.js';

import focus from './memory/focus.js';
import gridrecall from './memory/gridrecall.js';
import nback from './memory/nback.js';

import bag from './decision/bag.js';
import bet from './decision/bet.js';
import calibrate from './decision/calibrate.js';

import mentalmap from './spatial/mentalmap.js';
import paperfold from './spatial/paperfold.js';
import rotate from './spatial/rotate.js';

import baserate from './critical/baserate.js';
import fallacy from './critical/fallacy.js';
import validity from './critical/validity.js';

export const GAMES = Object.freeze([
  equation,
  target,
  speed,
  codebreaker,
  logicgrid,
  pattern,
  nback,
  gridrecall,
  focus,
  bet,
  bag,
  calibrate,
  rotate,
  paperfold,
  mentalmap,
  validity,
  fallacy,
  baserate,
]);

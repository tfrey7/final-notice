// Stage 2's test run: the auditor, the enchantments, Associates, boxes and the camera on one small built-in area. Pure.
import { stepCasts } from './casting.mjs';
import { createAssociate, stepFoes, stepGlyphs } from './foes.mjs';
import { parseArea } from './physics.mjs';
import { createPickups, dropExtra, inHand, marks, stepPickups, swapHand } from './pickups.mjs';
import { createPlayer, stepPlayer } from './player.mjs';
import { RING, addHits, pushDir, restoreAtCheckpoint, ringVictims, startRing, stepRing, wantsInjunction, withoutAB } from '../injunction.mjs';

export const SCREEN_W = 256;
export const KNOCK_FRAMES = 20;
// Frames the run holds still after a cast lands on an Associate or a Custodian, and after the blow that drops one.
export const HIT_STOP = { hit: 3, drop: 6 };

// Until the archive art lands: 48x15 tiles, a HUD band on top, three pits, ledges and boxes to break.
// C, T and M float a Carbon Copy, Red Tape or Margin of Error ledger; A is an Associate; W a wax lock.
export const TEST_MAP = [
  '',
  '',
  '',
  '',
  '.........................B',
  '',
  '............B...............######.........B',
  '...........###',
  '..................B',
  '..........................................####',
  '......B.........#####',
  '....C.........T...............M',
  '..P...........B..........A.A..B.....W..A...W',
  '##############....#############.....########...##',
  '##############....#############.....########...##',
].map((r) => r.padEnd(49, '.'));

export const ENCHANTMENTS = ['notice', 'carbonCopy', 'redTape', 'margin'];

export function createRun(auditor = 'ward', map = TEST_MAP) {
  const area = parseArea(map);
  return {
    area, frame: 0, camX: 0, paused: false,
    player: createPlayer(auditor, area.start),
    casts: [],
    targets: area.targets.map((t) => ({ ...t, w: 16, h: 16, hp: 2, flash: 0, frozen: 0 })),
    locks: marks(map, 'W').map(({ x, y }) => ({ x, y, w: 16, h: 32, hp: 1, flash: 0, lock: true })),
    foes: marks(map, 'A').map(createAssociate),
    bosses: [],
    glyphs: [],
    pickups: createPickups(map),
    carried: ['notice', null],
    hand: 0,
    meterHits: 0, ring: null, hitStop: 0,
    events: [],
  };
}

// The Emergency Injunction: ordinary foes on screen are thrown back, every glyph in flight is gone.
export function injunction(w, pad) {
  if (w.hitStop > 0 || !wantsInjunction(pad, w.meterHits)) return false;
  const p = w.player;
  w.meterHits = 0;
  for (const f of ringVictims(w.foes, { x0: w.camX, x1: w.camX + SCREEN_W }, (f) => f.hp > 0)) {
    Object.assign(f, { knock: KNOCK_FRAMES, knockDir: pushDir(f, p.x), flash: 6, facing: -pushDir(f, p.x) });
  }
  w.glyphs.length = 0;
  p.invuln = Math.max(p.invuln, RING.freeze + 20);
  w.ring = startRing(p.x, p.y - 16);
  w.hitStop = RING.freeze;
  w.events.push({ type: 'injunction' });
  return true;
}

export function stepRun(w, pad) {
  w.events = [];
  if (pad.pressed.has('start')) w.paused = !w.paused;
  if (w.paused) return w;
  w.frame += 1;
  w.ring = stepRing(w.ring);
  if (injunction(w, pad)) pad = withoutAB(pad);
  // A blow's stop starts the frame after it, so the stage finishes the frame the cast landed on.
  w.hitStop = Math.max(w.hitStop, w.blowStop ?? 0);
  w.blowStop = 0;
  if (w.hitStop > 0) {
    w.hitStop -= 1;
    return w;
  }
  if ((pad.swap ?? pad.pressed.has('select')) && swapHand(w)) w.events.push({ type: 'swap', name: inHand(w) });
  w.player.spell = inHand(w);
  w.events.push(...stepPlayer(w.player, pad, w.area, w.casts));
  w.events.push(...stepPickups(w));
  for (const t of [...w.targets, ...w.locks]) {
    t.flash = Math.max(0, t.flash - 1);
    t.frozen = Math.max(0, (t.frozen ?? 0) - 1);
  }
  w.events.push(...stepFoes(w.foes, w.glyphs, w.player, w.area));
  w.events.push(...stepCasts(w.casts, w.area, [...w.targets, ...w.locks, ...w.foes, ...(w.bosses ?? []), ...w.glyphs], { x0: w.camX, x1: w.camX + SCREEN_W }));
  w.events.push(...stepGlyphs(w.glyphs, w.player, w.area));
  const landed = w.events.filter((e) => ['hit', 'break'].includes(e.type) && !e.target?.glyph && !e.target?.lock && !e.target?.seal).length;
  w.meterHits = addHits(w.meterHits, landed);
  const blows = w.events.filter((e) => ['hit', 'break'].includes(e.type) && ['associate', 'custodian'].includes(e.target?.kind));
  if (blows.length) w.blowStop = blows.some((e) => e.type === 'break') ? HIT_STOP.drop : HIT_STOP.hit;
  if (w.events.some((e) => e.type === 'lifeLost')) {
    dropExtra(w);
    w.meterHits = restoreAtCheckpoint(w.meterHits);
  }
  w.camX = Math.max(0, Math.min(w.area.width - SCREEN_W, Math.round(w.player.x - SCREEN_W / 2 + 16)));
  return w;
}

// Stage 2's test run: the auditor, the seals, target boxes and the camera on one small built-in area. Pure.
import { stepCasts } from './casting.mjs';
import { parseArea } from './physics.mjs';
import { createPlayer, stepPlayer } from './player.mjs';

export const SCREEN_W = 256;

// Until the archive art lands: 48x15 tiles, a HUD band on top, three pits, ledges and boxes to break.
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
  '..............................B',
  '..P...........B..............B.........B',
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
    targets: area.targets.map((t) => ({ ...t, w: 16, h: 16, hp: 2, flash: 0 })),
    carried: ['notice', null],
    hand: 0,
    events: [],
  };
}

export function stepRun(w, pad) {
  w.events = [];
  if (pad.pressed.has('start')) w.paused = !w.paused;
  if (w.paused) return w;
  w.frame += 1;
  if (pad.pressed.has('select') && w.carried[1 - w.hand]) w.hand = 1 - w.hand;
  w.events.push(...stepPlayer(w.player, pad, w.area, w.casts));
  for (const t of w.targets) t.flash = Math.max(0, t.flash - 1);
  w.events.push(...stepCasts(w.casts, w.area, w.targets, { x0: w.camX, x1: w.camX + SCREEN_W }));
  w.camX = Math.max(0, Math.min(w.area.width - SCREEN_W, Math.round(w.player.x - SCREEN_W / 2 + 16)));
  return w;
}

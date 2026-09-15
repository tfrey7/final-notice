// Stage 4 as an escape climb, the express elevator shaft: the auditor hops girders, climbs service cables
// hand over hand and rides elevator cars while a runaway car rises from below in surges, through one
// checkpoint to the top landing where Bellwether's signature is found. Grey-box logic on Stage 2's real
// player and casting. Pure.
import { createRun, stepRun } from '../stage2/core.mjs';
import { TUNING } from '../stage2/escape.mjs';
import { HEALTH, INVULN } from '../stage2/player.mjs';
import { TILE } from '../stage2/physics.mjs';

export const COLS = 16;
export const LIVES = 3;
export const VIEW_H = 224;
export const CYCLES = 14;
export const RUNAWAY = { gap: 150, maxGap: 210, speed: 0.3, ramp: 0.00001, grace: 150, every: 480, warn: 60, surge: 50, surgeSpeed: 1.2 };
export const CABLE = { grab: 10, climb: 1.2, hop: 0.85, regrab: 14 };
export const CAR = { w: 6 * TILE, h: 10, speed: 1, wait: 60, board: 30 };
export const RESPAWN_FRAMES = 60;

// One leg flips the auditor from one side ledge to the other. A hop crosses on a girder, a car lifts ten
// rows up the middle lane, a cable climbs eight rows to a girder beside its top. Legs run hop, car, cable
// so no girder hangs over a takeoff or a car's roof.
const LEFT = [1, 4];
const RISE = { hop: 4, car: 10, cable: 10 };
const TOP = 4;
const mirror = ([a, b]) => [COLS - 1 - b, COLS - 1 - a];

function buildShaft() {
  const legs = Array.from({ length: CYCLES }, () => ['hop', 'car', 'cable']).flat();
  const floor = TOP + legs.reduce((n, leg) => n + RISE[leg], 0);
  const grid = Array.from({ length: floor + 1 }, () => ['#', ...'.'.repeat(COLS - 2), '#']);
  grid[floor].fill('#');
  const route = [];
  const ledges = [];
  const cables = [];
  const cars = [];
  const ledge = (row, [c0, c1], side = false) => {
    const l = { kind: 'ledge', k: ledges.length, row, c0, c1, side };
    ledges.push(l);
    route.push(l);
  };
  ledge(floor, [1, COLS - 2], true);
  let row = floor;
  let left = true;
  for (const leg of legs) {
    if (leg === 'hop') ledge(row - 2, left ? [7, 10] : [5, 8]);
    if (leg === 'car') {
      const car = { kind: 'car', k: cars.length, c0: 5, c1: 10, x: 8 * TILE, w: CAR.w, bottom: row * TILE, top: (row - RISE.car) * TILE };
      cars.push(car);
      route.push(car);
    }
    if (leg === 'cable') {
      const col = left ? 5 : 10;
      const cable = { kind: 'cable', k: cables.length, col, x: col * TILE + TILE / 2, top: (row - 8) * TILE, bottom: row * TILE };
      cables.push(cable);
      route.push(cable);
      ledge(row - 8, [6, 9]);
    }
    row -= RISE[leg];
    left = !left;
    ledge(row, left ? LEFT : mirror(LEFT), true);
  }
  ledges.at(-1).top = true;
  for (const l of ledges) for (let c = l.c0; c <= l.c1; c++) grid[l.row][c] = '#';
  grid[floor - 1][3] = 'P';
  return { map: grid.map((r) => r.join('')), route, ledges, cables, cars };
}

export const SHAFT = buildShaft();
export const TOP_LEDGE = SHAFT.ledges.at(-1);
export const CHECKPOINT_LEDGE = SHAFT.ledges.find((l) => l.side && l.row <= (SHAFT.ledges[0].row + TOP_LEDGE.row) / 2);

const ledgeY = (l) => l.row * TILE;
const ledgeMid = (l) => ((l.c0 + l.c1 + 1) / 2) * TILE;

export function createShaft(who = 'ward') {
  const run = createRun(who, SHAFT.map);
  const s = {
    who, run, frame: 0, lives: LIVES, over: null, dying: null, respawn: 0, checkpoint: null, events: [],
    runaway: { y: run.player.y + RUNAWAY.gap, clock: 0, warn: 0, surge: 0 },
    cars: SHAFT.cars.map((c) => ({ ...c, y: c.bottom, prevY: c.bottom, moving: 0, dir: -1, t: CAR.wait })),
    hang: null, hangY: 0, regrab: 0, ride: null,
    camY: 0, best: run.player.y,
    signature: { x: ledgeMid(TOP_LEDGE), y: ledgeY(TOP_LEDGE) },
  };
  s.camY = cameraTarget(s);
  return s;
}

function cameraTarget(s) {
  const p = s.run.player;
  return Math.max(0, Math.min(s.run.area.height - VIEW_H, p.y - VIEW_H / 2 + 12));
}

// Back at the checkpoint (or the floor), whole again, the runaway car its opening gap below.
function respawn(s) {
  const p = s.run.player;
  const at = s.checkpoint ?? s.run.area.start;
  Object.assign(p, { x: at.x, y: at.y, vx: 0, vy: 0, grounded: true, health: HEALTH, invuln: INVULN, safe: { ...at } });
  s.run.casts.length = 0;
  Object.assign(s.runaway, { y: p.y + RUNAWAY.gap, clock: 0, warn: 0, surge: 0 });
  Object.assign(s, { frame: 0, dying: null, hang: null, ride: null, regrab: 0 });
  s.camY = cameraTarget(s);
}

function die(s, kind) {
  s.lives -= 1;
  s.events.push({ type: 'death', kind });
  if (s.lives <= 0) s.over = { kind: 'game over', t: 0 };
  else Object.assign(s, { dying: kind, respawn: RESPAWN_FRAMES, hang: null, ride: null });
}

// A car parks at its bottom stop until someone boards, sets off a moment later, waits at the top, and
// comes back down.
function stepCars(s) {
  for (const car of s.cars) {
    car.prevY = car.y;
    if (!car.moving && car.y === car.bottom && s.ride !== car) car.t = CAR.board;
    if (car.t > 0) {
      if (--car.t === 0) car.moving = car.dir;
      continue;
    }
    car.y += car.moving * CAR.speed;
    const end = car.moving < 0 ? car.top : car.bottom;
    if ((car.moving < 0 && car.y <= end) || (car.moving > 0 && car.y >= end)) {
      Object.assign(car, { y: end, moving: 0, dir: -car.moving, t: CAR.wait });
    }
  }
}

// The runaway car creeps up, and every so often an alarm warns of a surge.
function stepRunaway(s) {
  const r = s.runaway;
  const p = s.run.player;
  if (s.frame <= RUNAWAY.grace) return;
  r.clock += 1;
  if (r.clock % RUNAWAY.every === RUNAWAY.every - RUNAWAY.warn) {
    r.warn = RUNAWAY.warn;
    s.events.push({ type: 'alarm' });
  }
  if (r.warn > 0 && --r.warn === 0) {
    r.surge = RUNAWAY.surge;
    s.events.push({ type: 'surge' });
  }
  const speed = r.surge > 0 ? RUNAWAY.surgeSpeed : RUNAWAY.speed + s.frame * RUNAWAY.ramp;
  r.surge = Math.max(0, r.surge - 1);
  r.y = Math.min(r.y - speed, p.y + RUNAWAY.maxGap);
}

const without = (set, names) => new Set([...set].filter((b) => !names.includes(b)));
const HANDS = ['left', 'right', 'up', 'down', 'a'];
export const hangPad = (pad) => ({ ...pad, held: without(pad.held, HANDS), pressed: without(pad.pressed, HANDS), aim: null });

export function climb(s, pad) {
  const p = s.run.player;
  const c = s.hang;
  Object.assign(p, { x: c.x, vx: 0, vy: 0, grounded: false });
  const side = (pad.held.has('right') ? 1 : 0) - (pad.held.has('left') ? 1 : 0);
  if (pad.pressed.has('a')) {
    Object.assign(p, { y: s.hangY, vy: -TUNING.jump * CABLE.hop, vx: side * TUNING.walk });
    if (side) p.facing = side;
    Object.assign(s, { hang: null, regrab: CABLE.regrab });
    s.events.push({ type: 'jump' });
    return;
  }
  const dy = (pad.held.has('down') ? 1 : 0) - (pad.held.has('up') ? 1 : 0);
  s.hangY = Math.max(c.top, Math.min(c.bottom, s.hangY + dy * CABLE.climb));
  p.y = s.hangY;
  if (dy > 0 && s.hangY >= c.bottom) Object.assign(s, { hang: null, regrab: CABLE.regrab });
}

export function grab(s, pad, cables = SHAFT.cables) {
  const p = s.run.player;
  if (s.regrab > 0) {
    s.regrab -= 1;
    return;
  }
  if (!pad.held.has('up')) return;
  const c = cables.find((k) => Math.abs(p.x - k.x) <= CABLE.grab && p.y >= k.top && p.y <= k.bottom + 2);
  if (!c) return;
  Object.assign(s, { hang: c, hangY: Math.min(p.y, c.bottom), ride: null });
  Object.assign(p, { x: c.x, vx: 0, vy: 0, grounded: false });
  s.events.push({ type: 'grab' });
}

// A car's roof carries whoever lands on it or stands on it; while it runs, the rider stays inside it.
function ride(s, before) {
  const p = s.run.player;
  if (p.vy < 0) {
    s.ride = null;
    return;
  }
  const car = s.cars.find((c) => Math.abs(p.x - c.x) <= c.w / 2 && (s.ride === c || (before.y <= c.prevY + 0.5 && p.y >= c.y - 0.5)));
  s.ride = car ?? null;
  if (!car) return;
  Object.assign(p, { y: car.y, vy: 0, grounded: true });
  const reach = (car.w - p.w) / 2;
  if (car.moving) p.x = Math.max(car.x - reach, Math.min(car.x + reach, p.x));
}

// One frame of the climb.
export function stepShaft(s, pad) {
  s.events = [];
  if (s.over) {
    s.over.t += 1;
    return s;
  }
  if (s.respawn > 0) {
    s.respawn -= 1;
    if (s.respawn === 0) respawn(s);
    return s;
  }
  const { run } = s;
  const p = run.player;
  const before = { x: p.x, y: p.y };
  if (s.hang) p.vx = p.vy = 0;
  stepRun(run, s.hang ? hangPad(pad) : pad);
  s.events.push(...run.events);
  if (run.paused || run.hitStop > 0) return s;
  s.frame += 1;

  stepCars(s);
  if (s.hang) climb(s, pad);
  else {
    ride(s, before);
    grab(s, pad);
  }
  stepRunaway(s);
  s.best = Math.min(s.best, p.y);

  const settled = p.grounded && !s.ride && !s.hang;
  const cp = { x: ledgeMid(CHECKPOINT_LEDGE), y: ledgeY(CHECKPOINT_LEDGE) };
  if (!s.checkpoint && settled && p.y <= cp.y) {
    s.checkpoint = cp;
    s.events.push({ type: 'checkpoint' });
  }
  if (p.y - p.h / 2 > s.runaway.y) die(s, 'caught');
  else if (s.events.some((e) => e.type === 'lifeLost') || p.health <= 0) die(s, 'worn down');
  else if (settled && p.y <= ledgeY(TOP_LEDGE)) {
    s.over = { kind: 'clear', t: 0 };
    s.events.push({ type: 'signature' }, { type: 'stageClear' });
  }
  s.camY += (cameraTarget(s) - s.camY) * 0.15;
  return s;
}

export const floorsClimbed = (s) => Math.max(0, Math.floor((s.run.area.start.y - s.best) / (4 * TILE)));
export const FLOORS = Math.floor((SHAFT.ledges[0].row - TOP_LEDGE.row) / 4);

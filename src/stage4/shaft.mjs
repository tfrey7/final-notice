// Stage 4 as an escape climb, the express elevator shaft: the auditor hops girders, climbs service cables
// hand over hand and rides elevator cars while a runaway car rises from below in surges, through one
// checkpoint to the top landing where Bellwether's signature is found. Grey-box logic on Stage 2's real
// player and casting. Pure.
import { createRun } from '../stage2/core.mjs';
import { TILE } from '../stage2/physics.mjs';
import {
  LIVES, VIEW_H, buildCourse, checkpointLedge, climb, floorCount, follow, frameSpent, grab, ledgeMid, ledgeY, loseLife,
  passCheckpoint, restorePlayer, runFrame, wornDown,
} from '../climb/course.mjs';

export { CABLE, COLS, LIVES, RESPAWN_FRAMES, VIEW_H, climb, floorsClimbed, grab, hangPad } from '../climb/course.mjs';
export const CYCLES = 14;
export const RUNAWAY = { gap: 150, maxGap: 210, speed: 0.3, ramp: 0.00001, grace: 150, every: 480, warn: 60, surge: 50, surgeSpeed: 1.2 };
export const CAR = { w: 6 * TILE, h: 10, speed: 1, wait: 60, board: 30 };

export const SHAFT = buildCourse(['hop', 'car', 'cable'], CYCLES, CAR.w);
export const TOP_LEDGE = SHAFT.ledges.at(-1);
export const CHECKPOINT_LEDGE = checkpointLedge(SHAFT);
export const FLOORS = floorCount(SHAFT);

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
  const p = restorePlayer(s);
  Object.assign(s.runaway, { y: p.y + RUNAWAY.gap, clock: 0, warn: 0, surge: 0 });
  Object.assign(s, { frame: 0, dying: null, hang: null, ride: null, regrab: 0 });
  s.camY = cameraTarget(s);
}

const LET_GO = { hang: null, ride: null };

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
  if (frameSpent(s, respawn)) return s;
  const p = s.run.player;
  const before = { x: p.x, y: p.y };
  if (!runFrame(s, pad)) return s;

  stepCars(s);
  if (s.hang) climb(s, pad);
  else {
    ride(s, before);
    grab(s, pad, SHAFT.cables);
  }
  stepRunaway(s);
  s.best = Math.min(s.best, p.y);

  const settled = p.grounded && !s.ride && !s.hang;
  passCheckpoint(s, CHECKPOINT_LEDGE, settled);
  if (p.y - p.h / 2 > s.runaway.y) loseLife(s, 'caught', LET_GO);
  else if (wornDown(s)) loseLife(s, 'worn down', LET_GO);
  else if (settled && p.y <= ledgeY(TOP_LEDGE)) {
    s.over = { kind: 'clear', t: 0 };
    s.events.push({ type: 'signature' }, { type: 'stageClear' });
  }
  follow(s, cameraTarget(s));
  return s;
}

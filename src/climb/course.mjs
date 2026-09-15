// What every escape climb shares: the girder-and-cable course, hanging from a cable, lives and the respawn
// at the checkpoint, and each frame's opening and closing. A stage keeps its own layout, hazard and boss.
// Grey-box logic on Stage 2's real player and casting. Pure.
import { stepRun } from '../stage2/core.mjs';
import { TUNING } from '../stage2/escape.mjs';
import { HEALTH, INVULN } from '../stage2/player.mjs';
import { TILE } from '../stage2/physics.mjs';

export const COLS = 16;
export const LIVES = 3;
export const VIEW_H = 224;
export const RESPAWN_FRAMES = 60;
export const CABLE = { grab: 10, climb: 1.2, hop: 0.85, regrab: 14 };

// One leg flips the auditor from one side ledge to the other. A hop crosses on a girder, a car lifts ten
// rows up the middle lane, a cable climbs eight rows to a girder beside its top. Legs run hop, car, cable
// so no girder hangs over a takeoff or a car's roof.
const LEFT = [1, 4];
const RISE = { hop: 4, car: 10, cable: 10 };
const TOP = 4;
const mirror = ([a, b]) => [COLS - 1 - b, COLS - 1 - a];

export function buildCourse(cycle, cycles, carW = 0) {
  const legs = Array.from({ length: cycles }, () => cycle).flat();
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
      const car = { kind: 'car', k: cars.length, c0: 5, c1: 10, x: 8 * TILE, w: carW, bottom: row * TILE, top: (row - RISE.car) * TILE };
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

export const checkpointLedge = (course) => course.ledges.find((l) => l.side && l.row <= (course.ledges[0].row + course.ledges.at(-1).row) / 2);
export const floorCount = (course) => Math.floor((course.ledges[0].row - course.ledges.at(-1).row) / 4);
export const floorsClimbed = (s) => Math.max(0, Math.floor((s.run.area.start.y - s.best) / (4 * TILE)));

export const ledgeY = (l) => l.row * TILE;
export const ledgeMid = (l) => ((l.c0 + l.c1 + 1) / 2) * TILE;

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

export function grab(s, pad, cables) {
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

// Back at the checkpoint (or the floor), whole again. The stage puts its own hazard back.
export function restorePlayer(s) {
  const p = s.run.player;
  const at = s.checkpoint ?? s.run.area.start;
  Object.assign(p, { x: at.x, y: at.y, vx: 0, vy: 0, grounded: true, health: HEALTH, invuln: INVULN, safe: { ...at } });
  s.run.casts.length = 0;
  return p;
}

export function loseLife(s, kind, clear = {}) {
  s.lives -= 1;
  s.events.push({ type: 'death', kind });
  if (s.lives <= 0) s.over = { kind: 'game over', t: 0 };
  else Object.assign(s, { dying: kind, respawn: RESPAWN_FRAMES, ...clear });
}

export const wornDown = (s) => s.events.some((e) => e.type === 'lifeLost') || s.run.player.health <= 0;

// A finished run or a life being lost spends the frame; true when it did.
export function frameSpent(s, respawn) {
  s.events = [];
  if (s.over) {
    s.over.t += 1;
    return true;
  }
  if (s.respawn > 0) {
    s.respawn -= 1;
    if (s.respawn === 0) respawn(s);
    return true;
  }
  return false;
}

// The run's own frame, the auditor held still on a cable; false while it pauses or hit-stops.
export function runFrame(s, pad) {
  const { run } = s;
  if (s.hang) run.player.vx = run.player.vy = 0;
  stepRun(run, s.hang ? hangPad(pad) : pad);
  s.events.push(...run.events);
  if (run.paused || run.hitStop > 0) return false;
  s.frame += 1;
  return true;
}

export function passCheckpoint(s, ledge, settled) {
  if (s.checkpoint || !settled || s.run.player.y > ledgeY(ledge)) return;
  s.checkpoint = { x: ledgeMid(ledge), y: ledgeY(ledge) };
  s.events.push({ type: 'checkpoint' });
}

export const follow = (s, target) => { s.camY += (target - s.camY) * 0.15; };

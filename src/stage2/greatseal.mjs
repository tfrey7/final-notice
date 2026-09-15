// The Great Seal, Stage 2's boss (docs/NES-PLAN.md section 7), then the enemy-free run to the exit. Pure.
// The Retention Director works a brass press over a locked arena: stamps marked by a shadow, a low red-tape
// sweep, three slow seal shots. Two wax bindings take casts; with both broken his contract seal opens and
// takes damage. Each break is a new phase with a longer, quicker loop; the floor is never taken away.
import { SCREEN_W, createRun, stepRun } from './core.mjs';
import { TILE, solidAt } from './physics.mjs';
import { HEALTH, INVULN } from './player.mjs';

export const FLOOR_Y = 13 * TILE;

// 16x15: walls both sides, the floor, two low ledges. The bulkhead is the left wall, the Director's gantry art.
export const ARENA_MAP = [
  '#..............#', '#..............#', '#..............#', '#..............#', '#..............#',
  '#..............#', '#..............#', '#..............#', '#..............#', '#..............#',
  '#..............#', '#..###....###..#', '#..###.P..###..#', '################', '################',
];

// A short flat run with one easy step and no foes; its far end is the stage's end.
export const EXIT_MAP = [
  ...Array.from({ length: 11 }, () => '#'.padEnd(40, '.')),
  '#'.padEnd(18, '.') + '###'.padEnd(22, '.'),
  '#.P'.padEnd(18, '.') + '###'.padEnd(22, '.'),
  '#'.repeat(40),
  '#'.repeat(40),
];

// Per phase (bindings broken: 0, 1, 2). Frames. Every stamp's shadow shows at least half a second (L8).
export const SEAL = {
  hp: 12, bindingHp: 5, damage: 2,
  rest: [80, 64, 48], shadow: [44, 36, 30], slam: 8, tapeWarn: 32, tapeSpeed: [2.5, 3, 3.5],
  shotGap: 24, shotSpeed: [0.9, 1.05, 1.2], shotLife: 320, stagger: 60, downFrames: 120,
  headHalf: 16, tapeHigh: 12,
};

export const LOOPS = [
  ['stamp', 'tape', 'shots'],
  ['stamp', 'stamp', 'tape', 'shots'],
  ['stamp', 'shots', 'stamp', 'tape', 'shots'],
];

export const DIRECTOR = { x: 216, y: 112 };
const BINDINGS = [{ x: 64, y: 96 }, { x: 160, y: 96 }];

export const phaseOf = (b) => b.bindings.filter((x) => x.hp <= 0).length;
export const sealOpen = (b) => phaseOf(b) === 2;

function newBoss() {
  return {
    hp: SEAL.hp, maxHp: SEAL.hp, state: 'rest', t: 0, loop: 0, attack: null, phase: 0,
    bindings: BINDINGS.map((p) => ({ ...p, w: 16, h: 16, hp: SEAL.bindingHp, flash: 0, binding: true })),
    seal: { x: DIRECTOR.x, y: DIRECTOR.y - 8, w: 16, h: 16, hp: SEAL.hp, flash: 0, contract: true },
    stamp: null, tape: null, shots: [], shotsLeft: 0,
  };
}

// The top of the first solid tile under column x: where the press head comes to rest.
export function landingY(area, x) {
  const col = Math.floor(x / TILE);
  for (let row = 1; row < area.rows; row++) if (solidAt(area, col, row)) return row * TILE;
  return area.height;
}

export function createArena(auditor = 'ward') {
  const w = createRun(auditor, ARENA_MAP);
  w.boss = newBoss();
  w.exit = null;
  w.cleared = false;
  w.events.push({ type: 'checkpoint', id: 'stage2-area5' });
  syncTargets(w);
  return w;
}

// The casts can reach whatever of the press is up: bindings still whole, the seal once open, shots in flight.
function syncTargets(w) {
  const b = w.boss;
  w.targets = b.state === 'down' ? [] : [...b.bindings.filter((x) => x.hp > 0), ...(sealOpen(b) ? [b.seal] : []), ...b.shots];
}

function hurt(w, damage) {
  const p = w.player;
  if (p.invuln) return false;
  p.health -= damage;
  p.invuln = INVULN;
  w.events.push({ type: 'hurt' });
  if (p.health <= 0) {
    p.health = HEALTH;
    w.events.push({ type: 'lifeLost' });
  }
  return true;
}

const overlapX = (p, x, half) => Math.abs(p.x - x) < half + p.w / 2;

function begin(w, b) {
  const loop = LOOPS[b.phase];
  b.attack = loop[b.loop++ % loop.length];
  b.t = 0;
  b.state = b.attack;
  const p = w.player;
  if (b.attack === 'stamp') {
    const x = Math.max(TILE + SEAL.headHalf, Math.min(15 * TILE - SEAL.headHalf, p.x));
    b.stamp = { x, y: landingY(w.area, x), shadow: SEAL.shadow[b.phase], t: 0, hit: false };
    w.events.push({ type: 'shadow', x });
  } else if (b.attack === 'tape') {
    const dir = b.loop % 2 ? -1 : 1;
    b.tape = { dir, x: dir > 0 ? TILE : 15 * TILE, t: 0, hit: false };
    w.events.push({ type: 'telegraph' });
  } else {
    b.shotsLeft = 3;
  }
}

function stepAttack(w, b) {
  const p = w.player;
  if (b.attack === 'stamp') {
    const s = b.stamp;
    s.t++;
    if (s.t === s.shadow) w.events.push({ type: 'stamp', x: s.x });
    if (s.t >= s.shadow && s.t < s.shadow + SEAL.slam && !s.hit && overlapX(p, s.x, SEAL.headHalf) && p.y <= s.y + 0.5) {
      s.hit = hurt(w, SEAL.damage);
    }
    if (s.t >= s.shadow + SEAL.slam * 3) { b.stamp = null; rest(b); }
  } else if (b.attack === 'tape') {
    const s = b.tape;
    s.t++;
    if (s.t > SEAL.tapeWarn) {
      s.x += s.dir * SEAL.tapeSpeed[b.phase];
      if (!s.hit && overlapX(p, s.x, 8) && p.y > FLOOR_Y - SEAL.tapeHigh) s.hit = hurt(w, SEAL.damage);
      if (s.x < TILE || s.x > 15 * TILE) { b.tape = null; rest(b); }
    }
  } else {
    b.t++;
    if (b.shotsLeft > 0 && b.t % SEAL.shotGap === 1) {
      b.shotsLeft--;
      const sx = DIRECTOR.x - 12;
      const sy = DIRECTOR.y - 16;
      const len = Math.hypot(p.x - sx, p.y - 16 - sy) || 1;
      const v = SEAL.shotSpeed[b.phase];
      b.shots.push({ glyph: true, sealShot: true, x: sx, y: sy + 4, w: 8, h: 8, hp: 1, flash: 0, age: 0, vx: ((p.x - sx) / len) * v, vy: ((p.y - 16 - sy) / len) * v });
      w.events.push({ type: 'sealShot' });
    }
    if (b.shotsLeft === 0) rest(b);
  }
}

const rest = (b) => Object.assign(b, { state: 'rest', t: 0, attack: null });

function stepShots(w, b) {
  const p = w.player;
  b.shots = b.shots.filter((s) => {
    if (s.hp <= 0) return false;
    s.age++;
    s.x += s.vx;
    s.y += s.vy;
    const touch = Math.abs(s.x - p.x) < (s.w + p.w) / 2 && s.y > p.y - p.h && s.y - s.h < p.y;
    if (touch && hurt(w, SEAL.damage)) return false;
    return s.age < SEAL.shotLife && !solidAt(w.area, Math.floor(s.x / TILE), Math.floor((s.y - s.h / 2) / TILE));
  });
}

function stepBoss(w) {
  const b = w.boss;
  if (b.state === 'down') {
    if (++b.t === SEAL.downFrames) enterExit(w);
    return;
  }
  const phase = phaseOf(b);
  if (phase !== b.phase) {
    Object.assign(b, { phase, loop: 0, stamp: null, tape: null, shotsLeft: 0, state: 'stagger', t: 0, attack: null });
    w.events.push({ type: 'bindingBreak', phase }, ...(phase === 2 ? [{ type: 'sealOpen' }] : []));
  }
  b.hp = b.seal.hp;
  if (b.hp <= 0) {
    Object.assign(b, { state: 'down', t: 0, stamp: null, tape: null, shots: [], shotsLeft: 0 });
    w.events.push({ type: 'bossDown' });
    return;
  }
  if (b.state === 'stagger') {
    if (++b.t >= SEAL.stagger) rest(b);
  } else if (b.state === 'rest') {
    if (++b.t >= SEAL.rest[b.phase]) begin(w, b);
  } else {
    stepAttack(w, b);
  }
  stepShots(w, b);
}

// A lost life restarts at the boss checkpoint, never earlier (L10): the press whole again, the auditor at the door.
function restartArena(w) {
  w.boss = newBoss();
  const { start } = w.area;
  Object.assign(w.player, { x: start.x, y: start.y, vx: 0, vy: 0, grounded: true, health: HEALTH, invuln: INVULN, safe: { ...start } });
  w.casts.length = 0;
}

export function enterExit(w) {
  const next = createRun(w.player.auditor, EXIT_MAP);
  const { player } = w;
  Object.assign(player, { x: next.player.x, y: next.player.y, vx: 0, vy: 0, safe: { ...next.player.safe } });
  Object.assign(w, { area: next.area, targets: [], casts: [], camX: 0, exit: { end: next.area.width - 2 * TILE } });
  w.events.push({ type: 'exitRun' });
}

export function stepArena(w, pad) {
  stepRun(w, pad);
  if (w.paused || w.hitStop > 0) return w;
  if (w.exit) {
    if (!w.cleared && w.player.x >= w.exit.end) {
      w.cleared = true;
      w.events.push({ type: 'stageClear' });
    }
    return w;
  }
  stepBoss(w);
  if (w.events.some((e) => e.type === 'lifeLost')) restartArena(w);
  if (!w.exit) {
    syncTargets(w);
    w.camX = 0;
  }
  return w;
}

// The strip's far end: the auditor walks into the locked arena.
export const reachedArena = (w) => !w.boss && w.player.x >= w.area.width - 1.5 * TILE;

// Stagings for screenshots: a stamp mid-shadow over the auditor, and the contract seal open.
export function poseArena(w, name) {
  const b = w.boss;
  if (name === 'stamp') {
    Object.assign(b, { state: 'rest', t: SEAL.rest[0] - 1, loop: 0 });
  }
  if (name === 'seal') {
    for (const x of b.bindings) x.hp = 0;
    b.seal.hp = 9;
  }
  syncTargets(w);
  return w;
}

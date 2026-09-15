// Stage 2 as an escape climb, the Archive: the auditor climbs a tall shaft of shelving ahead of a rising
// paper flood, past Associates and falling paper, through one checkpoint to the Records Custodian at the
// top. Grey-box logic on Stage 2's real run (player, casting, Associates). Pure.
import { createRun, stepRun } from './core.mjs';
import { HEALTH, INVULN } from './player.mjs';
import { TILE } from './physics.mjs';

export const COLS = 16;
export const LIVES = 3;
export const VIEW_H = 224;
export const LEDGES = 100;
export const CHECKPOINT_LEDGE = 50;
export const FLOOD = { gap: 120, maxGap: 184, speed: 0.26, ramp: 0.000012, grace: 120 };
export const DROP = { speed: 1.5, w: 10, h: 12, period: 150, x: 128 };
export const RESPAWN_FRAMES = 60;

// Ledges two rows apart, bottom to top, four tiles wide. The auditor is two rows tall, so the ledge two
// above is the ceiling over a jump: the cycle keeps it clear of every takeoff.
const SIDES = { A: [1, 4], B: [7, 10], C: [11, 14], D: [5, 8] };
const CYCLE = 'ABCD';
const ASSOCIATES = [6, 13, 20, 27, 36, 43, 58, 65, 74, 81, 88, 95];
const DROPS = [10, 22, 38, 62, 78, 90];
const TOP = 3;

function buildArchive() {
  const floor = TOP + 2 * (LEDGES + 1);
  const grid = Array.from({ length: floor + 1 }, () => ['#', ...'.'.repeat(COLS - 2), '#']);
  grid[floor].fill('#');
  const ledges = [{ k: 0, row: floor, c0: 1, c1: COLS - 2 }];
  for (let k = 1; k <= LEDGES; k++) {
    const [c0, c1] = SIDES[CYCLE[(k - 1) % CYCLE.length]];
    ledges.push({ k, row: floor - 2 * k, c0, c1 });
  }
  const [t0, t1] = SIDES[CYCLE[LEDGES % CYCLE.length]];
  ledges.push({ k: LEDGES + 1, row: TOP, c0: t0, c1: t1, top: true });
  for (const l of ledges) for (let c = l.c0; c <= l.c1; c++) grid[l.row][c] = '#';
  grid[floor - 1][12] = 'P';
  for (const k of ASSOCIATES) grid[ledges[k].row - 1][ledges[k].c0 + 2] = 'A';
  return { map: grid.map((r) => r.join('')), ledges };
}

export const ARCHIVE = buildArchive();

const ledgeY = (k) => ARCHIVE.ledges[k].row * TILE;
const ledgeMid = (k) => ((ARCHIVE.ledges[k].c0 + ARCHIVE.ledges[k].c1 + 1) / 2) * TILE;

export function createArchive(who = 'ward') {
  const run = createRun(who, ARCHIVE.map);
  const s = {
    who, run, frame: 0, lives: LIVES, over: null, dying: null, respawn: 0,
    checkpoint: null, drops: [], events: [],
    flood: { y: run.player.y + FLOOD.gap },
    camY: 0, best: run.player.y,
    custodian: { x: ledgeMid(LEDGES + 1) - 16, y: ledgeY(LEDGES + 1) },
    spawners: DROPS.map((k) => ({ x: DROP.x, y0: ledgeY(Math.min(LEDGES + 1, k + 4)), y1: ledgeY(k - 1) })),
  };
  s.camY = cameraTarget(s);
  return s;
}

function cameraTarget(s) {
  const p = s.run.player;
  return Math.max(0, Math.min(s.run.area.height - VIEW_H, p.y - p.h / 2 - VIEW_H / 2 - 24));
}

// Back at the checkpoint (or the floor), whole again, the flood its opening gap below.
function respawn(s) {
  const p = s.run.player;
  const at = s.checkpoint ?? s.run.area.start;
  Object.assign(p, { x: at.x, y: at.y, vx: 0, vy: 0, grounded: true, health: HEALTH, invuln: INVULN, safe: { ...at } });
  s.run.glyphs.length = 0;
  s.run.casts.length = 0;
  s.drops.length = 0;
  s.flood.y = p.y + FLOOD.gap;
  s.frame = 0;
  s.dying = null;
  s.camY = cameraTarget(s);
}

function die(s, kind) {
  s.lives -= 1;
  s.events.push({ type: 'death', kind });
  if (s.lives <= 0) s.over = { kind: 'game over', t: 0 };
  else Object.assign(s, { dying: kind, respawn: RESPAWN_FRAMES });
}

function stepDrops(s) {
  const p = s.run.player;
  if (s.frame % DROP.period === 0) {
    for (const sp of s.spawners) if (p.y >= sp.y0 && p.y <= sp.y1) s.drops.push({ x: sp.x, y: s.camY - DROP.h });
  }
  for (const d of s.drops) {
    d.y += DROP.speed;
    const touch = Math.abs(d.x - p.x) < (DROP.w + p.w) / 2 && d.y > p.y - p.h && d.y - DROP.h < p.y;
    if (touch && !p.invuln) {
      d.hit = true;
      p.health -= 1;
      p.invuln = INVULN;
      s.events.push({ type: 'hurt' });
    }
  }
  s.drops = s.drops.filter((d) => !d.hit && d.y < s.flood.y && d.y < s.camY + VIEW_H + 32);
}

// One frame of the climb.
export function stepArchive(s, pad) {
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
  for (const f of run.foes) if (Math.abs(f.y - p.y) > VIEW_H / 2) f.rest = Math.max(f.rest, 20);
  stepRun(run, pad);
  s.events.push(...run.events);
  if (run.paused || run.hitStop > 0) return s;
  s.frame += 1;

  if (s.frame > FLOOD.grace) s.flood.y -= FLOOD.speed + s.frame * FLOOD.ramp;
  s.flood.y = Math.min(s.flood.y, p.y + FLOOD.maxGap);
  for (const f of run.foes) if (f.y - f.h / 2 > s.flood.y) f.hp = 0;
  stepDrops(s);
  s.best = Math.min(s.best, p.y);

  const cp = { x: ledgeMid(CHECKPOINT_LEDGE), y: ledgeY(CHECKPOINT_LEDGE) };
  if (!s.checkpoint && p.grounded && p.y <= cp.y) {
    s.checkpoint = cp;
    s.events.push({ type: 'checkpoint' });
  }
  if (p.y - p.h / 2 > s.flood.y) die(s, 'caught');
  else if (s.events.some((e) => e.type === 'lifeLost') || p.health <= 0) die(s, 'worn down');
  else if (p.grounded && p.y <= ledgeY(LEDGES + 1)) {
    s.over = { kind: 'clear', t: 0 };
    s.events.push({ type: 'custodian' }, { type: 'stageClear' });
  }
  s.camY += (cameraTarget(s) - s.camY) * 0.15;
  return s;
}

export const ledgesClimbed = (s) => ARCHIVE.ledges.filter((l) => l.row * TILE >= s.best).length - 1;

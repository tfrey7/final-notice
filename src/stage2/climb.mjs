// Stage 2 as an escape climb, the Archive: the auditor climbs a tall shaft of shelving ahead of a rising
// paper flood, past Associates and falling paper, through one checkpoint to the Records Custodian's arena
// at the top. Reaching it stops the flood and starts the boss fight; beating him clears the stage.
// Grey-box logic on Stage 2's real run (player, casting, Associates). Pure.
import { createRun } from './core.mjs';
import { INVULN } from './player.mjs';
import { TILE } from './physics.mjs';
import { CUSTODIAN, createCustodian, stepCustodian, stepParry } from './summit.mjs';
import { COLS, LIVES, VIEW_H, follow, frameSpent, ledgeY, loseLife, passCheckpoint, restorePlayer, runFrame, wornDown } from '../climb/course.mjs';

export { COLS, LIVES, RESPAWN_FRAMES, VIEW_H } from '../climb/course.mjs';
export const LEDGES = 100;
export const CHECKPOINT_LEDGE = 50;
export const LANDING_LEDGE = LEDGES + 1;
export const ARENA_LEDGE = LEDGES + 2;
export const FLOOD = { gap: 120, maxGap: 184, speed: 0.26, ramp: 0.000012, grace: 120 };
export const DROP = { speed: 1.5, w: 10, h: 12, period: 150, x: 128 };

// Ledges two rows apart, bottom to top, four tiles wide. The auditor is two rows tall, so the ledge two
// above is the ceiling over a jump: the cycle keeps it clear of every takeoff. Above the last ledge a
// landing, then the arena: nine tiles of floor with a stairwell gap over the landing.
const SIDES = { A: [1, 4], B: [7, 10], C: [11, 14], D: [5, 8] };
const CYCLE = 'ABCD';
const ASSOCIATES = [6, 13, 20, 27, 36, 43, 58, 65, 74, 81, 88, 95];
const DROPS = [10, 22, 38, 62, 78, 90];
const TOP = 6;
const ARENA_COLS = [6, 14];

function buildArchive() {
  const floor = TOP + 2 * ARENA_LEDGE;
  const grid = Array.from({ length: floor + 1 }, () => ['#', ...'.'.repeat(COLS - 2), '#']);
  grid[floor].fill('#');
  const ledges = [{ k: 0, row: floor, c0: 1, c1: COLS - 2 }];
  for (let k = 1; k <= LANDING_LEDGE; k++) {
    const [c0, c1] = SIDES[CYCLE[(k - 1) % CYCLE.length]];
    ledges.push({ k, row: floor - 2 * k, c0, c1 });
  }
  ledges.push({ k: ARENA_LEDGE, row: TOP, c0: ARENA_COLS[0], c1: ARENA_COLS[1], arena: true });
  for (const l of ledges) for (let c = l.c0; c <= l.c1; c++) grid[l.row][c] = '#';
  grid[floor - 1][12] = 'P';
  for (const k of ASSOCIATES) grid[ledges[k].row - 1][ledges[k].c0 + 2] = 'A';
  return { map: grid.map((r) => r.join('')), ledges };
}

export const ARCHIVE = buildArchive();

const rowY = (k) => ledgeY(ARCHIVE.ledges[k]);

export const ARENA = { x0: ARENA_COLS[0] * TILE, x1: (ARENA_COLS[1] + 1) * TILE, y: rowY(ARENA_LEDGE) };

export function createArchive(who = 'ward', boss = CUSTODIAN) {
  const run = createRun(who, ARCHIVE.map);
  const s = {
    who, run, boss, frame: 0, lives: LIVES, over: null, dying: null, respawn: 0,
    checkpoint: null, drops: [], events: [], fight: null,
    flood: { y: run.player.y + FLOOD.gap },
    camY: 0, best: run.player.y,
    spawners: DROPS.map((k) => ({ x: DROP.x, y0: rowY(Math.min(LEDGES + 1, k + 4)), y1: rowY(k - 1) })),
  };
  s.camY = cameraTarget(s);
  return s;
}

function cameraTarget(s) {
  const p = s.run.player;
  return Math.max(0, Math.min(s.run.area.height - VIEW_H, p.y - p.h / 2 - VIEW_H / 2 - 24));
}

// Puts the auditor at the arena's edge, a frame from the fight, for the lab and screenshots.
export function startAtSummit(s) {
  const at = { x: ARENA.x0 + 12, y: ARENA.y };
  Object.assign(s.run.player, { ...at, vx: 0, vy: 0, grounded: true, safe: { ...at } });
  s.best = at.y;
  s.flood.y = at.y + FLOOD.gap;
  s.camY = cameraTarget(s);
  return s;
}

// Back at the checkpoint (or the floor), whole again, the flood its opening gap below. A lost fight
// starts over against a Custodian at full health.
function respawn(s) {
  const p = restorePlayer(s);
  s.run.glyphs.length = 0;
  s.drops.length = 0;
  s.flood.y = p.y + FLOOD.gap;
  s.frame = 0;
  s.dying = null;
  if (s.fight) s.fight = createCustodian(ARENA, s.boss);
  s.camY = cameraTarget(s);
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

function stepFight(s, pad) {
  const { run, fight } = s;
  if (stepParry(run.player, pad, s.boss)) s.events.push({ type: 'objection' });
  const events = stepCustodian(fight, run, s.boss);
  s.events.push(...events);
  run.bosses = fight.beaten ? [] : [fight, ...fight.papers];
  if (events.some((e) => e.type === 'bossDown')) {
    s.over = { kind: 'clear', t: 0 };
    s.events.push({ type: 'stageClear' });
  }
}

// One frame of the climb.
export function stepArchive(s, pad) {
  if (frameSpent(s, respawn)) return s;
  const { run } = s;
  const p = run.player;
  for (const f of run.foes) if (Math.abs(f.y - p.y) > VIEW_H / 2) f.rest = Math.max(f.rest, 20);
  if (!runFrame(s, pad)) return s;

  if (s.frame > FLOOD.grace && !s.fight) s.flood.y -= FLOOD.speed + s.frame * FLOOD.ramp;
  s.flood.y = Math.min(s.flood.y, p.y + FLOOD.maxGap);
  for (const f of run.foes) if (f.y - f.h / 2 > s.flood.y) f.hp = 0;
  stepDrops(s);
  s.best = Math.min(s.best, p.y);

  passCheckpoint(s, ARCHIVE.ledges[CHECKPOINT_LEDGE], p.grounded);
  if (!s.fight && p.grounded && p.y <= ARENA.y) {
    s.fight = createCustodian(ARENA, s.boss);
    s.checkpoint = { x: p.x, y: p.y };
    s.events.push({ type: 'custodian' });
  }
  if (s.fight) stepFight(s, pad);
  if (s.over) return s;
  if (p.y - p.h / 2 > s.flood.y) loseLife(s, 'caught');
  else if (wornDown(s)) loseLife(s, 'worn down');
  follow(s, cameraTarget(s));
  return s;
}

export const ledgesClimbed = (s) => ARCHIVE.ledges.filter((l) => l.row * TILE >= s.best).length - 1;

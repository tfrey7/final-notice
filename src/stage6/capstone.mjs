// Stage 6, the Great Seal: an escape climb up the inside of the pyramid capstone by girder and cable while
// the Seal's shadow rises below. Unlike the Archive's steady flood and the shaft's runaway car, the shadow
// breathes, surging on each inhale and all but stopping on the ebb, and every so often it reaches a hand up
// under the auditor. At the crown Bellwether is bound to the Seal; beaten, the Seal is in the auditor's
// hands and the final choice picks the ending. Grey-box logic on Stage 2's real player and casting. Pure.
import { createRun, stepRun } from '../stage2/core.mjs';
import { HEALTH, INVULN } from '../stage2/player.mjs';
import { TILE } from '../stage2/physics.mjs';
import { stepParry } from '../stage2/summit.mjs';
import { climb, grab, hangPad } from '../stage4/shaft.mjs';
import { BELLWETHER, createBellwether, stepBellwether } from './bellwether.mjs';

export const COLS = 16;
export const LIVES = 3;
export const VIEW_H = 224;
export const CYCLES = 12;
export const SHADOW = { gap: 150, maxGap: 200, speed: 0.22, swell: 0.7, ebb: 0.4, breath: 240, grace: 150 };
export const HAND = { every: 420, warn: 50, rise: 16, hold: 30, height: 60, w: 20 };
export const RESPAWN_FRAMES = 60;
export const CHOICES = [{ key: 'good', label: 'STAMP THE NOTICE' }, { key: 'bad', label: 'KEEP THE SEAL' }];
export const CHOICE_DELAY = 40;
export const ENDINGS = {
  good: ['THE NOTICE IS SERVED', 'THE PAYROLL GOES FREE', 'TUESDAY MOVES ON AT LAST'],
  bad: ['YOU KEEP THE SEAL', 'THE PAYROLL KEEPS WORKING', 'THE TOP CHAIR IS YOURS'],
};

// One leg flips the auditor from one side ledge to the other: a hop crosses on a girder, a cable climbs
// eight rows to a girder beside its top. Built like the elevator shaft, without its cars.
const LEFT = [1, 4];
const RISE = { hop: 4, cable: 10 };
const TOP = 4;
const mirror = ([a, b]) => [COLS - 1 - b, COLS - 1 - a];

function buildCapstone() {
  const legs = Array.from({ length: CYCLES }, () => ['hop', 'cable']).flat();
  const floor = TOP + legs.reduce((n, leg) => n + RISE[leg], 0);
  const grid = Array.from({ length: floor + 1 }, () => ['#', ...'.'.repeat(COLS - 2), '#']);
  grid[floor].fill('#');
  const route = [];
  const ledges = [];
  const cables = [];
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
  return { map: grid.map((r) => r.join('')), route, ledges, cables, cars: [] };
}

export const CAPSTONE = buildCapstone();
export const TOP_LEDGE = CAPSTONE.ledges.at(-1);
export const CHECKPOINT_LEDGE = CAPSTONE.ledges.find((l) => l.side && l.row <= (CAPSTONE.ledges[0].row + TOP_LEDGE.row) / 2);

// The crown: one screen of floor between two walls, the Seal hanging over it.
const ARENA_ROWS = VIEW_H / TILE;
export const ARENA_MAP = Array.from({ length: ARENA_ROWS }, (_, r) => {
  if (r === ARENA_ROWS - 1) return '#'.repeat(COLS);
  return `#${(r === ARENA_ROWS - 2 ? '..P' : '...').padEnd(COLS - 2, '.')}#`;
});
export const ARENA = { x0: TILE, x1: (COLS - 1) * TILE, y: (ARENA_ROWS - 1) * TILE };

const ledgeY = (l) => l.row * TILE;
const ledgeMid = (l) => ((l.c0 + l.c1 + 1) / 2) * TILE;

export function createCapstone(who = 'ward', boss = BELLWETHER) {
  const run = createRun(who, CAPSTONE.map);
  const s = {
    who, run, boss, part: 'climb', frame: 0, lives: LIVES, over: null, dying: null, respawn: 0, checkpoint: null, events: [],
    shadow: { y: run.player.y + SHADOW.gap, clock: 0, hand: null },
    hang: null, hangY: 0, regrab: 0, ride: null, fight: null, choice: null,
    camY: 0, best: run.player.y,
  };
  s.camY = cameraTarget(s);
  return s;
}

// The auditor's feet about 100 px down the view, so the shadow a full gap below is still on screen.
function cameraTarget(s) {
  if (s.part !== 'climb') return 0;
  return Math.max(0, Math.min(s.run.area.height - VIEW_H, s.run.player.y - 100));
}

function enterFight(s) {
  Object.assign(s, { run: createRun(s.who, ARENA_MAP), part: 'fight', fight: createBellwether(ARENA, s.boss), hang: null, dying: null, camY: 0 });
  s.events.push({ type: 'bellwether' });
}

// Puts the auditor in the crown a frame from the fight, for screenshots and tests.
export function startAtCrown(s) {
  enterFight(s);
  s.events = [];
  return s;
}

// Back at the checkpoint (or the floor), whole again, the shadow its opening gap below. A life lost in the
// crown starts the fight over against Bellwether at full health.
function respawn(s) {
  s.dying = null;
  if (s.part === 'fight') {
    Object.assign(s, { run: createRun(s.who, ARENA_MAP), fight: createBellwether(ARENA, s.boss) });
    s.run.player.invuln = INVULN;
    return;
  }
  const p = s.run.player;
  const at = s.checkpoint ?? s.run.area.start;
  Object.assign(p, { x: at.x, y: at.y, vx: 0, vy: 0, grounded: true, health: HEALTH, invuln: INVULN, safe: { ...at } });
  s.run.casts.length = 0;
  Object.assign(s.shadow, { y: p.y + SHADOW.gap, clock: 0, hand: null });
  Object.assign(s, { frame: 0, hang: null, regrab: 0 });
  s.camY = cameraTarget(s);
}

function die(s, kind) {
  s.lives -= 1;
  s.events.push({ type: 'death', kind });
  if (s.lives <= 0) s.over = { kind: 'game over', t: 0 };
  else Object.assign(s, { dying: kind, respawn: RESPAWN_FRAMES, hang: null });
}

// How far the shadow's hand is up, 0 to 1: still under the surface through its warning, then rising,
// holding and sinking back.
export function handReach(hand) {
  const t = (hand?.t ?? 0) - HAND.warn;
  if (t <= 0) return 0;
  if (t < HAND.rise) return t / HAND.rise;
  if (t < HAND.rise + HAND.hold) return 1;
  return Math.max(0, 1 - (t - HAND.rise - HAND.hold) / HAND.rise);
}

export const inhaling = (shadow) => shadow.clock % SHADOW.breath < SHADOW.breath / 3;

function stepShadow(s) {
  const sh = s.shadow;
  const p = s.run.player;
  if (s.frame <= SHADOW.grace) return;
  sh.clock += 1;
  if (sh.clock % SHADOW.breath === 1) s.events.push({ type: 'breath' });
  const speed = inhaling(sh) ? SHADOW.speed + SHADOW.swell : SHADOW.speed * SHADOW.ebb;
  sh.y = Math.min(sh.y - speed, p.y + SHADOW.maxGap);
  if (sh.clock % HAND.every === 0) {
    sh.hand = { x: Math.max(ARENA.x0 + HAND.w / 2, Math.min(ARENA.x1 - HAND.w / 2, p.x)), t: 0 };
    s.events.push({ type: 'reach' });
  }
  if (sh.hand && ++sh.hand.t > HAND.warn + 2 * HAND.rise + HAND.hold) sh.hand = null;
}

function caught(s) {
  const p = s.run.player;
  const sh = s.shadow;
  if (p.y - p.h / 2 > sh.y) return true;
  const reach = handReach(sh.hand) * HAND.height;
  return reach > 0 && Math.abs(p.x - sh.hand.x) < (HAND.w + p.w) / 2 && p.y > sh.y - reach;
}

function stepFight(s, pad) {
  const { run, fight } = s;
  if (stepParry(run.player, pad, s.boss)) s.events.push({ type: 'objection' });
  const events = stepBellwether(fight, run, s.boss);
  s.events.push(...events);
  run.bosses = fight.beaten ? [] : [fight, ...fight.drops];
  if (events.some((e) => e.type === 'bossDown')) {
    Object.assign(s, { part: 'choice', choice: { pick: 0, t: 0 } });
    s.events.push({ type: 'sealTaken' });
  } else if (s.events.some((e) => e.type === 'lifeLost') || run.player.health <= 0) die(s, 'worn down');
  return s;
}

// The placeholder final choice: up or down moves the cursor, jump or start picks once the prompt has settled.
function stepChoice(s, pad) {
  const c = s.choice;
  c.t += 1;
  if (pad.pressed.has('up') || pad.pressed.has('down')) {
    c.pick = (c.pick + 1) % CHOICES.length;
    s.events.push({ type: 'cursor' });
  }
  if (c.t >= CHOICE_DELAY && (pad.pressed.has('a') || pad.pressed.has('start'))) {
    const ending = CHOICES[c.pick].key;
    s.over = { kind: 'ending', ending, t: 0 };
    s.events.push({ type: 'choice', ending });
  }
  return s;
}

// One frame of the finale.
export function stepCapstone(s, pad) {
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
  if (s.part === 'choice') return stepChoice(s, pad);
  const { run } = s;
  const p = run.player;
  if (s.hang) p.vx = p.vy = 0;
  stepRun(run, s.hang ? hangPad(pad) : pad);
  s.events.push(...run.events);
  if (run.paused || run.hitStop > 0) return s;
  s.frame += 1;
  if (s.part === 'fight') return stepFight(s, pad);

  if (s.hang) climb(s, pad);
  else grab(s, pad, CAPSTONE.cables);
  stepShadow(s);
  s.best = Math.min(s.best, p.y);

  const settled = p.grounded && !s.hang;
  if (!s.checkpoint && settled && p.y <= ledgeY(CHECKPOINT_LEDGE)) {
    s.checkpoint = { x: ledgeMid(CHECKPOINT_LEDGE), y: ledgeY(CHECKPOINT_LEDGE) };
    s.events.push({ type: 'checkpoint' });
  }
  if (caught(s)) die(s, 'caught');
  else if (s.events.some((e) => e.type === 'lifeLost') || p.health <= 0) die(s, 'worn down');
  else if (settled && p.y <= ledgeY(TOP_LEDGE)) return enterFight(s), s;
  s.camY += (cameraTarget(s) - s.camY) * 0.15;
  return s;
}

export const floorsClimbed = (s) => Math.max(0, Math.floor((s.run.area.start.y - s.best) / (4 * TILE)));
export const FLOORS = Math.floor((CAPSTONE.ledges[0].row - TOP_LEDGE.row) / 4);

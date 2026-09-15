// Stage 2's first four areas as one scrolling strip: Archive Access, a safe landing that teaches CAST and AIM;
// Retention Order, where the wax front chases the auditor past closing fire doors to a wax-lock door; Original
// Copy, the Records Custodian's locked screen; and the Disposal Line's belts, seals and two pushes of the wax.
// Checkpoints, triggers and restarts. Pure.
import { SCREEN_W, createRun, stepRun } from './core.mjs';
import { TILE } from './physics.mjs';
import { dropExtra } from './pickups.mjs';
import { HEALTH, INVULN } from './player.mjs';
import { createFront, resetFront, stepFront, wake } from './waxfront.mjs';
import { carry, createBelts, createSeal } from './conveyor.mjs';
import { createCustodian, createLedger, stepCustodian, stepLedger } from './custodian.mjs';
import { restoreAtCheckpoint } from '../injunction.mjs';

export const ROWS = 15;
export const FLOOR_ROW = 13;
export const DOOR_TOP = 4;

// Each area's place on the strip, its checkpoint (as flow names it) and the column a restart stands on.
export const AREAS = [
  { name: 'archiveAccess', id: 'stage2-area1', col: 0, cols: 32, spawnCol: 2 },
  { name: 'retentionOrder', id: 'stage2-area2', col: 32, cols: 48, spawnCol: 35 },
  { name: 'originalCopy', id: 'stage2-area3', col: 80, cols: 16, spawnCol: 81 },
  { name: 'disposalLine', id: 'stage2-area4', col: 96, cols: 48, spawnCol: 97 },
];

// A map from [row, col, text] pieces over a floor with pits. '#' solid, P start, B box, A Associate,
// C/T/M a ledger, F a fire door, D the wax-lock door; both doors fill from DOOR_TOP down to their row.
// K the Custodian, L his ledger stand, a an Associate he calls; > and < belts; S a disposal seal.
function sketch(cols, pits, pieces) {
  const rows = Array.from({ length: ROWS }, (_, r) => [...(r >= FLOOR_ROW ? '#' : '.').repeat(cols)]);
  for (const [a, b] of pits) for (let r = FLOOR_ROW; r < ROWS; r++) for (let c = a; c <= b; c++) rows[r][c] = '.';
  for (const [r, c, text] of pieces) [...text].forEach((ch, i) => { rows[r][c + i] = ch; });
  return rows.map((r) => r.join(''));
}

// One new verb per area, one tucked-away ledger each, a squad of three at most.
export const BUILT_IN = {
  archiveAccess: sketch(32, [[29, 30]], [
    [8, 10, 'B'], [8, 18, 'T'], [9, 17, '####'], [10, 22, '######'], [11, 13, '###'],
    [12, 2, 'P'], [12, 22, 'A.A.A'],
  ]),
  retentionOrder: sketch(48, [[25, 27]], [
    [8, 36, 'C'], [9, 34, '#####'], [10, 8, '#####'], [11, 20, '###'], [11, 31, '###'],
    [12, 1, 'F'], [12, 6, 'B'], [12, 30, 'F'], [12, 42, 'D'],
  ]),
  originalCopy: sketch(16, [], [
    [8, 3, 'a'], [8, 12, 'a'], [9, 2, '###'], [9, 11, '###'], [12, 12, 'K'], [12, 14, 'L'],
  ]),
  // A safe belt first, then belts under the first push, a pocket, a belt against you and one toward a pit.
  disposalLine: sketch(48, [[38, 39]], [
    [8, 6, 'M'], [9, 5, '###'], [10, 27, '#####'],
    [12, 15, 'S'], [12, 32, 'S'],
    [13, 3, '>>>>>>>>>>'], [13, 17, '>>>>>>>>>>'], [13, 33, '<<<<<'], [13, 40, '>>>>'],
  ]),
};

const at = (name, col) => (AREAS.find((a) => a.name === name).col + col) * TILE;

function buildLayout(maps) {
  return {
    maps,
    map: Array.from({ length: ROWS }, (_, r) => AREAS.map((a) => maps[a.name][r]).join('')),
    // The alarm sounds well inside Retention Order, with the wax a screen behind.
    wakeAt: at('retentionOrder', 6),
    frontX: at('retentionOrder', -4),
    prompts: [{ text: 'CAST', from: 0, to: 8 * TILE }, { text: 'AIM', from: 8 * TILE, to: 16 * TILE }],
    arena: { x0: at('originalCopy', 0), x1: at('disposalLine', 0) },
    // Each push wakes past a seal and halts at the left edge of the safe pocket that follows it.
    pushes: [
      { wakeAt: at('disposalLine', 17), frontX: at('disposalLine', 5), halt: at('disposalLine', 27) },
      { wakeAt: at('disposalLine', 33), frontX: at('disposalLine', 21), halt: at('disposalLine', 44) },
    ],
  };
}

export const LAYOUT = buildLayout(BUILT_IN);

const isSolid = (v) => v === '#' || v === 1 || v === '1' || v === true;

// The art card's `solid` grids replace the terrain when they have an area's shape; markers stay built in.
export function layoutFrom(solids = {}) {
  const fits = (a) => Array.isArray(solids[a.name]) && solids[a.name].length === ROWS && solids[a.name].every((r) => r.length === a.cols);
  if (!AREAS.some(fits)) return LAYOUT;
  const maps = Object.fromEntries(AREAS.map((a) => [a.name, !fits(a) ? BUILT_IN[a.name] : BUILT_IN[a.name].map((line, r) =>
    [...line].map((ch, c) => (isSolid(solids[a.name][r][c]) ? '#' : ch === '#' ? '.' : ch)).join(''))]));
  return buildLayout(maps);
}

export const areaAt = (x) => AREAS.findLastIndex((a) => a.col * TILE <= x);

const find = (map, ch) => map.flatMap((line, row) => [...line].flatMap((c, col) => (c === ch ? [{ col, row }] : [])));
const foot = ({ col, row }) => ({ x: col * TILE + TILE / 2, y: (row + 1) * TILE });

function fill(area, col, top, bottom, v) {
  for (let r = top; r <= bottom; r++) area.solid[r * area.cols + col] = v;
}

function createArena(layout) {
  const [k] = find(layout.map, 'K');
  const [stand] = find(layout.map, 'L');
  return { ...layout.arena, started: false, home: foot(k), spots: find(layout.map, 'a').map(foot), boss: null, ledger: createLedger({ ...foot(stand), y: foot(stand).y - 16 }) };
}

export function createStage(auditor = 'ward', layout = LAYOUT, checkpoint = AREAS[0].id) {
  const w = createRun(auditor, layout.map);
  const doors = find(layout.map, 'F').map(({ col, row }) => ({ col, top: DOOR_TOP, bottom: row, closeAt: (col + 4) * TILE, closed: false }));
  for (const { col, row } of find(layout.map, 'D')) {
    fill(w.area, col, DOOR_TOP, row, 1);
    w.locks.push({ x: col * TILE + TILE / 2, y: (row + 1) * TILE, w: TILE, h: (row - DOOR_TOP + 1) * TILE, hp: 1, flash: 0, lock: true, door: true, col, row });
  }
  for (const { col, row } of find(layout.map, 'S')) {
    fill(w.area, col, DOOR_TOP, row, 1);
    w.locks.push(createSeal(col, row, DOOR_TOP));
  }
  const belts = createBelts(layout.map);
  for (const key of belts.keys()) {
    const [col, row] = key.split(',').map(Number);
    fill(w.area, col, row, row, 1);
  }
  w.stage = {
    checkpoint: 0, doors, belts, riding: 0,
    front: createFront(layout.frontX), wakeAt: layout.wakeAt, prompts: layout.prompts,
    pushes: layout.pushes.map((q) => ({ ...q, front: createFront(q.frontX, q.halt) })),
    arena: createArena(layout),
  };
  const i = AREAS.findIndex((a) => a.id === checkpoint);
  if (i > 0) {
    w.stage.checkpoint = i;
    restart(w);
  }
  return w;
}

// Every wax front on the strip, for the drawing and the restarts.
export const frontsOf = (s) => [s.front, ...s.pushes.map((q) => q.front)];

// A lost life: the checkpoint's column, full health, the wax asleep again, the doors ahead open and an
// unbeaten Custodian back on his mark.
function restart(w) {
  const s = w.stage;
  const a = AREAS[s.checkpoint];
  const x = a.spawnCol * TILE + TILE / 2;
  const y = FLOOR_ROW * TILE;
  Object.assign(w.player, { x, y, vx: 0, vy: 0, grounded: true, health: HEALTH, invuln: INVULN, safe: { x, y } });
  frontsOf(s).forEach(resetFront);
  for (const d of s.doors) {
    if (!d.closed || d.col < a.spawnCol) continue;
    fill(w.area, d.col, d.top, d.bottom, 0);
    d.closed = false;
  }
  if (s.arena.started && !s.arena.boss.beaten) {
    s.arena.started = false;
    s.arena.boss = null;
    w.bosses.length = 0;
    w.foes = w.foes.filter((f) => !f.called);
  }
  w.casts.length = 0;
  w.glyphs.length = 0;
  w.camX = Math.max(0, Math.min(w.area.width - SCREEN_W, Math.round(x - SCREEN_W / 2 + 16)));
}

// The locked screen: shut once the auditor is in, open again once the ledger is in their hands.
function stepArena(w) {
  const r = w.stage.arena;
  const p = w.player;
  if (!r.started) {
    if (areaAt(p.x) !== 2 || p.x < r.x0 + TILE * 1.5) return;
    r.started = true;
    r.boss = createCustodian(r.home, r.spots, r);
    w.bosses.push(r.boss);
    w.events.push({ type: 'bossStart' });
  }
  if (r.ledger.taken) return;
  w.events.push(...stepCustodian(r.boss, p, w.foes), ...stepLedger(r.ledger, r.boss, p));
  p.x = Math.max(r.x0 + p.w / 2, Math.min(r.x1 - p.w / 2, p.x));
  w.camX = r.x0;
}

export const arenaLocked = (w) => w.stage.arena.started && !w.stage.arena.ledger.taken;

export function stepStage(w, pad) {
  stepRun(w, pad);
  if (w.paused || w.hitStop > 0) return w;
  const s = w.stage;
  const p = w.player;
  stepArena(w);
  const here = areaAt(p.x);
  if (here > s.checkpoint) {
    s.checkpoint = here;
    w.events.push({ type: 'checkpoint', id: AREAS[here].id });
  }
  for (const d of s.doors) {
    if (d.closed || p.x < d.closeAt) continue;
    fill(w.area, d.col, d.top, d.bottom, 1);
    d.closed = true;
    w.events.push({ type: 'doorShut', col: d.col });
  }
  if (here >= 2) s.front.active = false;
  else if (!s.front.active && p.x >= s.wakeAt) {
    wake(s.front);
    w.events.push({ type: 'alarm' });
  }
  for (const q of s.pushes) {
    if (q.front.active || p.x < q.wakeAt || p.x >= q.halt) continue;
    wake(q.front);
    w.events.push({ type: 'alarm' });
  }
  for (const lock of w.locks) {
    if (!lock.door || lock.hp > 0 || lock.open) continue;
    lock.open = true;
    fill(w.area, lock.col, DOOR_TOP, lock.row, 0);
  }
  const dir = carry(s.belts, p, w.area);
  if (dir && dir !== s.riding) w.events.push({ type: 'belt', dir });
  s.riding = dir;
  const lost = w.events.some((e) => e.type === 'lifeLost');
  const touched = frontsOf(s).map((f) => stepFront(f, p, w.camX)).some(Boolean);
  if (touched && !lost) {
    w.events.push({ type: 'caught' }, { type: 'lifeLost' });
    dropExtra(w);
    w.meterHits = restoreAtCheckpoint(w.meterHits);
  }
  if (w.events.some((e) => e.type === 'lifeLost')) restart(w);
  return w;
}

// The teaching prompts showing for where the auditor stands on the landing.
export const promptsFor = (w) => (w.stage.checkpoint > 0 ? [] : w.stage.prompts.filter((q) => w.player.x >= q.from && w.player.x < q.to).map((q) => q.text));
export const BOSS_AREA = { name: 'greatSeal', id: 'stage2-area5' }; // entered past the strip's far end (greatseal.mjs)

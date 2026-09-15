// Stage 2's first two areas as one scrolling strip: Archive Access, a safe landing that teaches CAST and AIM,
// then Retention Order, where the wax front chases the auditor past closing fire doors to a wax-lock door.
// Checkpoints, triggers and restarts. Pure.
import { SCREEN_W, createRun, stepRun } from './core.mjs';
import { TILE } from './physics.mjs';
import { dropExtra } from './pickups.mjs';
import { HEALTH, INVULN } from './player.mjs';
import { createFront, resetFront, stepFront, wake } from './waxfront.mjs';
import { restoreAtCheckpoint } from '../injunction.mjs';

export const ROWS = 15;
export const FLOOR_ROW = 13;
export const DOOR_TOP = 4;

// Each area's place on the strip, its checkpoint (as flow names it) and the column a restart stands on.
export const AREAS = [
  { name: 'archiveAccess', id: 'stage2-area1', col: 0, cols: 32, spawnCol: 2 },
  { name: 'retentionOrder', id: 'stage2-area2', col: 32, cols: 48, spawnCol: 35 },
];

// A map from [row, col, text] pieces over a floor with pits. '#' solid, P start, B box, A Associate,
// C/T/M a ledger, F a fire door, D the wax-lock door; both doors fill from DOOR_TOP down to their row.
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
};

function buildLayout(maps) {
  const [, retention] = AREAS;
  return {
    maps,
    map: Array.from({ length: ROWS }, (_, r) => AREAS.map((a) => maps[a.name][r]).join('')),
    // The alarm sounds well inside Retention Order, with the wax a screen behind.
    wakeAt: (retention.col + 6) * TILE,
    frontX: (retention.col - 4) * TILE,
    prompts: [{ text: 'CAST', from: 0, to: 8 * TILE }, { text: 'AIM', from: 8 * TILE, to: 16 * TILE }],
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

function fill(area, col, top, bottom, v) {
  for (let r = top; r <= bottom; r++) area.solid[r * area.cols + col] = v;
}

export function createStage(auditor = 'ward', layout = LAYOUT, checkpoint = AREAS[0].id) {
  const w = createRun(auditor, layout.map);
  const doors = find(layout.map, 'F').map(({ col, row }) => ({ col, top: DOOR_TOP, bottom: row, closeAt: (col + 4) * TILE, closed: false }));
  for (const { col, row } of find(layout.map, 'D')) {
    fill(w.area, col, DOOR_TOP, row, 1);
    w.locks.push({ x: col * TILE + TILE / 2, y: (row + 1) * TILE, w: TILE, h: (row - DOOR_TOP + 1) * TILE, hp: 1, flash: 0, lock: true, door: true, col, row });
  }
  w.stage = { checkpoint: 0, doors, front: createFront(layout.frontX), wakeAt: layout.wakeAt, prompts: layout.prompts };
  const at = AREAS.findIndex((a) => a.id === checkpoint);
  if (at > 0) {
    w.stage.checkpoint = at;
    restart(w);
  }
  return w;
}

// A lost life: the checkpoint's column, full health, the front asleep again and the doors ahead open.
function restart(w) {
  const s = w.stage;
  const a = AREAS[s.checkpoint];
  const x = a.spawnCol * TILE + TILE / 2;
  const y = FLOOR_ROW * TILE;
  Object.assign(w.player, { x, y, vx: 0, vy: 0, grounded: true, health: HEALTH, invuln: INVULN, safe: { x, y } });
  resetFront(s.front);
  for (const d of s.doors) {
    if (!d.closed || d.col < a.spawnCol) continue;
    fill(w.area, d.col, d.top, d.bottom, 0);
    d.closed = false;
  }
  w.casts.length = 0;
  w.glyphs.length = 0;
  w.camX = Math.max(0, Math.min(w.area.width - SCREEN_W, Math.round(x - SCREEN_W / 2 + 16)));
}

export function stepStage(w, pad) {
  stepRun(w, pad);
  if (w.paused || w.hitStop > 0) return w;
  const s = w.stage;
  const p = w.player;
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
  if (!s.front.active && p.x >= s.wakeAt) {
    wake(s.front);
    w.events.push({ type: 'alarm' });
  }
  for (const lock of w.locks) {
    if (!lock.door || lock.hp > 0 || lock.open) continue;
    lock.open = true;
    fill(w.area, lock.col, DOOR_TOP, lock.row, 0);
  }
  const lost = w.events.some((e) => e.type === 'lifeLost');
  if (stepFront(s.front, p, w.camX) && !lost) {
    w.events.push({ type: 'caught' }, { type: 'lifeLost' });
    dropExtra(w);
    w.meterHits = restoreAtCheckpoint(w.meterHits);
  }
  if (w.events.some((e) => e.type === 'lifeLost')) restart(w);
  return w;
}

// The teaching prompts showing for where the auditor stands on the landing.
export const promptsFor = (w) => (w.stage.checkpoint > 0 ? [] : w.stage.prompts.filter((q) => w.player.x >= q.from && w.player.x < q.to).map((q) => q.text));

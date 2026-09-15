// The climb lab's pure half: a tall grey shaft on Stage 2's real run (player, casting, Associates),
// a rising flood behind the auditor, hit pause and knockback on a landed cast, a hanging shelf that
// Margin of Error drops into a platform, and the dials Tim turns while he climbs.
import { createRun, stepRun } from '../stage2/core.mjs';
import { ASSOCIATE } from '../stage2/foes.mjs';
import { TILE, solidAt } from '../stage2/physics.mjs';
import { marks } from '../stage2/pickups.mjs';

// 16 tiles wide, 56 tall. '#' solid, 'P' the start, 'A' an Associate, 'S' the left end of a hanging shelf,
// '=' the stub a dropped shelf comes to rest on. The shelf is the only way from row 29 up to row 25.
export const SHAFT = [
  '#..............#',
  '#..............#',
  '#####......#####',
  '#..............#',
  '#......####....#',
  '#..............#',
  '#.####.........#',
  '#.........A....#',
  '#.......####...#',
  '#..............#',
  '#...........###',
  '#..............#',
  '#.....####.....#',
  '#..............#',
  '#.###..........#',
  '#..............#',
  '#....####......#',
  '#...........A..#',
  '#.........####.#',
  '#..............#',
  '#....###.......#',
  '#.......###....#',
  '#..............#',
  '#..####........#',
  '#....S.........#',
  '#........####..#',
  '#..............#',
  '#..............#',
  '#......=.......#',
  '####...........#',
  '#..............#',
  '#......####....#',
  '#............A.#',
  '#...........###',
  '#..............#',
  '#.....####.....#',
  '#..............#',
  '####...........#',
  '#.....A........#',
  '#....####......#',
  '#..............#',
  '#.........####.#',
  '#..............#',
  '#...####.......#',
  '#..............#',
  '#........####..#',
  '#..............#',
  '#..####........#',
  '#..............#',
  '#.......####...#',
  '#..............#',
  '#...........###',
  '#..............#',
  '#....#####.....#',
  '#..P...........#',
  '################',
].map((r) => r.padEnd(15, '.').slice(0, 15) + '#').map((r, i) => (i === 55 ? '################' : r.replace('=', '#')));

export const SHELF_TILES = 3;
export const ESCAPE_ROW = 2;
export const FLOOD_GRACE = 90;
export const FLOOD_CAP = 4;
export const VIEW_H = 224;

// Each dial is [start, min, max, step]; `player` ones write Stage 2's movement TUNING while the lab runs.
export const CLIMB = {
  player: { jump: [4.87, 2, 8, 0.125], gravity: [0.25, 0.05, 0.6, 0.0125], jumpCut: [1.5, 0.5, 4, 0.125], walk: [1.375, 0.5, 3, 0.0625], airAccel: [0.09375, 0.015625, 0.3, 0.015625] },
  pursuer: { floodSpeed: [0.3, 0, 2, 0.025], floodAccel: [0.02, 0, 0.2, 0.005], floodGap: [96, 16, 240, 8] },
  camera: { lookAhead: [40, 0, 100, 4], cameraLag: [0.15, 0.02, 1, 0.01] },
  casting: { castSpeed: [1, 0.25, 3, 0.125], hitPause: [4, 0, 20, 1], knockback: [20, 0, 40, 1] },
  enemies: { fireRate: [1, 0, 4, 0.25] },
};

export function buildClimbDials() {
  return Object.entries(CLIMB).flatMap(([group, table]) => Object.entries(table).map(([key, [value, min, max, step]]) => (
    { group, key, value, start: value, min, max, step })));
}

export const dialValues = (dials) => Object.fromEntries(dials.map((d) => [d.key, d.value]));

export const climbTune = (dials) => Object.fromEntries(dials.filter((d) => d.group === 'player').map((d) => [d.key, d.value]));

export function createClimb(who = 'ward', dials = buildClimbDials()) {
  const run = createRun(who, SHAFT);
  run.carried = ['notice', 'margin'];
  const shelves = marks(SHAFT, 'S').map(({ x, y }) => ({
    shelf: true, lock: true, x: x - TILE / 2 + (SHELF_TILES * TILE) / 2, y, w: SHELF_TILES * TILE, h: 8, hp: 1, flash: 0, vy: 0, state: 'hanging',
  }));
  run.targets.push(...shelves);
  const v = dialValues(dials);
  const p = run.player;
  return {
    who, run, shelves, frame: 0, over: null,
    flood: { y: p.y + v.floodGap, extra: 0 },
    camY: Math.max(0, Math.min(run.area.height - VIEW_H, p.y - VIEW_H + 48)),
    best: p.y,
  };
}

// Puts the auditor on the leftmost standing tile of `row`'s ledge, the flood and camera following.
export function startAt(c, row, dials) {
  const { area, player: p } = c.run;
  const col = [...Array(area.cols).keys()].find((i) => i > 0 && i < area.cols - 1 && solidAt(area, i, row) && !solidAt(area, i, row - 1));
  if (col === undefined) return false;
  Object.assign(p, { x: col * TILE + TILE / 2, y: row * TILE, vx: 0, vy: 0, safe: { x: col * TILE + TILE / 2, y: row * TILE } });
  c.flood.y = p.y + dialValues(dials).floodGap;
  c.best = p.y;
  c.camY = Math.max(0, Math.min(area.height - VIEW_H, p.y - VIEW_H + 48));
  return true;
}

const inView =(c, y) => y > c.camY - 16 && y < c.camY + VIEW_H + 16;

// A dropped shelf falls until a tile under its span is solid, then becomes solid tiles itself.
function stepShelf(s, area) {
  if (s.state !== 'falling') return false;
  s.vy = Math.min(s.vy + 0.3, 6);
  const next = s.y + s.vy;
  const c0 = Math.round((s.x - s.w / 2) / TILE);
  const row = Math.floor(next / TILE);
  if ([...Array(SHELF_TILES).keys()].some((i) => solidAt(area, c0 + i, row))) {
    s.y = row * TILE;
    s.state = 'landed';
    for (let i = 0; i < SHELF_TILES; i++) area.solid[(row - 1) * area.cols + c0 + i] = 1;
    return true;
  }
  s.y = next;
  return false;
}

// One frame. Answers the climb to keep: a fresh one once a finished run is dismissed.
export function stepClimb(c, pad, dials) {
  const v = dialValues(dials);
  const { run } = c;
  const p = run.player;
  if (c.over) {
    c.over.t += 1;
    return c.over.t > 45 && (pad.pressed.has('a') || pad.pressed.has('start')) ? createClimb(c.who, dials) : c;
  }
  const stopped = run.hitStop > 0;
  stepRun(run, pad);
  if (run.paused) return c;
  c.events = run.events;
  if (!stopped) {
    c.frame += 1;
    for (const k of run.casts) {
      if (k.scaled) continue;
      k.scaled = true;
      k.vx *= v.castSpeed;
      k.vy *= v.castSpeed;
    }
    for (const e of run.events) {
      if (e.type === 'glyph') e.foe.rest = v.fireRate > 0 ? Math.round(ASSOCIATE.rest / v.fireRate) : Infinity;
      if (!['hit', 'break'].includes(e.type) || e.target?.glyph) continue;
      const t = e.target;
      run.hitStop = Math.max(run.hitStop, v.hitPause);
      if (t.shelf) Object.assign(t, { state: 'falling', vy: 0 });
      else if (t.kind === 'associate' && t.hp > 0 && v.knockback > 0) Object.assign(t, { knock: v.knockback, knockDir: Math.sign(t.x - p.x) || 1 });
    }
    for (const f of run.foes) if (!inView(c, f.y - f.h) && f.rest !== Infinity) f.rest = Math.max(f.rest, 20);
    for (const s of c.shelves) if (stepShelf(s, run.area)) run.events.push({ type: 'shelfLanded', target: s });

    if (c.frame > FLOOD_GRACE) {
      c.flood.extra += v.floodAccel / 60;
      c.flood.y -= Math.min(FLOOD_CAP, v.floodSpeed + c.flood.extra);
    }
    for (const f of run.foes) if (f.y - f.h / 2 > c.flood.y) f.hp = 0;
    c.best = Math.min(c.best, p.y);
    if (p.y - p.h / 2 > c.flood.y) c.over = { kind: 'caught', t: 0 };
    else if (run.events.some((e) => e.type === 'lifeLost')) c.over = { kind: 'worn down', t: 0 };
    else if (p.grounded && p.y <= ESCAPE_ROW * TILE) c.over = { kind: 'escaped', t: 0 };
  }
  const target = p.y - p.h / 2 - VIEW_H / 2 - v.lookAhead;
  c.camY += (target - c.camY) * v.cameraLag;
  c.camY = Math.max(0, Math.min(run.area.height - VIEW_H, c.camY));
  return c;
}

export const rowsClimbed = (c) => Math.max(0, Math.round((c.run.area.start.y - c.best) / TILE));

// The text "copy settings" puts on the clipboard: changed dials first, then every group.
export function climbSettingsText(dials, who) {
  const changed = dials.filter((d) => d.value !== d.start);
  return [
    `Climb lab settings (${who})`,
    `changed: ${changed.length ? changed.map((d) => `${d.key} ${d.start} -> ${d.value}`).join(', ') : 'none'}`,
    ...Object.keys(CLIMB).flatMap((g) => ['', `[${g}]`, ...dials.filter((d) => d.group === g).map((d) => `${d.key}: ${d.value}`)]),
  ].join('\n');
}

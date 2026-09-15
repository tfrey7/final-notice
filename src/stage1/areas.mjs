// Stage 1, Claims & Adjustments, as the auditor walks it (docs/NES-PLAN.md section 6): five areas,
// the screens the camera locks on, the wave script behind every lock, a checkpoint at each area,
// props to throw and the first-aid box. Pure: newStage builds the floor, stepAreas runs after
// stepFloor each frame and adds its events to world.events.
import { player } from './moves.mjs';
import { PIPS, SCREEN_W, START, cameraX } from './player.mjs';
import { spawnStaff, thinkStaff } from './staff.mjs';
import { CHECKPOINTS } from '../flow.mjs';

export const GO_FRAMES = 150;
export const HEAL = 4;
export const EDGE = 16;

// Lock `screen` counts from the area's own first screen; prop and first-aid x from its left edge.
// Area 5, Vellum's office, is its own locked room (vellum.mjs), reached through the door at the end.
export const AREAS = [
  {
    id: 'reception', screens: 2, remark: 'reception',
    locks: [
      { screen: 0, waves: [{ prompt: 'PUNCH', foes: ['associate'] }, { prompt: 'STEP', foes: ['associate'] }] },
      { screen: 1, waves: [{ prompt: 'THROW', foes: ['associate'] }] },
    ],
    props: [{ kind: 'chair', x: 312, y: 188 }],
  },
  {
    id: 'serviceFloor', screens: 3,
    locks: [
      { screen: 1, waves: [{ foes: ['associate', 'associate'] }, { foes: ['associate', 'associate', 'associate'] }] },
      { screen: 2, waves: [{ foes: ['manager'] }] },
    ],
    props: [{ kind: 'briefcase', x: 160, y: 200 }, { kind: 'post', x: 560, y: 176 }],
  },
  {
    id: 'internalReview', screens: 2,
    locks: [
      { screen: 0, waves: [{ foes: ['counsel'] }] },
      { screen: 1, waves: [{ foes: ['associate', 'supervisor'] }] },
    ],
    props: [{ kind: 'post', x: 300, y: 196 }],
  },
  {
    id: 'waiting', screens: 1,
    locks: [{ screen: 0, waves: [{ foes: ['associate', 'manager'] }] }],
    props: [],
    firstAid: { x: 200, y: 188 },
  },
];

export function layout(areas = AREAS) {
  let width = 0;
  const locks = [];
  const starts = areas.map((a, area) => {
    const start = width;
    width += a.screens * SCREEN_W;
    for (const l of a.locks) locks.push({ area, x: start + l.screen * SCREEN_W, waves: l.waves, seats: l.seats, fold: l.fold });
    return start;
  });
  return { width, starts, locks };
}

export const STAGE = layout();

// The floor from the checkpoint of area `from` (0-3): only the auditor, every prop at home, the
// locks of earlier areas already cleared. A scene may bring its own `areas` table (the same screens,
// its own waves and seats) and an `entry` for how foes walk on (staff.mjs); both stay on the world.
// Another stage also brings its `checkpoints` and the `end` event it fires at the far edge.
export function newStage(world, tune, from = 0, { areas = AREAS, entry = null, checkpoints = CHECKPOINTS.stage1, end = 'toOffice' } = {}) {
  const stage = areas === AREAS ? STAGE : layout(areas);
  const start = stage.starts[from];
  const p = player(world);
  Object.assign(p, { x: start + START.x, y: START.y, z: 0, vx: 0, vz: 0 });
  world.fighters = [p];
  world.props = areas.flatMap((a, i) => a.props.map((o, n) => {
    const home = { x: stage.starts[i] + o.x, y: o.y };
    return { id: `${a.id}-${o.kind}${n}`, kind: o.kind, home, ...home, z: 0, vx: 0, state: 'floor', t: 0 };
  }));
  world.firstAid = areas.flatMap((a, i) => (a.firstAid ? [{ x: stage.starts[i] + a.firstAid.x, y: a.firstAid.y, taken: false }] : []));
  world.floor = { ...world.floor, left: start + EDGE, right: stage.width - EDGE };
  Object.assign(world, { areas, stage, entry, checkpoints, end, seats: undefined, bench: [], tapes: [], think: thinkStaff, noWaves: true, locked: false, cameraX: start, checkpointX: start + START.x });
  const lock = stage.locks.findIndex((l) => l.area >= from);
  world.run = { area: from - 1, lock: lock < 0 ? stage.locks.length : lock, wave: -1, locked: false, camera: start, go: 0, prompt: null, done: false };
  return world;
}

export const waveDown = (world) => !world.bench.length && !world.fighters.some((f) => f.kind && f.state !== 'ko');

// A fold lock is the room just cleared, met again: the camera is already on it, so it locks only when
// the auditor walks out of its far side, and he comes back in at its near side.
const folding = (lock, run) => lock?.fold && run.camera >= lock.x;

export function stepAreas(world, tune) {
  const run = world.run;
  const p = player(world);
  const events = world.events;
  const stage = world.stage ?? STAGE;
  const areas = world.areas ?? AREAS;

  const area = stage.starts.findLastIndex((s) => p.x >= s);
  if (area > run.area) {
    run.area = area;
    world.checkpointX = stage.starts[area] + START.x;
    events.push(`checkpoint:${(world.checkpoints ?? CHECKPOINTS.stage1)[area]}`);
    if (areas[area].remark) events.push(`remark:${areas[area].remark}`);
  }

  const lock = stage.locks[run.lock];
  if (!run.locked) {
    if (run.go > 0) run.go--;
    const stop = lock ? lock.x : stage.width - SCREEN_W;
    run.camera = Math.min(stop, Math.max(run.camera, cameraX(run.camera, p.x, SCREEN_W, stage.width)));
    const fold = folding(lock, run);
    if (fold && p.x >= lock.x + SCREEN_W - EDGE - 4) {
      Object.assign(p, { x: lock.x + EDGE + 12, vx: 0 });
      events.push('fold');
    }
    if (lock && run.camera >= lock.x && (!fold || events.includes('fold'))) {
      Object.assign(run, { locked: true, wave: -1, go: 0 });
      world.seats = lock.seats;
      events.push('lock');
    }
  }
  world.cameraX = run.camera;
  world.floor.left = run.camera + EDGE;
  world.floor.right = run.locked || folding(stage.locks[run.lock], run) ? run.camera + SCREEN_W - EDGE : stage.width - EDGE;

  if (run.locked && waveDown(world)) {
    const { waves } = stage.locks[run.lock];
    if (run.wave + 1 < waves.length) {
      run.wave++;
      run.prompt = waves[run.wave].prompt ?? null;
      spawnStaff(world, waves[run.wave].foes, tune);
      events.push('wave');
    } else {
      Object.assign(run, { locked: false, prompt: null, lock: run.lock + 1, go: GO_FRAMES });
      events.push('go');
    }
  }

  for (const box of world.firstAid) {
    if (box.taken || p.z > 0 || Math.abs(p.x - box.x) > 10 || Math.abs(p.y - box.y) > tune.depthReach) continue;
    box.taken = true;
    p.hp = Math.min(PIPS, p.hp + HEAL);
    events.push('heal', 'remark:firstAid');
  }

  if (!run.done && !run.locked && run.lock >= stage.locks.length && p.x >= stage.width - EDGE - 4) {
    run.done = true;
    events.push(world.end ?? 'toOffice');
  }
  return world;
}

// Which area a flow checkpoint restarts in; the office (area 5) is not on this floor.
export const areaFor = (checkpoint, list = CHECKPOINTS.stage1, areas = AREAS.length) => Math.max(0, Math.min(areas - 1, list.indexOf(checkpoint)));

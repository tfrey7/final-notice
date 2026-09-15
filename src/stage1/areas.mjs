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
    for (const l of a.locks) locks.push({ area, x: start + l.screen * SCREEN_W, waves: l.waves });
    return start;
  });
  return { width, starts, locks };
}

export const STAGE = layout();

// The floor from the checkpoint of area `from` (0-3): only the auditor, every prop at home, the
// locks of earlier areas already cleared.
export function newStage(world, tune, from = 0) {
  const start = STAGE.starts[from];
  const p = player(world);
  Object.assign(p, { x: start + START.x, y: START.y, z: 0, vx: 0, vz: 0 });
  world.fighters = [p];
  world.props = AREAS.flatMap((a, i) => a.props.map((o, n) => {
    const home = { x: STAGE.starts[i] + o.x, y: o.y };
    return { id: `${a.id}-${o.kind}${n}`, kind: o.kind, home, ...home, z: 0, vx: 0, state: 'floor', t: 0 };
  }));
  world.firstAid = AREAS.flatMap((a, i) => (a.firstAid ? [{ x: STAGE.starts[i] + a.firstAid.x, y: a.firstAid.y, taken: false }] : []));
  world.floor = { ...world.floor, left: start + EDGE, right: STAGE.width - EDGE };
  Object.assign(world, { bench: [], tapes: [], think: thinkStaff, noWaves: true, locked: false, cameraX: start, checkpointX: start + START.x });
  const lock = STAGE.locks.findIndex((l) => l.area >= from);
  world.run = { area: from - 1, lock: lock < 0 ? STAGE.locks.length : lock, wave: -1, locked: false, camera: start, go: 0, prompt: null, done: false };
  return world;
}

export const waveDown = (world) => !world.bench.length && !world.fighters.some((f) => f.kind && f.state !== 'ko');

export function stepAreas(world, tune) {
  const run = world.run;
  const p = player(world);
  const events = world.events;

  const area = STAGE.starts.findLastIndex((s) => p.x >= s);
  if (area > run.area) {
    run.area = area;
    world.checkpointX = STAGE.starts[area] + START.x;
    events.push(`checkpoint:${CHECKPOINTS.stage1[area]}`);
    if (AREAS[area].remark) events.push(`remark:${AREAS[area].remark}`);
  }

  const lock = STAGE.locks[run.lock];
  if (!run.locked) {
    if (run.go > 0) run.go--;
    const stop = lock ? lock.x : STAGE.width - SCREEN_W;
    run.camera = Math.min(stop, Math.max(run.camera, cameraX(run.camera, p.x, SCREEN_W, STAGE.width)));
    if (lock && run.camera >= lock.x) {
      Object.assign(run, { locked: true, wave: -1, go: 0 });
      events.push('lock');
    }
  }
  world.cameraX = run.camera;
  world.floor.left = run.camera + EDGE;
  world.floor.right = run.locked ? run.camera + SCREEN_W - EDGE : STAGE.width - EDGE;

  if (run.locked && waveDown(world)) {
    const { waves } = STAGE.locks[run.lock];
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

  if (!run.done && !run.locked && run.lock >= STAGE.locks.length && p.x >= STAGE.width - EDGE - 4) {
    run.done = true;
    events.push('toOffice');
  }
  return world;
}

// Which area a flow checkpoint restarts in; the office (area 5) is not on this floor.
export const areaFor = (checkpoint) => Math.max(0, Math.min(AREAS.length - 1, CHECKPOINTS.stage1.indexOf(checkpoint)));

import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad } from '../src/input.mjs';
import { tuningTables } from '../src/tune.mjs';
import {
  DEFAULTS, LEVEL, SCREEN_W, TUNING, castDirection, createRunner, createWorld, stepBody, stepCamera, stepWorld,
} from '../src/stage2/escape.mjs';

const t = { ...DEFAULTS };
const world = () => createWorld(LEVEL, t);

// Runs a world through frames of held buttons; answers the world and the pad.
function play(w, frames, pad = createPad()) {
  for (const down of frames) {
    pad = updatePad(pad, new Set(down));
    stepWorld(w, pad);
  }
  return pad;
}
const hold = (buttons, n) => Array.from({ length: n }, () => buttons);

test('cast directions follow the Contra rule in five directions', () => {
  const dir = (held, grounded = true) => castDirection(new Set(held), grounded);
  assert.equal(dir([]), 'forward');
  assert.equal(dir(['right']), 'forward');
  assert.equal(dir(['up']), 'up');
  assert.equal(dir(['up', 'right']), 'upForward');
  assert.equal(dir(['down']), 'forward', 'crouching casts low and forward');
  assert.equal(dir(['down', 'left']), 'forward');
  assert.equal(dir(['down'], false), 'down');
  assert.equal(dir(['down', 'right'], false), 'downForward');
});

test('a shot flies in the held direction, mirrored by facing', () => {
  const w = world();
  play(w, [...hold(['left'], 6), ['left', 'up', 'b'], ...hold(['left', 'up'], t.castDelay + 1)]);
  const [shot] = w.shots;
  assert.equal(shot.dir, 'upForward');
  assert.ok(shot.vx < 0 && shot.vy < 0);
  assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - t.shotSpeed) < 1e-9);
});

test('the cast waits its wind-up, then the cooldown spaces taps out', () => {
  const w = world();
  play(w, [['b'], ...hold([], t.castDelay - 1)]);
  assert.equal(w.shots.length, 0, 'still winding up');
  play(w, [[]]);
  assert.equal(w.shots.length, 1);
  play(w, [['b'], [], ['b'], []]);
  assert.equal(w.shots.length, 1, 'taps inside the cooldown are ignored');
});

test('holding B past the charge threshold fires a charged shot on release, one frame short does not', () => {
  const release = (heldFrames) => {
    const w = world();
    play(w, [...hold(['b'], heldFrames), ...hold([], t.castDelay + 2)]);
    return w.shots.filter((s) => s.charged).length;
  };
  assert.equal(release(t.chargeFrames - 1), 0);
  assert.equal(release(t.chargeFrames), 1);
});

test('running builds momentum to the Mega Man walk speed and skids on a turn', () => {
  const r = createRunner(100, LEVEL.floor);
  const flat = { ...LEVEL, surfaces: [{ x0: 0, x1: 1600, y: LEVEL.floor }] };
  const step = (dir) => stepBody(r, dir, { pressed: false, held: false }, flat, t);
  step(1);
  assert.ok(r.vx < t.walk, 'first frame is not full speed');
  for (let i = 0; i < 20; i++) step(1);
  assert.equal(r.vx, t.walk);
  step(-1);
  assert.equal(r.skid, true);
  assert.ok(r.vx > 0, 'still sliding forward during the skid');
});

test('a held jump rises about three tiles, a tapped jump far less', () => {
  const apex = (heldFrames) => {
    const r = createRunner(100, LEVEL.floor);
    let top = r.y;
    for (let f = 0; f < 60; f++) {
      stepBody(r, 0, { pressed: f === 0, held: f < heldFrames }, LEVEL, t);
      top = Math.min(top, r.y);
    }
    return LEVEL.floor - top;
  };
  assert.ok(apex(60) > 44 && apex(60) < 50, `full jump ${apex(60)}`);
  assert.ok(apex(3) < 20, `short hop ${apex(3)}`);
});

test('the chase scrolls at its pace: Ward outruns it, standing still gets pushed', () => {
  const w = world();
  w.camX = LEVEL.chase[0].x0;
  w.ward.x = w.camX + 40;
  stepCamera(w);
  assert.equal(w.camX, LEVEL.chase[0].x0 + t.scrollSpeed);
  for (let i = 0; i < 120; i++) stepCamera(w);
  assert.equal(w.camX, LEVEL.chase[0].x0 + 121 * t.scrollSpeed);
  assert.ok(w.ward.x >= w.camX + 8, 'the left edge pushes Ward');
  assert.ok(t.scrollSpeed < t.chaseSpeed && t.chaseSpeed < t.walk, 'scroll < pursuers < Ward');
});

test('outside a chase the camera only follows and never scrolls back', () => {
  const w = world();
  w.ward.x = 200;
  stepCamera(w);
  assert.equal(w.camX, 88);
  w.ward.x = 150;
  stepCamera(w);
  assert.equal(w.camX, 88);
  assert.ok(SCREEN_W === 256);
});

test('checkpoints record as Ward passes them and a lost life returns there', () => {
  const w = world();
  w.ward.x = LEVEL.checkpoints[1] + 2;
  w.camX = w.ward.x - 100;
  play(w, [[]]);
  assert.equal(w.checkpoint, 1);
  w.health = 1;
  w.ward.y = 300;
  w.ward.vy = 1;
  const pad = play(w, [[]]);
  assert.ok(pad);
  assert.equal(w.ward.x, LEVEL.checkpoints[1]);
  assert.equal(w.health, t.health);
});

test('a shot foe bowls over the pursuer behind it, and a knocked foe can slide into a pit', () => {
  const w = world();
  w.camX = 300;
  w.ward.x = 380;
  const foe = (x) => ({ ...createRunner(x, LEVEL.floor), hp: t.pursuerHp, hurt: 0 });
  const front = foe(340);
  const back = foe(326);
  w.pursuers.push(front, back);
  w.shots.push({ x: 346, y: 180, vx: -t.shotSpeed, vy: 0, dir: 'forward', charged: true, damage: 1, hit: new Set() });
  play(w, hold([], 3));
  assert.ok(back.hurt > 0 && back.hp < t.pursuerHp, 'the one behind was knocked too');

  const edge = foe(396);
  edge.hurt = 30;
  edge.vx = 2;
  const lone = world();
  lone.camX = 300;
  lone.ward.x = 250 + 200;
  lone.pursuers.push(edge);
  play(lone, hold([], 30));
  assert.ok(edge.y > LEVEL.floor, 'fell into the pit at 400');
});

test('tune: every escape number is on the shared table, and the world reads it live', () => {
  const entry = tuningTables().find((e) => e.name === 'escape');
  assert.deepEqual(entry.defaults, DEFAULTS);
  const w = createWorld();
  assert.equal(w.t, TUNING);
  const walk = TUNING.walk;
  TUNING.walk = 2;
  assert.equal(w.t.walk, 2);
  TUNING.walk = walk;
});

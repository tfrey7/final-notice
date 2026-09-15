import test from 'node:test';
import assert from 'node:assert/strict';
import { player } from '../src/stage1/moves.mjs';
import { PIPS, SCREEN_W, newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { AREAS, GO_FRAMES, STAGE, areaFor, newStage, stepAreas } from '../src/stage1/areas.mjs';
import { CHECKPOINTS } from '../src/flow.mjs';

const walkRight = { held: new Set(['right']), pressed: new Set(), dash: null };

function stage(who = 'ward', from = 0) {
  const tune = tuneFor(who);
  const world = newStage(newFloor(who, tune), tune, from);
  return { world, tune, p: player(world) };
}

// Holds right for `frames`, untouchable; `clear` knocks every foe off the floor each frame.
function walk(world, tune, frames, { clear = true, until = () => false } = {}) {
  const log = [];
  for (let i = 0; i < frames && !until(); i++) {
    player(world).invuln = 999;
    stepFloor(world, walkRight, tune);
    stepAreas(world, tune);
    for (const e of world.events) {
      log.push(e);
      if (e === 'wave') log.push(`foes:${world.fighters.filter((f) => f.kind).map((f) => f.kind).join(',')}`);
    }
    if (clear) world.fighters = world.fighters.filter((f) => !f.kind);
  }
  return log;
}

test('the stage is four areas of 2, 3, 2 and 1 screens with a checkpoint each, then the office', () => {
  assert.deepEqual(AREAS.map((a) => [a.id, a.screens]), [['reception', 2], ['serviceFloor', 3], ['internalReview', 2], ['waiting', 1]]);
  assert.equal(STAGE.width, 8 * SCREEN_W);
  assert.deepEqual(STAGE.starts, [0, 512, 1280, 1792]);
  assert.equal(CHECKPOINTS.stage1.length, AREAS.length + 1);
  assert.equal(areaFor('stage1-area3'), 2);
  assert.equal(areaFor(null), 0);
});

test('camera locks sit on whole screens, in order, inside their own area', () => {
  const xs = STAGE.locks.map((l) => l.x);
  assert.deepEqual(xs, [0, 256, 768, 1024, 1280, 1536, 1792]);
  for (const l of STAGE.locks) {
    assert.equal(l.x % SCREEN_W, 0);
    assert.ok(l.x >= STAGE.starts[l.area] && l.x < STAGE.starts[l.area] + AREAS[l.area].screens * SCREEN_W);
    for (const w of l.waves) assert.ok(w.foes.length >= 1 && w.foes.length <= 3, 'at most three foes a wave');
  }
});

test('wave scripts: Reception teaches one Associate at a time, then the floor, review and waiting room', () => {
  const waves = (id) => AREAS.find((a) => a.id === id).locks.flatMap((l) => l.waves);
  assert.deepEqual(waves('reception').map((w) => [w.prompt, w.foes]), [['PUNCH', ['associate']], ['STEP', ['associate']], ['THROW', ['associate']]]);
  const floor = waves('serviceFloor').map((w) => w.foes);
  assert.equal(floor.length, 3);
  assert.ok(floor.slice(0, 2).every((w) => w.every((k) => k === 'associate')), 'two waves of Associates');
  assert.deepEqual(floor[2], ['manager']);
  assert.deepEqual(waves('internalReview').flatMap((w) => w.foes).filter((k) => k !== 'associate'), ['counsel', 'supervisor']);
  const waiting = AREAS.find((a) => a.id === 'waiting');
  assert.equal(waves('waiting').length, 1);
  assert.ok(waves('waiting')[0].foes.length <= 2, 'a short wave');
  assert.ok(waiting.firstAid);
  assert.ok(AREAS.flatMap((a) => a.props).length >= 3, 'props to throw');
});

test('the camera holds on a locked screen until its last wave is down, then GO and it scrolls on', () => {
  const { world, tune, p } = stage();
  const log = walk(world, tune, 400, { clear: false });
  assert.deepEqual(log.filter((e) => ['lock', 'wave'].includes(e)), ['lock', 'wave']);
  assert.equal(world.cameraX, 0);
  assert.ok(p.x <= SCREEN_W - 16, `held on screen at ${p.x}`);
  assert.equal(world.run.prompt, 'PUNCH');

  const cleared = walk(world, tune, 3, { until: () => world.run.prompt === 'STEP' });
  assert.ok(cleared.includes('wave'));
  const go = walk(world, tune, 3, { until: () => world.run.go > 0 });
  assert.ok(go.includes('go'));
  assert.ok(world.run.go > 0 && world.run.go <= GO_FRAMES);

  walk(world, tune, 600, { clear: false, until: () => world.run.locked });
  assert.equal(world.cameraX, 256);
  assert.equal(world.run.prompt, 'THROW');
  walk(world, tune, 300, { clear: false });
  assert.equal(world.cameraX, 256, 'the second lock holds too');
  assert.ok(p.x >= 256 + 16 && p.x <= 512 - 16);
});

for (const who of ['ward', 'mercer']) {
  test(`${who} walks the whole stage: checkpoints, remarks, first aid, every wave, then the office door`, () => {
    const { world, tune, p } = stage(who);
    p.hp = 2;
    const log = walk(world, tune, 6000, { until: () => world.run.done });
    assert.ok(world.run.done, `stuck at x ${p.x}, camera ${world.cameraX}`);
    assert.deepEqual(log.filter((e) => e.startsWith('checkpoint:')), CHECKPOINTS.stage1.slice(0, 4).map((c) => `checkpoint:${c}`));
    assert.deepEqual(log.filter((e) => e.startsWith('remark:')), ['remark:reception', 'remark:firstAid']);
    assert.equal(log.filter((e) => e === 'lock').length, STAGE.locks.length);
    assert.equal(log.filter((e) => e === 'go').length, STAGE.locks.length);
    const spawned = log.filter((e) => e.startsWith('foes:')).map((e) => e.slice(5));
    assert.deepEqual(spawned, STAGE.locks.flatMap((l) => l.waves.map((w) => w.foes.join(','))));
    assert.equal(p.hp, Math.min(PIPS, 2 + 4));
    assert.equal(log.at(-1), 'toOffice');
  });
}

test('a restart at a checkpoint puts the auditor at that area with the earlier locks cleared', () => {
  const { world, tune, p } = stage('ward', 2);
  assert.equal(p.x, 1280 + 48);
  assert.equal(world.cameraX, 1280);
  assert.equal(STAGE.locks[world.run.lock].x, 1280);
  const log = walk(world, tune, 5, { clear: false });
  assert.deepEqual(log.slice(0, 3), ['checkpoint:stage1-area3', 'lock', 'wave']);
  assert.ok(world.fighters.some((f) => f.kind === 'counsel'));
});

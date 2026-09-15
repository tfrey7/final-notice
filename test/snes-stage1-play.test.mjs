import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTune } from '../src/stage1/moves.mjs';
import { newFloor, tuneFor } from '../src/stage1/player.mjs';
import { STAGE, newStage } from '../src/stage1/areas.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { FINISHER_FRAMES, SCALED, endsArea, finisherFrame, finisherTarget, livingFoes, scaledTune } from '../src/snes/stage1/finisher.mjs';

test('one scale factor grows every pixel number and leaves times and damage alone', () => {
  const base = tuneFor('ward', defaultTune());
  const big = scaledTune(base, 1.5);
  for (const k of SCALED) assert.equal(big[k], base[k] * 1.5, k);
  for (const k of ['hitStop', 'punchStartup', 'punchDamage', 'playerHp']) assert.equal(big[k], base[k], k);
  assert.deepEqual(scaledTune(base, 1), base);
  assert.equal(STAGE1.scale, 1.5);
});

test('a jump keeps its airtime when scaled: speed and gravity grow together', () => {
  const base = defaultTune();
  const big = scaledTune(base, 1.5);
  assert.equal(big.jumpUp / big.gravity, base.jumpUp / base.gravity);
});

test('only the last lock of each area ends it', () => {
  const ends = STAGE.locks.map((_, i) => endsArea(i));
  const lastPerArea = STAGE.locks.map((l, i) => STAGE.locks[i + 1]?.area !== l.area);
  assert.deepEqual(ends, lastPerArea);
  assert.equal(ends.filter(Boolean).length, 4);
  assert.equal(endsArea(STAGE.locks.length), false);
});

function lockedOn(lockIndex) {
  const tune = tuneFor('ward');
  const world = newStage(newFloor('ward', tune), tune, STAGE.locks[lockIndex].area);
  const foe = { id: 'f1', kind: 'associate', team: 'foe', state: 'hurt', hp: 1 };
  world.fighters.push(foe);
  Object.assign(world.run, { lock: lockIndex, locked: true, wave: STAGE.locks[lockIndex].waves.length - 1 });
  return { world, foe };
}

test('the finisher fires on the last foe of an area, on the frame it is knocked out', () => {
  const last = STAGE.locks.findIndex((_, i) => endsArea(i));
  const { world, foe } = lockedOn(last);
  const before = livingFoes(world);
  assert.equal(finisherTarget(world, before), null, 'still standing');
  foe.state = 'ko';
  assert.equal(finisherTarget(world, before), foe);
});

test('no finisher mid-area, on an earlier wave, with foes on the bench or two foes standing', () => {
  const mid = STAGE.locks.findIndex((_, i) => !endsArea(i));
  let { world, foe } = lockedOn(mid);
  let before = livingFoes(world);
  foe.state = 'ko';
  assert.equal(finisherTarget(world, before), null, 'not the area-ending lock');

  const last = STAGE.locks.findIndex((l, i) => endsArea(i) && l.waves.length > 1);
  if (last >= 0) {
    ({ world, foe } = lockedOn(last));
    world.run.wave = 0;
    before = livingFoes(world);
    foe.state = 'ko';
    assert.equal(finisherTarget(world, before), null, 'earlier wave');
  }

  ({ world, foe } = lockedOn(STAGE.locks.findIndex((_, i) => endsArea(i))));
  world.bench = ['associate'];
  before = livingFoes(world);
  foe.state = 'ko';
  assert.equal(finisherTarget(world, before), null, 'bench waiting');

  ({ world, foe } = lockedOn(STAGE.locks.findIndex((_, i) => endsArea(i))));
  world.fighters.push({ id: 'f2', kind: 'associate', team: 'foe', state: 'idle', hp: 3 });
  before = livingFoes(world);
  foe.state = 'ko';
  assert.equal(finisherTarget(world, before), null, 'another foe standing');
});

test('the throw grows through four sizes toward the middle and ends after its frames', () => {
  const steps = Array.from({ length: FINISHER_FRAMES }, (_, t) => finisherFrame(t));
  assert.deepEqual([...new Set(steps.map((s) => s.scale))], [1, 1.75, 3, 5]);
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i].scale >= steps[i - 1].scale && steps[i].toward >= steps[i - 1].toward);
  assert.equal(steps.filter((s) => s.impact).length, 1);
  assert.ok(steps.every((s) => !s.done));
  assert.equal(finisherFrame(FINISHER_FRAMES).done, true);
});

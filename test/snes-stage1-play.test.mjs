import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTune, set } from '../src/stage1/moves.mjs';
import { newFloor, tuneFor } from '../src/stage1/player.mjs';
import { STAGE, newStage } from '../src/stage1/areas.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { KINDS, spawnStaff, spot, thinkStaff } from '../src/stage1/staff.mjs';
import { BRAWL_WEIGHT } from '../src/snes/weight.mjs';
import { FINISHER_FRAMES, SCALED, endsArea, finisherFrame, finisherTarget, livingFoes, scaledTune } from '../src/snes/stage1/finisher.mjs';

test('one scale factor grows every pixel number and leaves times and damage alone', () => {
  const base = tuneFor('ward', defaultTune());
  const big = scaledTune(base, 1.5);
  for (const k of SCALED) assert.equal(big[k], base[k] * 1.5, k);
  for (const k of ['hitStop', 'punchStartup', 'punchDamage', 'playerHp']) assert.equal(big[k], base[k], k);
  const { kinds, vellum, crowd, ...same } = scaledTune(base, 1);
  assert.deepEqual(same, base);
  assert.equal(STAGE1.scale, 1.5);
});

test('the SNES staff foes stand and reach 1.5x as far and swing at the brawl weight; the NES keeps its numbers', () => {
  const nes = structuredClone(KINDS);
  const { kinds } = scaledTune(defaultTune(), STAGE1.scale);
  const a = kinds.associate;
  assert.equal(a.reach, nes.associate.reach * 1.5);
  assert.equal(a.stand, nes.associate.stand * 1.5);
  assert.equal(a.speed, nes.associate.speed * BRAWL_WEIGHT.scale.foeSpeed * 1.5);
  assert.equal(a.windup, nes.associate.windup + BRAWL_WEIGHT.frames.foeWindup);
  assert.equal(a.cooldown, nes.associate.cooldown + BRAWL_WEIGHT.frames.foeCooldown);
  assert.equal(a.hp, nes.associate.hp);
  assert.equal(kinds.manager.flank, nes.manager.flank * 1.5);
  assert.equal(kinds.counsel.keep, nes.counsel.keep * 1.5);
  assert.equal(kinds.counsel.near, nes.counsel.near * 1.5);
  assert.deepEqual(KINDS, nes);

  const p = { x: 200, y: 180, facing: 1 };
  const f = { kind: 'associate', x: 260, y: 180 };
  assert.equal(spot(f, p, { kinds }).x - p.x, nes.associate.stand * 1.5);
  assert.equal(spot(f, p).x - p.x, nes.associate.stand);
  assert.equal(spot(f, p, defaultTune()).x - p.x, nes.associate.stand);
});

test('an SNES Associate given the attack turn stands in and swings on his weighed wind-up', () => {
  const tune = scaledTune(tuneFor('ward', defaultTune()), STAGE1.scale);
  const world = newFloor('ward', tune);
  world.fighters = [world.fighters.find((f) => f.team === 'player')];
  Object.assign(world, { bench: [], tapes: [] });
  const p = world.fighters[0];
  spawnStaff(world, ['associate'], tune);
  const a = world.fighters.find((f) => f.kind === 'associate');
  Object.assign(a, { x: p.x + 90, y: p.y, cooldown: 1000 });
  for (let t = 0; t < 600 && a.state !== 'windup'; t++) thinkStaff(world, a, tune);
  assert.equal(a.state, 'windup');
  assert.ok(a.x - p.x <= tune.kinds.associate.reach, `${a.x - p.x} px out`);
  set(a, 'idle');
  let wound = null;
  for (let t = 0; t < 200 && a.state !== 'punch'; t++) {
    thinkStaff(world, a, tune);
    if (a.state === 'windup' && wound === null) wound = t;
    if (a.state === 'punch') assert.equal(t - wound, tune.kinds.associate.windup);
  }
  assert.equal(a.state, 'punch');
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

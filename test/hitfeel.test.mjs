import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTune, fighter, hitFeel, landHit, step } from '../src/stage1/moves.mjs';
import { comboRating, comboScale, routeLights } from '../src/stage1/combo.mjs';
import { tuneFor } from '../src/stage1/player.mjs';
import { BRAWL_WEIGHT, weighed } from '../src/snes/weight.mjs';

const snes = () => weighed(tuneFor('ward'), BRAWL_WEIGHT);
const idle = { held: new Set(), pressed: new Set(), dash: null };

function hitOnce(tune, blow) {
  const foe = Object.assign(fighter('foe', 'foe', 120, 190, tune), { cooldown: 999 });
  const world = { frame: 0, hitStop: 0, shake: 0, events: [], noWaves: true, fighters: [fighter('player', 'player', 100, 190, tune), foe] };
  assert.ok(landHit(world, foe, { damage: 1, dir: 1, ...blow }, tune));
  return { world, foe };
}

test('the SNES freeze grows from a light jab to a heavy blow, and a finisher holds at least as long', () => {
  const tune = snes();
  const stops = ['light', 'heavy', 'finisher'].map((w) => hitFeel(w, tune).stop);
  assert.ok(stops[0] >= 2 && stops[0] < stops[1] && stops[1] <= stops[2], stops.join(' '));
  assert.equal(hitOnce(tune, {}).world.hitStop, tune.hitStop);
  assert.equal(hitOnce(tune, { weight: 'heavy' }).world.hitStop, tune.hitStopHeavy);
  assert.equal(hitOnce(tune, { heavy: true }).world.hitStop, tune.hitStopFinish);
});

test('knockback grows with the weight, and only a finisher knocks down', () => {
  const tune = snes();
  const light = hitOnce(tune, {}).foe;
  const heavy = hitOnce(tune, { weight: 'heavy' }).foe;
  const fin = hitOnce(tune, { heavy: true }).foe;
  assert.equal(light.state, 'hurt');
  assert.equal(heavy.state, 'hurt');
  assert.equal(fin.state, 'knockdown');
  assert.equal(light.vx, tune.knockback);
  assert.ok(light.vx < heavy.vx && light.vx < fin.vx, `${light.vx} ${heavy.vx} ${fin.vx}`);
  assert.equal(heavy.vx, tune.heavyPush);
  assert.equal(fin.vx, tune.launchX);
  assert.ok(fin.vz > 0);
});

test('a light jab never shakes the screen; heavy blows and finishers do', () => {
  const tune = snes();
  assert.equal(hitOnce(tune, {}).world.shake, 0);
  assert.ok(hitOnce(tune, { weight: 'heavy' }).world.shake > 0);
  assert.equal(hitOnce(tune, { heavy: true }).world.shake, tune.shakeFrames);
});

test('the NES keeps its old freeze and never flashes', () => {
  const tune = defaultTune();
  assert.equal(hitOnce(tune, { heavy: true }).world.hitStop, tune.hitStopHeavy);
  assert.equal(hitOnce(tune, {}).foe.hitFlash, 0);
});

test('a hit flashes the foe past the freeze and bursts a spark that fades', () => {
  const tune = snes();
  const { world, foe } = hitOnce(tune, { weight: 'heavy' });
  assert.equal(world.sparks.length, 1);
  const frozen = world.hitStop;
  for (let i = 0; i < frozen + 1; i++) step(world, idle, tune);
  assert.ok(foe.hitFlash > 0 && foe.hitFlash < tune.hitFlashFrames);
  for (let i = 0; i < 40; i++) step(world, idle, tune);
  assert.equal(foe.hitFlash, 0);
  assert.equal(world.sparks.length, 0);
});

test('the combo counts landed blows, drops on its timer, and breaks when the auditor is hit', () => {
  const tune = snes();
  const { world, foe } = hitOnce(tune, {});
  foe.state = 'idle';
  landHit(world, foe, { damage: 0, dir: 1 }, tune);
  assert.equal(world.combo.hits, 2);
  const p = world.fighters[0];
  landHit(world, p, { damage: 0, dir: -1 }, tune);
  assert.equal(world.combo.hits, 0);
  foe.state = 'idle';
  landHit(world, foe, { damage: 0, dir: 1 }, tune);
  const frames = tune.comboDrop + world.hitStop + 1;
  for (let i = 0; i < frames; i++) step(world, idle, tune);
  assert.equal(world.combo.hits, 0);
  assert.equal(world.combo.best, 2);
});

test('the rating word and the pop grow with the combo', () => {
  assert.equal(comboRating(2), '');
  assert.equal(comboRating(5), 'GREAT');
  assert.equal(comboRating(20), 'AUDITED!');
  assert.ok(comboScale({ hits: 1, pop: 0 }) > comboScale({ hits: 1, pop: 20 }));
  assert.ok(comboScale({ hits: 8, pop: 20 }) > comboScale({ hits: 1, pop: 20 }));
});

test('the route map lights the routes the chain is on', () => {
  const tune = snes();
  const lit = (p) => Object.fromEntries(routeLights(p, tune).map((r) => [r.name, r.lit]));
  assert.deepEqual(lit({ state: 'punch', combo: 2 }), { FINISHER: 2, KNOCKBACK: 2, LAUNCHER: 0, CRUSH: 0 });
  assert.deepEqual(lit({ state: 'heavy', route: 'launcher' }), { FINISHER: 0, KNOCKBACK: 0, LAUNCHER: 2, CRUSH: 0 });
  assert.deepEqual(lit({ state: 'idle', chain: 0 }), { FINISHER: 0, KNOCKBACK: 0, LAUNCHER: 0, CRUSH: 0 });
  assert.equal(routeLights({ state: 'idle' }, { ...tune, routeLH: 0 }).find((r) => r.name === 'LAUNCHER').on, false);
});

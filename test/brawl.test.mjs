import test from 'node:test';
import assert from 'node:assert/strict';
import { TUNING, defaultTune, fighter, landHit, player, step } from '../src/brawl.mjs';

// A player squared up to one foe that never swings.
function duel(tune) {
  const p = fighter('player', 'player', 100, 188, tune);
  const foe = fighter('foe', 'foe', 112, 188, tune);
  foe.cooldown = 1e9;
  foe.hp = 99;
  return { frame: 0, hitStop: 0, shake: 0, events: [], wave: 1, waveTimer: 0, fighters: [p, foe] };
}

const idle = { held: new Set(), pressed: new Set(), dash: null };
const press = (...b) => ({ held: new Set(b), pressed: new Set(b), dash: null });

// Steps `frames` frames, pressing B on the listed frames; answers each frame's record.
function play(world, tune, frames, bFrames = []) {
  const log = [];
  for (let i = 0; i < frames; i++) {
    step(world, bFrames.includes(i) ? press('b') : idle, tune);
    const p = player(world);
    log.push({ state: p.state, combo: p.combo, t: p.t, events: world.events, hitStop: world.hitStop, foe: world.fighters[1] && { ...world.fighters[1] } });
  }
  return log;
}

test('every tuning entry is a value inside its own slider range', () => {
  for (const [key, [v, min, max, stepSize]] of Object.entries(TUNING)) {
    assert.ok(min <= v && v <= max && stepSize > 0, key);
  }
  assert.ok(defaultTune().hitStop >= 2 && defaultTune().hitStopHeavy <= 4, 'hits freeze 2-4 frames');
});

test('a press buffered during a landing punch chains straight into the next, up to the finisher', () => {
  const tune = defaultTune();
  const world = duel(tune);
  const log = play(world, tune, 60, [0, 2, 14]);
  const combos = [...new Set(log.filter((r) => r.state === 'punch').map((r) => r.combo))];
  assert.deepEqual(combos, [1, 2, 3]);
  const firstIdle = log.findIndex((r) => r.state !== 'punch');
  assert.ok(log.slice(0, firstIdle).every((r) => r.state === 'punch'), 'no idle gap between the three punches');
  assert.ok(log.some((r) => r.events.includes('heavy')), 'the third hit is heavy');
  assert.ok(['knockdown', 'down'].includes(world.fighters[1].state));
});

test('the whole combo connects when it starts at the edge of reach', () => {
  const tune = defaultTune();
  const world = duel(tune);
  world.fighters[1].x = 100 + tune.punchReach - 1;
  const log = play(world, tune, 60, [0, 8, 20, 32]);
  assert.equal(log.filter((r) => r.events.includes('hit') || r.events.includes('heavy')).length, 3);
});

test('a press older than the buffer is dropped, and the combo restarts', () => {
  const tune = { ...defaultTune(), bufferFrames: 0 };
  const log = play(duel(tune), tune, 40, [0, 2]);
  assert.deepEqual([...new Set(log.filter((r) => r.state === 'punch').map((r) => r.combo))], [1]);
});

test('a press after the combo window starts over at the first punch', () => {
  const tune = defaultTune();
  const late = 3 + 2 + 7 + 3 + tune.comboWindow + 5;
  const log = play(duel(tune), tune, late + 10, [0, late]);
  assert.deepEqual(log.filter((r) => r.state === 'punch' && r.t === 0).map((r) => r.combo), [1, 1]);
});

for (const hitStop of [2, 4]) {
  test(`a hit freezes the whole fight for exactly ${hitStop} frames`, () => {
    const tune = { ...defaultTune(), hitStop };
    const log = play(duel(tune), tune, 20, [0]);
    const hit = log.findIndex((r) => r.events.includes('hit'));
    assert.ok(hit >= 0);
    const frozen = log.slice(hit + 1, hit + 1 + hitStop);
    assert.ok(frozen.every((r) => r.t === log[hit].t && r.foe.x === log[hit].foe.x), 'nothing moves during hit-stop');
    assert.notEqual(log[hit + 1 + hitStop].t, log[hit].t, 'the fight resumes on the next frame');
  });
}

test('a foe getting up is untouchable, then blinks invulnerable for invulnFrames', () => {
  const tune = defaultTune();
  const world = duel(tune);
  const foe = world.fighters[1];
  assert.equal(landHit(world, foe, { damage: 1, heavy: true, dir: 1 }, tune), true);
  let frames = 0;
  while (foe.state !== 'idle' && frames++ < 200) {
    if (['down', 'getup'].includes(foe.state)) assert.equal(landHit(world, foe, { damage: 1, heavy: false, dir: 1 }, tune), false);
    step(world, idle, tune);
  }
  assert.equal(foe.invuln, tune.invulnFrames);
  assert.equal(landHit(world, foe, { damage: 1, heavy: false, dir: 1 }, tune), false, 'still invulnerable');
  for (let i = 0; i < tune.invulnFrames; i++) step(world, idle, tune);
  assert.equal(foe.invuln, 0);
  assert.equal(landHit(world, foe, { damage: 1, heavy: false, dir: 1 }, tune), true);
});

test('B on a reeling foe grabs it, B knees, and a direction with B throws it down', () => {
  const tune = defaultTune();
  const world = duel(tune);
  const foe = world.fighters[1];
  landHit(world, foe, { damage: 0, heavy: false, dir: 0 }, tune);
  world.hitStop = 0;
  step(world, press('b'), tune);
  assert.equal(player(world).state, 'grab');
  assert.equal(foe.state, 'held');
  step(world, press('b'), tune);
  assert.equal(foe.state, 'held', 'a knee keeps hold');
  assert.equal(foe.hp, 99 - tune.kneeDamage);
  while (world.hitStop > 0) step(world, idle, tune);
  step(world, { held: new Set(['left', 'b']), pressed: new Set(['b']), dash: null }, tune);
  assert.equal(player(world).state, 'throw');
  assert.equal(foe.state, 'knockdown');
  assert.ok(foe.vx < 0 && world.shake > 0);
});

test('a thrown foe bowls over the foe it flies into', () => {
  const tune = defaultTune();
  const world = duel(tune);
  const other = fighter('foe2', 'foe', 130, 188, tune);
  other.cooldown = 1e9;
  world.fighters.push(other);
  landHit(world, world.fighters[1], { damage: 0, heavy: true, dir: 1 }, tune);
  for (let i = 0; i < 30 && other.state !== 'knockdown'; i++) step(world, idle, tune);
  assert.equal(other.state, 'knockdown');
});

test('the jump is a committed arc: steering mid-air changes nothing', () => {
  const tune = defaultTune();
  const world = duel(tune);
  world.fighters.pop();
  step(world, { held: new Set(['a', 'right']), pressed: new Set(['a']), dash: null }, tune);
  const p = player(world);
  let peak = 0;
  while (p.state === 'jump') {
    step(world, { held: new Set(['left']), pressed: new Set(), dash: null }, tune);
    peak = Math.max(peak, p.z);
  }
  assert.ok(p.x > 100, 'kept drifting right');
  assert.ok(peak > 15 && peak < 30, `apex ${peak}`);
});

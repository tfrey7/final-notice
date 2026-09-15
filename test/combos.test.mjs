import test from 'node:test';
import assert from 'node:assert/strict';
import { player } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { freeInjunction } from '../src/injunction.mjs';
import { PADS, createPad, updatePad } from '../src/input.mjs';

const pad = (pressed = [], extra = {}) => ({ held: new Set(), pressed: new Set(pressed), step: 0, ...extra });

// The auditor squared up to a tough dummy `gap` px ahead, or behind with a negative gap.
function floor(who = 'ward', gap = 8, dials = {}) {
  const tune = { ...tuneFor(who), ...dials };
  const world = newFloor(who, tune);
  world.fighters = world.fighters.filter((f) => f.id !== 'spar');
  const p = player(world);
  Object.assign(p, { x: 100, y: 188 });
  const dummy = world.fighters.find((f) => f.dummy);
  Object.assign(dummy, { x: 100 + gap, y: 188, hp: 99 });
  return { world, tune, p, dummy };
}

// Presses `buttons[i]` on frame `at[i]`; answers every event and the highest combo count reached.
function play(ctx, script, frames = 70) {
  const events = [];
  let top = 0;
  for (let i = 0; i < frames; i++) {
    const hit = script.find(([at]) => at === i);
    stepFloor(ctx.world, hit ? pad([hit[1]]) : pad(), ctx.tune);
    events.push(...ctx.world.events);
    if (ctx.p.state === 'punch') top = Math.max(top, ctx.p.combo);
  }
  return { events, top };
}

test('light, light, light chains three punches', () => {
  assert.equal(play(floor(), [[0, 'b'], [5, 'b'], [13, 'b']]).top, 3);
});

test('light then heavy is the launcher; light, light, heavy the knockback', () => {
  assert.ok(play(floor(), [[0, 'b'], [5, 'heavy']]).events.includes('launcher'));
  assert.ok(play(floor(), [[0, 'b'], [5, 'b'], [13, 'heavy']]).events.includes('knockback'));
});

test('a heavy on a dazed foe crushes him for the big damage', () => {
  const ctx = floor();
  Object.assign(ctx.dummy, { state: 'hurt', stagger: 48, t: 0 });
  const { events } = play(ctx, [[0, 'heavy']]);
  assert.ok(events.includes('crush'));
  assert.equal(ctx.dummy.hp, 99 - ctx.tune.dazedDamage);
});

test('a route dial at 0 turns that route off', () => {
  assert.ok(!play(floor('ward', 8, { routeLH: 0 }), [[0, 'b'], [5, 'heavy']]).events.includes('launcher'));
  assert.equal(play(floor('ward', 8, { routeLLL: 0 }), [[0, 'b'], [5, 'b'], [13, 'b']]).top, 2);
});

test('A is each auditor\'s own special: Ward lunges through a foe ahead, Mercer sweeps one behind', () => {
  const ward = floor('ward', 40);
  const x = ward.p.x;
  stepFloor(ward.world, pad([], { special: true }), ward.tune);
  assert.equal(ward.p.state, 'special');
  for (let i = 0; i < 30; i++) stepFloor(ward.world, pad(), ward.tune);
  assert.ok(ward.p.x > x + 20, 'Ward travels');
  assert.ok(['knockdown', 'down'].includes(ward.dummy.state), ward.dummy.state);

  const mercer = floor('mercer', -20);
  stepFloor(mercer.world, pad([], { special: true }), mercer.tune);
  for (let i = 0; i < 30; i++) stepFloor(mercer.world, pad(), mercer.tune);
  assert.ok(['knockdown', 'down'].includes(mercer.dummy.state), mercer.dummy.state);
});

test('Y then X a frame apart clears the room and cancels the light it began', () => {
  const ctx = floor('ward', 40);
  ctx.world.cooldown = freeInjunction();
  let events = [];
  [['y'], ['y', 'x']].reduce((p, down, f) => {
    const next = updatePad(p, new Set(down), f);
    stepFloor(ctx.world, next, ctx.tune);
    events = [...events, ...ctx.world.events];
    return next;
  }, createPad(PADS.snes));
  assert.ok(events.includes('injunction'));
  assert.notEqual(ctx.p.state, 'punch');
  assert.ok(ctx.world.cooldown.left > 0, 'same cooldown as before');
});

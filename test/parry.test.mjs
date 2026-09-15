import test from 'node:test';
import assert from 'node:assert/strict';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { KINDS, spawnStaff } from '../src/stage1/staff.mjs';
import { PADS, createPad, updatePad } from '../src/input.mjs';

const pad = (parry = false) => ({ held: new Set(), pressed: new Set(), parry, step: 0 });

// The auditor alone with one Associate squared up, `lead` frames from his blow landing.
function squaredUp(lead) {
  const tune = tuneFor('ward');
  const world = newFloor('ward', tune);
  world.fighters = [world.fighters.find((f) => f.team === 'player')];
  Object.assign(world, { bench: [], tapes: [] });
  const p = world.fighters[0];
  spawnStaff(world, ['associate'], tune);
  const a = world.fighters.find((f) => f.kind === 'associate');
  Object.assign(a, { x: p.x + 16, y: p.y, facing: -1, state: 'windup', t: KINDS.associate.windup - lead, cooldown: 0 });
  return { tune, world, p, a };
}

function run(world, tune, frames, press = () => false) {
  const events = [];
  for (let i = 0; i < frames; i++) events.push(...stepFloor(world, pad(press(i)), tune).events);
  return events;
}

test('X pressed just before a blow lands deflects it: no damage, a freeze and flash, the attacker staggered', () => {
  const { tune, world, p, a } = squaredUp(4);
  const hp = p.hp;
  const events = run(world, tune, 6, (i) => i === 0);
  assert.ok(events.includes('parry'));
  assert.equal(p.hp, hp);
  assert.equal(a.state, 'hurt');
  assert.equal(a.stagger, tune.parryStagger);
  assert.ok(world.flash > 0);
  assert.ok(world.hitStop > 0);
});

test('X pressed too early lets the blow land', () => {
  const { tune, world, p } = squaredUp(tune0().parryFrames + 4);
  const hp = p.hp;
  const events = run(world, tune, tune.parryFrames + 6, (i) => i === 0);
  assert.ok(!events.includes('parry'));
  assert.ok(p.hp < hp);
});

test('a whiffed parry locks out the next press, so mashing does not parry', () => {
  const { tune, world, p } = squaredUp(200);
  run(world, tune, 1, () => true);
  assert.equal(p.parry, tune.parryFrames);
  run(world, tune, tune.parryFrames + 2, (i) => i === tune.parryFrames + 1);
  assert.equal(p.parry, 0);
  run(world, tune, tune.parryLockout, () => false);
  run(world, tune, 1, () => true);
  assert.equal(p.parry, tune.parryFrames);
});

test('a staggered foe stays open far longer than a plain hit stuns him', () => {
  const { tune, world, a } = squaredUp(1);
  run(world, tune, 2, (i) => i === 0);
  let open = 0;
  while (a.state === 'hurt' && open < 500) {
    const frozen = world.hitStop > 0;
    stepFloor(world, pad(), tune);
    if (!frozen) open++;
  }
  assert.ok(open >= tune.parryStagger - 2, `open ${open}`);
  assert.ok(open > tune.hitstun * 2);
});

test('the SNES L shoulder is the parry, X is not; the NES pad has none', () => {
  const snes = updatePad(createPad(PADS.snes), new Set(['l']));
  assert.equal(snes.parry, true);
  assert.equal(updatePad(createPad(PADS.snes), new Set(['x'])).parry, false);
  let nes = createPad(PADS.nes);
  nes = updatePad(nes, new Set(['select']));
  assert.ok(!nes.parry);
});

function tune0() {
  return tuneFor('ward');
}

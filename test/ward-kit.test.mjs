import test from 'node:test';
import assert from 'node:assert/strict';
import { fighter, landHit } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { PADS, createPad, updatePad } from '../src/input.mjs';

const pad = ({ held = [], pressed = [], heavy = false, block = false, parry = false } = {}) => ({
  held: new Set(held), pressed: new Set(pressed), heavy, block, parry, step: 0,
});

// The auditor alone with one foe who never swings, a step in front of him.
function squaredUp(who = 'ward') {
  const tune = tuneFor(who);
  const world = newFloor(who, tune);
  const p = world.fighters.find((f) => f.team === 'player');
  const foe = Object.assign(fighter('foe', 'foe', p.x + 20, p.y, tune), { dummy: true, facing: -1, hp: 30 });
  world.fighters = [p, foe];
  world.props = [];
  return { tune, world, p, foe };
}

test('the SNES L held is the block, and a press still reads as the parry', () => {
  const held = updatePad(updatePad(createPad(PADS.snes), new Set(['l'])), new Set(['l']));
  assert.equal(held.block, true);
  assert.equal(held.parry, false);
});

test('Ward blocks while L is held: a light blow from in front costs only banked chip', () => {
  const { tune, world, p, foe } = squaredUp();
  stepFloor(world, pad({ block: true }), tune);
  assert.equal(p.state, 'block');
  const hp = p.hp;
  const perPip = Math.round(1 / tune.blockChip);
  for (let i = 0; i < perPip - 1; i++) landHit(world, p, { damage: 1, heavy: false, dir: -1, from: foe }, tune);
  assert.equal(p.hp, hp);
  assert.equal(p.state, 'block');
  landHit(world, p, { damage: 1, heavy: false, dir: -1, from: foe }, tune);
  assert.equal(p.hp, hp - 1, `${perPip} blocked light blows of chip make one pip`);
  assert.equal(foe.recoil, tune.blockRecoil, "the blocked foe's recovery runs long, open to a punish");
  assert.ok(tune.blockRecoil < tune.parryStagger, "a block's punish is shorter than a parry's");
  world.hitStop = 0;
  stepFloor(world, pad(), tune);
  assert.equal(p.state, 'idle');
});

test("a heavy blow breaks Ward's block and leaves him open", () => {
  const { tune, world, p, foe } = squaredUp();
  stepFloor(world, pad({ block: true }), tune);
  landHit(world, p, { damage: 2, heavy: true, dir: -1, from: foe }, tune);
  assert.equal(p.state, 'hurt');
  assert.equal(p.stagger, tune.blockStun);
  assert.ok(world.events.includes('guardBreak'));
});

test('a block held too long breaks by itself, and cannot go straight back up', () => {
  const { tune, world, p } = squaredUp();
  const events = [];
  for (let i = 0; i <= tune.blockMax + 1 && p.state !== 'hurt'; i++) events.push(...stepFloor(world, pad({ block: true }), tune).events);
  assert.ok(events.includes('guardBreak'));
  assert.ok(p.blockLock > 0);
});

test('Mercer has no block: L is his parry', () => {
  const { tune, world, p } = squaredUp('mercer');
  stepFloor(world, pad({ block: true, parry: true }), tune);
  assert.notEqual(p.state, 'block');
  assert.equal(p.parry, tune.parryFrames);
});

// Up + heavy, the jump out of the launcher, two air lights and the air heavy: what a player presses.
function airCombo(who) {
  const { tune, world, p, foe } = squaredUp(who);
  const seen = [];
  let lights = 0;
  for (let i = 0; i < 240; i++) {
    let input = pad();
    if (i === 0) input = pad({ held: ['up'], heavy: true });
    else if (p.state === 'heavy' && p.landed && foe.juggle) input = pad({ pressed: ['a'] });
    else if (p.state === 'jump' && foe.juggle && i % 4 === 0) input = lights < 2 ? pad({ pressed: ['b'] }) : pad({ heavy: true });
    const events = stepFloor(world, input, tune).events;
    lights += events.filter((e) => e === 'airHit').length;
    seen.push(...events);
    if (seen.includes('slam') && foe.state === 'down') break;
  }
  return { seen, foe, tune };
}

test("Ward's up + heavy launches a foe, two air lights keep him up, the air heavy slams him down", () => {
  const { seen, foe, tune } = airCombo('ward');
  assert.ok(seen.includes('launcher'), seen.join());
  assert.equal(seen.filter((e) => e === 'airHit').length, 2, seen.join());
  assert.ok(seen.includes('slam'), seen.join());
  assert.equal(foe.state, 'down');
  assert.equal(foe.hp, 30 - tune.launcherDamage - 2 * tune.airDamage - tune.slamDamage);
});

test('Mercer has no launcher or air combo', () => {
  const { seen } = airCombo('mercer');
  assert.ok(!seen.includes('airHit') && !seen.includes('slam'), seen.join());
});

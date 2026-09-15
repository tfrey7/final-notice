import test from 'node:test';
import assert from 'node:assert/strict';
import { landHit, player } from '../src/stage1/moves.mjs';
import { AUDITORS, STEP, animFor, newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { hudLayout, HUD_HEIGHT } from '../src/hud.mjs';
import { WIDTH, SAFE } from '../src/nes/screen.mjs';

const pad = (held = [], pressed = [], dash = null) => ({ held: new Set(held), pressed: new Set(pressed), dash });
const idle = pad();

// A floor with the player at (x, y), the dummy at (dx, y) and no sparring foe.
function floor(who, x, dx, y = 188) {
  const tune = tuneFor(who);
  const world = newFloor(who, tune);
  world.fighters = world.fighters.filter((f) => f.id !== 'spar');
  const p = player(world);
  Object.assign(p, { x, y });
  Object.assign(world.fighters.find((f) => f.dummy), { x: dx, y });
  return { world, tune, p, dummy: () => world.fighters.find((f) => f.dummy) };
}

function run(world, tune, frames, input = () => idle) {
  const events = [];
  for (let i = 0; i < frames; i++) {
    stepFloor(world, input(i), tune);
    events.push(...world.events);
  }
  return events;
}

test('Ward reaches further than Mercer, and each ends the combo on his own finisher', () => {
  for (const [who, lands] of [['ward', true], ['mercer', false]]) {
    const { world, tune, dummy } = floor(who, 100, 122);
    run(world, tune, 20, (i) => (i === 0 ? pad([], ['b']) : idle));
    assert.equal(dummy().hp < tune.foeHp, lands, who);
  }
  assert.notEqual(AUDITORS.ward.finisher, AUDITORS.mercer.finisher);
  assert.ok(tuneFor('mercer').finisherStartup < tuneFor('ward').finisherStartup, 'Mercer\'s finisher comes out sooner');
  assert.equal(tuneFor('ward').playerHp, 8);
});

test('the auditor walks in all eight directions', () => {
  const { world, tune, p } = floor('ward', 100, 400, 190);
  run(world, tune, 10, () => pad(['up', 'right']));
  assert.ok(p.x > 100 && p.y < 190);
  run(world, tune, 10, () => pad(['down', 'left']));
  assert.ok(p.x < 101 && p.y > 189);
});

test('a double tap is an evasive step: invulnerable, and further than a walk', () => {
  const { world, tune, p } = floor('mercer', 100, 400);
  const events = run(world, tune, 1, () => pad(['right'], ['right'], 'right'));
  assert.equal(p.state, 'step');
  assert.ok(p.invuln > 0 && events.includes('step'));
  run(world, tune, STEP.frames + 1);
  assert.equal(p.state, 'idle');
  assert.ok(p.x - 100 > tune.walkX * (STEP.frames + 2));
});

test('B beside the office chair picks it up; B again throws it and it knocks a foe down, then is gone', () => {
  const { world, tune, p, dummy } = floor('ward', 190, 260, 204);
  const chair = world.props[0];
  run(world, tune, 1, () => pad([], ['b']));
  assert.equal(p.state, 'carry');
  assert.equal(chair.state, 'held');
  const events = run(world, tune, 40, (i) => (i === 2 ? pad([], ['b']) : idle));
  assert.ok(events.includes('throw'));
  assert.ok(['knockdown', 'down', 'getup'].includes(dummy().state), dummy().state);
  assert.equal(chair.state, 'gone');
});

test('grab a reeling dummy, then a direction and B throws it', () => {
  const { world, tune, p, dummy } = floor('ward', 100, 108);
  run(world, tune, 1, () => pad([], ['b']));
  for (let i = 0; i < 40 && p.state !== 'idle'; i++) stepFloor(world, idle, tune);
  assert.equal(dummy().state, 'hurt');
  run(world, tune, 1, () => pad([], ['b']));
  for (let i = 0; i < 4 && p.state !== 'grab'; i++) stepFloor(world, idle, tune);
  assert.equal(p.state, 'grab');
  const events = run(world, tune, 3, (i) => (i === 0 ? pad(['right'], ['b']) : idle));
  assert.ok(events.includes('throw'));
  assert.equal(dummy().state, 'knockdown');
});

test('losing all health costs a life and puts the auditor back at the checkpoint, healed', () => {
  const { world, tune, p } = floor('ward', 400, 900);
  p.hp = 1;
  landHit(world, p, { damage: 1, heavy: false, dir: -1 }, tune);
  const events = run(world, tune, 120);
  assert.ok(events.includes('lifeLost'));
  assert.equal(p.x, world.checkpointX);
  assert.equal(p.hp, 8);
});

test('landed hits fill the injunction meter a segment every four hits', () => {
  const { world, tune, dummy } = floor('ward', 100, 108);
  dummy().hp = 99;
  run(world, tune, 160, (i) => (i % 40 === 0 ? pad([], ['b']) : idle));
  assert.equal(world.meterHits, 4);
  assert.equal(world.meter, 1);
});

test('the floor scrolls with the auditor and never sends waves; the dummy comes back', () => {
  const { world, tune } = floor('ward', 100, 400);
  run(world, tune, 300, () => pad(['right']));
  assert.ok(world.cameraX > 0);
  world.fighters = world.fighters.filter((f) => f.team === 'player');
  run(world, tune, 90);
  assert.equal(world.wave, 0);
  assert.equal(world.fighters.filter((f) => f.team === 'foe').length, 1);
});

test('each auditor has an animation for every state', () => {
  assert.equal(animFor('ward', { state: 'punch', combo: 3 }), 'punch3');
  assert.equal(animFor('ward', { state: 'jump', kicked: true }), 'jumpKick');
  assert.equal(animFor('mercer', { state: 'carry' }), 'mercer.punch');
});

test('the HUD strip has 8 pips, lives and 4 meter segments inside its 24 rows', () => {
  const l = hudLayout({ name: 'ward', hp: 5, lives: 3, meter: 2 });
  assert.equal(l.pips.length, 8);
  assert.equal(l.pips.filter((p) => p.full).length, 5);
  assert.equal(l.meter.filter((m) => m.full).length, 2);
  assert.equal(l.lives.text, 'x3');
  for (const r of [l.portrait, ...l.pips, ...l.meter]) {
    assert.ok(r.x >= 0 && r.x + r.w <= WIDTH && r.y >= SAFE && r.y + r.h <= SAFE + HUD_HEIGHT);
  }
});

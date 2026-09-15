import test from 'node:test';
import assert from 'node:assert/strict';
import { landHit, player, set } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { KINDS, moveOf, spawnStaff } from '../src/stage1/staff.mjs';
import { readout } from '../src/stage1/readout.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';
import { KINDS as SNES_KINDS } from '../src/snes/fight.mjs';

const idle = { held: new Set(), pressed: new Set(), dash: null };
const mash = (i) => ({ held: new Set(), pressed: new Set(i % 2 ? [] : ['b']), dash: null });

function floor(kind) {
  const tune = tuneFor('ward');
  const world = newFloor('ward', tune);
  world.fighters = world.fighters.filter((f) => f.team === 'player');
  spawnStaff(world, [kind], tune);
  const p = Object.assign(player(world), { hp: 999, facing: 1 });
  return { world, tune, p, f: world.fighters.find((o) => o.kind === kind) };
}

function run(world, tune, frames, until = () => false, input = () => idle) {
  const events = [];
  for (let i = 0; i < frames && !until(); i++) {
    stepFloor(world, input(i), tune);
    events.push(...world.events);
  }
  return events;
}

// Stands the foe `gap` px in front of the auditor and starts move `name`'s wind-up.
function windUp(world, p, f, name, gap) {
  Object.assign(f, { x: p.x + gap, y: p.y, facing: -1, cooldown: 0, entering: false, attack: moveOf(KINDS[f.kind], name) });
  set(f, 'windup');
}

const picked = (k) => Object.entries(KINDS[k].moves).filter(([, m]) => (m.weight ?? 1) > 0).map(([n]) => n);

test('each kind has two or three attacks, each with a wind-up long enough to read', () => {
  for (const [kind, k] of Object.entries(KINDS)) {
    const names = Object.keys(k.moves);
    assert.ok(names.length >= 2 && names.length <= 3, `${kind}: ${names}`);
    for (const n of names) assert.ok(moveOf(k, n).windup >= (n === 'counter' ? 10 : 16), `${kind} ${n}`);
  }
  const others = ['manager', 'counsel', 'supervisor'].map((k) => KINDS[k]);
  assert.ok(others.every((k) => KINDS.associate.speed > k.speed && KINDS.associate.hp <= k.hp), 'the Associate is the fast, weak one');
  assert.ok(KINDS.supervisor.guard && KINDS.supervisor.counterAfter);
  assert.ok(KINDS.manager.moves.grab.hold && KINDS.manager.moves.charge.rush);
  assert.ok(Object.values(KINDS.counsel.moves).every((m) => m.shot));
});

test('left to fight, each kind uses every attack it picks from', () => {
  for (const kind of Object.keys(KINDS)) {
    const { world, tune, p, f } = floor(kind);
    const used = new Set();
    for (let t = 0; t < 4000 && used.size < picked(kind).length; t++) {
      stepFloor(world, idle, tune);
      p.hp = 999;
      if (f.state === 'windup' && f.attack) used.add(f.attack.name);
    }
    assert.deepEqual([...used].sort(), picked(kind).sort(), kind);
  }
});

test('the Associate lunges in from a distance', () => {
  const { world, tune, p, f } = floor('associate');
  windUp(world, p, f, 'lunge', 70);
  const hp = p.hp;
  const events = run(world, tune, 80, () => f.state === 'punch');
  assert.ok(events.includes('charge'));
  assert.ok(f.x - p.x < 20, `stopped ${f.x - p.x} px out`);
  assert.equal(p.hp, hp - 1);
});

test('the Supervisor counters a string hammered into his guard, not a single blow', () => {
  const one = floor('supervisor');
  Object.assign(one.f, { x: one.p.x + 16, y: one.p.y, facing: -1, cooldown: 999, entering: false });
  run(one.world, one.tune, 2);
  assert.equal(one.f.state, 'guard');
  landHit(one.world, one.f, { damage: 1, heavy: false, dir: 1 }, one.tune);
  run(one.world, one.tune, 30);
  assert.notEqual(one.f.attack?.name, 'counter', 'one blocked punch goes unpunished');

  const two = floor('supervisor');
  const { world, tune, p, f } = two;
  Object.assign(f, { x: p.x + 16, y: p.y, facing: -1, cooldown: 999, entering: false });
  run(world, tune, 2);
  landHit(world, f, { damage: 1, heavy: false, dir: 1 }, tune);
  landHit(world, f, { damage: 1, heavy: false, dir: 1 }, tune);
  assert.equal(f.hp, KINDS.supervisor.hp, 'both blocked');
  run(world, tune, 40, () => f.state === 'punch');
  assert.equal(f.attack?.name, 'counter');
  assert.equal(p.state, 'knockdown');
});

test('the Manager grabs, squeezes and throws; mashing breaks his grip first', () => {
  const held = floor('manager');
  windUp(held.world, held.p, held.f, 'grab', 14);
  const grabbed = run(held.world, held.tune, 40, () => held.f.state === 'hold');
  assert.ok(grabbed.includes('grabbed'));
  assert.equal(held.p.state, 'bound');
  const events = run(held.world, held.tune, 120, () => held.f.state !== 'hold');
  assert.ok(events.includes('squeeze') && events.includes('throw'), `${events}`);
  assert.equal(held.p.state, 'knockdown');

  const { world, tune, p, f } = floor('manager');
  windUp(world, p, f, 'grab', 14);
  run(world, tune, 40, () => f.state === 'hold');
  const free = run(world, tune, 60, () => f.state !== 'hold', mash);
  assert.ok(free.includes('breakFree'));
  assert.ok(!free.includes('throw'));
  assert.notEqual(p.state, 'bound');
});

test('the Manager charges across the floor and knocks the auditor down', () => {
  const { world, tune, p, f } = floor('manager');
  windUp(world, p, f, 'charge', 100);
  const events = run(world, tune, 120, () => f.state === 'punch');
  assert.ok(events.includes('charge'));
  assert.equal(p.state, 'knockdown');
});

test('a parry turns the grab and the charge back on the Manager', () => {
  for (const [name, gap] of [['grab', 14], ['charge', 100]]) {
    const { world, tune, p, f } = floor('manager');
    windUp(world, p, f, name, gap);
    const events = run(world, tune, 120, () => f.state === 'hurt', () => {
      p.parry = 5;
      return idle;
    });
    assert.ok(events.includes('parry'), name);
    assert.equal(f.state, 'hurt', name);
    assert.notEqual(p.state, 'bound', name);
  }
});

test('Counsel throws paperwork, objects and red tape from range, and a parry snaps each one', () => {
  const hits = { paper: ['hurt', 1], object: ['knockdown', 2], tape: ['bound', 0] };
  for (const [name, [state, damage]] of Object.entries(hits)) {
    const { world, tune, p, f } = floor('counsel');
    windUp(world, p, f, name, 60);
    run(world, tune, 80, () => p.state !== 'idle');
    assert.equal(p.state, state, name);
    assert.equal(p.hp, 999 - damage, name);

    const parried = floor('counsel');
    windUp(parried.world, parried.p, parried.f, name, 60);
    const events = run(parried.world, parried.tune, 80, () => parried.world.events.includes('parry'), () => {
      parried.p.parry = 5;
      return idle;
    });
    assert.ok(events.includes('parry'), name);
    assert.equal(parried.p.hp, 999, name);
  }
});

test('the readout names the attack being wound up and times it by that attack', () => {
  const tune = tuneFor('ward');
  const f = { ...floor('manager').f, state: 'windup', t: 16, attack: moveOf(KINDS.manager, 'charge') };
  const r = readout(f, tune);
  assert.equal(r.move, 'CHARGE');
  assert.equal(r.windup, 16 / KINDS.manager.moves.charge.windup);
  assert.equal(readout({ ...f, state: 'walk' }, tune).move, null);
});

test('the SNES tune grows each move\'s reach and run-up and takes its SNES wind-up', () => {
  const { kinds } = scaledTune(tuneFor('ward'), 1.5);
  assert.equal(kinds.associate.moves.lunge.from, SNES_KINDS.associate.moves.lunge.from * 1.5);
  assert.equal(kinds.counsel.moves.paper.speed, SNES_KINDS.counsel.moves.paper.speed * 1.5);
  assert.equal(kinds.supervisor.moves.overhead.windup, SNES_KINDS.supervisor.moves.overhead.windup);
  assert.ok(SNES_KINDS.supervisor.moves.overhead.windup > KINDS.supervisor.moves.overhead.windup);
  assert.equal(kinds.associate.moves.jab.windup, undefined, 'a move with no wind-up of its own takes the kind\'s');
});

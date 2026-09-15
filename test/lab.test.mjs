import test from 'node:test';
import assert from 'node:assert/strict';
import { LAB, PLANNED, buildDials, labKinds, nudge, settingsText, takeTurns, waveKinds, withKindDials } from '../src/lab/dials.mjs';
import { TUNING, defaultTune, fighter } from '../src/stage1/moves.mjs';
import { KINDS } from '../src/stage1/staff.mjs';
import { WEAPONS } from '../src/stage1/weapons.mjs';

test('every TUNING value, the lab dials and the planned dials each get one dial', () => {
  const dials = buildDials(defaultTune());
  const keys = dials.map((d) => d.key);
  for (const k of [...Object.keys(TUNING), ...Object.keys(LAB), ...Object.keys(WEAPONS), ...Object.keys(PLANNED)]) assert.ok(keys.includes(k), k);
  assert.equal(new Set(keys).size, keys.length);
});

test('a starting value outside its range widens the range rather than clamping', () => {
  const dial = buildDials({ ...defaultTune(), foeWindup: 90 }).find((d) => d.key === 'foeWindup');
  assert.equal(dial.value, 90);
  assert.equal(dial.max, 90);
});

test('nudge steps, snaps and clamps', () => {
  const dial = { value: 0.625, min: 0.125, max: 1, step: 0.125 };
  assert.equal(nudge(dial, 1), 0.75);
  nudge(dial, 5);
  assert.equal(dial.value, 1);
  const whole = { value: 1, min: 1, max: 4, step: 1 };
  assert.equal(nudge(whole, -1), 1);
});

test('a wave mixes kinds in order', () => {
  assert.deepEqual(waveKinds({ associate: 2, manager: 1, supervisor: 1 }), ['associate', 'manager', 'supervisor', 'associate']);
  assert.deepEqual(waveKinds({}), []);
});

test('lab kinds scale speed and shift wind-up without touching the originals', () => {
  const before = structuredClone(KINDS);
  const kinds = labKinds(KINDS, { foeWalkScale: 2, foeWindupAdd: -100 });
  assert.equal(kinds.associate.speed, KINDS.associate.speed * 2);
  assert.equal(kinds.associate.windup, 1);
  assert.equal(kinds.associate.moves.lunge.windup, 1);
  assert.deepEqual(KINDS, before);
});

test('every enemy kind\'s health, speed and each attack\'s wind-up and damage get a dial that edits a copy', () => {
  const dials = buildDials(defaultTune());
  const foes = dials.filter((d) => d.group === 'foes').map((d) => d.key);
  for (const [kind, k] of Object.entries(KINDS)) {
    for (const key of ['hp', 'speed']) assert.ok(foes.includes(`${kind}.${key}`), `${kind}.${key}`);
    for (const move of Object.keys(k.moves)) {
      assert.ok(foes.includes(`${kind}.${move}.windup`) && foes.includes(`${kind}.${move}.damage`), `${kind}.${move}`);
    }
  }
  assert.ok(foes.includes('supervisor.counterAfter'));
  const before = structuredClone(KINDS);
  nudge(dials.find((d) => d.key === 'manager.charge.windup'), 4);
  nudge(dials.find((d) => d.key === 'associate.hp'), 1);
  const kinds = withKindDials(KINDS, dials);
  assert.equal(kinds.manager.moves.charge.windup, KINDS.manager.moves.charge.windup + 4);
  assert.equal(kinds.associate.hp, KINDS.associate.hp + 1);
  assert.deepEqual(KINDS, before);
  assert.match(settingsText(dials, {}, 'ward'), /\[foes\][^[]*manager\.charge\.windup: 36/);
});

test('a foe starting a wind-up waits while the attack turns are all taken', () => {
  const tune = defaultTune();
  const a = { ...fighter('a', 'foe', 0, 0, tune), state: 'punch' };
  const b = { ...fighter('b', 'foe', 0, 0, tune), state: 'windup', t: 0, cooldown: 0 };
  const world = { fighters: [a, b] };
  assert.equal(takeTurns(world, b, 1), true);
  assert.equal(b.state, 'idle');
  assert.ok(b.cooldown > 0);
  b.state = 'windup';
  assert.equal(takeTurns(world, b, 2), false);
});

test('settings text names the wave and every changed dial', () => {
  const dials = buildDials(defaultTune());
  nudge(dials.find((d) => d.key === 'hitStop'), 1);
  const text = settingsText(dials, { associate: 2, counsel: 0 }, 'ward');
  assert.match(text, /wave: associate x2/);
  assert.match(text, /changed: hitStop 3 -> 4/);
  assert.match(text, /parryFrames: 12/);
  assert.equal(dials.find((d) => d.key === 'parryFrames').group, 'moves');
  assert.match(text, /\[weapons\][^[]*binderUses: 6/);
});

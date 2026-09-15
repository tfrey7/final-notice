import test from 'node:test';
import assert from 'node:assert/strict';
import { hitArea, injunctionLook, letterOf, readLook, readout, turnOwners } from '../src/stage1/readout.mjs';
import { defaultTune, fighter } from '../src/stage1/moves.mjs';
import { freeInjunction, fireCooldown } from '../src/injunction.mjs';

const tune = defaultTune();
const foe = (kind, extra = {}) => Object.assign(fighter(`${kind}1`, 'foe', 100, 180, tune), { kind }, extra);

test('each fighter carries its type letter, auditors P1 and P2', () => {
  assert.deepEqual(['associate', 'manager', 'counsel', 'supervisor', 'vellum'].map((k) => letterOf(foe(k))), ['A', 'M', 'C', 'S', 'V']);
  assert.equal(letterOf(fighter('player', 'player', 0, 0, tune)), 'P1');
  assert.equal(letterOf(fighter('player2', 'player', 0, 0, tune)), 'P2');
});

test('every state reads as its own look', () => {
  const cases = [
    [{ state: 'idle' }, 'idle'], [{ state: 'walk' }, 'walk'], [{ state: 'windup' }, 'windup'], [{ state: 'punch' }, 'attack'],
    [{ state: 'guard' }, 'guard'], [{ state: 'hurt', stagger: 48 }, 'open'], [{ state: 'hurt' }, 'hurt'],
    [{ state: 'down' }, 'down'], [{ state: 'knockdown' }, 'down'], [{ state: 'getup' }, 'getup'], [{ state: 'idle', invuln: 20 }, 'getup'],
  ];
  for (const [fields, look] of cases) assert.equal(readLook(foe('associate', fields)), look, JSON.stringify(fields));
  assert.equal(readLook(Object.assign(fighter('player', 'player', 0, 0, tune), { parry: 5 })), 'parry');
});

test('a wind-up grows toward the strike and a parry-opened foe counts down its window', () => {
  const early = readout(foe('associate', { state: 'windup', t: 7 }), tune);
  const late = readout(foe('associate', { state: 'windup', t: 27 }), tune);
  assert.ok(early.windup < late.windup && late.windup <= 1);
  assert.equal(readout(foe('associate', { state: 'hurt', stagger: 48, t: 8 }), tune).openLeft, 40);
});

test('the hit area shows only while a blow can land, on the facing side', () => {
  const p = fighter('player', 'player', 100, 180, tune);
  Object.assign(p, { state: 'punch', combo: 1, t: tune.punchStartup + 1 });
  assert.deepEqual(hitArea(p, tune), { x: 100, y: 180 - tune.depthReach, w: tune.punchReach, h: tune.depthReach * 2 });
  p.t = 1;
  assert.equal(hitArea(p, tune), null);
  const f = foe('associate', { state: 'punch', t: 0, facing: -1 });
  assert.equal(hitArea(f, tune).x, 100 - 20);
  assert.equal(hitArea(foe('counsel', { state: 'punch', t: 0 }), tune), null);
});

test('turn owners are the foes winding up or swinging; the Injunction reads ready or cooling', () => {
  const world = { fighters: [foe('associate', { state: 'windup' }), foe('manager', { state: 'walk' }), foe('supervisor', { state: 'punch' })] };
  assert.deepEqual(turnOwners(world).map((f) => f.kind), ['associate', 'supervisor']);
  const cd = freeInjunction(600);
  assert.equal(injunctionLook(cd).ready, true);
  assert.equal(injunctionLook(fireCooldown(cd)).ready, false);
});

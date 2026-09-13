import test from 'node:test';
import assert from 'node:assert/strict';
import { createWard, stepWard, punchPhase, PUNCHES, cameraX } from '../src/ward.mjs';

const BOUNDS = { minX: 0, maxX: 800, depth: 60 };
const NONE = {};

function run(w, inputs) {
  const log = [];
  for (const input of inputs) log.push({ events: stepWard(w, input, BOUNDS), state: w.state });
  return log;
}

test('movement starts and stops on the same tick', () => {
  const w = createWard(100, 30);
  stepWard(w, { right: true }, BOUNDS);
  assert.equal(w.state, 'walk');
  assert.ok(w.x > 100);
  const x = w.x;
  stepWard(w, NONE, BOUNDS);
  assert.equal(w.state, 'idle');
  assert.equal(w.x, x);
});

test('a jump leaves the floor and comes back down', () => {
  const w = createWard();
  stepWard(w, { jump: true }, BOUNDS);
  assert.ok(w.y > 0);
  for (let i = 0; i < 60; i++) stepWard(w, NONE, BOUNDS);
  assert.equal(w.y, 0);
});

test('a punch winds up, makes contact with a freeze, then recovers to idle', () => {
  const w = createWard();
  const p = PUNCHES.punch1;
  const log = run(w, [{ punch: true }, ...Array(40).fill(NONE)]);
  const contactTick = log.findIndex((l) => l.events.length);
  assert.equal(contactTick, p.windup);
  assert.equal(log[contactTick].events[0].punch, 'punch1');
  assert.equal(w.state, 'idle');
  // Frozen ticks hold the punch: it lasts its phases plus the freeze.
  const punchTicks = log.filter((l) => l.state === 'punch1').length;
  assert.equal(punchTicks, p.windup + p.contact + p.recover + p.freeze);
});

test('pressing during a punch chains into the next, three hits at most', () => {
  const w = createWard();
  const inputs = [{ punch: true }];
  for (let i = 0; i < 80; i++) inputs.push(i % 4 === 0 ? { punch: true } : NONE);
  const hits = run(w, inputs).flatMap((l) => l.events).map((e) => e.punch);
  assert.deepEqual(hits.slice(0, 4), ['punch1', 'punch2', 'punch3', 'punch1']);
});

test('without a press the combo ends after one punch', () => {
  const w = createWard();
  const hits = run(w, [{ punch: true }, ...Array(60).fill(NONE)]).flatMap((l) => l.events);
  assert.equal(hits.length, 1);
});

test('punch phases split in order', () => {
  assert.equal(punchPhase('punch3', 0), 'windup');
  assert.equal(punchPhase('punch3', PUNCHES.punch3.windup), 'contact');
  assert.equal(punchPhase('punch3', 999), null);
});

test('the camera holds in its dead zone and stays inside the lobby', () => {
  assert.equal(cameraX(0, 149, 298, 894), 0);
  assert.ok(cameraX(0, 300, 298, 894) > 0);
  assert.equal(cameraX(500, 890, 298, 894), 894 - 298);
  assert.equal(cameraX(100, 0, 298, 894), 0);
});

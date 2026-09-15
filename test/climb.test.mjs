import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad, PADS } from '../src/input.mjs';
import { CLIMB, SHAFT, buildClimbDials, climbSettingsText, createClimb, startAt, stepClimb } from '../src/lab/climb.mjs';
import { nudge } from '../src/lab/dials.mjs';
import { TILE, solidAt } from '../src/stage2/physics.mjs';

const idle = () => updatePad(createPad(PADS.snes), new Set());
const dial = (dials, key) => dials.find((d) => d.key === key);

test('the shaft is 16 tiles wide, walled, floored, with one shelf over its stub', () => {
  assert.equal(SHAFT.length, 56);
  for (const row of SHAFT) assert.equal(row.length, 16, row);
  assert.equal(SHAFT.at(-1), '################');
  const c = createClimb();
  assert.equal(c.shelves.length, 1);
  assert.equal(c.run.foes.length, 4);
});

test('every dial is listed once with its start inside its range', () => {
  const dials = buildClimbDials();
  assert.equal(dials.length, Object.values(CLIMB).reduce((n, g) => n + Object.keys(g).length, 0));
  assert.equal(new Set(dials.map((d) => d.key)).size, dials.length);
  for (const d of dials) assert.ok(d.value >= d.min && d.value <= d.max, d.key);
});

test('the flood waits out its grace, then rises faster as it accelerates and catches a player who stands still', () => {
  const dials = buildClimbDials();
  dial(dials, 'fireRate').value = 0;
  let c = createClimb('ward', dials);
  const start = c.flood.y;
  const pad = idle();
  for (let i = 0; i < 90; i++) c = stepClimb(c, pad, dials);
  assert.equal(c.flood.y, start);
  for (let i = 0; i < 60; i++) c = stepClimb(c, pad, dials);
  const early = start - c.flood.y;
  for (let i = 0; i < 60 && !c.over; i++) c = stepClimb(c, pad, dials);
  assert.ok(start - c.flood.y - early > early, 'second second rises further than the first');
  for (let i = 0; i < 2000 && !c.over; i++) c = stepClimb(c, pad, dials);
  assert.equal(c.over?.kind, 'caught');
});

test('Margin of Error drops the hanging shelf into solid tiles; a plain seal only clinks', () => {
  const dials = buildClimbDials();
  const c = createClimb('ward', dials);
  const [s] = c.shelves;
  const area = c.run.area;
  assert.equal(solidAt(area, 5, 27), false);
  c.run.casts.push({ kind: 'seal', spell: 'notice', rule: { speed: 4, pierce: true, radius: 0 }, x: s.x, y: s.y - 4, vx: 0, vy: 0, age: 0, hit: new Set(), volley: -1 });
  stepClimb(c, idle(), dials);
  assert.equal(s.state, 'hanging');
  c.run.casts.length = 0;
  c.run.casts.push({ kind: 'page', spell: 'margin', rule: { speed: 0, radius: 28, burstFrames: 18, breaksLocks: true }, x: s.x, y: s.y - 4, vx: 0, vy: 0, age: 0, hit: new Set(), volley: -2 });
  for (let i = 0; i < 120 && s.state !== 'landed'; i++) stepClimb(c, idle(), dials);
  assert.equal(s.state, 'landed');
  for (const col of [5, 6, 7]) assert.equal(solidAt(area, col, 27), true, `col ${col}`);
  assert.equal(s.y, 28 * TILE);
});

test('a landed cast holds the frame for the hit pause and throws the Associate back', () => {
  const dials = buildClimbDials();
  dial(dials, 'hitPause').value = 6;
  const c = createClimb('ward', dials);
  const foe = c.run.foes.at(-1);
  c.run.casts.push({ kind: 'seal', spell: 'notice', rule: { speed: 4, pierce: false, radius: 0 }, x: foe.x, y: foe.y - 10, vx: 0, vy: 0, age: 0, hit: new Set(), volley: -3 });
  stepClimb(c, idle(), dials);
  assert.equal(c.run.hitStop, 6);
  assert.equal(foe.knock, dial(dials, 'knockback').value);
});

test('the SNES pad climbs from the floor onto the first ledge', () => {
  const dials = buildClimbDials();
  let c = createClimb('ward', dials);
  let pad = createPad(PADS.snes);
  for (let i = 0; i < 50; i++) {
    const down = new Set(['right']);
    if (i >= 6 && i < 26) down.add('b');
    pad = updatePad(pad, down);
    c = stepClimb(c, pad, dials);
  }
  assert.equal(c.run.player.y, 53 * TILE);
  assert.ok(c.run.player.grounded);
});

test('startAt stands the auditor on a ledge with the flood its gap below', () => {
  const dials = buildClimbDials();
  const c = createClimb('ward', dials);
  assert.equal(startAt(c, 29, dials), true);
  assert.equal(c.run.player.y, 29 * TILE);
  assert.equal(c.flood.y, 29 * TILE + dial(dials, 'floodGap').value);
  assert.equal(startAt(c, 1, dials), false);
});

test('settings text names every changed dial and every group', () => {
  const dials = buildClimbDials();
  nudge(dial(dials, 'floodSpeed'), 2);
  const text = climbSettingsText(dials, 'mercer');
  assert.match(text, /Climb lab settings \(mercer\)/);
  assert.match(text, /changed: floodSpeed 0.3 -> 0.35/);
  for (const g of Object.keys(CLIMB)) assert.match(text, new RegExp(`\\[${g}\\]`));
});

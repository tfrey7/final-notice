import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad } from '../src/input.mjs';
import { HITS_PER_SEGMENT, MAX_HITS, RING, addHits, isFull, restoreAtCheckpoint, ringShape, ringVictims, segments, startRing, stepRing, wantsInjunction } from '../src/injunction.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { spawnStaff } from '../src/stage1/staff.mjs';
import { createRun, stepRun } from '../src/stage2/core.mjs';

const idle = createPad();
const chord = updatePad(updatePad(createPad(), ['a']), ['a', 'b']);

test('the meter fills a segment every four hits, tops out at four and a checkpoint gives back one', () => {
  assert.equal(segments(HITS_PER_SEGMENT - 1), 0);
  assert.equal(segments(HITS_PER_SEGMENT * 2), 2);
  assert.equal(addHits(MAX_HITS - 1, 5), MAX_HITS);
  assert.equal(segments(MAX_HITS + 99), 4);
  assert.ok(isFull(MAX_HITS) && !isFull(MAX_HITS - 1));
  assert.equal(segments(restoreAtCheckpoint(0)), 1);
  assert.equal(restoreAtCheckpoint(10), 10, 'a checkpoint never takes meter away');
});

test('A+B fires only with a full meter; A alone never does', () => {
  assert.ok(chord.chord);
  assert.ok(wantsInjunction(chord, MAX_HITS));
  assert.ok(!wantsInjunction(chord, MAX_HITS - 1));
  assert.ok(!wantsInjunction(updatePad(createPad(), ['a']), MAX_HITS));
});

test('the ring pushes ordinary foes on screen, never a boss or anyone off screen', () => {
  const foes = [{ x: 100 }, { x: 120, boss: true }, { x: 400 }, { x: 50, down: true }];
  const hit = ringVictims(foes, { x0: 0, x1: 256 }, (f) => !f.down);
  assert.deepEqual(hit, [foes[0]]);
});

test('the ring flashes, swells and fades', () => {
  let ring = startRing(0, 0);
  assert.ok(ringShape(ring).flash);
  let last = 0;
  for (let i = 0; i < RING.frames - 1; i++) {
    ring = stepRing(ring);
    assert.ok(ringShape(ring).radius >= last);
    last = ringShape(ring).radius;
  }
  assert.equal(stepRing(ring), null);
});

function brawl() {
  const tune = tuneFor('ward');
  const world = newFloor('ward', tune);
  world.fighters = world.fighters.filter((f) => f.team === 'player');
  spawnStaff(world, ['associate', 'counsel'], tune);
  const p = world.fighters[0];
  const foe = (kind) => world.fighters.find((f) => f.kind === kind);
  Object.assign(foe('associate'), { x: p.x + 30, y: p.y });
  Object.assign(foe('counsel'), { x: p.x + 90, y: p.y });
  return { tune, world, p, foe };
}

test('Stage 1: the injunction knocks down every foe on screen unhurt, snaps red tape and empties the meter', () => {
  const { tune, world, p, foe } = brawl();
  const boss = { ...foe('associate'), id: 'boss', kind: undefined, boss: true, x: p.x + 50, hp: 40 };
  world.fighters.push(boss);
  world.tapes.push({ x: p.x + 40, y: p.y, vx: -2, t: 0, from: 'counsel' });
  const hp = foe('associate').hp;
  world.meterHits = MAX_HITS;
  stepFloor(world, chord, tune);
  assert.ok(world.events.includes('injunction'));
  assert.equal(foe('associate').state, 'knockdown');
  assert.equal(foe('counsel').state, 'knockdown');
  assert.equal(foe('associate').hp, hp, 'thrown back, not hurt');
  assert.ok(foe('associate').vx > 0, 'pushed away from the auditor');
  assert.equal(world.tapes.length, 0);
  assert.equal(boss.hp, 40);
  assert.notEqual(boss.state, 'knockdown', 'a boss shrugs it off');
  assert.equal(world.meter, 0);
  assert.ok(world.ring && world.hitStop > 0);
  assert.equal(p.state, 'idle', 'A+B neither jumps nor punches');
});

test('Stage 1: without a full meter A+B does nothing special', () => {
  const { tune, world, foe } = brawl();
  world.meterHits = MAX_HITS - 1;
  stepFloor(world, chord, tune);
  assert.ok(!world.events.includes('injunction'));
  assert.notEqual(foe('associate').state, 'knockdown');
});

test('Stage 1: losing a life at a checkpoint gives back a segment', () => {
  const { tune, world, p } = brawl();
  Object.assign(p, { state: 'down', t: 999, hp: 0 });
  stepFloor(world, idle, tune);
  assert.ok(world.events.includes('lifeLost'));
  assert.ok(world.meter >= 1);
});

function escape() {
  const run = createRun('ward');
  const p = run.player;
  run.foes.forEach((f, i) => Object.assign(f, { x: p.x + 40 + i * 30, y: p.y }));
  return { run, p };
}

test('Stage 2: the injunction clears every glyph and throws ordinary foes back, not a boss', () => {
  const { run, p } = escape();
  const [near] = run.foes;
  const boss = { ...run.foes[1], boss: true, hp: 30 };
  run.foes.splice(1, 1, boss);
  run.glyphs.push({ glyph: true, x: p.x + 20, y: p.y - 16, w: 8, h: 8, hp: 1, flash: 0, age: 0, vx: -1, vy: 0 });
  run.meterHits = MAX_HITS;
  const x0 = near.x;
  const hp = near.hp;
  stepRun(run, chord);
  assert.ok(run.events.some((e) => e.type === 'injunction'));
  assert.equal(run.glyphs.length, 0);
  assert.equal(run.meterHits, 0);
  assert.ok(near.knock > 0 && !boss.knock);
  for (let i = 0; i < 40; i++) stepRun(run, idle);
  assert.ok(near.x > x0, `${near.x} > ${x0}`);
  assert.equal(near.hp, hp);
  assert.equal(boss.hp, 30);
});

test('Stage 2: hits land in the meter and a lost life gives back a segment', () => {
  const { run, p } = escape();
  run.foes[0].x = p.x + 30;
  for (let i = 0; i < 60; i++) stepRun(run, i % 14 === 0 ? updatePad(createPad(), ['b']) : idle);
  assert.ok(run.meterHits >= 1, `${run.meterHits}`);

  const fresh = escape().run;
  Object.assign(fresh.player, { health: 1, y: fresh.area.height + 200 });
  stepRun(fresh, idle);
  assert.ok(fresh.events.some((e) => e.type === 'lifeLost'));
  assert.ok(segments(fresh.meterHits) >= 1);
});

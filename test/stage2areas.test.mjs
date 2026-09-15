import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad } from '../src/input.mjs';
import { CHECKPOINTS, jumpTo, next } from '../src/flow.mjs';
import { TUNING } from '../src/stage2/escape.mjs';
import { TILE, solidAt } from '../src/stage2/physics.mjs';
import { HEALTH } from '../src/stage2/player.mjs';
import { AREAS, BUILT_IN, DOOR_TOP, LAYOUT, ROWS, createStage, layoutFrom, promptsFor, stepStage } from '../src/stage2/areas.mjs';
import { HITS_PER_SEGMENT } from '../src/injunction.mjs';
import { FRONT, caught, createFront, stepFront, wake } from '../src/stage2/waxfront.mjs';

const play = (w, frames) => {
  let pad = createPad();
  const seen = [];
  for (const down of frames) {
    pad = updatePad(pad, new Set(down));
    stepStage(w, pad);
    seen.push(...w.events);
  }
  return seen;
};
const hold = (b, n) => Array.from({ length: n }, () => b);
const body = (x) => ({ x, y: 208, w: 12, h: 32 });
const spawnX = (a) => a.spawnCol * TILE + TILE / 2;

test('the wax front sleeps until woken, creeps through its grace, then advances slower than a run', () => {
  const f = createFront(100);
  assert.equal(stepFront(f, body(400), 0), false);
  assert.equal(f.x, 100, 'asleep');
  wake(f);
  for (let i = 0; i < FRONT.grace; i++) stepFront(f, body(4000), 0);
  assert.ok(Math.abs(f.x - (100 + FRONT.grace * FRONT.creep)) < 1e-9, 'a gentle creep first');
  const before = f.x;
  stepFront(f, body(4000), 0);
  assert.ok(Math.abs(f.x - before - FRONT.speed) < 1e-9, 'then full speed');
  assert.ok(FRONT.creep < FRONT.speed && FRONT.speed < TUNING.walk, 'a running auditor outpaces it');
  stepFront(f, body(4000), 2000);
  assert.equal(f.x, 2000 - FRONT.lead, 'never further than its lead behind the view');
});

test("the front catches an auditor once it touches their back edge, not a pixel before", () => {
  const f = createFront(100);
  assert.equal(caught(f, body(106)), true);
  assert.equal(caught(f, body(106.5)), false);
});

test('in Retention Order the front costs a life and restarts the area at its checkpoint, the wax asleep', () => {
  const w = createStage('mercer');
  const [, retention] = AREAS;
  w.player.x = w.player.safe.x = (retention.col + 8) * TILE;
  let events = play(w, hold([], 2));
  assert.ok(w.stage.front.active && events.some((e) => e.type === 'alarm'), 'the alarm woke it');
  const mid = w.stage.doors[1];
  w.player.x = mid.closeAt + 8;
  play(w, hold([], 1));
  assert.ok(mid.closed && solidAt(w.area, mid.col, 12), 'a fire door shut behind');
  w.stage.front.x = w.player.x;
  w.meterHits = 0;
  events = play(w, hold([], 1));
  assert.ok(w.meterHits >= HITS_PER_SEGMENT, 'the checkpoint gives back a meter segment');
  assert.deepEqual(events.filter((e) => e.type === 'lifeLost').length, 1);
  assert.equal(w.player.x, spawnX(retention));
  assert.equal(w.player.health, HEALTH);
  assert.equal(w.stage.front.active, false);
  assert.equal(w.stage.front.x, LAYOUT.frontX);
  assert.ok(!mid.closed && !solidAt(w.area, mid.col, 12), 'the door ahead of the checkpoint is open again');
  assert.ok(w.stage.doors[0].closed, 'the one behind stays shut');
});

test('a checkpoint at the start of each area, named as the flow names them', () => {
  assert.deepEqual(AREAS.map((a) => a.id), CHECKPOINTS.stage2.slice(0, 4));
  const w = createStage('ward');
  let flow = jumpTo('stage2');
  assert.equal(flow.checkpoint, 'stage2-area1');
  w.player.x = (AREAS[1].col + 2) * TILE;
  const reached = play(w, hold([], 3)).filter((e) => e.type === 'checkpoint');
  assert.deepEqual(reached.map((e) => e.id), ['stage2-area2'], 'reported once');
  for (const e of reached) flow = next(flow, e);
  assert.equal(flow.checkpoint, 'stage2-area2');

  const a = createStage('ward');
  Object.assign(a.player, { x: 20 * TILE, y: 1000, health: 1 });
  play(a, hold([], 1));
  assert.equal(a.player.x, spawnX(AREAS[0]), 'a life lost on the landing restarts there');

  assert.equal(createStage('ward', LAYOUT, 'stage2-area2').player.x, spawnX(AREAS[1]), 'a continue starts at the flow checkpoint');
});

test('the wax-lock door blocks the way; a seal cast standing clinks off, one cast on the move breaks it', () => {
  const w = createStage('ward');
  const lock = w.locks.find((l) => l.door);
  assert.ok(solidAt(w.area, lock.col, 12) && solidAt(w.area, lock.col, DOOR_TOP), 'a wall up to the ceiling band');
  w.player.x = w.player.safe.x = (lock.col - 4) * TILE;
  let events = play(w, [[], [], ['b'], ...hold([], 30)]);
  assert.ok(events.some((e) => e.type === 'clink'));
  assert.equal(lock.hp, 1);
  events = play(w, [...hold(['right'], 8), ['right', 'b'], ...hold(['right'], 30)]);
  assert.ok(events.some((e) => e.type === 'break' && e.target === lock));
  assert.equal(solidAt(w.area, lock.col, 12), false, 'the way is open');
});

test('CAST then AIM prompts on the landing, gone once past it', () => {
  const w = createStage('ward');
  assert.deepEqual(promptsFor(w), ['CAST']);
  w.player.x = 10 * TILE;
  assert.deepEqual(promptsFor(w), ['AIM']);
  w.player.x = 20 * TILE;
  assert.deepEqual(promptsFor(w), []);
});

test("the art card's solid grids replace the terrain when they fit; otherwise the built-in layout stands", () => {
  assert.equal(layoutFrom({}), LAYOUT);
  assert.equal(layoutFrom({ archiveAccess: ['###'] }), LAYOUT);
  const flat = (cols) => Array.from({ length: ROWS }, (_, r) => (r >= 13 ? '#' : '.').repeat(cols));
  const art = layoutFrom({ archiveAccess: flat(32), retentionOrder: flat(48) });
  assert.equal(art.map.length, ROWS);
  assert.equal(art.map[11][13], '.', 'the built-in step is gone');
  assert.equal(art.map[12][2], 'P', 'markers stay');
  assert.equal(art.map[13][29], '#', 'the art floor has no pit');
  assert.equal(LAYOUT.map[12].length, AREAS.reduce((n, a) => n + BUILT_IN[a.name][0].length, 0));
  assert.ok(AREAS.every((a) => BUILT_IN[a.name][0].length === a.cols));
});

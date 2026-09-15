import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad } from '../src/input.mjs';
import { AUDITORS, DIRS, MAX_CASTS, aim, spawnCast, stepCasts } from '../src/stage2/casting.mjs';
import { TILE, moveBody, parseArea, solidAt } from '../src/stage2/physics.mjs';
import { HEALTH, PIT_DAMAGE, createPlayer, stepPlayer } from '../src/stage2/player.mjs';
import { TEST_MAP, createRun, stepRun } from '../src/stage2/core.mjs';

const aimOf = (held, o = {}) => aim(new Set(held), { facing: 1, grounded: true, walking: false, ...o });

test('standing still, the d-pad aims in all eight directions', () => {
  const pads = [[['right'], 'right'], [['right', 'up'], 'upRight'], [['up'], 'up'], [['left', 'up'], 'upLeft'],
    [['left'], 'left'], [['left', 'down'], 'downLeft'], [['right', 'down'], 'downRight']];
  for (const [held, dir] of pads) assert.equal(aimOf(held), dir, held.join('+'));
  assert.equal(aimOf([], { facing: -1 }), 'left', 'no d-pad casts the way you face');
  assert.equal(aimOf(['down']), 'right', 'down on the ground crouches and casts low');
  assert.equal(aimOf(['down'], { grounded: false }), 'down', 'straight down from the air');
  assert.equal(Object.keys(DIRS).length, 8);
});

test('walking casts forward, or diagonally up with up held', () => {
  assert.equal(aimOf(['left'], { facing: -1, walking: true }), 'left');
  assert.equal(aimOf(['left', 'up'], { facing: -1, walking: true }), 'upLeft');
  assert.equal(aimOf(['right', 'down'], { walking: true }), 'right', 'no low diagonal on the move');
});

test('at most three casts are out at once', () => {
  const casts = [];
  for (let i = 0; i < 5; i++) spawnCast(casts, 'ward', 100, 100, 'right');
  assert.equal(casts.length, MAX_CASTS);
});

const area = parseArea(['', '', '', '', '####....####']);
const box = (x, y = 4 * TILE) => ({ x, y, w: 16, h: 16, hp: 2, flash: 0 });

test("Ward's seal pierces a row of boxes; Mercer's bursts on the first and catches its neighbour", () => {
  const targets = [box(40), box(58), box(120)];
  const casts = [];
  spawnCast(casts, 'ward', 8, 4 * TILE - 8, 'right');
  for (let i = 0; i < 40; i++) stepCasts(casts, area, targets);
  assert.deepEqual(targets.map((t) => t.hp), [1, 1, 1], 'one seal hit all three once');

  const m = [box(40), box(58), box(120)];
  const mc = [];
  spawnCast(mc, 'mercer', 8, 4 * TILE - 8, 'right');
  const events = [];
  for (let i = 0; i < 40; i++) events.push(...stepCasts(mc, area, m));
  assert.deepEqual(m.map((t) => t.hp), [1, 1, 2], 'the burst reached the neighbour, not the far box');
  assert.ok(AUDITORS.mercer.speed < AUDITORS.ward.speed);
  assert.equal(mc.length, 0, 'the burst has faded');
});

test('target boxes break on their second hit', () => {
  const t = box(40);
  const events = [];
  for (let n = 0; n < 2; n++) {
    const casts = [];
    spawnCast(casts, 'ward', 8, 4 * TILE - 8, 'right');
    for (let i = 0; i < 20; i++) events.push(...stepCasts(casts, area, [t]));
  }
  assert.deepEqual(events.map((e) => e.type), ['hit', 'break']);
  assert.equal(t.hp, 0);
});

test('platform collision: land on a tile top, stop at a wall, bump a ceiling, fall off an edge', () => {
  const room = parseArea(['........', '...#....', '........', '........', '#.......', '########']);
  assert.equal(solidAt(room, -1, 0), true, 'the sides are wall');
  assert.equal(solidAt(room, 0, 9), false, 'below the grid is the pit');

  const b = { x: 40, y: 60, vx: 0, vy: 6, w: 12, h: 32 };
  for (let i = 0; i < 4; i++) moveBody(b, room);
  assert.equal(b.y, 80, 'landed on row 5 without sinking in');
  assert.equal(moveBody(Object.assign(b, { vy: 0.25 }), room).landed, true, 'standing lands every frame');
  assert.equal(b.y, 80);

  const w = { x: 30, y: 80, vx: -4, vy: 0, w: 12, h: 32 };
  for (let i = 0; i < 4; i++) moveBody(w, room);
  assert.equal(w.x, 22, 'stopped by the block at column 0, row 4');

  const head = { x: 56, y: 66, vx: 0, vy: -6, w: 12, h: 32 };
  assert.equal(moveBody(head, room).ceiling, true);
  assert.equal(head.y - head.h, 32, 'head under the block at row 1');

  const edge = { x: 40, y: 80, vx: 0, vy: 1, w: 12, h: 32 };
  const pit = parseArea(['', '', '', '', '', '###.....']);
  edge.x = 60;
  assert.equal(moveBody(edge, pit).landed, false, 'nothing under column 3');
});

const play = (w, frames, pad = createPad()) => {
  for (const down of frames) {
    pad = updatePad(pad, new Set(down));
    stepRun(w, pad);
  }
  return pad;
};
const hold = (b, n) => Array.from({ length: n }, () => b);

test('falling into a pit costs 2 pips and returns to the last safe ledge', () => {
  const w = createRun('ward');
  const { x, y } = w.player;
  play(w, hold([], 3));
  assert.equal(w.player.safe.y, y);
  const runs = [];
  let pad = createPad();
  for (let i = 0; i < 400 && w.player.health === HEALTH; i++) {
    pad = updatePad(pad, new Set(['right']));
    stepRun(w, pad);
    runs.push(...w.events.map((e) => e.type));
  }
  assert.ok(runs.includes('pit'));
  assert.equal(w.player.health, HEALTH - PIT_DAMAGE);
  assert.equal(w.player.y, 13 * TILE, 'back on the floor');
  assert.ok(w.player.x < 14 * TILE && w.player.x > x, 'on the ledge before the first pit');
  assert.ok(w.player.invuln > 0);
});

test('a lost life when the pit takes the last pips', () => {
  const p = createPlayer('mercer', { x: 24, y: 208 });
  p.health = 2;
  p.y = 400;
  const events = stepPlayer(p, updatePad(createPad(), new Set()), parseArea(TEST_MAP), []);
  assert.deepEqual(events.map((e) => e.type), ['pit', 'lifeLost']);
  assert.equal(p.health, HEALTH);
});

test('holding B plants the feet and aims diagonally; a walking press casts on the move', () => {
  const w = createRun('ward');
  play(w, [...hold([], 2), ['b'], ...hold(['b', 'up', 'right'], 30)]);
  assert.equal(w.player.vx, 0, 'planted');
  assert.ok(w.casts.some((c) => c.dir === 'upRight'));

  const r = createRun('ward');
  play(r, [...hold(['right'], 20), ['right', 'up', 'b']]);
  assert.equal(r.casts[0].dir, 'upRight');
  assert.ok(r.player.vx > 0, 'still moving');
});

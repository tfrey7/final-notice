import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SPRITES, frameSprites, lineDemand, visibleSprites } from '../src/nes/limits.mjs';
import { FRAME_CYCLES, COST, createSlowdown, frameCost, pairs, slowdownTick } from '../src/slowdown.mjs';

const row = (n, extra = {}) => Array.from({ length: n }, (_, i) => ({ x: i * 12, y: 100, palette: 'a', ...extra }));

test('past 64 sprites the rest never draw', () => {
  const many = Array.from({ length: 70 }, (_, i) => ({ x: 0, y: (i % 25) * 9, palette: 'a' }));
  const { shown, stats } = frameSprites(many, 0);
  assert.equal(stats.count, MAX_SPRITES);
  assert.equal(stats.dropped, 6);
  assert.ok([...shown].every((i) => i < MAX_SPRITES));
});

test('kept sprites never flicker while the rest rotate through the 8-a-line limit', () => {
  const sprites = [...row(10), { x: 200, y: 100, palette: 'a', keep: true }];
  const shownCount = Array(11).fill(0);
  for (let f = 0; f < 10; f++) {
    const { shown, stats } = frameSprites(sprites, f);
    assert.equal(shown.size, 8);
    assert.equal(stats.flicker, 3);
    for (const i of shown) shownCount[i]++;
  }
  assert.equal(shownCount[10], 10);
  assert.deepEqual(shownCount.slice(0, 10), Array(10).fill(7));
  assert.equal(lineDemand(sprites)[100], 11);
});

test('a fifth sprite palette on screen does not draw, and kept sprites pick their palettes first', () => {
  const sprites = ['a', 'b', 'c', 'd', 'e'].map((palette, i) => ({ x: 0, y: i * 20, palette }));
  let { shown, stats } = frameSprites(sprites, 0);
  assert.equal(stats.palettes, 4);
  assert.equal(stats.offPalette, 1);
  assert.ok(!shown.has(4));
  sprites[4].keep = true;
  ({ shown, stats } = frameSprites(sprites, 0));
  assert.ok(shown.has(4));
  assert.ok(!shown.has(3));
  const shared = sprites.map((s, i) => ({ ...s, palette: i % 2 ? 'a' : 'b' }));
  assert.equal(frameSprites(shared, 0).stats.offPalette, 0);
});

test('a sprite off its palette takes no scanline slot', () => {
  const sprites = [...row(8, { palette: 'x' }), ...['a', 'b', 'c', 'd'].map((palette) => ({ x: 0, y: 0, palette }))];
  const off = sprites.map((s, i) => (i === 0 ? { ...s, off: true } : s));
  assert.equal(visibleSprites([...off, { x: 0, y: 100 }], 0).size, 12);
});

test('the slowdown budget: a quiet frame fits, a crowded one overruns', () => {
  assert.equal(frameCost({}), COST.fixed);
  assert.ok(frameCost({ objects: 4, collisions: pairs(4), sprites: 40 }) < FRAME_CYCLES);
  assert.ok(frameCost({ objects: 12, collisions: pairs(12), sprites: 64 }) > FRAME_CYCLES);
});

test('while overrunning, the game logic runs at exactly half speed and recovers at once', () => {
  const sd = createSlowdown();
  const busy = { objects: 12, collisions: pairs(12), sprites: 64 };
  const runs = Array.from({ length: 20 }, () => slowdownTick(sd, busy));
  assert.equal(runs.filter(Boolean).length, 10);
  assert.deepEqual(runs.slice(0, 4), [true, false, true, false]);
  assert.equal(sd.lagFrames, 10);
  const calm = Array.from({ length: 4 }, () => slowdownTick(sd, {}));
  assert.deepEqual(calm, [true, true, true, true]);
});

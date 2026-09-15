import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSheet, encodePng, measure, PALETTE, joint } from '../tools/ward-sprite.mjs';
globalThis.Phaser ??= { Scene: class {} }; // the scene module extends Phaser.Scene at load
const { previewSpots, PREVIEW_ORDER, ASSOCIATE_ORDER } = await import('../src/sprites.mjs');
const associate = await import('../tools/associate-sprite.mjs');

const root = new URL('../assets/sprites/', import.meta.url);

test('the committed sheet is exactly what the grids build', () => {
  const sheet = buildSheet();
  assert.ok(readFileSync(new URL('ward.png', root)).equals(encodePng(sheet.width, sheet.height, sheet.rgba)));
  assert.deepEqual(JSON.parse(readFileSync(new URL('ward.json', root), 'utf8')), sheet.meta);
});

test('Ward has the animation names the movement card uses', () => {
  const { meta } = buildSheet();
  assert.deepEqual(Object.keys(meta.animations), ['idle', 'walk', 'punch1', 'punch2', 'punch3', 'hit']);
  assert.deepEqual([...PREVIEW_ORDER].sort(), Object.keys(meta.animations).sort());
});

test('every frame is 56-64 pixels tall and stands on the foot row', () => {
  for (const [name, frames] of Object.entries(buildSheet().frames)) {
    for (const grid of frames) {
      const { height, bottom } = measure(grid);
      assert.ok(height >= 56 && height <= 64, `${name} is ${height} tall`);
      assert.ok(bottom >= 61, `${name} floats at ${bottom}`);
    }
  }
});

test('one Super Nintendo sprite palette: at most 15 colours on the 5-bit grid', () => {
  const colours = Object.values(PALETTE);
  assert.ok(colours.length <= 15);
  for (const c of colours) for (const v of c) assert.equal(Math.round((Math.round((v * 31) / 255) * 255) / 31), v);
});

test('a two-bone joint keeps both bone lengths when the reach allows', () => {
  const e = joint([0, 0], [12, 0], 10, 10, 1);
  assert.ok(Math.abs(Math.hypot(e[0], e[1]) - 10) < 1e-6);
  assert.ok(Math.abs(Math.hypot(12 - e[0], e[1]) - 10) < 1e-6);
});

test('preview figures all stand on the carpet inside the screen', () => {
  for (const { x, y } of previewSpots()) {
    assert.ok(x > 20 && x < 280 && y - 62 >= 58 && y < 224, `${x},${y}`);
  }
});

test("the Security Associate's committed sheet is exactly what his grids build", () => {
  const sheet = associate.buildSheet();
  assert.ok(readFileSync(new URL('associate.png', root)).equals(encodePng(sheet.width, sheet.height, sheet.rgba)));
  assert.deepEqual(JSON.parse(readFileSync(new URL('associate.json', root), 'utf8')), sheet.meta);
  assert.deepEqual(Object.keys(sheet.meta.animations), ['walk', 'windup', 'punch', 'reel', 'knockdown', 'down']);
  assert.deepEqual([...ASSOCIATE_ORDER].sort(), Object.keys(sheet.meta.animations).sort());
});

test('the Associate stands 56-64 tall, lies flat when down, and keeps to one 5-bit palette', () => {
  const { frames } = associate.buildSheet();
  const lying = new Set(['knockdown:2', 'knockdown:3', 'down:0', 'down:1']);
  for (const [name, grids] of Object.entries(frames)) {
    grids.forEach((grid, i) => {
      const { height, bottom } = measure(grid);
      if (lying.has(`${name}:${i}`)) assert.ok(height < 30, `${name} ${i} lies ${height} tall`);
      else if (!(name === 'knockdown' && i === 1)) assert.ok(height >= 56 && height <= 64, `${name} ${i} is ${height} tall`);
      assert.ok(bottom >= (name === 'knockdown' && i === 2 ? 58 : 61), `${name} ${i} floats at ${bottom}`);
      assert.ok(grid.every((line) => line[0] === '.' && line[line.length - 1] === '.'), `${name} ${i} touches the frame edge`);
    });
  }
  const colours = Object.values(associate.PALETTE);
  assert.ok(colours.length <= 15);
  for (const c of colours) for (const v of c) assert.equal(Math.round((Math.round((v * 31) / 255) * 255) / 31), v);
});

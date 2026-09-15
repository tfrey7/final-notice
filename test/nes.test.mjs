import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT, SAFE, integerZoom } from '../src/nes/screen.mjs';
import { MASTER, nes, rgb, paletteSet, paletteSetProblems } from '../src/nes/palette.mjs';
import { tileValid, frameOnePalette, attributeProblems, scanlineVisible, visibleSprites } from '../src/nes/limits.mjs';
import { artProblems, tileRGBA, placeFrame, tilePalettes } from '../src/nes/art.mjs';
import { readdirSync } from 'node:fs';

test('every art module passes the NES limit checks', async () => {
  const names = readdirSync(new URL('../src/art/', import.meta.url)).filter((f) => f.endsWith('.mjs'));
  assert.ok(names.includes('example.mjs'));
  for (const file of names) {
    const def = (await import(`../src/art/${file}`)).default;
    assert.deepEqual(artProblems(def), [], file);
  }
});

test('artProblems catches a second palette in a frame and a broken attribute table', () => {
  const tile = Array(8).fill('01230000');
  const def = {
    palettes: [[1, 2, 3], [4, 5, 6]],
    tiles: { t: tile },
    animations: { a: { frames: [{ palette: 0, parts: [{ tile: 't', x: 0, y: 0, palette: 1 }] }] } },
    backgrounds: { b: { backdrop: 0x0f, palettes: [[1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 2, 3]], cols: 2, rows: 2, nametable: ['t', 't', 't', 't'], attributes: [0, 1] } },
  };
  const problems = artProblems(def);
  assert.equal(problems.length, 2, problems.join('\n'));
});

test('tiles bake to transparent 0 and flips mirror across the frame', () => {
  const px = tileRGBA(Array(8).fill('10000000'), [null, 0x112233, 0, 0]);
  assert.deepEqual([...px.subarray(0, 8)], [0x11, 0x22, 0x33, 255, 0, 0, 0, 0]);
  const placed = placeFrame({ parts: [{ tile: 'a', x: 0, y: 0 }, { tile: 'b', x: 16, y: 0 }] }, 100, 50, true);
  assert.deepEqual(placed.map((p) => [p.tile, p.x, p.flipX]), [['a', 116, true], ['b', 100, true]]);
  assert.deepEqual(tilePalettes({ cols: 3, rows: 2, attributes: [0, 1] }), [0, 0, 1, 0, 0, 1]);
});

test('the screen is 256x240 with 8 rows of overscan each end', () => {
  assert.equal(WIDTH, 256);
  assert.equal(HEIGHT, 240);
  assert.equal(SAFE, 8);
  assert.equal(integerZoom(1920, 1080), 4);
  assert.equal(integerZoom(100, 100), 1);
});

test('the master palette has 64 entries and nes() maps an index to a colour', () => {
  assert.equal(MASTER.length, 64);
  assert.equal(nes(0x0f), 0x000000);
  assert.equal(nes(0x30), 0xfcfcfc);
  assert.deepEqual(rgb(0x16), [0xd8, 0x28, 0x00]);
  assert.throws(() => nes(0x40));
  assert.throws(() => nes(-1));
});

test('a palette set is one backdrop with 4 bg and 4 sprite palettes of 3 NES indices', () => {
  const good = { backdrop: 0x0f, bg: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]], sprite: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]] };
  assert.deepEqual(paletteSetProblems(good), []);
  assert.ok(paletteSet(good));
  assert.equal(paletteSetProblems({ ...good, sprite: [[1, 2, 3, 4], ...good.sprite.slice(1)] }).length, 1);
  assert.equal(paletteSetProblems({ ...good, bg: good.bg.slice(0, 3) }).length, 1);
  assert.throws(() => paletteSet({ ...good, backdrop: 0x40 }));
});

test('a tile uses values 0-3 only', () => {
  const rows = ['01230123', '00000000', '33333333', '12121212', '00000000', '00000000', '00000000', '00000000'];
  assert.ok(tileValid(rows));
  assert.ok(!tileValid([...rows.slice(0, 7), '00000004']));
  assert.ok(!tileValid(rows.slice(0, 7)));
});

test('a sprite frame draws from one sprite palette', () => {
  assert.ok(frameOnePalette([{ x: 0, y: 0 }, { x: 8, y: 0, palette: 2 }], 2));
  assert.ok(!frameOnePalette([{ x: 0, y: 0 }, { x: 8, y: 0, palette: 1 }], 2));
  assert.ok(!frameOnePalette([{ x: 0, y: 0 }], 4));
});

test('each 16x16 attribute area uses one bg palette', () => {
  const ok = { cols: 4, rows: 2, palettes: [0, 0, 1, 1, 0, 0, 1, 1] };
  assert.deepEqual(attributeProblems(ok), []);
  const bad = { cols: 4, rows: 2, palettes: [0, 0, 1, 2, 0, 0, 1, 1] };
  assert.deepEqual(attributeProblems(bad), [[1, 0]]);
});

test('ten sprites on one row: 8 draw, the lowest priority 2 drop, and the drop rotates', () => {
  const row = Array.from({ length: 10 }, (_, i) => ({ x: i * 20, y: 100 }));
  const lines = scanlineVisible(row, 0);
  for (let y = 100; y < 108; y++) assert.equal(lines[y].length, 8);
  assert.equal(lines[99].length, 0);
  assert.equal(lines[108].length, 0);
  assert.deepEqual([...visibleSprites(row, 0)].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual([...visibleSprites(row, 1)].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...visibleSprites(row, 3)].sort((a, b) => a - b), [0, 3, 4, 5, 6, 7, 8, 9]);
  const shownCount = Array(10).fill(0);
  for (let f = 0; f < 10; f++) for (const i of visibleSprites(row, f)) shownCount[i]++;
  assert.deepEqual(shownCount, Array(10).fill(8));
});

test('sprites on different rows do not crowd each other', () => {
  const sprites = [
    ...Array.from({ length: 8 }, (_, i) => ({ x: i * 10, y: 20 })),
    ...Array.from({ length: 8 }, (_, i) => ({ x: i * 10, y: 28 })),
  ];
  assert.equal(visibleSprites(sprites, 5).size, 16);
  const overlap = [...sprites.slice(0, 8), { x: 0, y: 24 }];
  assert.equal(visibleSprites(overlap, 0).size, 8);
});

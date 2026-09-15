import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { WIDTH, HEIGHT, integerZoom } from '../src/snes/screen.mjs';
import { rgb15, channels, hex, css } from '../src/snes/color.mjs';
import { MAX_OAM, SIZES, paletteProblems, paletteSetProblems, scanlines, frameEntries } from '../src/snes/limits.mjs';
import { artProblems, cutFrame, entryValues, pixelAt, valuesRGBA } from '../src/snes/art.mjs';
import { platformFor } from '../src/platform.mjs';

const pal = (n = 15) => Array.from({ length: n }, (_, i) => rgb15(i, i, i));
const row = (n, size, y = 100) => Array.from({ length: n }, (_, i) => ({ x: i * 6, y, size }));

test('the screen is 256x224 and zooms by whole numbers', () => {
  assert.equal(WIDTH, 256);
  assert.equal(HEIGHT, 224);
  assert.equal(integerZoom(1920, 1080), 4);
  assert.equal(integerZoom(100, 100), 1);
});

test('?snes picks the SNES profile and the plain page stays the NES one', () => {
  const snes = platformFor(new URLSearchParams('?snes&hw'));
  assert.deepEqual([snes.name, snes.WIDTH, snes.HEIGHT, snes.crtLook], ['snes', 256, 224, 'snes']);
  const plain = platformFor(new URLSearchParams(''));
  assert.deepEqual([plain.name, plain.WIDTH, plain.HEIGHT, plain.background], ['nes', 256, 240, 0x000000]);
  assert.equal(snes.colour(rgb15(31, 0, 0)), 0xff0000);
});

test('rgb15 packs BGR555 channels of 0-31 and widens them to 8 bits', () => {
  assert.equal(rgb15(31, 0, 0), 0x001f);
  assert.equal(rgb15(0, 0, 31), 0x7c00);
  assert.deepEqual(channels(rgb15(3, 17, 29)), [3, 17, 29]);
  assert.equal(hex(rgb15(31, 31, 31)), 0xffffff);
  assert.equal(hex(rgb15(16, 0, 0)), 0x840000);
  assert.equal(css(rgb15(0, 31, 0)), '#00ff00');
  assert.throws(() => rgb15(32, 0, 0));
  assert.throws(() => rgb15(1.5, 0, 0));
  assert.throws(() => hex(0x8000));
});

test('a palette is 15 rgb15 colours, and a set holds 8 bg and 8 sprite palettes', () => {
  assert.deepEqual(paletteProblems(pal()), []);
  assert.equal(paletteProblems(pal(16)).length, 1);
  assert.equal(paletteProblems([...pal(14), 0x8000]).length, 1);
  assert.deepEqual(paletteSetProblems({ bg: Array(8).fill(pal()), sprite: Array(8).fill(pal()) }), []);
  assert.equal(paletteSetProblems({ bg: Array(9).fill(pal()), sprite: [] }).length, 1);
});

test('36 entries on one line: the 32 highest priority draw, the rest drop, every frame the same', () => {
  const entries = row(36, 8);
  const lines = scanlines(entries);
  for (let y = 100; y < 108; y++) assert.equal(lines[y].shown.length, 32);
  assert.equal(lines[99].wanted, 0);
  const first = frameEntries(entries);
  assert.deepEqual([...first.shown], Array.from({ length: 32 }, (_, i) => i));
  assert.equal(first.stats.dropped, 4);
  assert.deepEqual([...frameEntries(entries).shown], [...first.shown]);
});

test('time over: 34 tiles a line, a 32x32 counting 4', () => {
  assert.equal(frameEntries(row(9, 32)).stats.dropped, 1);
  assert.equal(frameEntries(row(8, 32)).stats.dropped, 0);
  assert.equal(frameEntries(row(20, 16)).stats.dropped, 3);
  const mixed = [...row(8, 32), { x: 0, y: 100, size: 16 }, { x: 20, y: 100, size: 16 }];
  const { shown } = frameEntries(mixed);
  assert.ok(shown.has(8));
  assert.ok(!shown.has(9));
});

test('entries on different lines do not crowd each other; past 128 and 8 palettes they are off', () => {
  assert.equal(frameEntries([...row(32, 8, 20), ...row(32, 8, 28)]).shown.size, 64);
  const many = Array.from({ length: 130 }, (_, i) => ({ x: 0, y: (i % 13) * 17, size: 16 }));
  assert.equal(frameEntries(many).stats.overOam, 2);
  assert.equal(frameEntries(many).stats.count, MAX_OAM);
  const colours = Array.from({ length: 9 }, (_, i) => ({ x: i * 20, y: 0, size: 16, palette: `p${i}` }));
  const nine = frameEntries(colours);
  assert.equal(nine.stats.palettes, 8);
  assert.ok(!nine.shown.has(8));
});

function frameOf(w, h, fill) {
  return { w, h, pixels: Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (fill(x, y) ? '5' : '0')).join('')) };
}

function covered(frame, entries) {
  for (let y = 0; y < frame.h; y++) {
    for (let x = 0; x < frame.w; x++) {
      const owners = entries.filter((e) => entryValues(frame, e)[y - e.y]?.[x - e.x]);
      if (pixelAt(frame, x, y) && owners.length !== 1) return `pixel ${x},${y} drawn by ${owners.length}`;
    }
  }
  return '';
}

test('cutting a frame covers each opaque pixel with exactly one 16x16 or 32x32 entry', () => {
  const blob = frameOf(32, 32, (x, y) => x >= 20 && x < 30 && y >= 4 && y < 14);
  const cutBlob = cutFrame(blob);
  assert.deepEqual(cutBlob.map((e) => e.size), [16]);
  assert.equal(covered(blob, cutBlob), '');

  const full = frameOf(32, 32, () => true);
  assert.deepEqual(cutFrame(full).map((e) => [e.x, e.y, e.size]), [[0, 0, 32]]);

  const figure = frameOf(48, 56, (x, y) => Math.hypot(x - 24, y - 10) <= 8 || (y > 18 && x > 11 && x < 36) || (y > 43 && x % 10 < 6));
  const cut = cutFrame(figure);
  assert.ok(cut.every((e) => SIZES.includes(e.size)));
  assert.ok(cut.some((e) => e.size === 16) && cut.some((e) => e.size === 32));
  assert.equal(covered(figure, cut), '');
});

test('artProblems checks the palette, the pixel rows and the animation names', () => {
  const good = { palette: pal(), frames: { a: { w: 2, h: 2, pixels: ['0F', 'A1'] } } };
  assert.deepEqual(artProblems(good), []);
  assert.equal(artProblems({ ...good, palette: pal(4) }).length, 1);
  assert.equal(artProblems({ ...good, frames: { a: { w: 2, h: 2, pixels: ['0G', 'A1'] } } }).length, 1);
  assert.equal(artProblems({ ...good, frames: { a: { w: 2, h: 2, pixels: ['0F'] } } }).length, 1);
  assert.equal(artProblems({ ...good, animations: { walk: { frames: ['b'] } } }).length, 1);
  const px = valuesRGBA([[0, 1]], [rgb15(31, 0, 0)]);
  assert.deepEqual([...px], [0, 0, 0, 0, 255, 0, 0, 255]);
});

test('every SNES art module passes the limit checks', async () => {
  const dir = new URL('../src/snes/art/', import.meta.url);
  const names = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.mjs')) : [];
  assert.ok(names.includes('test.mjs'));
  for (const file of names) {
    const def = (await import(`../src/snes/art/${file}`)).default;
    assert.deepEqual(artProblems(def), [], file);
  }
});

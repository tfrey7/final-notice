import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { WIDTH, HEIGHT } from '../src/snes/screen.mjs';
import { rgb15, hex } from '../src/snes/color.mjs';
import {
  MAX_RUN, sceneProblems, hdmaProblems, lineFactors, layerScroll, floorTable, bakeScene, composeFrame,
} from '../src/snes/layers.mjs';

const pal = (c) => Array(15).fill(c);
const RED = rgb15(31, 0, 0);
const GREEN = rgb15(0, 31, 0);
const BLUE = rgb15(0, 0, 31);
const BACK = rgb15(3, 3, 3);
const solid = (palette, v = '1') => ({ palette, pixels: Array(8).fill(v.repeat(8)) });
const rows = (w, h, ch) => Array(h).fill(ch.repeat(w));

// BG2 red everywhere, BG1 green on its left half only, BG3 blue on its top row of tiles.
const scene = () => ({
  backdrop: BACK,
  palettes: [pal(RED), pal(GREEN), pal(BLUE)],
  tiles: { red: solid(0), green: solid(1), blue: solid(2) },
  layers: [
    { bg: 2, map: rows(32, 28, 'r'), legend: { r: 'red' }, scroll: [0.5, 0] },
    { bg: 1, map: rows(1, 28, 'g'.repeat(16) + '.'.repeat(16)), legend: { g: 'green' }, scroll: [1, 0] },
    { bg: 3, map: ['b'.repeat(32), ...rows(32, 27, '.')], legend: { b: 'blue' }, scroll: [0, 0] },
  ],
});

const at = (out, x, y) => {
  const o = (y * WIDTH + x) * 4;
  return (out[o] << 16) | (out[o + 1] << 8) | out[o + 2];
};

test('a legal Mode 1 scene has no problems', () => {
  assert.deepEqual(sceneProblems(scene()), []);
});

test('scene checks catch every broken limit', () => {
  const s = scene();
  s.tiles.blue = solid(2, '4');
  assert.match(sceneProblems(s).join(), /bg3 tile blue uses value 4, the layer draws 0-3/);

  const t = scene();
  t.tiles.red = { palette: 0, pixels: Array(8).fill('1111111') };
  assert.match(sceneProblems(t).join(), /tile red is not 8 rows/);

  const p = scene();
  p.palettes = Array(9).fill(pal(RED));
  assert.match(sceneProblems(p).join(), /more than 8 background palettes/);

  const q = scene();
  q.tiles.green.palette = 5;
  assert.match(sceneProblems(q).join(), /tile green names no palette/);

  const m = scene();
  m.layers[0].map = rows(129, 2, 'r');
  m.layers[1].legend = {};
  const found = sceneProblems(m).join();
  assert.match(found, /bg2 map is over 128 tiles a side/);
  assert.match(found, /bg1 map char g names no tile/);

  const d = scene();
  d.layers.push({ ...d.layers[0] }, { bg: 4, map: ['r'], legend: { r: 'red' } });
  assert.match(sceneProblems(d).join(), /bg2 appears twice.*Mode 1 has 1, 2 and 3/);
});

test('each layer scrolls at its own multiplier, wrapped to its map, and the HUD stays put', () => {
  const [bg2, bg1, bg3] = scene().layers;
  assert.deepEqual(layerScroll(bg1, 100, 0), [100, 0]);
  assert.deepEqual(layerScroll(bg2, 100, 0), [50, 0]);
  assert.deepEqual(layerScroll(bg3, 100, 0), [0, 0]);
  assert.deepEqual(layerScroll(bg1, 256 + 7, 0), [7, 0]);
  assert.deepEqual(layerScroll(bg1, -1, 0), [255, 0]);
});

test('the floor table is exact perspective inside the hdma limits', () => {
  const table = floorTable({ top: 160, horizon: 96 });
  assert.deepEqual(hdmaProblems(table), []);
  assert.ok(table.every(([n]) => n <= MAX_RUN));
  const f = lineFactors({ scroll: [1, 0], hdma: table });
  assert.equal(f.length, HEIGHT);
  assert.equal(f[0], 1);
  assert.equal(f[159], 1);
  assert.equal(f[160], 1);
  assert.equal(f[192], 1.5);
  assert.equal(f[223], (223 - 96) / 64);
  for (let y = 161; y < HEIGHT; y++) assert.ok(f[y] > f[y - 1]);
  assert.throws(() => floorTable({ top: 100, horizon: 120 }));
});

test('hdma checks reject a run over 127 lines and a table past the screen', () => {
  assert.match(hdmaProblems([[128, 1]]).join(), /128 lines, not 1-127/);
  assert.match(hdmaProblems([[127, 1], [98, 1]]).join(), /covers 225 lines/);
  assert.deepEqual(lineFactors({ scroll: [1, 0], hdma: [[10, 2]] }).slice(9, 12), [2, 2, 2]);
  const s = scene();
  s.layers.forEach((l) => { l.hdma = [[1, 1]]; });
  assert.deepEqual(sceneProblems(s), []);
});

test('composing draws BG2 under BG1 under BG3, transparent pixels show what is behind', () => {
  const s = scene();
  const out = composeFrame(s, bakeScene(s), 0, 0);
  assert.equal(at(out, 10, 100), hex(GREEN));
  assert.equal(at(out, 200, 100), hex(RED));
  assert.equal(at(out, 200, 3), hex(BLUE));
  s.layers[0].map = rows(32, 28, '.');
  const bare = composeFrame(s, bakeScene(s), 0, 0);
  assert.equal(at(bare, 200, 100), hex(BACK));
});

test('scrolling moves BG1 a whole step and one hdma line alone moves at its own rate', () => {
  const s = scene();
  const moved = composeFrame(s, bakeScene(s), 130, 0);
  assert.equal(at(moved, 10, 100), hex(RED));
  assert.equal(at(moved, 160, 100), hex(GREEN));
  s.layers[1].hdma = [[100, 1], [1, 0], [1, 1]];
  const bent = composeFrame(s, bakeScene(s), 130, 0);
  assert.equal(at(bent, 10, 100), hex(GREEN));
  assert.equal(at(bent, 10, 99), hex(RED));
  assert.equal(at(bent, 10, 101), hex(RED));
});

test('colour math tints only the enabled layer on its own lines', () => {
  const s = scene();
  s.math = [[10, 'none'], [10, 'half', rgb15(0, 0, 31), [2]], [10, 'sub', rgb15(31, 31, 31), [1]]];
  assert.deepEqual(sceneProblems(s), []);
  const out = composeFrame(s, bakeScene(s), 0, 0);
  assert.equal(at(out, 200, 9), hex(RED), 'line 9 is before the half run');
  assert.equal(at(out, 200, 15), 0x7f007f);
  assert.equal(at(out, 10, 15), hex(GREEN), 'BG1 is not enabled on the half run');
  assert.equal(at(out, 10, 25), 0);
  assert.equal(at(out, 200, 25), hex(RED));
  s.math = [[300, 'mix', 5, [4]]];
  assert.equal(sceneProblems(s).length, 4);
});

test('every Claims & Adjustments area is legal and inside its tile budget', async () => {
  const { default: claims } = await import('../src/snes/bg/claims.mjs');
  assert.deepEqual(claims.areas.map((a) => a.name), ['Reception', 'Service Floor']);
  for (const area of claims.areas) {
    assert.deepEqual(sceneProblems(area), [], area.name);
    assert.ok(Object.keys(area.tiles).length < 384, `${area.name} has ${Object.keys(area.tiles).length} tiles`);
  }
});

test('Internal Review, Executive Waiting and Vellum\'s office are legal, in budget, and reuse the title skyline', async () => {
  const { default: claims2, SKY_ROLL } = await import('../src/snes/bg/claims2.mjs');
  const { default: title, skyline } = await import('../src/snes/bg/ui.mjs');
  assert.deepEqual(claims2.areas.map((a) => a.name), ['Internal Review', 'Executive Waiting', "Vellum's office"]);
  for (const area of claims2.areas) {
    assert.deepEqual(sceneProblems(area), [], area.name);
    assert.ok(Object.keys(area.tiles).length < 384, `${area.name} has ${Object.keys(area.tiles).length} tiles`);
  }
  for (const area of claims2.areas.slice(1)) {
    const view = area.layers[0];
    assert.deepEqual([...view.map.slice(-SKY_ROLL), ...view.map.slice(0, -SKY_ROLL)], skyline.near.map, area.name);
    for (const [ch, name] of Object.entries(skyline.near.legend)) {
      assert.deepEqual(area.tiles[view.legend[ch]].pixels, title.tiles[name].pixels, `${area.name} ${name}`);
    }
  }
});

test('every background module passes the Mode 1 checks', async () => {
  const dir = new URL('../src/snes/bg/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs'));
  assert.ok(files.includes('test.mjs'));
  for (const file of files) {
    const def = (await import(`../src/snes/bg/${file}`)).default;
    assert.deepEqual(sceneProblems(def), [], file);
  }
});

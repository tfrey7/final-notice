import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH } from '../src/snes/screen.mjs';
import { AREAS } from '../src/snes/bg/archive.mjs';
import { areaProblems, bakeArea, composeArea, screens, sweep } from '../src/snes/bgart.mjs';
import { bakeScene, composeFrame, lineFactors } from '../src/snes/layers.mjs';
import { fromRgba } from '../src/snes/fx.mjs';

const byKey = Object.fromEntries(AREAS.map((a) => [a.key, a]));
const red = (c) => c & 31;
const green = (c) => (c >> 5) & 31;
const sum = (buf, x0, x1, y0, y1, ch) => {
  let s = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) s += ch(buf[y * WIDTH + x]);
  return s;
};
const mainOnly = (area, camX) => {
  const { main } = screens(area);
  return fromRgba(composeFrame(main, bakeScene(main), camX, 0));
};

test('areas 1-3 stay inside Mode 1: three layers, eight palettes, BG3 on the sub screen', () => {
  assert.deepEqual(AREAS.map((a) => a.key), ['access', 'retention', 'original']);
  for (const area of AREAS) {
    assert.deepEqual(areaProblems(area), [], area.key);
    assert.deepEqual(area.scene.layers.map((l) => l.bg).sort(), [1, 2, 3]);
    const { main, sub } = screens(area);
    assert.deepEqual(sub.layers.map((l) => l.bg), [3]);
    assert.equal(main.layers.length, 2);
  }
  assert.match(areaProblems({ ...byKey.access, sub: [4] }).join(), /bg4/);
});

test('the stacks give three planes of depth: gallery, stacks and the play layer', () => {
  const bg2 = byKey.access.scene.layers.find((l) => l.bg === 2);
  const f = lineFactors(bg2);
  assert.equal(f[40], 0.25);
  assert.equal(f[150], 0.5);
});

test('reading lamps brighten what is under them and nothing far from them', () => {
  const area = byKey.access;
  const lit = composeArea(area, bakeArea(area), 0);
  const plain = mainOnly(area, 0);
  assert.ok(sum(lit, 76, 92, 100, 140, red) > sum(plain, 76, 92, 100, 140, red) + 200);
  assert.equal(sum(lit, 200, WIDTH, 100, 140, red), sum(plain, 200, WIDTH, 100, 140, red));
});

test('the wax front tints the left of the screen red wherever the camera is', () => {
  const area = byKey.retention;
  const baked = bakeArea(area);
  for (const camX of [0, 300]) {
    const tinted = composeArea(area, baked, camX);
    const plain = mainOnly(area, camX);
    assert.ok(sum(tinted, 0, 40, 60, 160, red) > sum(tinted, 0, 40, 60, 160, green) * 2);
    assert.equal(sum(tinted, 160, WIDTH, 60, 160, red), sum(plain, 160, WIDTH, 60, 160, red));
  }
});

test('the camera sweeps out and back inside the span', () => {
  assert.equal(sweep(100, 0), 0);
  assert.equal(sweep(100, 2500), 100);
  assert.equal(sweep(100, 3750), 50);
  assert.equal(sweep(0, 999), 0);
});

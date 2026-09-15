import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH } from '../src/snes/screen.mjs';
import { AREAS, BELTS, EDGE, FRAMES, PRESS, SEALS } from '../src/snes/bg/disposal.mjs';
import { areaProblems, bakeArea, composeArea, screens } from '../src/snes/bgart.mjs';
import { bakeScene, composeFrame } from '../src/snes/layers.mjs';
import { fromRgba } from '../src/snes/fx.mjs';
import { AREAS as STRIP, BUILT_IN } from '../src/stage2/areas.mjs';

const byKey = Object.fromEntries(AREAS.map((a) => [a.key, a]));
const red = (c) => c & 31;
const green = (c) => (c >> 5) & 31;
const sum = (buf, x0, x1, y0, y1, ch) => {
  let s = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) s += ch(buf[y * WIDTH + x]);
  return s;
};
const bg = (scene, n) => scene.layers.find((l) => l.bg === n);
const tileAt = (scene, n, x, y) => bg(scene, n).legend[bg(scene, n).map[y][x]];
const mainOnly = (area, camX) => {
  const { main } = screens(area);
  return fromRgba(composeFrame(main, bakeScene(main), camX, 0));
};

test('every frame of areas 4-5 stays inside Mode 1: three layers, BG3 alone on the sub screen', () => {
  assert.deepEqual(AREAS.map((a) => a.key), ['line', 'front', 'seal']);
  for (const area of AREAS) {
    assert.equal(area.frames.length, FRAMES);
    assert.equal(area.scene, area.frames[0]);
    for (const scene of area.frames) {
      assert.deepEqual(areaProblems({ ...area, scene }), [], area.key);
      assert.deepEqual(scene.layers.map((l) => l.bg).sort(), [1, 2, 3]);
      assert.deepEqual(screens({ ...area, scene }).sub.layers.map((l) => l.bg), [3]);
    }
  }
});

test('belts and seals sit where the stage puts them, and the belt treads move frame to frame', () => {
  const line = byKey.line;
  const map = BUILT_IN.disposalLine;
  for (const [a, b, d] of BELTS) for (let col = a; col <= b; col++) assert.equal(map[13][col], d > 0 ? '>' : '<');
  for (const col of SEALS) assert.equal(map[12][col], 'S');
  assert.equal(STRIP.find((s) => s.name === 'disposalLine').cols * 2, bg(line.scene, 1).map[0].length);
  const x = BELTS[0][0] * 2 + 3;
  const treads = line.frames.map((s) => tileAt(s, 1, x, 26));
  assert.equal(new Set(treads).size, FRAMES);
  assert.notDeepEqual(line.scene.tiles[treads[0]].pixels, line.scene.tiles[treads[1]].pixels);
  assert.match(tileAt(line.scene, 1, SEALS[0] * 2, 12), /^seal/);
});

test('the wax front tints the left of the screen red and its edge flashes', () => {
  const area = byKey.front;
  for (const camX of [0, 300]) {
    const tinted = composeArea(area, bakeArea(area), camX);
    const plain = mainOnly(area, camX);
    assert.ok(sum(tinted, 0, 40, 60, 160, red) > sum(tinted, 0, 40, 60, 160, green) * 2);
    assert.equal(sum(tinted, 200, WIDTH, 60, 160, red), sum(plain, 200, WIDTH, 60, 160, red));
  }
  assert.equal(area.frames[0].palettes[6][2], EDGE[0]);
  assert.notEqual(EDGE[0], EDGE[2]);
  const edge = (f) => { const baked = bakeArea({ ...area, scene: area.frames[f] }); return composeArea({ ...area, scene: area.frames[f] }, baked, 0); };
  assert.notDeepEqual(edge(0), edge(2));
});

test('the arena leaves the press its space: nothing on BG1 between the housing columns', () => {
  const g = bg(byKey.seal.scene, 1);
  for (let y = PRESS.y0; y <= PRESS.y1; y++) assert.equal(g.map[y].slice(PRESS.x0, PRESS.x1 + 1), '.'.repeat(PRESS.x1 - PRESS.x0 + 1), `row ${y}`);
  assert.match(tileAt(byKey.seal.scene, 1, 8, 10), /^col/);
  assert.match(tileAt(byKey.seal.scene, 1, 36, 10), /^bulk/);
});

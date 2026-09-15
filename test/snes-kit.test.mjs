import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneProblems } from '../src/snes/layers.mjs';
import { BANDS, BAND_PALETTES, MAT, bandOf, palettesAt } from '../src/snes/kit/palettes.mjs';
import { painter, cut } from '../src/snes/kit/paint.mjs';
import { PROPS } from '../src/snes/kit/props.mjs';
import { buildArea } from '../src/snes/kit/area.mjs';
import { RECEPTION } from '../src/snes/bg/reception.mjs';

test('every band keeps eight palettes of fifteen with the common slots shared inside a band', () => {
  for (const band of BANDS) {
    const pals = BAND_PALETTES[band];
    assert.equal(pals.length, 8);
    for (const p of pals) assert.equal(p.length, 15);
    for (const p of pals.slice(2, 7)) assert.deepEqual(p.slice(0, 5), pals[1].slice(0, 5), band);
  }
});

test('descent picks the band and lerps the palettes between anchors', () => {
  assert.deepEqual([bandOf(0), bandOf(30), bandOf(80)], ['corporate', 'backrooms', 'gothic']);
  assert.deepEqual(palettesAt(0), BAND_PALETTES.corporate);
  assert.deepEqual(palettesAt(100), BAND_PALETTES.gothic);
  const mid = palettesAt(31);
  assert.notDeepEqual(mid, BAND_PALETTES.corporate);
  assert.notDeepEqual(mid, BAND_PALETTES.backrooms);
});

test('cutting a painter refuses a tile that mixes two material palettes, and common slots fit any', () => {
  const p = painter(2, 1);
  p.rect(0, 0, 8, 8, 'wall', 1);
  p.set(1, 1, 'wood', 0);
  p.rect(8, 0, 8, 8, 'shadow');
  const tiles = {};
  const { map } = cut(p, 't', tiles, 2);
  assert.equal(tiles.t0.palette, MAT.wood.pal);
  assert.equal(tiles.t1.palette, 2);
  assert.equal(map[0].length, 2);
  p.set(2, 2, 'steel', 0);
  assert.throws(() => cut(p, 'u', {}, 2), /mixes palettes/);
});

test('every prop draws in every band as a legal area', () => {
  for (const band of BANDS) {
    const props = Object.keys(PROPS).map((prop, i) => ({ prop, x: 8 + i * 96, y: PROPS[prop].anchor === 'wall' ? 40 : undefined }));
    const area = buildArea({ name: `props ${band}`, band, descent: { corporate: 0, backrooms: 50, gothic: 95 }[band], cols: 128, props });
    assert.deepEqual(sceneProblems(area), [], band);
  }
});

test('the kit-built Reception is legal, in budget, and the same description builds in every band', () => {
  for (const descent of [3, 52, 90]) {
    const area = buildArea({ ...RECEPTION, descent });
    assert.deepEqual(sceneProblems(area), [], `descent ${descent}`);
    assert.ok(Object.keys(area.tiles).length < 384, `descent ${descent} has ${Object.keys(area.tiles).length} tiles`);
    assert.deepEqual(area.layers.map((l) => l.bg), [2, 1, 3]);
  }
});

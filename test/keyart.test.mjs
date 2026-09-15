import { test } from 'node:test';
import assert from 'node:assert/strict';
import { W, H, LAYERS, PALETTES, CONCEPTS, paintKeyArt, textWidth } from '../src/snes/keyart.mjs';
import { paletteSetProblems, COLOURS } from '../src/snes/limits.mjs';

test('each key-art layer has one legal 15-colour palette', () => {
  assert.deepEqual(Object.keys(PALETTES), LAYERS);
  assert.deepEqual(paletteSetProblems({ bg: Object.values(PALETTES) }), []);
});

test('every concept paints 256x224 layers inside their palettes', () => {
  for (const concept of Object.values(CONCEPTS)) {
    const art = paintKeyArt(concept);
    for (const name of LAYERS) {
      const px = art.layers[name];
      assert.equal(px.length, W * H, name);
      assert.ok(px.every((v) => v <= COLOURS), `${concept.name} ${name} stays within its palette`);
    }
    assert.ok(art.layers.sky.every((v) => v > 0), 'the sky covers the whole screen');
  }
});

test('the painting is deterministic and the title fits the screen', () => {
  assert.deepEqual(paintKeyArt(CONCEPTS.a).layers.tower, paintKeyArt(CONCEPTS.a).layers.tower);
  assert.ok(textWidth('FINAL NOTICE') < W - 40);
});

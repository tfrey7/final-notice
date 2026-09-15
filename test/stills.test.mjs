import test from 'node:test';
import assert from 'node:assert/strict';
import { STILLS } from '../src/snes/stills.mjs';
import { STAGING } from '../src/story/staging.mjs';

test('every digitized still fits the SNES: 16-colour 15-bit palettes chosen per 8x8 tile', () => {
  for (const [name, s] of Object.entries(STILLS)) {
    assert.ok(s.palettes.length <= 8, name);
    for (const pal of s.palettes) {
      assert.equal(pal.length, 16, name);
      assert.ok(pal.flat().every((c) => Number.isInteger(c) && c >= 0 && c <= 31), name);
    }
    assert.deepEqual(s.palettes.map((p) => p[0]), s.palettes.map(() => s.palettes[0][0]), `${name} shares colour 0`);
    assert.equal(s.tiles.length, (s.w >> 3) * (s.h >> 3), name);
    assert.ok([...s.tiles].every((t) => parseInt(t, 16) < s.palettes.length), name);
    assert.equal(s.pixels.length, s.h, name);
    assert.ok(s.pixels.every((row) => row.length === s.w && /^[0-9a-f]+$/.test(row)), name);
  }
});

test('every still Scene 1 stages exists', () => {
  const named = STAGING.assignment.beats.map((b) => b.still).filter(Boolean);
  assert.deepEqual(named.filter((n) => !STILLS[n]), []);
  assert.ok(named.length >= 4);
});

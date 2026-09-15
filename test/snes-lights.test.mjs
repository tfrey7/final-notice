import test from 'node:test';
import assert from 'node:assert/strict';
import { hex } from '../src/snes/color.mjs';
import { bakeScene, composeFrame, sceneProblems } from '../src/snes/layers.mjs';
import { DARK_WINDOW, FLOORS, FLOOR_ORDER, KEPT_FLOOR, afterHours, litWindow, setFloors } from '../src/snes/bg/ui.mjs';
import { INTRO_BEATS, INTRO_FRAMES, TITLE_BPM, lightsOut } from '../src/snes/lights.mjs';
import song, { BAR_ROWS } from '../src/snes/audio/songs/title.mjs';

test('the beat and the intro come from the title song: four bars, a beat every four rows', () => {
  assert.equal(INTRO_BEATS, 16);
  assert.equal(INTRO_FRAMES, 4 * BAR_ROWS * song.tempo);
  assert.equal(Math.round(3600 / TITLE_BPM), song.tempo * 4);
});

test('lightsOut darkens one floor a beat after the first, with one clunk each, and stops at fifteen', () => {
  const beat = 3600 / TITLE_BPM;
  assert.deepEqual(lightsOut(0, TITLE_BPM), { beat: 0, dark: 0, clunk: false });
  assert.equal(lightsOut(beat - 1, TITLE_BPM).dark, 0);
  assert.deepEqual(lightsOut(beat, TITLE_BPM), { beat: 1, dark: 1, clunk: true });
  assert.equal(lightsOut(beat + 1, TITLE_BPM).clunk, false);
  assert.equal(lightsOut(8 * beat, TITLE_BPM).dark, 8);
  let clunks = 0;
  for (let f = 0; f < INTRO_FRAMES * 2; f++) if (lightsOut(f, TITLE_BPM).clunk) clunks++;
  assert.equal(clunks, FLOORS - 1);
  assert.equal(lightsOut(INTRO_FRAMES * 2, TITLE_BPM).dark, FLOORS - 1);
});

const count = (s, colour) => {
  const out = composeFrame(s, bakeScene(s), 0, 0);
  const want = hex(colour);
  let n = 0;
  for (let o = 0; o < out.length; o += 4) if (((out[o] << 16) | (out[o + 1] << 8) | out[o + 2]) === want) n++;
  return n;
};

test('After Hours is a legal Mode 1 scene and floors go dark by palette writes alone', () => {
  const s = afterHours();
  assert.deepEqual(sceneProblems(s), []);
  const tiles = JSON.stringify(s.tiles);
  const warm = litWindow(KEPT_FLOOR);
  const allLit = count(s, warm);
  setFloors(s.palettes, 7);
  assert.equal(JSON.stringify(s.tiles), tiles);
  const half = count(s, warm);
  setFloors(s.palettes, FLOOR_ORDER.length);
  const one = count(s, warm);
  assert.ok(allLit > half && half > one && one > 0, `${allLit} > ${half} > ${one} > 0`);
  assert.ok(count(s, DARK_WINDOW) > 0);
  assert.equal(FLOOR_ORDER[0], 0);
});

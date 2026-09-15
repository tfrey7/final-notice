import test from 'node:test';
import assert from 'node:assert/strict';
import { hex } from '../src/snes/color.mjs';
import { MAX_TILESET, bakeScene, composeFrame, sceneProblems } from '../src/snes/layers.mjs';
import { FILES, GLINT_EVERY, PAL, STAMP_FRAMES, approvedStamp, glintBand, logo, logoPalette, logoTiles, mode7Problems, screens, skyline } from '../src/snes/bg/ui.mjs';
import { SNES_GLYPHS } from '../src/snes/text.mjs';

test('every front-end screen passes the Mode 1 checks', () => {
  assert.deepEqual(Object.keys(screens), ['title', 'select', 'hud', 'gameover', 'theend']);
  for (const [name, s] of Object.entries(screens)) {
    assert.deepEqual(sceneProblems(s), [], name);
    assert.ok(Object.keys(s.tiles).length <= MAX_TILESET, name);
  }
});

test('the skyline is two parallax layers, and THE END reuses its tiles', () => {
  assert.equal(skyline.far.bg, 2);
  assert.equal(skyline.near.bg, 1);
  assert.ok(skyline.far.scroll[0] < skyline.near.scroll[0]);
  const title = new Set(Object.keys(screens.title.tiles));
  const end = Object.keys(screens.theend.tiles);
  const shared = end.filter((t) => title.has(t));
  assert.ok(shared.length >= title.size * 0.9, `${shared.length} of ${title.size} skyline tiles reused`);
});

test('the title shows lit office windows', () => {
  const s = screens.title;
  const out = composeFrame(s, bakeScene(s), 0, 0);
  const warm = hex(s.palettes[PAL.near][3]);
  let lit = 0;
  for (let o = 0; o < out.length; o += 4) if (((out[o] << 16) | (out[o + 1] << 8) | out[o + 2]) === warm) lit++;
  assert.ok(lit > 500, `${lit} warm window pixels`);
});

test('the logo is a Mode 7-ready tile image in exactly 15 colours', () => {
  assert.deepEqual(mode7Problems(logo), []);
  assert.ok(logoTiles() <= 256);
  assert.equal(new Set(logo.pixels.join('').replace(/0/g, '')).size, 15);
  assert.match(mode7Problems({ ...logo, w: 175 }).join(), /not whole tiles/);
  assert.equal(new Set(logo.palette.slice(6)).size, 1, 'the highlight bands share one colour between glints');
  assert.equal(glintBand(0), -1);
  const bands = Array.from({ length: GLINT_EVERY * 2 }, (_, t) => glintBand(t)).filter((k) => k >= 0);
  assert.deepEqual([...new Set(bands)], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(bands.length, 2 * 30, 'two crossings in 12 s');
  assert.notDeepEqual(logoPalette(4), logo.palette);
  assert.deepEqual(logoPalette(-1), logo.palette);
});

test('select is two manila files on a green blotter under the skyline window', () => {
  const s = screens.select;
  assert.deepEqual(s.layers.map((l) => l.bg), [2, 1]);
  const out = composeFrame(s, bakeScene(s), 0, 0);
  const at = (x, y) => (out[(y * 256 + x) * 4] << 16) | (out[(y * 256 + x) * 4 + 1] << 8) | out[(y * 256 + x) * 4 + 2];
  const pal = s.palettes[PAL.frame];
  const manila = new Set([8, 9, 10, 11].map((v) => hex(pal[v - 1])));
  const blotter = new Set([5, 6, 7].map((v) => hex(pal[v - 1])));
  for (const fx of FILES.xs) assert.ok(manila.has(at(fx + 60, FILES.y + 70)), `file at ${fx}`);
  assert.ok(blotter.has(at(128, 150)), 'blotter between the files');
  for (const ch of 'PERSONNEL FILESA:SIGN OUT7BYKMRCWD') assert.ok(SNES_GLYPHS[ch], ch);
});

test('the APPROVED stamp comes down in four frames and rests inside its file', () => {
  const frames = Array.from({ length: STAMP_FRAMES }, (_, k) => approvedStamp(k));
  const width = (pts) => Math.max(...pts.map(([x]) => x)) - Math.min(...pts.map(([x]) => x));
  for (let k = 1; k < STAMP_FRAMES; k++) assert.ok(width(frames[k]) < width(frames[k - 1]), `frame ${k} shrinks`);
  assert.ok(width(frames[STAMP_FRAMES - 1]) < FILES.w - 8);
  assert.deepEqual(approvedStamp(9), frames[STAMP_FRAMES - 1]);
});

test('the HUD lives on BG3 and draws only its first three colours', () => {
  const hud = screens.hud.layers.find((l) => l.bg === 3);
  assert.ok(hud);
  assert.deepEqual(hud.scroll, [0, 0]);
  for (const name of Object.values(hud.legend)) assert.match(screens.hud.tiles[name].pixels.join(''), /^[0-3]+$/);
});

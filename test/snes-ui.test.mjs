import test from 'node:test';
import assert from 'node:assert/strict';
import { hex } from '../src/snes/color.mjs';
import { MAX_TILESET, bakeScene, composeFrame, sceneProblems } from '../src/snes/layers.mjs';
import { PAL, logo, logoTiles, mode7Problems, screens, skyline } from '../src/snes/bg/ui.mjs';

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
});

test('the HUD lives on BG3 and draws only its first three colours', () => {
  const hud = screens.hud.layers.find((l) => l.bg === 3);
  assert.ok(hud);
  assert.deepEqual(hud.scroll, [0, 0]);
  for (const name of Object.values(hud.legend)) assert.match(screens.hud.tiles[name].pixels.join(''), /^[0-3]+$/);
});

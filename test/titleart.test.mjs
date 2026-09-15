import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TITLE_ART } from '../src/snes/titleart.mjs';
import { RAIN, drops, glowStep, paintArt } from '../src/snes/titlepaint.mjs';
import { screen } from '../src/snes/fx.mjs';

const hexRows = (rows, w, h) => rows.length === h && rows.every((r) => r.length === w && /^[0-9a-f]+$/.test(r));
const channels = (pal) => pal.every(([r, g, b]) => [r, g, b].every((v) => Number.isInteger(v) && v >= 0 && v <= 31));

test('the back layer keeps to 8 BG palettes of 15 colours, one a tile', () => {
  const { back, w, h } = TITLE_ART;
  assert.equal(back.palettes.length, 8);
  assert.ok(back.palettes.every((p) => p.length === 15 && channels(p)));
  assert.equal(back.tiles.length, (w / 8) * (h / 8));
  assert.ok(hexRows(back.pixels, w, h));
});

test('the partners keep to 4 sprite palettes and are clear outside their tiles', () => {
  const { front, w, h } = TITLE_ART;
  assert.equal(front.palettes.length, 4);
  assert.ok(front.palettes.every((p) => p.length === 15 && channels(p)));
  assert.ok(hexRows(front.pixels, w, h));
  front.pixels.forEach((row, y) => [...row].forEach((v, x) => {
    if (front.tiles[(y >> 3) * (w / 8) + (x >> 3)] === '.') assert.equal(v, '0');
  }));
});

test('the logo is one 15-colour texture', () => {
  const { logo } = TITLE_ART;
  assert.ok(logo.palette.length <= 15 && channels(logo.palette));
  assert.ok(hexRows(logo.pixels, logo.w, logo.h));
});

test('the crown glows up through the intro and never goes past full', () => {
  assert.equal(glowStep(0, 448), 0);
  for (let f = 0; f < 1200; f += 7) assert.ok(glowStep(f, 448) >= 0 && glowStep(f, 448) <= 8);
  assert.ok(glowStep(448, 448) > glowStep(100, 448));
});

test('near rain falls faster than far rain and every frame paints the whole screen', () => {
  const moved = (sheet) => drops(sheet, 1).reduce((s, [, y], i) => s + (((y - drops(sheet, 0)[i][1]) + 400) % 400), 0) / sheet.count;
  assert.ok(moved(RAIN.near) > moved(RAIN.far));
  const buf = paintArt(screen(0xffff), 30, 448);
  assert.ok(buf.every((c) => c <= 0x7fff));
});

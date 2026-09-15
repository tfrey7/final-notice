import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH } from '../src/snes/screen.mjs';
import { logo } from '../src/snes/bg/ui.mjs';
import {
  IN_FRAMES, OUT_FRAMES, ZOOM_FRAMES, confirmed, inStep, logoZoom, mode7Texture, outStep, spotSub,
} from '../src/snes/scenes/front.mjs';

test('a screen mosaics in to 1 px at full brightness and out to 16 px in black', () => {
  assert.deepEqual(inStep(0), { mosaic: 16, level: 0, done: false });
  assert.deepEqual(inStep(IN_FRAMES), { mosaic: 1, level: 15, done: true });
  assert.deepEqual(outStep(0), { mosaic: 1, level: 15, done: false });
  assert.deepEqual(outStep(OUT_FRAMES), { mosaic: 16, level: 0, done: true });
  for (let f = 1; f <= OUT_FRAMES; f++) {
    assert.ok(outStep(f).mosaic >= outStep(f - 1).mosaic);
    assert.ok(outStep(f).level <= outStep(f - 1).level);
  }
});

test('the logo presses from 260% to full size in 20 frames by scale alone, easing out', () => {
  assert.equal(ZOOM_FRAMES, 20);
  assert.deepEqual(logoZoom(0), { scale: 2.6, done: false });
  assert.deepEqual(logoZoom(ZOOM_FRAMES), { scale: 1, done: true });
  for (let f = 1; f <= ZOOM_FRAMES; f++) assert.ok(logoZoom(f).scale < logoZoom(f - 1).scale);
  assert.ok(logoZoom(ZOOM_FRAMES / 2).scale < 1.5, 'most of the travel is in the first half');
});

test('the logo becomes a Mode 7 texture with its clear pixels transparent', () => {
  const tex = mode7Texture(logo);
  assert.equal(tex.px.length, logo.w * logo.h);
  assert.equal(tex.px[0], 0xffff);
  assert.ok(tex.px.some((c) => c !== 0xffff));
});

test('the spotlight lights its centre and nothing outside its cone', () => {
  const sub = spotSub(76, 116, 52, 70);
  assert.ok(sub[116 * WIDTH + 76] > 0);
  assert.equal(sub[116 * WIDTH + 180], 0);
  assert.equal(sub[10 * WIDTH + 76], 0);
});

test('menus confirm on Start, the NES A and the SNES A', () => {
  const pad = (b) => ({ pressed: new Set(b) });
  assert.ok(confirmed(pad(['start'])));
  assert.ok(confirmed(pad(['a'])));
  assert.ok(confirmed(pad(['injunction'])));
  assert.ok(!confirmed(pad(['b', 'left'])));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH } from '../src/snes/screen.mjs';
import { isRgb15 } from '../src/snes/color.mjs';
import { measure, BOX } from '../src/snes/text.mjs';
import { screen } from '../src/snes/fx.mjs';
import { startPlayer } from '../src/story/cinema.mjs';
import {
  BACKDROP_NAMES, CHANGE_FRAMES, FADE_OUT_FRAMES, PICTURE, PORTRAIT, SPIN_FRAMES,
  changeStep, fadeOutStep, paintPicture, snesWrap, spinStep,
} from '../src/snes/cinema.mjs';

test('the SNES cinema types the chosen auditor its own lines, wrapped to the text box by pixel width', () => {
  for (const [scene, auditor] of [['assignment', 'ward'], ['incident', 'mercer'], ['documents', 'ward']]) {
    const { pages } = startPlayer(scene, auditor, snesWrap);
    assert.ok(pages.length > 0);
    for (const page of pages) {
      assert.ok(page.lines.length <= BOX.rows);
      for (const line of page.lines) assert.ok(measure(line) <= BOX.w - 2 * BOX.pad, line);
    }
  }
  const ward = startPlayer('incident', 'ward', snesWrap).pages.map((p) => p.lines.join(' '));
  const mercer = startPlayer('incident', 'mercer', snesWrap).pages.map((p) => p.lines.join(' '));
  assert.ok(ward.includes('What incident?'));
  assert.ok(mercer.includes('Which incident?'));
  assert.ok(startPlayer('incident', 'ward', snesWrap).pages.some((p) => p.sound === 'alarm'));
});

test('a change of picture mosaics up on the old one and back down on the new', () => {
  assert.deepEqual(changeStep(0), { mosaic: 1, swap: false, done: false });
  assert.equal(changeStep(CHANGE_FRAMES / 2).mosaic, 16);
  assert.ok(changeStep(CHANGE_FRAMES / 2).swap);
  assert.ok(changeStep(CHANGE_FRAMES).done);
});

test('the alarm spin turns the room once in a second and settles square at full size', () => {
  const end = spinStep(SPIN_FRAMES);
  assert.ok(end.done);
  assert.ok(Math.abs(Math.cos(end.angle) - 1) < 1e-9);
  assert.equal(end.scale, 1);
  assert.equal(SPIN_FRAMES, 60);
  assert.ok(spinStep(SPIN_FRAMES / 2).scale < 1);
});

test('the fade out falls from full brightness to black', () => {
  assert.deepEqual(fadeOutStep(0), { level: 15, done: false });
  assert.deepEqual(fadeOutStep(FADE_OUT_FRAMES), { level: 0, done: true });
});

test('every backdrop and portrait paints real SNES colours inside the picture', () => {
  for (const backdrop of BACKDROP_NAMES) {
    for (const portrait of [null, 'bellwether', 'vellum', 'ward', 'mercer', 'speaker']) {
      const buf = paintPicture(screen(), { backdrop, portrait });
      assert.ok(buf.every(isRgb15));
      assert.ok(new Set(buf.subarray(0, PICTURE.w * PICTURE.h)).size > 8, backdrop);
      assert.ok(buf.subarray(PICTURE.h * WIDTH).every((c) => c === 0));
    }
  }
  const bare = paintPicture(screen(), { backdrop: 'break-room', portrait: null });
  const ward = paintPicture(screen(), { backdrop: 'break-room', portrait: 'ward' });
  const i = (PORTRAIT.y + 30) * WIDTH + PORTRAIT.x + 32;
  assert.notEqual(bare[i], ward[i]);
});

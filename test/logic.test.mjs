import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT, integerZoom, blinkVisible, skyline } from '../src/screen.mjs';
import { textWidth, textPixels, hasGlyph } from '../src/font.mjs';

test('the composition is 224 high at 4:3', () => {
  assert.equal(HEIGHT, 224);
  assert.ok(Math.abs(WIDTH / HEIGHT - 4 / 3) < 0.01);
});

test('zoom is the largest whole number that fits, never below 1', () => {
  assert.equal(integerZoom(1920, 1080), 4);
  assert.equal(integerZoom(WIDTH * 3 - 1, 5000), 2);
  assert.equal(integerZoom(100, 100), 1);
});

test('PRESS START blinks on then off', () => {
  assert.equal(blinkVisible(0), true);
  assert.equal(blinkVisible(700), false);
  assert.equal(blinkVisible(1040), true);
});

test('the skyline is the same every load and spans the screen', () => {
  const a = skyline(1989);
  assert.deepEqual(a, skyline(1989));
  const last = a[a.length - 1];
  assert.equal(a[0].x, 0);
  assert.ok(last.x + last.w >= WIDTH);
});

test('every title letter has a glyph and the title fits the screen', () => {
  for (const ch of 'FINAL NOTICE PRESS START') assert.ok(hasGlyph(ch), ch);
  assert.ok(textWidth('FINAL NOTICE', 3) < WIDTH);
  const px = textPixels('I', 2);
  assert.ok(px.every(([x, y]) => x >= 0 && x < 10 && y >= 0 && y < 14));
});

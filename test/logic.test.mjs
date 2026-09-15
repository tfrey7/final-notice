import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT, integerZoom } from '../src/screen.mjs';

test('the composition is 224 high at 4:3', () => {
  assert.equal(HEIGHT, 224);
  assert.ok(Math.abs(WIDTH / HEIGHT - 4 / 3) < 0.01);
});

test('zoom is the largest whole number that fits, never below 1', () => {
  assert.equal(integerZoom(1920, 1080), 4);
  assert.equal(integerZoom(WIDTH * 3 - 1, 5000), 2);
  assert.equal(integerZoom(100, 100), 1);
});

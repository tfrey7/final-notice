import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESS_IN, SLIP, VELLUM_IN, pressEntrance, skipTo, slipFrame, vellumEntrance } from '../src/snes/entrance.mjs';
import { CARD_TIMES } from '../src/snes/stage1/boss.mjs';
import { CARD } from '../src/snes/stage2/seal.mjs';

const EIGHT_SECONDS = 8 * 60;

test('each entrance with its card is under eight seconds', () => {
  assert.ok(VELLUM_IN.end + CARD_TIMES.leave < EIGHT_SECONDS);
  assert.ok(SLIP.leave < EIGHT_SECONDS);
  assert.ok(PRESS_IN.end + CARD.in + CARD.hold + CARD.out < EIGHT_SECONDS);
});

test('the camera pans 96 px into the office, then Vellum stands', () => {
  assert.equal(vellumEntrance(0).pan, 96);
  assert.equal(vellumEntrance(VELLUM_IN.pan).pan, 0);
  assert.equal(vellumEntrance(VELLUM_IN.pan).stand, 0);
  assert.equal(vellumEntrance(VELLUM_IN.pan + VELLUM_IN.stand).stand, 1);
  assert.ok(!vellumEntrance(VELLUM_IN.end - 1).done);
  assert.ok(vellumEntrance(VELLUM_IN.end).done);
});

test('the Custodian slip slams once and leaves', () => {
  assert.equal(slipFrame(0).rise, 1);
  assert.equal(slipFrame(SLIP.drop).rise, 0);
  assert.equal([...Array(SLIP.leave).keys()].filter((t) => slipFrame(t).slamNow).length, 1);
  assert.ok(slipFrame(SLIP.leave).done);
});

test('the press scales 0.6 to 1.4 over two seconds with its shadow', () => {
  assert.equal(PRESS_IN.lower, 120);
  assert.equal(pressEntrance(0).scale, 0.6);
  assert.equal(pressEntrance(0).shadow, 0);
  assert.ok(Math.abs(pressEntrance(PRESS_IN.lower).scale - 1.4) < 1e-9);
  assert.equal(pressEntrance(PRESS_IN.lower).shadow, 1);
  assert.ok(pressEntrance(60).scale < pressEntrance(61).scale);
});

test('Start skips to the last frame', () => {
  assert.equal(skipTo(5, { pressed: new Set(['start']) }, 138), 138);
  assert.equal(skipTo(5, { pressed: new Set() }, 138), 5);
});

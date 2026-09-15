import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOSE_AT, CREDITS_AT, FLOORS, LEDGER_AT, LEDGER_FRAMES, MOSAIC_FRAMES, STAMP_AT, STAMP_FRAMES, TICK_EVERY,
  endAt, endingAt, endingCues, endingStep, fadeAt, floorWindow, floorsOut, leaveAt,
} from '../src/snes/ending.mjs';
import { CREDITS } from '../src/story/script.mjs';

const pad = (...buttons) => ({ pressed: new Set(buttons) });

test('E1 fades in on the file and lays the ledger in over 12 frames', () => {
  assert.deepEqual([endingAt(0).board, endingAt(0).level, endingAt(0).ledger], ['E1', 0, 0]);
  assert.equal(endingAt(LEDGER_AT + LEDGER_FRAMES / 2).ledger, 0.5);
  assert.equal(endingAt(LEDGER_AT + LEDGER_FRAMES).ledger, 1);
  assert.equal(endingAt(STAMP_AT - 1).stamp, null);
});

test('E2 stamps EVIDENCE from scale 3.0 to 1.8 in 10 frames, one flash frame, then a 2 px shake', () => {
  assert.equal(endingAt(STAMP_AT).board, 'E2');
  assert.equal(endingAt(STAMP_AT).stamp, 3);
  assert.ok(Math.abs(endingAt(STAMP_AT + STAMP_FRAMES).stamp - 1.8) < 1e-9);
  for (let f = STAMP_AT + 1; f <= STAMP_AT + STAMP_FRAMES; f++) assert.ok(endingAt(f).stamp < endingAt(f - 1).stamp);
  const flashes = Array.from({ length: CREDITS_AT }, (_, f) => endingAt(f).flash).filter(Boolean);
  assert.equal(flashes.length, 1);
  assert.equal(endingAt(STAMP_AT + STAMP_FRAMES).flash, true);
  const shakes = Array.from({ length: CREDITS_AT }, (_, f) => endingAt(f).shake);
  assert.ok(shakes.every((s) => Math.abs(s) <= 2));
  assert.deepEqual(endingCues(STAMP_AT + STAMP_FRAMES), ['stamp']);
});

test('E3 closes the file, then a mosaic grows 1 to 16 and shrinks on the tower', () => {
  assert.deepEqual([endingAt(CLOSE_AT).board, endingAt(CLOSE_AT).closed], ['E3', 0]);
  assert.equal(endingAt(CREDITS_AT - MOSAIC_FRAMES - 1).mosaic, 1);
  assert.equal(endingAt(CREDITS_AT - 1).mosaic, 16);
  assert.equal(endingAt(CREDITS_AT - 1).closed, 1);
  assert.deepEqual([endingAt(CREDITS_AT).picture, endingAt(CREDITS_AT).mosaic], ['tower', 16]);
  assert.equal(endingAt(CREDITS_AT + MOSAIC_FRAMES).mosaic, 1);
});

test('E4 puts one floor out per credit line, top down, all of them by THE END', () => {
  assert.equal(FLOORS, CREDITS.filter(Boolean).length);
  assert.equal(floorsOut(CREDITS_AT), 0);
  let last = 0;
  for (let f = CREDITS_AT; f < endAt(); f++) {
    const n = floorsOut(f);
    assert.ok(n === last || n === last + 1);
    last = n;
  }
  assert.equal(last, FLOORS);
  assert.equal(endingAt(endAt() - 1).board, 'E4');
});

test('a dark floor\'s band windows out everything but the clerk\'s one window on the bottom floor', () => {
  const keep = { left: 180, right: 183 };
  assert.deepEqual(floorWindow(2, 2, FLOORS, keep), [{ left: 0, right: 255 }]);
  const [dark] = floorWindow(1, 2, FLOORS, keep);
  assert.ok(dark.left > dark.right);
  assert.deepEqual(floorWindow(FLOORS - 1, FLOORS, FLOORS, keep), [keep]);
});

test('E5 holds THE END to the clock tick alone, fades to black, then goes to the title', () => {
  assert.equal(endingAt(endAt()).board, 'E5');
  assert.equal(endingAt(fadeAt() - 1).level, 15);
  assert.equal(endingAt(leaveAt()).level, 0);
  assert.deepEqual(endingCues(endAt()), ['tick']);
  assert.deepEqual(endingCues(endAt() + TICK_EVERY), ['tick']);
  assert.deepEqual(endingCues(endAt() + 1), []);
  assert.deepEqual(endingCues(CLOSE_AT), ['paper']);
  assert.equal(endingStep(leaveAt() - 1, pad()).event, 'title');
});

test('Start skips to THE END, and Start there leaves', () => {
  assert.deepEqual(endingStep(10, pad('start')), { frame: endAt(), event: null });
  assert.deepEqual(endingStep(10, pad()), { frame: 11, event: null });
  assert.equal(endingStep(endAt(), pad('start')).event, 'title');
});

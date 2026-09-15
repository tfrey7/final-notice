import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BILL_AT, COUNT_TO, END_AT, FADE_FRAMES, MOSAIC_FRAMES, OFFICE_AT, TILT_AT, TILT_FRAMES, TILT_PX,
  countText, openingAt, openingCues, openingStep,
} from '../src/snes/opening.mjs';

const pad = (...buttons) => ({ pressed: new Set(buttons) });

test('the opening fades in from black over its first 32 frames', () => {
  assert.equal(openingAt(0).level, 0);
  assert.ok(openingAt(FADE_FRAMES >> 1).level > 0 && openingAt(FADE_FRAMES >> 1).level < 15);
  assert.equal(openingAt(FADE_FRAMES).level, 15);
  assert.equal(openingAt(0).board, 'O1');
});

test('the tilt scrolls the tower 160 px in 4 s and the skyline at half speed', () => {
  assert.deepEqual([openingAt(TILT_AT).bg1Y, openingAt(TILT_AT).bg2Y], [TILT_PX, TILT_PX / 2]);
  const mid = openingAt(TILT_AT + TILT_FRAMES / 2);
  assert.equal(mid.board, 'O2');
  assert.deepEqual([mid.bg1Y, mid.bg2Y], [80, 40]);
  assert.deepEqual([openingAt(TILT_AT + TILT_FRAMES).bg1Y, openingAt(TILT_AT + TILT_FRAMES).bg2Y], [0, 0]);
  for (let f = TILT_AT + 1; f <= TILT_AT + TILT_FRAMES; f++) assert.ok(openingAt(f).bg1Y <= openingAt(f - 1).bg1Y);
});

test('a mosaic grows to 16 px on the tower and shrinks to 1 on the office', () => {
  assert.equal(openingAt(OFFICE_AT - 1).mosaic, 1);
  assert.equal(openingAt(OFFICE_AT + (MOSAIC_FRAMES >> 1) - 1).mosaic, 16);
  assert.equal(openingAt(OFFICE_AT + (MOSAIC_FRAMES >> 1) - 1).picture, 'tower');
  assert.equal(openingAt(OFFICE_AT + (MOSAIC_FRAMES >> 1)).mosaic, 16);
  assert.equal(openingAt(OFFICE_AT + (MOSAIC_FRAMES >> 1)).picture, 'office');
  assert.equal(openingAt(OFFICE_AT + MOSAIC_FRAMES).mosaic, 1);
  assert.equal(openingAt(OFFICE_AT + MOSAIC_FRAMES).board, 'O3');
});

test('the bill feeds 1 px a frame and counts 01 to 47, one blip a count', () => {
  assert.deepEqual([openingAt(BILL_AT).board, openingAt(BILL_AT).count, openingAt(BILL_AT).billY], ['O4', 1, 0]);
  assert.equal(openingAt(BILL_AT + 10).billY, 10);
  assert.equal(openingAt(END_AT - 1).count, COUNT_TO);
  let blips = 0;
  for (let f = 0; f < END_AT; f++) blips += openingCues(f).filter((c) => c === 'count').length;
  assert.equal(blips, COUNT_TO);
  assert.equal(countText(1), 'LIFETIMES BILLED:  01');
  assert.equal(countText(47), 'LIFETIMES BILLED:  47');
});

test('the clock ticks once a second until the office', () => {
  assert.deepEqual(openingCues(0), ['tick']);
  assert.deepEqual(openingCues(1), []);
  assert.deepEqual(openingCues(OFFICE_AT), []);
});

test('Start skips to the title from any frame; otherwise part 1 runs to its end', () => {
  for (const f of [0, TILT_AT + 7, OFFICE_AT + 3, BILL_AT + 20]) assert.equal(openingStep(f, pad('start')).event, 'title');
  assert.deepEqual(openingStep(5, pad()), { frame: 6, event: null });
  assert.equal(openingStep(END_AT - 1, pad()).event, 'title');
});

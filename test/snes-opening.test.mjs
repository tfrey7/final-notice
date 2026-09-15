import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BILL_AT, COUNT_TO, DOORS_AT, DOORS_FRAMES, DOOR_HALF, END_AT, FADE_FRAMES, FADE_OUT_AT, LIFT_AT, MOSAIC_FRAMES,
  OFFICE_AT, SEEN_KEY, SETTLE_FRAMES, SHAKE_FRAMES, STAMP_AT, TILT_AT, TILT_FRAMES, TILT_PX, TITLE_BAR,
  countText, openingAt, openingCues, openingStep, opensWithOpening,
} from '../src/snes/opening.mjs';

const pad = (...buttons) => ({ pressed: new Set(buttons) });
const cuesBetween = (from, to, name) => {
  const at = [];
  for (let f = from; f < to; f++) if (openingCues(f).includes(name)) at.push(f);
  return at;
};

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
  assert.equal(openingAt(STAMP_AT - 1).count, COUNT_TO);
  assert.equal(cuesBetween(0, END_AT, 'count').length, COUNT_TO);
  assert.equal(countText(1), 'LIFETIMES BILLED:  01');
  assert.equal(countText(47), 'LIFETIMES BILLED:  47');
});

test('the scene music starts on frame 0 and the clock ticks once a second until the office', () => {
  assert.deepEqual(openingCues(0), ['music', 'tick']);
  assert.deepEqual(openingCues(1), []);
  assert.deepEqual(openingCues(OFFICE_AT), []);
});

test('APPROVED lands at 150% and settles to 100%, then shakes 2 px and flashes', () => {
  const first = openingAt(STAMP_AT);
  assert.deepEqual([first.board, first.picture, first.scale], ['O5', 'stamp', 1.5]);
  for (let t = 1; t <= SETTLE_FRAMES; t++) assert.ok(openingAt(STAMP_AT + t).scale < openingAt(STAMP_AT + t - 1).scale);
  const landed = openingAt(STAMP_AT + SETTLE_FRAMES);
  assert.equal(landed.scale, 1);
  assert.equal(landed.flash, true);
  const shakes = Array.from({ length: SHAKE_FRAMES + 2 }, (_, i) => openingAt(STAMP_AT + SETTLE_FRAMES + i).shakeX);
  assert.deepEqual(shakes, [2, -2, 2, -2, 2, -2, 0, 0]);
  assert.equal(openingAt(STAMP_AT + SETTLE_FRAMES + 5).flash, false);
});

test('the music cuts as the stamp lands, and one second of silence follows', () => {
  const land = STAMP_AT + SETTLE_FRAMES;
  assert.deepEqual(openingCues(land), ['stamp', 'cut']);
  for (let f = land + 1; f < land + 60; f++) assert.deepEqual(openingCues(f), [], `frame ${f}`);
  assert.equal(LIFT_AT, land + 60);
  assert.deepEqual(openingCues(LIFT_AT), ['chime']);
});

test('the lift indicator climbs B3, B2, B1 with one chime a floor, doors shut', () => {
  const floors = [];
  for (let f = LIFT_AT; f < DOORS_AT; f++) {
    const at = openingAt(f);
    assert.equal(at.board, 'O6');
    assert.equal(at.doors, 0);
    if (floors.at(-1) !== at.floor) floors.push(at.floor);
  }
  assert.deepEqual(floors, ['B3', 'B2', 'B1']);
  assert.equal(cuesBetween(0, END_AT, 'chime').length, 3);
});

test('the doors part by a widening window as the title melody starts', () => {
  assert.deepEqual(openingCues(DOORS_AT), ['title']);
  assert.equal(openingAt(DOORS_AT).board, 'O7');
  assert.equal(openingAt(DOORS_AT).doors, 0);
  for (let f = DOORS_AT + 1; f <= DOORS_AT + DOORS_FRAMES; f++) assert.ok(openingAt(f).doors >= openingAt(f - 1).doors);
  assert.equal(openingAt(DOORS_AT + DOORS_FRAMES).doors, DOOR_HALF);
});

test('the fade starts on a downbeat of the title melody and reaches black at the end', () => {
  assert.equal((FADE_OUT_AT - DOORS_AT) % TITLE_BAR, 0);
  assert.equal(openingAt(FADE_OUT_AT - 1).level, 15);
  assert.equal(openingAt(FADE_OUT_AT).board, 'O8');
  assert.equal(openingAt(END_AT).level, 0);
  assert.equal(END_AT, 2400);
});

test('Start skips to the title from any frame; otherwise the opening runs to its end', () => {
  for (const f of [0, TILT_AT + 7, OFFICE_AT + 3, BILL_AT + 20, STAMP_AT + 4, LIFT_AT + 30, DOORS_AT + 50, FADE_OUT_AT + 2]) {
    assert.equal(openingStep(f, pad('start')).event, 'title');
  }
  assert.deepEqual(openingStep(5, pad()), { frame: 6, event: null });
  assert.equal(openingStep(STAMP_AT, pad()).event, null);
  assert.equal(openingStep(END_AT - 1, pad()).event, 'title');
});

test('a bare boot plays the opening once a session; ?go=opening always does', () => {
  const store = new Map();
  const session = { getItem: (k) => store.get(k) ?? null };
  const q = (s) => new URLSearchParams(s);
  assert.equal(opensWithOpening(q('snes'), session), true);
  store.set(SEEN_KEY, '1');
  assert.equal(opensWithOpening(q('snes'), session), false);
  assert.equal(opensWithOpening(q('snes&go=opening'), session), true);
  assert.equal(opensWithOpening(q('snes&go=stage1'), null), false);
  assert.equal(opensWithOpening(q('snes&t=40&memo=settings'), null), false);
  assert.equal(opensWithOpening(q('snes'), null), true);
});

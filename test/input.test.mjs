import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPad, updatePad, entered, keysToButtons, gamepadToButtons, scriptedButtons, DEMO_SCRIPT, DOUBLE_TAP_FRAMES,
} from '../src/input.mjs';

const run = (frames) => frames.reduce((pad, down, f) => updatePad(pad, new Set(down), f), createPad());

test('pressed and released last one frame, held lasts while down', () => {
  let pad = updatePad(createPad(), new Set(['a']), 0);
  assert.deepEqual([pad.pressed.has('a'), pad.held.has('a')], [true, true]);
  pad = updatePad(pad, new Set(['a']), 1);
  assert.deepEqual([pad.pressed.has('a'), pad.held.has('a')], [false, true]);
  pad = updatePad(pad, new Set(), 2);
  assert.deepEqual([pad.released.has('a'), pad.held.has('a')], [true, false]);
  assert.equal(updatePad(pad, new Set(), 3).released.size, 0);
});

test('A+B chord fires once, on the frame the second button joins', () => {
  const chords = [['a'], ['a', 'b'], ['a', 'b'], ['b'], ['a', 'b']].map((_, i, all) => run(all.slice(0, i + 1)).chord);
  assert.deepEqual(chords, [false, true, false, false, true]);
  assert.equal(run([['a', 'b']]).chord, true);
});

test('a double tap left or right is a dash; slow taps are not', () => {
  assert.equal(run([['right'], [], ['right']]).dash, 'right');
  const slow = [['left'], ...Array(DOUBLE_TAP_FRAMES + 1).fill([]), ['left']];
  assert.equal(run(slow).dash, null);
  assert.equal(run([['left'], [], ['right']]).dash, null);
  assert.equal(run([['right'], [], ['right'], [], ['right']]).dash, null, 'a third tap starts a new pair');
});

test('press history spells a secret code', () => {
  const pad = run([['up'], [], ['up'], [], ['down'], ['down', 'b'], []]);
  assert.equal(entered(pad, ['up', 'up', 'down', 'b']), true);
  assert.equal(entered(pad, ['down', 'up']), false);
});

test('keyboard maps onto the NES pad as the plan says', () => {
  assert.deepEqual([...keysToButtons(['ArrowLeft', 'KeyD', 'KeyZ', 'KeyK', 'ShiftLeft', 'Enter', 'KeyQ'])].sort(),
    ['a', 'b', 'left', 'right', 'select', 'start']);
});

test('gamepad buttons and the left stick map onto the pad', () => {
  const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: [0, 2, 9, 12].includes(i), value: 0 }));
  assert.deepEqual([...gamepadToButtons({ buttons, axes: [0.9, 0.1] })].sort(), ['a', 'b', 'right', 'start', 'up']);
  assert.equal(gamepadToButtons(null).size, 0);
});

test('a demo script holds its buttons for their frames', () => {
  const script = [{ at: 10, hold: 2, buttons: ['start'] }];
  assert.deepEqual([9, 10, 11, 12].map((f) => scriptedButtons(script, f).has('start')), [false, true, true, false]);
  assert.equal(scriptedButtons(DEMO_SCRIPT, DEMO_SCRIPT[0].at).has('start'), true);
});

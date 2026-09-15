import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT } from '../src/snes/screen.mjs';
import { rgb15, channels } from '../src/snes/color.mjs';
import {
  colorMath, brightness, crush, dipLevel, fadeLevel, mosaicSize, mode7Matrix, mode7Point, inWindow,
  screen, mathPass, brightnessPass, mosaicPass, windowPass, mode7Pass, fromRgba, toRgba,
} from '../src/snes/fx.mjs';

test('colour math adds and subtracts per channel, clamped to 0-31, and half halves', () => {
  const a = rgb15(20, 10, 31);
  const b = rgb15(20, 4, 2);
  assert.deepEqual(channels(colorMath(a, b, 'add')), [31, 14, 31]);
  assert.deepEqual(channels(colorMath(a, b, 'sub')), [0, 6, 29]);
  assert.deepEqual(channels(colorMath(a, b, 'add', true)), [20, 7, 16]);
  assert.deepEqual(channels(colorMath(b, a, 'sub', true)), [0, 0, 0]);
  assert.equal(colorMath(a, 0, 'add'), a);
});

test('master brightness has 16 levels: 15 is untouched, 0 black, each step never brighter', () => {
  const c = rgb15(31, 16, 7);
  assert.equal(brightness(c, 15), c);
  assert.equal(brightness(c, 0), 0);
  assert.deepEqual(channels(brightness(c, 8)), [16, 8, 3]);
  for (let l = 1; l < 16; l++) {
    const [r0, g0, b0] = channels(brightness(c, l - 1));
    const [r1, g1, b1] = channels(brightness(c, l));
    assert.ok(r0 <= r1 && g0 <= g1 && b0 <= b1);
  }
  assert.throws(() => brightness(c, 16));
});

test('a fade walks one level every few frames and stops at its end', () => {
  assert.equal(fadeLevel(0), 15);
  assert.equal(fadeLevel(3, { every: 2 }), 14);
  assert.equal(fadeLevel(30, { every: 2 }), 0);
  assert.equal(fadeLevel(999), 0);
  assert.equal(fadeLevel(4, { from: 0, to: 15, every: 1 }), 4);
  const levels = new Set(Array.from({ length: 40 }, (_, f) => fadeLevel(f)));
  assert.equal(levels.size, 16);
});

test('a dip through black reaches 0 on both sides of the cut and full brightness 30 frames away', () => {
  assert.equal(dipLevel(Infinity, 1), 0);
  assert.equal(dipLevel(0, Infinity), 0);
  assert.equal(dipLevel(30, 31), 15);
  assert.equal(dipLevel(Infinity, Infinity), 15);
  assert.equal(dipLevel(3, Infinity), 1);
  assert.equal(dipLevel(Infinity, 8, 1), 7);
});

test('a crushed fade takes the same amount off every channel, so shadows reach black first', () => {
  const colour = rgb15(28, 12, 4);
  assert.equal(crush(colour, 15), colour);
  assert.deepEqual(channels(crush(colour, 13)), [23, 7, 0]);
  assert.deepEqual(channels(crush(colour, 7)), [11, 0, 0]);
  assert.equal(crush(rgb15(31, 31, 31), 0), 0);
  assert.throws(() => crush(colour, 16), RangeError);
});

test('mosaic grows 1 to 16 by the halfway point and shrinks back to 1', () => {
  assert.equal(mosaicSize(0, 1000), 1);
  assert.equal(mosaicSize(500, 1000), 16);
  assert.equal(mosaicSize(1000, 1000), 1);
  assert.equal(mosaicSize(-5, 1000), 1);
  assert.equal(mosaicSize(250, 1000), 8);
  for (let t = 10; t <= 500; t += 10) assert.ok(mosaicSize(t, 1000) >= mosaicSize(t - 10, 1000));
});

test('the Mode 7 matrix is 8.8 fixed point: identity, zoom, turn and clamping', () => {
  assert.deepEqual(mode7Matrix(1, 0), [256, 0, 0,256]);
  assert.deepEqual(mode7Matrix(2, 0), [128, 0, 0,128]);
  const [a, b, c, d] = mode7Matrix(1, Math.PI / 2);
  assert.deepEqual([a, b, c, d], [0, 256, -256, 0]);
  assert.deepEqual(mode7Matrix(0.001, 0), [32767, 0, 0,32767]);
  assert.deepEqual(mode7Point(mode7Matrix(1, 0), [128, 112], 140, 100), [140, 100]);
  assert.deepEqual(mode7Point(mode7Matrix(2, 0), [128, 112], 138, 102), [133, 107]);
  assert.deepEqual(mode7Point(mode7Matrix(1, Math.PI / 2), [0, 0], 10, 0), [0, -10]);
});

test('windows are inclusive, invertible and combine by or, and, xor, xnor', () => {
  const w1 = { left: 10, right: 20 };
  const w2 = { left: 15, right: 30 };
  assert.ok(inWindow(10, [w1]) && inWindow(20, [w1]) && !inWindow(21, [w1]));
  assert.ok(inWindow(5, [{ ...w1, invert: true }]));
  assert.ok(!inWindow(5, [{ left: 9, right: 3 }]));
  assert.ok(!inWindow(5, []));
  assert.deepEqual([12, 17, 25, 40].map((x) => inWindow(x, [w1, w2], 'or')), [true, true, true, false]);
  assert.deepEqual([12, 17, 25, 40].map((x) => inWindow(x, [w1, w2], 'and')), [false, true, false, false]);
  assert.deepEqual([12, 17, 25, 40].map((x) => inWindow(x, [w1, w2], 'xor')), [true, false, true, false]);
  assert.deepEqual([12, 17, 25, 40].map((x) => inWindow(x, [w1, w2], 'xnor')), [false, true, false, true]);
});

test('screen passes: math inside a window, brightness, mosaic blocks, masking, Mode 7', () => {
  const main = screen(rgb15(10, 10, 10));
  const sub = screen(rgb15(30, 0, 0));
  const lit = mathPass(main, sub, { op: 'add', where: (x) => x < 100 });
  assert.equal(lit[5], rgb15(31, 10, 10));
  assert.equal(lit[150], rgb15(10, 10, 10));
  assert.equal(brightnessPass(main, 0)[7], 0);

  const grad = screen();
  for (let i = 0; i < grad.length; i++) grad[i] = rgb15(i % WIDTH % 32, Math.floor(i / WIDTH) % 32, 0);
  const m = mosaicPass(grad, 4);
  assert.equal(m[5 * WIDTH + 7], grad[4 * WIDTH + 4]);
  assert.equal(mosaicPass(grad, 1)[5 * WIDTH + 7], grad[5 * WIDTH + 7]);

  const masked = windowPass(main, (y) => [{ left: y, right: y + 5 }]);
  assert.equal(masked[3 * WIDTH + 4], main[0]);
  assert.equal(masked[3 * WIDTH + 20], 0);

  const tex = { w: 2, h: 2, px: Uint16Array.from([rgb15(31, 0, 0), 0xffff, 0xffff, rgb15(0, 31, 0)]) };
  const centre = [WIDTH >> 1, HEIGHT >> 1];
  const drawn = mode7Pass(tex, mode7Matrix(1, 0), centre, main);
  assert.equal(drawn[(centre[1] - 1) * WIDTH + centre[0] - 1], rgb15(31, 0, 0));
  assert.equal(drawn[(centre[1] - 1) * WIDTH + centre[0]], main[0]);
  assert.equal(drawn[centre[1] * WIDTH + centre[0]], rgb15(0, 31, 0));
  const big = mode7Pass(tex, mode7Matrix(8, 0), centre, main);
  assert.equal(big[(centre[1] - 8) * WIDTH + centre[0] - 8], rgb15(31, 0, 0));
});

test('rgb15 buffers survive the trip to RGBA and back', () => {
  const buf = screen();
  for (let i = 0; i < buf.length; i++) buf[i] = i & 0x7fff;
  assert.deepEqual(fromRgba(toRgba(buf)), buf);
});

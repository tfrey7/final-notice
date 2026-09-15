// SNES effects: colour math, master brightness, mosaic, windows and Mode 7.
//
// Render-texture based, not Phaser post-FX: every effect runs on 15-bit screen buffers
// (Uint16Array of rgb15, one entry a pixel) and the result is written into a canvas texture, the
// way src/snes/layers.mjs composes its frame. The SNES does its colour math on 5-bit channels with
// clamping and halving, fades by 16 levels and samples Mode 7 through an 8.8 fixed-point matrix;
// a WebGL blend mode or shader would do 8-bit maths and filter, and never land on the same colours.
// Doing it on the buffers keeps each pixel an SNES colour and lets node --test check the maths.

import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb } from './color.mjs';

export const LEVELS = 16;
export const MAX_MOSAIC = 16;

const ch = (c, s) => (c >> s) & 31;
const pack = (r, g, b) => (b << 10) | (g << 5) | r;

// Colour math between a main-screen and a sub-screen colour: 'add' or 'sub', each channel clamped
// to 0-31, and `half` halves the result, as CGADSUB's half bit does (glass: add + half).
export function colorMath(main, sub, op = 'add', half = false) {
  const one = (s) => {
    let v = op === 'sub' ? ch(main, s) - ch(sub, s) : ch(main, s) + ch(sub, s);
    if (half) v >>= 1;
    return Math.max(0, Math.min(31, v));
  };
  return pack(one(0), one(5), one(10));
}

// Master brightness 0-15 (INIDISP): each channel scaled by level / 15, so 15 is untouched, 0 black.
export function brightness(c, level) {
  if (!(Number.isInteger(level) && level >= 0 && level < LEVELS)) throw new RangeError(`brightness is 0-15, got ${level}`);
  const one = (s) => Math.floor((ch(c, s) * level) / 15);
  return pack(one(0), one(5), one(10));
}

// The brightness level `frame` frames into a fade that moves one level every `every` frames.
export function fadeLevel(frame, { from = 15, to = 0, every = 2 } = {}) {
  const steps = Math.floor(Math.max(0, frame) / every);
  const dir = Math.sign(to - from);
  return dir ? from + dir * Math.min(steps, Math.abs(to - from)) : from;
}

// Mosaic block size, 1-16 px, at time `t` of a transition lasting `duration`: it grows to 16 by
// the halfway point, then shrinks back to 1 as the new picture comes in.
export function mosaicSize(t, duration) {
  const p = Math.max(0, Math.min(1, t / duration));
  const up = p <= 0.5 ? p * 2 : (1 - p) * 2;
  return 1 + Math.floor(up * (MAX_MOSAIC - 1) + 1e-9);
}

// The Mode 7 matrix registers M7A-M7D for a zoom and a turn: signed 16-bit 8.8 fixed point,
// mapping a screen offset from the centre to a texture offset (so a zoom of 2 halves the step).
export function mode7Matrix(scale, angle, scaleY = scale) {
  const fix = (v) => Math.max(-32768, Math.min(32767, Math.round(v * 256))) + 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [fix(cos / scale), fix(sin / scale), fix(-sin / scaleY), fix(cos / scaleY)];
}

// The texture pixel Mode 7 reads for screen pixel (x, y), about centre [cx, cy] (M7X, M7Y).
export function mode7Point([a, b, c, d], [cx, cy], x, y) {
  const dx = x - cx;
  const dy = y - cy;
  return [cx + ((a * dx + b * dy) >> 8), cy + ((c * dx + d * dy) >> 8)];
}

// Is pixel column x inside the windows? Each window is { left, right, invert }, inclusive as
// WH0-WH3; two windows combine by 'or', 'and', 'xor' or 'xnor' (WBGLOG). left > right is empty.
export function inWindow(x, windows, logic = 'or') {
  const hits = windows.map(({ left, right, invert = false }) => (left <= x && x <= right) !== invert);
  if (hits.length < 2) return hits[0] ?? false;
  const [p, q] = hits;
  return { or: p || q, and: p && q, xor: p !== q, xnor: p === q }[logic];
}

// --- whole-screen passes, on rgb15 buffers of WIDTH x HEIGHT -------------------------------

export const screen = (fill = 0) => new Uint16Array(WIDTH * HEIGHT).fill(fill);

// Blend the sub screen into the main where `where(x, y)` says (default everywhere, or a window).
export function mathPass(main, sub, { op = 'add', half = false, where = () => true } = {}, out = screen()) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      out[i] = where(x, y) ? colorMath(main[i], sub[i], op, half) : main[i];
    }
  }
  return out;
}

export function brightnessPass(src, level, out = screen()) {
  for (let i = 0; i < src.length; i++) out[i] = brightness(src[i], level);
  return out;
}

// Each size x size block takes its top-left pixel, blocks anchored at the screen's top-left.
export function mosaicPass(src, size, out = screen()) {
  for (let y = 0; y < HEIGHT; y++) {
    const row = (y - (y % size)) * WIDTH;
    for (let x = 0; x < WIDTH; x++) out[y * WIDTH + x] = src[row + x - (x % size)];
  }
  return out;
}

// Pixels outside the windows are masked to `colour` (the window clips to black by default).
export function windowPass(src, windows, { logic = 'or', colour = 0 } = {}, out = screen()) {
  for (let y = 0; y < HEIGHT; y++) {
    const ws = typeof windows === 'function' ? windows(y) : windows;
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      out[i] = inWindow(x, ws, logic) ? src[i] : colour;
    }
  }
  return out;
}

// One Mode 7 layer: a texture { w, h, px: Uint16Array, 0xffff transparent } drawn through the
// matrix over `under`. Outside the texture is transparent (M7SEL "screen over" off).
export function mode7Pass(tex, matrix, centre, under, out = screen()) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      const [u, v] = mode7Point(matrix, centre, x, y);
      const tx = u - centre[0] + (tex.w >> 1);
      const ty = v - centre[1] + (tex.h >> 1);
      const c = tx >= 0 && ty >= 0 && tx < tex.w && ty < tex.h ? tex.px[ty * tex.w + tx] : 0xffff;
      out[i] = c === 0xffff ? under[i] : c;
    }
  }
  return out;
}

// RGBA bytes back to rgb15 (the layer compositor's output is already SNES colours, 5 bits a channel).
export function fromRgba(bytes, out = screen()) {
  for (let i = 0; i < out.length; i++) out[i] = pack(bytes[i * 4] >> 3, bytes[i * 4 + 1] >> 3, bytes[i * 4 + 2] >> 3);
  return out;
}

export function toRgba(buf, bytes = new Uint8ClampedArray(buf.length * 4)) {
  for (let i = 0; i < buf.length; i++) {
    const [r, g, b] = rgb(buf[i]);
    const o = i * 4;
    bytes[o] = r; bytes[o + 1] = g; bytes[o + 2] = b; bytes[o + 3] = 255;
  }
  return bytes;
}

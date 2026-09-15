// Button prompts in whatever the player touched last: Super Famicom button caps on a pad, key caps
// carrying the bound key on the keyboard. A prompt is text with its buttons in brackets,
// '[START] RESUME  [B] FILE AWAY'; a combo route's keys ('Y', 'JUMP', 'DOWN+X') draw as caps alone.
// Everything draws through fill(x, y, w, h, rgb15).
import { rgb15 as c, channels } from './color.mjs';
import { drawString, measure } from './text.mjs';
import { inputDevice, keysFor } from '../controls.mjs';

const BUTTON = { Y: 'y', X: 'x', A: 'a', B: 'b', L: 'l', R: 'r', START: 'start', SELECT: 'select', JUMP: 'b' };
const FACE = { y: c(4, 18, 7), x: c(5, 9, 25), a: c(24, 5, 4), b: c(26, 21, 3) };
const PAD_GREY = c(9, 8, 11);
const KEY = { top: c(28, 28, 30), body: c(22, 22, 25), side: c(11, 11, 14), ink: c(3, 3, 5) };
const WHITE = c(31, 31, 31);
const OFF = { face: c(11, 11, 13), ink: c(20, 20, 22) };
const HOT = c(31, 26, 8);

const mix = (a, b, t) => { const A = channels(a); const B = channels(b); return c(...A.map((v, i) => Math.round(v + (B[i] - v) * t))); };
const split = (key) => (key.startsWith('DOWN+') ? ['DOWN+', key.slice(5)] : ['', key]);

export const isButton = (key) => split(key)[1] in BUTTON;

// What the cap says: the SNES name on a pad, the first bound key on the keyboard.
export function capLabel(key, device = inputDevice()) {
  const [pre, k] = split(key);
  const b = BUTTON[k];
  if (!b) return key;
  if (device === 'gamepad') return pre + (k === 'JUMP' ? 'B' : k);
  return pre + keysFor(b).split(' / ')[0].toUpperCase();
}

export const capWidth = (key, device = inputDevice()) => Math.max(10, measure(capLabel(key, device)) + 4);

// One cap, 10 pixels tall with its top-left at (x, y); answers its width. `lit` brightens it, `off`
// greys it, `tone` maps every colour (a brightness fade).
export function drawCap(fill, key, x, y, { device = inputDevice(), lit = false, off = false, tone = (v) => v } = {}) {
  const label = capLabel(key, device);
  const w = Math.max(10, measure(label) + 4);
  const b = BUTTON[split(key)[1]];
  const put = (px, py, pw, ph, col) => fill(px, py, pw, ph, tone(col));
  let ink;
  // A state such as DAZED is no key to press, so it keeps the plain tag on either device.
  if (device === 'gamepad' || !b) {
    const face = off ? OFF.face : lit ? mix(FACE[b] ?? PAD_GREY, WHITE, 0.4) : FACE[b] ?? PAD_GREY;
    put(x, y, w, 10, face);
    put(x, y, w, 1, mix(face, WHITE, 0.5));
    ink = off ? OFF.ink : b === 'b' ? c(6, 5, 1) : WHITE;
  } else {
    const body = off ? OFF.face : lit ? mix(KEY.body, HOT, 0.5) : KEY.body;
    put(x, y, w, 10, KEY.side);
    put(x + 1, y, w - 2, 9, body);
    put(x + 1, y, w - 2, 1, off ? OFF.face : mix(body, KEY.top, 0.7));
    ink = off ? OFF.ink : KEY.ink;
  }
  drawString(put, label, x + ((w - measure(label)) >> 1), y + 1, ink, null);
  return w;
}

const parts = (text) => text.split(/(\[[A-Z+]+\])/).filter(Boolean).map((p) => (p.startsWith('[') ? { cap: p.slice(1, -1) } : { text: p }));

export function measurePrompt(text, device = inputDevice()) {
  const ps = parts(text);
  return ps.reduce((w, p) => w + (p.cap ? capWidth(p.cap, device) : measure(p.text)), 0) + Math.max(0, ps.length - 1);
}

// A whole prompt with its text baseline at (x, y), the caps a pixel above; answers its width.
export function drawPrompt(fill, text, x, y, { device = inputDevice(), colour = WHITE, shadow = c(2, 2, 6), tone = (v) => v } = {}) {
  let cx = x;
  for (const p of parts(text)) {
    if (p.cap) cx += drawCap(fill, p.cap, cx, y - 1, { device, tone }) + 1;
    else {
      drawString((px, py, pw, ph, col) => fill(px, py, pw, ph, tone(col)), p.text, cx, y, colour, shadow);
      cx += measure(p.text) + 1;
    }
  }
  return Math.max(0, cx - x - 1);
}

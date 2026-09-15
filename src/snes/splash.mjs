// The boot splash: the "Celeryman.ai" publisher logo on black before the intro, as a cartridge opened
// on its publisher's logo. The wordmark is our own lettering, drawn one pixel a stroke, tripled,
// leaned into an italic, shaded top to bottom in celery greens with ".ai" in cream, and outlined.
import { rgb15 } from './color.mjs';
import { LEVELS, colorMath, fadeLevel } from './fx.mjs';
import { WIDTH, HEIGHT } from './screen.mjs';
import { drawString } from './text.mjs';

// The logo animates in and holds until FADE_AT, fades through 16 crushed levels, and the intro
// starts after a few frames of black.
export const FADE_AT = 150;
export const FADE_EVERY = 2;
export const END_AT = FADE_AT + LEVELS * FADE_EVERY + 4;

export const splashLevel = (frame) => fadeLevel(frame - FADE_AT, { from: LEVELS - 1, to: 0, every: FADE_EVERY });

// One frame: any button skips to the intro, and the last frame hands over to it.
export function splashStep(frame, pad) {
  if (pad.pressed.size > 0) return { frame, event: 'skip' };
  if (frame + 1 >= END_AT) return { frame, event: 'end' };
  return { frame: frame + 1, event: null };
}

// The splash plays on every power-on: each bare ?snes boot, and ?go=splash always. A boot that names
// a screen or pins a frame for a screenshot goes straight there.
export function opensWithSplash(params) {
  if (params.get('go') === 'splash') return true;
  return !['go', 't', 'memo', 'freeze'].some((k) => params.has(k));
}

const EMPTY = 0xffff;
export const SCALE = 3;
export const LEAN_EVERY = 6;

// Rows 0-7 sit on the baseline, 8-9 are the descender; '#' is lit.
const LETTERS = {
  c: ['', '', '.###', '#...', '#...', '#...', '#...', '.###'],
  e: ['', '', '.###.', '#...#', '#####', '#....', '#...#', '.###.'],
  l: ['##.', '.#.', '.#.', '.#.', '.#.', '.#.', '.#.', '.##'],
  r: ['', '', '#.##', '##..', '#...', '#...', '#...', '#...'],
  y: ['', '', '#...#', '#...#', '#...#', '#...#', '.####', '....#', '#...#', '.###.'],
  m: ['', '', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  a: ['', '', '.###.', '....#', '.####', '#...#', '#...#', '.####'],
  n: ['', '', '#.##.', '##..#', '#...#', '#...#', '#...#', '#...#'],
  '.': ['', '', '', '', '', '', '##', '##'],
  i: ['#', '', '#', '#', '#', '#', '#', '#'],
};
// Tim, 19:06 EDT 2026-09-15: "all lower case, and surround with oval like nintendo, but copyright
// (C) in corner or whatever". Our own lettering and our own oval.
export const NAME = 'celeryman.ai';
export const NOTICE = '(C) 2026 CELERYMAN.AI';
const ROWS = 10;

// Tim, 18:30 EDT 2026-09-15: "i like A but it's gotta be red like supernintendo, same styliing".
const RED = [rgb15(31, 10, 8), rgb15(29, 5, 4), rgb15(25, 2, 2), rgb15(19, 1, 1), rgb15(13, 0, 0)];
const PALE = [rgb15(31, 26, 24), rgb15(31, 21, 19), rgb15(30, 16, 14), rgb15(27, 11, 10), rgb15(22, 7, 6)];
export const OUTLINE = rgb15(6, 0, 0);
export const RAMP_ROWS = 6;

// The glyph cells of the name, one pixel a stroke: [{ x, y, cream }], and the width they span.
export function letterCells(name = NAME) {
  const cells = [];
  let x = 0;
  const creamFrom = name.indexOf('.');
  [...name].forEach((ch, i) => {
    const rows = LETTERS[ch];
    const w = Math.max(...rows.map((r) => r.length));
    rows.forEach((row, y) => [...row].forEach((c, dx) => { if (c === '#') cells.push({ x: x + dx, y, cream: i >= creamFrom }); }));
    x += w + 1;
  });
  return { cells, w: x - 1, h: ROWS };
}

// The wordmark as a Mode 7 texture { w, h, px } (0xffff transparent), with `shade(row, cream)` choosing
// each lit pixel's colour; the default is the settled ramp.
export function wordmark({ shade = (row, pale) => (pale ? PALE : RED)[Math.min(4, Math.floor(row / RAMP_ROWS))] } = {}) {
  const { cells, w: cw } = letterCells();
  const lean = Math.floor((ROWS * SCALE - 1) / LEAN_EVERY);
  const w = cw * SCALE + lean + 2;
  const h = ROWS * SCALE + 2;
  const px = new Uint16Array(w * h).fill(EMPTY);
  const lit = new Uint8Array(w * h);
  for (const { x, y, cream } of cells) {
    for (let sy = 0; sy < SCALE; sy++) {
      const row = y * SCALE + sy;
      const shift = Math.floor((ROWS * SCALE - 1 - row) / LEAN_EVERY);
      for (let sx = 0; sx < SCALE; sx++) {
        const i = (row + 1) * w + x * SCALE + sx + shift + 1;
        px[i] = shade(row, cream);
        lit[i] = 1;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (lit[y * w + x]) continue;
      const near = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => lit[(y + dy) * w + x + dx] && x + dx >= 0 && x + dx < w);
      if (near) px[y * w + x] = OUTLINE;
    }
  }
  return { w, h, px };
}

// --- the sparkle sweep, the take Tim picked -------------------------------------------------
export const WIPE_FRAMES = 40;
export const SHINE_FROM = 50;
export const SHINE_FRAMES = 30;
export const SPARKLE_AT = 82;
const SPARKLE_R = [1, 2, 4, 6, 8, 7, 5, 4, 6, 8, 8, 7, 5, 4, 2, 1];
const SHINE = rgb15(16, 16, 16);
const OVAL = rgb15(27, 3, 3);
const NOTICE_INK = rgb15(17, 5, 5);
export const NOTICE_AT = [8, HEIGHT - 14];
const fillInto = (buf) => (x, y, w, h, c) => {
  for (let yy = Math.max(0, y); yy < Math.min(HEIGHT, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(WIDTH, x + w); xx++) buf[yy * WIDTH + xx] = c;
  }
};
const EDGE = rgb15(14, 14, 14);
const STAR = rgb15(31, 31, 31);
const STAR_ARM = rgb15(31, 22, 20);

let cached = null;
export const splashLogo = () => (cached ??= wordmark());

// The screen column the lit edge has wiped to, and where the shine band sits, on `frame`. The wipe
// crosses the whole oval, so the badge is complete when it passes.
export const wipeSpan = () => splashLogo().w + 2 * OVAL_PAD_X + 16;
export const wipeEdge = (frame) => Math.round(((WIDTH - wipeSpan()) >> 1) + (frame / WIPE_FRAMES) * wipeSpan());
export const shineAt = (frame) => Math.floor(((frame - SHINE_FROM) / SHINE_FRAMES * (splashLogo().w + 40))) - 20;
export const sparkleR = (frame) => (frame >= SPARKLE_AT && frame < SPARKLE_AT + SPARKLE_R.length * 2
  ? SPARKLE_R[Math.floor((frame - SPARKLE_AT) / 2)] : 0);

// A four-point star, the glint on the "i".
function star(buf, cx, cy, r) {
  const put = (x, y, c) => { if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) buf[y * WIDTH + x] = c; };
  for (let k = -r; k <= r; k++) {
    const c = Math.abs(k) <= r / 3 ? STAR : STAR_ARM;
    put(cx + k, cy, c);
    put(cx, cy + k, c);
  }
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) put(cx + dx, cy + dy, STAR_ARM);
}

// The badge the name sits inside, as a two-pixel outline. It is a pill — straight top and bottom
// with half-round ends — not an ellipse (Tim, 19:14 EDT 2026-09-15).
export const OVAL_PAD_X = 22;
export const OVAL_PAD_Y = 11;
export const OVAL_RING = 2;

// Is (x, y) inside a pill of half-width `halfW` and half-height `r` about the centre?
const inPill = (x, y, cx, cy, halfW, r) => {
  const dx = Math.max(Math.abs(x - cx) - (halfW - r), 0);
  return dx * dx + (y - cy) ** 2 <= r * r;
};

export function ovalPixels(tex = splashLogo()) {
  const cx = WIDTH / 2 - 0.5;
  const cy = HEIGHT / 2 - 0.5;
  const r = tex.h / 2 + OVAL_PAD_Y;
  const halfW = tex.w / 2 + OVAL_PAD_X;
  const px = [];
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - halfW); x <= Math.ceil(cx + halfW); x++) {
      if (inPill(x, y, cx, cy, halfW, r) && !inPill(x, y, cx, cy, halfW - OVAL_RING, r - OVAL_RING)) px.push([x, y]);
    }
  }
  return px;
}

// One frame of the splash: the oval and the name wiped on behind a lit edge, a shine crossing the
// letters, the glint on the "i", and the copyright line once the wipe has passed it.
export function paintSplash(frame, buf) {
  const tex = splashLogo();
  const left = (WIDTH - tex.w) >> 1;
  const top = (HEIGHT - tex.h) >> 1;
  const edge = wipeEdge(frame);
  const band = shineAt(frame);
  buf.fill(0);
  for (const [x, y] of ovalPixels(tex)) {
    if (x > edge) continue;
    const lead = frame < WIPE_FRAMES + 4 && edge - x >= 0 && edge - x < 6;
    buf[y * WIDTH + x] = lead ? colorMath(OVAL, EDGE, 'add') : OVAL;
  }
  if (frame >= WIPE_FRAMES) drawString(fillInto(buf), NOTICE, NOTICE_AT[0], NOTICE_AT[1], NOTICE_INK, 0);
  for (let y = 0; y < tex.h; y++) {
    for (let x = 0; x <= Math.min(tex.w - 1, edge - left); x++) {
      const c = tex.px[y * tex.w + x];
      if (c === 0xffff) continue;
      const lead = frame < WIPE_FRAMES + 4 && edge - left - x >= 0 && edge - left - x < 6;
      const shine = frame >= SHINE_FROM && frame < SHINE_FROM + SHINE_FRAMES;
      const d = x + (tex.h - y) * 0.6 - band;
      buf[(top + y) * WIDTH + left + x] = lead ? colorMath(c, EDGE, 'add')
        : shine && d >= 0 && d < 5 ? colorMath(c, SHINE, 'add') : c;
    }
  }
  const r = sparkleR(frame);
  if (r) {
    const [dx, dy] = iDot();
    star(buf, left + dx, top + dy, r);
  }
  return buf;
}

// Where the dot of the "i" lands in the texture, for a sparkle to sit on.
export function iDot() {
  const { cells } = letterCells();
  const dot = cells.filter((c) => c.y === 0).at(-1);
  const shift = Math.floor((ROWS * SCALE - 1) / LEAN_EVERY);
  return [dot.x * SCALE + shift + 1 + (SCALE >> 1), 1 + (SCALE >> 1)];
}

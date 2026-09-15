// Stage 2 areas 4-5 (docs/NES-PLAN.md section 7) as Mode 1 scenes in archive.mjs's style: the
// Disposal Line, the same line with the wax front pushing in on the sub screen, and the Great Seal's
// locked arena. Each area is FRAMES scenes sharing one tileset: belt treads, rollers, shredder teeth
// and falling paper swap tiles frame to frame, and the lamp glow and the wax's warning edge animate by
// palette. The arena's middle stays empty for the press, which is a Mode 7 sprite of its own.
import { rgb15 as c } from '../color.mjs';
import { floorTable } from '../layers.mjs';
import { descentAt } from '../descent.mjs';

export const FRAMES = 4;
const H = 28;
const FLOOR = 26;
const pad = (colours) => [...colours, ...Array(15 - colours.length).fill(colours[colours.length - 1])];
const scale = (k, [r, g, b]) => c(Math.round(r * k), Math.round(g * k), Math.round(b * k));

const base = [
  // 0 far machinery: cool steel (1-6), rust (7-9), gauge glass, face and needle (A-D), void
  pad([c(1, 2, 3), c(2, 3, 5), c(4, 5, 7), c(6, 7, 9), c(9, 10, 12), c(13, 14, 15), c(4, 2, 2), c(8, 4, 3),
    c(12, 7, 4), c(3, 5, 4), c(6, 9, 7), c(16, 15, 11), c(18, 4, 3), c(1, 1, 2)]),
  // 1 belts: rubber (1-3), steel (4-6), hazard yellow (7-8), black, paper
  pad([c(1, 1, 1), c(3, 3, 3), c(5, 5, 6), c(8, 8, 9), c(12, 12, 13), c(18, 18, 19), c(20, 15, 2), c(12, 8, 1),
    c(2, 2, 2), c(24, 23, 20), c(16, 15, 13)]),
  // 2 shredders: painted green (1-6), teeth (7-9), paper (A-B), warning yellow, beacon red and hot
  pad([c(1, 2, 2), c(3, 5, 4), c(5, 8, 6), c(7, 11, 8), c(10, 14, 10), c(14, 18, 13), c(6, 6, 7), c(12, 12, 14),
    c(22, 22, 24), c(26, 25, 21), c(17, 16, 13), c(22, 17, 3), c(26, 6, 4), c(31, 20, 10)]),
  // 3 disposal seals: red wax (1-6), gold (7-9), near black
  pad([c(4, 1, 1), c(9, 2, 2), c(14, 3, 3), c(19, 5, 4), c(24, 8, 6), c(28, 14, 10), c(12, 8, 2), c(21, 16, 5),
    c(29, 25, 12), c(2, 1, 1)]),
  null, // 4 lamp glow, added on the sub screen (BG3: 1-3), pulsing
  // 5 brass press housing (1-8), bolt shadow, screw steel, near black
  pad([c(3, 2, 1), c(6, 4, 1), c(10, 6, 2), c(14, 9, 3), c(19, 13, 4), c(24, 18, 7), c(29, 25, 14), c(31, 30, 22),
    c(4, 3, 3), c(8, 7, 6), c(2, 1, 1)]),
  null, // 6 red wax on the sub screen (BG3: 1-3), its edge flashing
  // 7 bulkhead steel (1-6), wax seeping (7-9), stripe yellow, black
  pad([c(2, 2, 3), c(4, 4, 6), c(6, 7, 9), c(9, 10, 12), c(13, 14, 16), c(18, 19, 21), c(8, 2, 2), c(16, 3, 3),
    c(25, 8, 5), c(20, 16, 4), c(1, 1, 1)]),
];

const GLOW = [[3, 2, 0], [8, 5, 1], [13, 8, 2]];
const PULSE = [1, 0.8, 0.6, 0.8];
export const EDGE = [c(31, 26, 14), c(31, 26, 14), c(22, 5, 3), c(22, 5, 3)];

export function palettesFor(f) {
  const p = [...base];
  p[4] = pad(GLOW.map((g) => scale(PULSE[f], g)));
  p[6] = pad([c(14, 2, 2), c(22, 5, 3), EDGE[f]]);
  return p;
}

const tiles = {};
const def = (name, palette, pixels) => { tiles[name] = { palette, pixels }; return name; };
const draw = (fn) => Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => fn(x, y)).join(''));
const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));

function picture(name, palette, w, h, fn) {
  return Array.from({ length: h / 8 }, (_, ty) => Array.from({ length: w / 8 }, (_, tx) => {
    const rows = draw((x, y) => fn(tx * 8 + x, ty * 8 + y));
    return rows.every((r) => r === '00000000') ? null : def(`${name}${ty}_${tx}`, palette, rows);
  }));
}

// A soft ramp through the characters of `steps`, dithered between neighbours by a 2x2 Bayer cell.
const BAYER = [[0, 2], [3, 1]];
function ramp(v, steps, x, y) {
  const p = Math.max(0, Math.min(1, v)) * (steps.length - 1);
  const i = Math.floor(p);
  return steps[Math.min(steps.length - 1, i + (p - i > (BAYER[y & 1][x & 1] + 0.5) / 4 ? 1 : 0))];
}

// --- far wall, BG2 ---------------------------------------------------------------------------

// A gallery of rust bins riding a chain rail (quarter speed by hdma), a catwalk railing, then the
// nearer hoppers, a gauge and a pipe (half speed).
const FAR = picture('far', 0, 48, 224, (x, y) => {
  if (x >= 40 && x <= 45 && y < 208) return y % 64 < 3 ? '64E'[y % 64] : ramp(1 - Math.abs(x - 41.5) / 4, '12345', x, y);
  if (y >= 208) return y === 208 ? '4' : y === 209 ? '3' : (x + y) % 2 ? '1' : 'E';
  if (y < 96) {
    if (y >= 36 && y < 40) return y === 36 ? '5' : y === 39 ? '1' : x % 4 < 2 ? '3' : '2';
    if (x >= 23 && x <= 24 && y >= 40 && y < 42) return '4';
    if (x >= 14 && x <= 33 && y >= 42 && y <= 62) return y === 42 ? '9' : y === 62 ? '7' : ramp(1 - (x - 14) / 19, '789', x, y);
    if (x % 24 === 0 || y % 32 === 0) return '1';
    if (x % 24 === 2 && y % 32 === 2) return '4';
    return ramp(0.4 - (y / 96) * 0.25, 'E1234', x, y);
  }
  if (y < 104) {
    if (y === 96) return '6';
    if (y === 97) return '4';
    if (y === 102) return '5';
    if (y === 103) return '2';
    return x % 12 < 2 ? (x % 12 ? '2' : '4') : '1';
  }
  const half = y <= 160 ? 20 - (y - 112) * 0.25 : 6;
  if (y >= 112 && y < 200 && Math.abs(x - 20) <= half) {
    if (y < 115) return '65'[y - 112] ?? '4';
    return (y - 112) % 16 === 15 ? '1' : ramp(0.85 - ((x - (20 - half)) / (2 * half)) * 0.7, '23456', x, y);
  }
  const d = Math.hypot(x - 7, y - 184);
  if (d < 6) {
    if (d >= 5) return '5';
    const t = ((x - 7) * 3 + (y - 184) * -3) / 18;
    return t > 0 && t < 0.3 && Math.abs((x - 7) * 3 - (y - 184) * -3) < 3 ? 'D' : 'C';
  }
  return ramp(0.35 - ((y - 104) / 104) * 0.2, '1234', x, y);
});

// --- disposal line, BG1 ----------------------------------------------------------------------

def('girder', 1, draw((x, y) => (y === 0 ? '1' : y === 1 ? '6' : y === 2 ? '5' : y === 7 ? '2' : x % 8 === 4 && y === 4 ? '6' : '4')));
def('truss', 1, draw((x, y) => (y < 5 ? ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0 ? '4' : '0') : '541'[y - 5])));

// Belt treads: ribs slide two pixels a frame the way the belt runs, the roller hub turns.
for (let f = 0; f < FRAMES; f++) {
  for (const [d, k] of [[1, 'r'], [-1, 'l']]) {
    def(`tread${k}${f}`, 1, draw((x, y) => {
      const s = (((x - d * f * 2) % 4) + 4) % 4;
      if (y < 5) return ['5', s ? '3' : '4', s ? '2' : '3', '1', '6'][y];
      if (y === 7) return '1';
      const [hx, hy] = [[3, 5], [4, 5], [4, 6], [3, 6]][(((f * d) % 4) + 4) % 4];
      if (x === hx && y === hy) return '9';
      return x >= 2 && x <= 5 ? '5' : '4';
    }));
  }
}
def('capl', 1, draw((x, y) => (x < 2 ? (y === 0 || y === 7 ? '0' : x ? '6' : '1') : x === 2 ? '5' : tiles.treadr0.pixels[y][x])));
def('capr', 1, mirror(tiles.capl.pixels));
def('beltbase', 1, draw((x, y) => (y === 0 ? '5' : y >= 5 ? '421'[y - 5] : (x + y) % 8 < 4 ? '7' : '9')));
def('deck', 1, draw((x, y) => (y === 0 ? '6' : y === 1 ? '5' : y === 7 ? '2' : y % 2 === 0 && (x + y) % 4 === 0 ? '5' : '4')));
def('deckb', 1, draw((x, y) => (y === 0 ? '4' : y === 7 ? '1' : x % 8 === 4 && y === 3 ? '3' : '2')));
def('pit', 1, draw((x, y) => (y === 0 ? '8' : '9')));
def('pitb', 1, draw(() => '9'));

const CHUTE = Array.from({ length: FRAMES }, (_, f) => picture(`chute${f}`, 2, 16, 8, (x, y) => {
  if (x === 0 || x === 15) return '1';
  if (x === 1) return '6';
  if (x === 14) return '2';
  return (((y - f * 2) & 7) === 0 && (x * 3) % 7 === 1) ? 'A' : ramp(0.9 - x / 16, '2345', x, y);
})[0]);

def('beacon', 2, draw((x, y) => {
  if (y >= 6) return y === 6 ? '4' : '1';
  const d = Math.hypot(x - 3.5, y - 5.5);
  if (d > 3.6) return '0';
  return d < 2.2 && x < 3 && y < 4 ? 'E' : 'D';
}));

// A shredder: hopper lip, paper feeding down the throat, two drums of teeth turning against each
// other, a bolt band, then the painted body with a seam, a hazard band, vents and a plinth.
const SHRED = Array.from({ length: FRAMES }, (_, f) => picture(`shred${f}`, 2, 32, 96, (x, y) => {
  if (y < 3) return '651'[y];
  if (y < 16) {
    if (x < 2 || x > 29) return x === 0 ? '5' : x === 31 ? '1' : x < 2 ? '4' : '2';
    const s = (((y - 3 - f * 2) % 8) + 8) % 8;
    if (s < 3 && x > 5 + s && x < 26 - s) return s === 0 ? 'A' : 'B';
    return '1';
  }
  if (y < 24) {
    if (x < 2 || x > 29) return '1';
    const top = y < 20;
    const ph = (((x + (top ? f : -f)) % 4) + 4) % 4;
    const yy = top ? y - 16 : 23 - y;
    if (yy === 3) return '1';
    return ph + yy < 3 ? (yy === 0 ? '9' : '8') : '7';
  }
  if (y < 28) return y === 24 ? '6' : y === 27 ? '1' : x % 6 === 3 ? '8' : '4';
  if (y >= 88) return y === 88 ? '3' : x % 10 === 4 && y === 91 ? '6' : '1';
  if (x === 0) return '6';
  if (x === 31) return '1';
  if (y === 48) return '1';
  if (y === 49) return '5';
  if (y >= 60 && y < 68) return (x + y) % 8 < 4 ? 'C' : '1';
  if (y >= 74 && y < 84 && x >= 6 && x <= 25 && y % 3 !== 1) return y % 3 === 2 ? '1' : '5';
  return ramp(0.95 - x / 36, '23456', x, y);
}));

// A disposal seal: a slab of red wax with a rounded top, sheen streaks and a gold medallion.
const SEAL = picture('seal', 3, 16, 144, (x, y) => {
  if (y < 6 && Math.hypot(Math.max(0, Math.abs(x - 7.5) - 2), 6 - y) > 6) return '0';
  const cy = 68;
  const d = Math.hypot(x - 7.5, y - cy);
  if (d < 7.5) {
    if (d > 6.2) return x + y < 7.5 + cy ? '9' : '7';
    if (d > 5) return '8';
    if (Math.abs(x - 7.5) < 1 || Math.abs(y - cy) < 1) return x - 7.5 + (y - cy) < 0 ? '6' : '2';
    return ramp(0.7 - (x + y - 7.5 - cy) / 14, '345', x, y);
  }
  if (y >= 140) return '1';
  if (x === 3 && y % 23 < 15) return '6';
  if (x === 0) return '4';
  if (x === 15) return 'A';
  return ramp(0.85 - (x / 15) * 0.7 + Math.sin(y / 9 + x) * 0.08, '12345', x, y);
});
def('postl', 1, draw((x, y) => (x < 5 ? '0' : x === 5 ? '6' : x === 7 ? '1' : y % 8 === 3 ? '6' : '4')));
def('postr', 1, mirror(tiles.postl.pixels));
def('sealhead', 1, draw((x, y) => (y === 0 || y === 7 ? '1' : y === 1 ? '6' : y === 6 ? '4' : (x + y) % 8 < 4 ? '7' : '9')));

// --- sub-screen tiles: glow and wax, BG3 values 1-3 ------------------------------------------

const checker = (a, b) => draw((x, y) => (((x >> 1) + (y >> 1)) % 2 ? a : b));
for (const [pal, pre] of [[4, 'g'], [6, 'w']]) {
  for (const v of ['1', '2', '3']) def(`${pre}${v}`, pal, draw(() => v));
  def(`${pre}01`, pal, checker('0', '1'));
  def(`${pre}12`, pal, checker('1', '2'));
  def(`${pre}23`, pal, checker('2', '3'));
}

// --- the Great Seal arena --------------------------------------------------------------------

def('bbeam', 5, draw((x, y) => 'B755442B'[y]));
def('bbeam2', 5, draw((x, y) => (y === 7 ? 'B' : x % 8 === 4 && y === 3 ? '8' : '3')));
def('plate', 7, draw((x, y) => (y === 0 ? '6' : y === 1 ? '5' : x % 8 === 7 ? '1' : x % 8 === 2 && y === 4 ? '5' : '3')));
def('plateb', 7, draw((x, y) => (x % 8 === 7 || y === 7 ? '1' : '2')));
def('bed', 5, draw((x, y) => (y === 0 ? '8' : y === 1 ? '6' : y === 7 ? 'B' : ramp(0.6 - y / 14, '345', x, y))));

const colFn = (x, y) => {
  if (x === 0 || x === 31) return 'B';
  if (x === 1) return '7';
  if (x === 9 || x === 22) return '2';
  if (x === 10 || x === 23) return '6';
  if (x === 30) return '2';
  return ramp(0.85 - (x / 31) * 0.8, '23456', x, y);
};
const COL = picture('col', 5, 32, 8, colFn)[0];
const COLBAND = picture('colband', 5, 32, 8, (x, y) => {
  if (y === 0 || y === 7) return 'B';
  if ((x % 8 === 3 || x % 8 === 4) && (y === 3 || y === 4)) return x % 8 === 3 && y === 3 ? '8' : '9';
  return '8653335B'[y] === '3' && x > 16 ? '4' : '8653335B'[y];
})[0];

const crownFn = (x, y) => {
  if (y < 3) return 'B87'[y];
  if (y < 11) return ramp(0.8 - ((y - 3) / 8) * 0.5, '456', x, y);
  if (y === 11) return '2';
  if (y === 12) return 'B';
  if (y < 27) return x === 4 && y === 19 ? '8' : ramp(0.7 - (y - 13) / 14, '234', x, y);
  return '6432B'[y - 27];
};
const CROWN = picture('crownm', 5, 8, 32, crownFn).map((r) => r[0]);
const CROWNL = picture('crownl', 5, 8, 32, (x, y) => (x === 0 ? 'B' : x === 1 ? '7' : crownFn(x, y))).map((r) => r[0]);
const CROWNR = picture('crownr', 5, 8, 32, (x, y) => (x === 7 ? 'B' : x === 6 ? '2' : crownFn(x, y))).map((r) => r[0]);
const MEDAL = picture('medal', 5, 32, 32, (x, y) => {
  const d = Math.hypot(x - 15.5, y - 15.5);
  if (d > 15) return crownFn(x % 8, y);
  if (d > 13) return x + y < 31 ? '8' : '3';
  if (d > 12) return 'B';
  if (d < 5) return d > 4 ? 'B' : x + y < 30 ? '8' : '7';
  const ray = Math.floor((Math.atan2(y - 15.5, x - 15.5) + Math.PI) / (Math.PI / 8)) % 2;
  return ray ? '6' : '4';
});

// The bulkhead: riveted plates behind a hazard header, wax squeezing out of its left seam and
// pooling at its foot, a locking wheel.
const plateFn = (x, y) => {
  if (x === 0) return '8';
  if (x === 1) return (y * 3 + x) % 5 ? '7' : '8';
  if (x === 2) return '1';
  if (x === 3) return '6';
  if (x >= 53) return x === 53 ? '2' : '1';
  if (x % 12 === 6 && y % 8 === 4) return '6';
  if (x % 12 === 7 && y % 8 === 5) return '1';
  return ramp(0.8 - (x / 56) * 0.6, '2345', x, y);
};
const BULK = {
  top: picture('bulktop', 7, 56, 8, (x, y) => (y === 0 || y === 7 ? '1' : y === 1 ? '6' : y === 6 ? '4' : (x + y) % 8 < 4 ? 'A' : 'B'))[0],
  plate: picture('bulkplate', 7, 56, 8, plateFn)[0],
  rib: picture('bulkrib', 7, 56, 8, (x, y) => (x < 2 ? '8' : '16544321'[y]))[0],
  foot: picture('bulkfoot', 7, 56, 8, (x, y) => (y >= 7 - Math.max(0, 4 - x / 10) ? ramp(0.3 + (7 - y) / 8, '789', x, y) : plateFn(x, y)))[0],
};
const WHEEL = picture('wheel', 7, 16, 16, (x, y) => {
  const d = Math.hypot(x - 7.5, y - 7.5);
  if (d > 7.5) return plateFn(x + 16, y);
  if (d > 5.5) return x + y < 15 ? '6' : '2';
  if (d < 2) return '6';
  if (Math.abs(x - 7.5) < 1 || Math.abs(y - 7.5) < 1) return '5';
  return plateFn(x + 16, y);
});
const GPANEL = picture('gpanel', 0, 32, 48, (x, y) => {
  if (x === 0 || x === 31 || y === 0 || y === 47) return '1';
  if (x === 1 || y === 1) return '5';
  for (const cx of [9, 22]) {
    const d = Math.hypot(x - cx, y - 14);
    if (d < 7) {
      if (d > 5.5) return '6';
      return x - cx === -(y - 14) && x > cx - 4 && x <= cx ? 'D' : 'C';
    }
  }
  if (y === 34 && (x === 8 || x === 9)) return 'D';
  if (y === 34 && (x === 14 || x === 15)) return 'B';
  if (y >= 40 && y <= 43 && x >= 6 && x <= 25) return '5';
  return ramp(0.6 - y / 60, '234', x, y);
});
def('pipe', 0, draw((x) => (x < 2 || x > 5 ? '0' : '2453'[x - 2])));

// --- grids -----------------------------------------------------------------------------------

const grid = (w) => Array.from({ length: H }, () => Array(w).fill(null));
const put = (g, x, y, name) => { if (y >= 0 && y < H) g[y][((x % g[0].length) + g[0].length) % g[0].length] = name; };
const stamp = (g, x, y, pic) => pic.forEach((row, dy) => row.forEach((n, dx) => n && put(g, x + dx, y + dy, n)));

// Tile-name grid to a layers.mjs map and legend; the characters run past ASCII, a map can name
// more tiles than there are letters.
function layer(bg, g, scroll, extra = {}) {
  const legend = {};
  const chars = new Map();
  const map = g.map((row) => row.map((n) => {
    if (!n) return '.';
    if (!chars.has(n)) {
      const ch = String.fromCharCode(0xc0 + chars.size);
      chars.set(n, ch);
      legend[ch] = n;
    }
    return chars.get(n);
  }).join(''));
  return { bg, map, legend, scroll, ...extra };
}

function cone(g, cx, top, bottom, rate) {
  const steps = [[0.75, '3'], [0.58, '23'], [0.42, '2'], [0.28, '12'], [0.15, '1'], [0.05, '01']];
  for (let y = top; y <= bottom; y++) {
    const d = y - top;
    const half = 0.9 + d / rate;
    const fade = 1 - (d / (bottom - top + 1)) * 0.55;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const v = (1 - Math.abs(x + 0.5 - cx) / half) * fade;
      const step = steps.find(([t]) => v >= t);
      if (step) put(g, x, y, `g${step[1]}`);
    }
  }
}

function far() {
  const g = grid(48);
  for (let x = 0; x < 48; x += 6) stamp(g, x, 0, FAR);
  return layer(2, g, [0.5, 0], { hdma: [[96, 0.25], [127, 0.5], [1, 0.5]] });
}

const floorHdma = floorTable({ top: FLOOR * 8, horizon: FLOOR * 8 - 128 });

// --- area 4: the Disposal Line ---------------------------------------------------------------

// The strip's belts, pit and seals in stage2/areas.mjs columns (16 px), here doubled to 8 px tiles.
export const LINE_W = 96;
export const BELTS = [[3, 12, 1], [17, 26, 1], [33, 37, -1], [40, 43, 1]];
export const PIT = [38, 39];
export const SEALS = [15, 32];
export const SHREDDERS = [6, 40, 56, 86];

function lineMain(f) {
  const g = grid(LINE_W);
  for (let x = 0; x < LINE_W; x++) {
    put(g, x, 0, 'girder');
    put(g, x, 1, 'truss');
    put(g, x, FLOOR, 'deck');
    put(g, x, FLOOR + 1, 'deckb');
  }
  for (const [a, b, d] of BELTS) {
    for (let x = a * 2; x <= b * 2 + 1; x++) {
      put(g, x, FLOOR, x === a * 2 ? 'capl' : x === b * 2 + 1 ? 'capr' : `tread${d > 0 ? 'r' : 'l'}${f}`);
      put(g, x, FLOOR + 1, 'beltbase');
    }
  }
  for (let x = PIT[0] * 2; x <= PIT[1] * 2 + 1; x++) { put(g, x, FLOOR, 'pit'); put(g, x, FLOOR + 1, 'pitb'); }
  for (const sx of SHREDDERS) {
    stamp(g, sx, 14, SHRED[f]);
    for (let y = 2; y < 14; y++) stamp(g, sx + 1, y, [CHUTE[f]]);
    put(g, sx + 3, 13, 'beacon');
  }
  for (const col of SEALS) {
    const sx = col * 2;
    stamp(g, sx, 8, SEAL);
    for (let y = 8; y < FLOOR; y++) { put(g, sx - 1, y, 'postl'); put(g, sx + 2, y, 'postr'); }
    for (let i = -1; i <= 2; i++) put(g, sx + i, 7, 'sealhead');
  }
  return layer(1, g, [1, 0], { hdma: floorHdma });
}

function line(f) {
  const glow = grid(LINE_W);
  for (const sx of SHREDDERS) {
    cone(glow, sx + 3.5, 14, FLOOR - 1, 2.2);
    put(glow, sx + 3, 13, 'g23');
  }
  return { backdrop: c(1, 1, 2), palettes: palettesFor(f), tiles, layers: [far(), lineMain(f), layer(3, glow, [1, 0])] };
}

// The same line with a push of the wax front held to the left of the screen: a ragged tinted mass,
// a flashing edge and spatter ahead of it.
function front(f) {
  const wax = grid(64);
  for (let y = 0; y < H; y++) {
    const edge = 10 + ((y * 5) % 4) - (y % 6 === 0 ? 2 : 0);
    for (let x = 0; x < edge - 3; x++) put(wax, x, y, 'w1');
    put(wax, edge - 3, y, 'w12');
    put(wax, edge - 2, y, 'w2');
    put(wax, edge - 1, y, 'w23');
    put(wax, edge, y, 'w3');
    if (y % 3 === 0) put(wax, edge + 2, y, 'w01');
  }
  return { backdrop: c(1, 1, 2), palettes: palettesFor(f), tiles, layers: [far(), lineMain(f), layer(3, wax, [0, 0])] };
}

// --- area 5: the Great Seal ------------------------------------------------------------------

export const ARENA_W = 40;
// Where the press hangs and stamps, left clear for the Great Seal sprite card: tile columns and rows.
export const PRESS = { x0: 12, x1: 27, y0: 6, y1: FLOOR - 1 };

function arena(f) {
  const g = grid(ARENA_W);
  for (let x = 0; x < ARENA_W; x++) {
    put(g, x, 0, 'bbeam');
    put(g, x, 1, 'bbeam2');
    put(g, x, FLOOR, x >= PRESS.x0 && x <= PRESS.x1 ? 'bed' : 'plate');
    put(g, x, FLOOR + 1, 'plateb');
  }
  for (let x = 7; x <= 32; x++) stamp(g, x, 2, (x === 7 ? CROWNL : x === 32 ? CROWNR : CROWN).map((n) => [n]));
  stamp(g, 18, 2, MEDAL);
  for (const cx of [8, 28]) {
    for (let y = 6; y < FLOOR; y++) stamp(g, cx, y, [(y - 6) % 6 === 0 ? COLBAND : COL]);
  }
  stamp(g, 33, 3, [BULK.top]);
  for (let y = 4; y < FLOOR; y++) stamp(g, 33, y, [y === FLOOR - 1 ? BULK.foot : [9, 17, 23].includes(y) ? BULK.rib : BULK.plate]);
  stamp(g, 35, 12, WHEEL);
  for (let y = 2; y < FLOOR; y++) put(g, 3, y, 'pipe');
  stamp(g, 1, 14, GPANEL);
  const glow = grid(ARENA_W);
  cone(glow, 20, 6, FLOOR - 1, 1.6);
  for (let y = 4; y < FLOOR; y++) put(glow, 32, y, 'w01');
  for (let x = 30; x <= 32; x++) put(glow, x, FLOOR - 1, 'w01');
  return {
    backdrop: c(1, 1, 1), palettes: palettesFor(f), tiles,
    layers: [far(), layer(1, g, [1, 0], { hdma: floorHdma }), layer(3, glow, [1, 0])],
  };
}

const frames = (build) => Array.from({ length: FRAMES }, (_, f) => build(f));

// Each area: its frames (scene is the first), which bg layers go to the sub screen, the colour
// math, how far the camera pans and how fast the frames turn.
export const AREAS = [
  { key: 'line', name: 'DISPOSAL LINE', frames: frames(line), sub: [3], math: { op: 'add' }, span: LINE_W * 8 - 298, fps: 8, descent: descentAt('stage2-area4') },
  { key: 'front', name: 'WAX FRONT', frames: frames(front), sub: [3], math: { op: 'add', half: true }, span: LINE_W * 8 - 298, fps: 8, descent: descentAt('stage2-area4', 1) },
  { key: 'seal', name: 'THE GREAT SEAL', frames: frames(arena), sub: [3], math: { op: 'add' }, span: ARENA_W * 8 - 298, fps: 8, descent: descentAt('stage2-area5') },
].map((a) => ({ ...a, scene: a.frames[0] }));

export default AREAS[0].scene;

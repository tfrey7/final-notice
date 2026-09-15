// The SNES front end as Mode 1 backgrounds (src/snes/layers.mjs): the night skyline in two parallax
// layers, the select desk, the BG3 HUD, GAME OVER and THE END, plus the FINAL NOTICE logo as a Mode 7
// image. Each picture is painted as palette values and cut into 8x8 tiles; identical tiles are stored
// once, so THE END's credits skyline costs no tiles beyond the title's. Every screen shares the eight
// palettes below and carries only the tiles its maps use. The default export is the title screen.
import { rgb15 } from '../color.mjs';
import { TILE } from '../layers.mjs';

const COLS = 32;
const ROWS = 28;
const SKY_COLS = 64;

const pad = (colours) => [...colours, ...Array(15 - colours.length).fill(colours[colours.length - 1])];

export const PAL = { far: 0, near: 1, logo: 2, frame: 3, hudRed: 4, hudBlue: 5, hudBrass: 6, stamp: 7 };

const palettes = [
  // far: 1 sky, 2 sky mid, 3 horizon glow, 4 building, 5 lit edge, 6 warm window, 7 cool window, 8 moon, 9 moon shade
  pad([rgb15(2, 2, 7), rgb15(4, 3, 10), rgb15(8, 4, 12), rgb15(5, 4, 11), rgb15(8, 7, 15), rgb15(17, 13, 7), rgb15(10, 12, 17), rgb15(28, 27, 21), rgb15(21, 20, 17)]),
  // near: 1 shade, 2 face, 3 lit edge, 4 warm office, 5 warm low, 6 fluorescent, 7 fluorescent low, 8 dark glass, 9 beacon, 10 ledge
  pad([rgb15(1, 1, 4), rgb15(3, 3, 8), rgb15(7, 7, 13), rgb15(31, 26, 13), rgb15(23, 16, 8), rgb15(22, 28, 25), rgb15(12, 18, 18), rgb15(2, 3, 7), rgb15(29, 4, 4), rgb15(8, 7, 14)]),
  // logo: 1 outline, 2-5 burgundy, 6-10 brass, 11 cream, 12 drop shadow, 13 deep burgundy, 14 rivet, 15 rule glint
  [rgb15(5, 1, 3), rgb15(9, 1, 5), rgb15(14, 2, 7), rgb15(18, 4, 9), rgb15(24, 8, 12), rgb15(12, 7, 2), rgb15(18, 12, 3),
    rgb15(24, 18, 6), rgb15(29, 24, 11), rgb15(31, 29, 19), rgb15(31, 31, 27), rgb15(3, 0, 2), rgb15(7, 1, 4), rgb15(8, 5, 2), rgb15(27, 23, 14)],
  // frame (the select desk): 1 outline, 2-4 walnut, 5-7 blotter green, 8-10 manila, 11 paper, 12-13 steel, 14-15 photo backdrop
  [rgb15(10, 4, 1), rgb15(7, 4, 2), rgb15(12, 6, 2), rgb15(18, 10, 4), rgb15(1, 6, 3), rgb15(3, 12, 6), rgb15(9, 19, 10), rgb15(15, 9, 2),
    rgb15(25, 18, 7), rgb15(31, 26, 13), rgb15(31, 31, 24), rgb15(11, 12, 15), rgb15(25, 26, 28), rgb15(4, 6, 12), rgb15(10, 13, 21)],
  // BG3 draws only colours 1-3: dark, colour, light
  pad([rgb15(3, 1, 3), rgb15(27, 5, 6), rgb15(31, 29, 22)]),
  pad([rgb15(2, 2, 7), rgb15(8, 16, 30), rgb15(28, 30, 31)]),
  pad([rgb15(4, 2, 2), rgb15(24, 18, 6), rgb15(31, 30, 20)]),
  // stamp: 1-3 red ink, 4-6 paper, 7 outline
  pad([rgb15(12, 1, 2), rgb15(22, 3, 4), rgb15(28, 8, 7), rgb15(27, 25, 19), rgb15(22, 20, 15), rgb15(16, 14, 10), rgb15(4, 1, 2)]),
];

// --- painting ---------------------------------------------------------------------------------

const canvas = (w, h) => Array.from({ length: h }, () => new Array(w).fill(0));
const put = (g, x, y, v) => { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = v; };
const rect = (g, x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(g, i, j, v); };
// The 2x2 checker, the only dither backgrounds use; keyed to absolute pixels so tiles repeat.
const checker = (g, x, y, w, h, a, b) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(g, i, j, (i + j) % 2 ? b : a); };
// Hand-drawn rows: '.' is 0, digits and A-F are values.
const draw = (g, x, y, rows) => rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.') put(g, x + i, y + j, parseInt(c, 16)); }));

// A box lit from the upper left: outline, light top and left edge, dark bottom and right edge.
function bevel(g, x, y, w, h, { outline, light, dark, fill }) {
  rect(g, x, y, w, h, outline);
  rect(g, x + 1, y + 1, w - 2, h - 2, fill);
  rect(g, x + 1, y + 1, w - 2, 1, light);
  rect(g, x + 1, y + 1, 1, h - 2, light);
  rect(g, x + 1, y + h - 2, w - 2, 1, dark);
  rect(g, x + w - 2, y + 1, 1, h - 2, dark);
}

const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  ' ': Array(7).fill('.....'),
};

// A line of capitals as a mask, each glyph pixel a scale x scale block.
function textMask(text, scale, gap) {
  const m = canvas(text.length * 5 * scale + (text.length - 1) * gap, 7 * scale);
  [...text].forEach((ch, n) => GLYPHS[ch].forEach((row, gy) => [...row].forEach((c, gx) => {
    if (c === '#') rect(m, n * (5 * scale + gap) + gx * scale, gy * scale, scale, scale, 1);
  })));
  return m;
}

const on = (m, x, y) => m[y]?.[x] === 1;
const touches = (m, x, y) => [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => on(m, x + dx, y + dy)));

// Raised letters: a drop shadow down-right, an outline, a lit top-left edge, a shaded bottom-right
// edge and a three-step vertical ramp dithered at its seams.
function emboss(g, m, ox, oy, c) {
  const h = m.length;
  const w = m[0].length;
  for (let y = -1; y < h + 3; y++) for (let x = -1; x < w + 3; x++) if (!on(m, x, y) && on(m, x - 2, y - 2)) put(g, ox + x, oy + y, c.shadow);
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) if (!on(m, x, y) && touches(m, x, y)) put(g, ox + x, oy + y, c.outline);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!on(m, x, y)) continue;
      const r = y / h;
      const [top, mid, low] = c.ramp;
      let v = r < 0.3 ? top : r < 0.38 ? ((x + y) % 2 ? top : mid) : r < 0.62 ? mid : r < 0.7 ? ((x + y) % 2 ? mid : low) : low;
      if (!on(m, x, y + 1) || !on(m, x + 1, y)) v = c.lo;
      if (!on(m, x, y - 1) || !on(m, x - 1, y)) v = c.hi;
      if (!on(m, x, y - 1) && !on(m, x - 1, y)) v = c.glint;
      put(g, ox + x, oy + y, v);
    }
  }
}

const BRASS = { outline: 1, shadow: 12, hi: 10, lo: 6, glint: 11, ramp: [9, 8, 7] };

// --- tiles and layers -------------------------------------------------------------------------

const tiles = {};
const named = new Map();
const hexRow = (r) => r.map((v) => v.toString(16).toUpperCase()).join('');

function tileFor(palette, pixels) {
  const key = `${palette}:${pixels.join('')}`;
  if (!named.has(key)) {
    const name = `t${named.size}`;
    named.set(key, name);
    tiles[name] = { palette, pixels };
  }
  return named.get(key);
}

const grid = (cols = COLS, rows = ROWS) => Array.from({ length: rows }, () => new Array(cols).fill(null));

// Cuts a picture into a grid of tile names at tile (tx, ty); fully transparent tiles leave the cell.
function stamp(cells, g, palette, tx = 0, ty = 0) {
  for (let j = 0; j * TILE < g.length; j++) {
    for (let i = 0; i * TILE < g[0].length; i++) {
      if (cells[ty + j]?.[tx + i] === undefined) continue;
      const pixels = Array.from({ length: TILE }, (_, y) => hexRow(Array.from({ length: TILE }, (_, x) => g[j * TILE + y]?.[i * TILE + x] ?? 0)));
      if (pixels.every((r) => r === '00000000')) continue;
      cells[ty + j][tx + i] = tileFor(palette, pixels);
    }
  }
  return cells;
}

function toLayer(bg, cells, scroll) {
  const chars = new Map();
  const legend = {};
  const map = cells.map((row) => row.map((name) => {
    if (!name) return '.';
    if (!chars.has(name)) {
      const ch = String.fromCharCode(0x100 + chars.size);
      chars.set(name, ch);
      legend[ch] = name;
    }
    return chars.get(name);
  }).join(''));
  return { bg, map, legend, scroll };
}

function screen(backdrop, layers) {
  const used = {};
  for (const l of layers) for (const name of Object.values(l.legend)) used[name] = tiles[name];
  return { backdrop, palettes, tiles: used, layers };
}

// --- the skyline ------------------------------------------------------------------------------

// BG2: sky bands with checker seams, stars, the moon, and a far row of towers with dim windows.
function farSkyline() {
  const g = canvas(SKY_COLS * TILE, ROWS * TILE);
  for (let ty = 0; ty < ROWS; ty++) {
    const y = ty * TILE;
    if (ty < 7) rect(g, 0, y, g[0].length, TILE, 1);
    else if (ty === 7) checker(g, 0, y, g[0].length, TILE, 1, 2);
    else if (ty < 12) rect(g, 0, y, g[0].length, TILE, 2);
    else if (ty === 12) checker(g, 0, y, g[0].length, TILE, 2, 3);
    else rect(g, 0, y, g[0].length, TILE, 3);
  }
  for (let tx = 0; tx < SKY_COLS; tx++) if ((tx * 7) % 3 === 0) put(g, tx * TILE + (tx % 2 ? 5 : 2), ((tx * 5) % 6) * TILE + 3, 8);
  for (let dy = -11; dy <= 11; dy++) {
    for (let dx = -11; dx <= 11; dx++) {
      if (dx * dx + dy * dy > 121) continue;
      put(g, 404 + dx, 36 + dy, (dx + 4) ** 2 + (dy + 4) ** 2 > 150 ? 9 : 8);
    }
  }
  let tx = 0;
  let n = 0;
  while (tx < SKY_COLS) {
    const w = 3 + ((n * 7) % 4);
    const top = 12 + ((n * 5) % 6);
    for (let bx = tx; bx < Math.min(SKY_COLS, tx + w); bx++) {
      rect(g, bx * TILE, top * TILE, TILE, (ROWS - top) * TILE, 4);
      rect(g, bx * TILE, top * TILE, TILE, 1, 5);
      for (let ty = top + 1; ty < ROWS; ty++) {
        [2, 5].forEach((wx, k) => {
          const lit = (bx * 3 + ty * 7 + n + k * 2) % 5;
          if (lit < 2) rect(g, bx * TILE + wx, ty * TILE + 3, 1, 2, lit ? 7 : 6);
        });
      }
    }
    rect(g, tx * TILE, top * TILE, 1, (ROWS - top) * TILE, 5);
    if (n % 3 === 1) rect(g, (tx + 1) * TILE + 3, (top - 1) * TILE + 1, 1, 7, 5);
    tx += w + (n % 3 === 2 ? 1 : 0);
    n++;
  }
  return g;
}

// BG1: the near office towers, floor by floor: warm lamps, fluorescent strips and dark glass, a
// parapet on each roof, a red beacon on every other one, the street in shadow.
function nearSkyline() {
  const g = canvas(SKY_COLS * TILE, ROWS * TILE);
  const WINDOW = { warm: [4, 5], fluoro: [6, 7], dark: [8, 8] };
  let tx = 1;
  let n = 0;
  while (tx < SKY_COLS - 4) {
    const w = 4 + ((n * 5) % 5);
    const top = 8 + ((n * 7) % 8);
    for (let bx = tx; bx < tx + w; bx++) {
      for (let ty = top; ty < ROWS; ty++) {
        const x = bx * TILE;
        const y = ty * TILE;
        if (ty === top) { rect(g, x, y, TILE, TILE, 2); rect(g, x, y + 2, TILE, 2, 10); rect(g, x, y + 4, TILE, 1, 1); continue; }
        if (ty >= ROWS - 3) { rect(g, x, y, TILE, TILE, 1); continue; }
        rect(g, x, y, TILE, TILE, 2);
        const floor = (ty * 3 + n * 5) % 7;
        const h = (bx * 11 + ty * 7 + n * 3) % 6;
        const state = floor < 2 ? (h === 5 ? 'dark' : 'warm') : floor === 2 ? (h < 4 ? 'fluoro' : 'dark') : ['warm', 'fluoro'][h] ?? 'dark';
        const [a, b] = WINDOW[state];
        rect(g, x + 1, y + 1, 6, 3, a);
        rect(g, x + 1, y + 4, 6, 1, b);
        rect(g, x + 4, y + 1, 1, 4, 1);
        rect(g, x, y + 7, TILE, 1, 10);
      }
    }
    const height = (ROWS - top) * TILE - 2;
    rect(g, tx * TILE, top * TILE + 2, 1, height, 3);
    rect(g, (tx + w) * TILE - 1, top * TILE + 2, 1, height, 1);
    if (n % 2 === 0) {
      rect(g, tx * TILE + 12, (top - 1) * TILE + 2, 1, 8, 1);
      put(g, tx * TILE + 12, (top - 1) * TILE + 1, 9);
    }
    tx += w + 1 + (n % 2);
    n++;
  }
  return g;
}

export const skyline = {
  far: toLayer(2, stamp(grid(SKY_COLS), farSkyline(), PAL.far), [0.25, 0]),
  near: toLayer(1, stamp(grid(SKY_COLS), nearSkyline(), PAL.near), [0.5, 0]),
};

// --- the logo ---------------------------------------------------------------------------------

// A burgundy plate with clipped corners and an inset brass rule, FINAL NOTICE raised in brass.
function logoPicture() {
  const w = 176;
  const h = 80;
  const g = canvas(w, h);
  bevel(g, 0, 0, w, h, { outline: 1, light: 5, dark: 2, fill: 3 });
  checker(g, 2, 2, w - 4, 6, 4, 3);
  checker(g, 2, h - 8, w - 4, 6, 2, 13);
  [[0, 0], [1, 0], [0, 1], [w - 1, 0], [w - 2, 0], [w - 1, 1], [0, h - 1], [1, h - 1], [0, h - 2], [w - 1, h - 1], [w - 2, h - 1], [w - 1, h - 2]].forEach(([x, y]) => put(g, x, y, 0));
  [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]].forEach(([x, y]) => put(g, x, y, 1));
  for (const y of [5, h - 7]) { rect(g, 6, y, w - 12, 1, 15); rect(g, 6, y + 1, w - 12, 1, 7); }
  for (const x of [5, w - 7]) { rect(g, x, 6, 1, h - 12, 15); rect(g, x + 1, 6, 1, h - 12, 7); }
  [[4, 4], [w - 8, 4], [4, h - 8], [w - 8, h - 8]].forEach(([x, y]) => draw(g, x, y, ['E99E', '9AA7', '9A76', 'E76E']));
  const top = textMask('FINAL', 3, 4);
  const bottom = textMask('NOTICE', 3, 4);
  emboss(g, top, Math.floor((w - top[0].length) / 2), 13, BRASS);
  emboss(g, bottom, Math.floor((w - bottom[0].length) / 2), 45, BRASS);
  return g;
}

export const logo = { palette: palettes[PAL.logo], w: 176, h: 80, pixels: logoPicture().map(hexRow) };

// Mode 7 takes one 128x128 map of up to 256 distinct 8x8 tiles; this logo also keeps to one
// 15-colour palette, so the same tiles drop onto BG1 once the zoom settles into Mode 1.
export function mode7Problems(img) {
  const problems = [];
  if (img.w % TILE || img.h % TILE) problems.push(`the image is ${img.w}x${img.h}, not whole tiles`);
  if (img.w > 128 * TILE || img.h > 128 * TILE) problems.push('the image is over 128 tiles a side');
  const distinct = new Set();
  for (let y = 0; y < img.h; y += TILE) for (let x = 0; x < img.w; x += TILE) distinct.add(img.pixels.slice(y, y + TILE).map((r) => r.slice(x, x + TILE)).join());
  if (distinct.size > 256) problems.push(`${distinct.size} distinct tiles, Mode 7 holds 256`);
  const values = new Set(img.pixels.join('').replace(/0/g, ''));
  if (values.size > 15) problems.push(`${values.size} colours, one palette holds 15`);
  return problems;
}

export const logoTiles = (img = logo) => {
  const distinct = new Set();
  for (let y = 0; y < img.h; y += TILE) for (let x = 0; x < img.w; x += TILE) distinct.add(img.pixels.slice(y, y + TILE).map((r) => r.slice(x, x + TILE)).join());
  return distinct.size;
};

// --- select -----------------------------------------------------------------------------------

// Where the select scene writes on the files: each file's left edge, its tab, photo well and ruled lines.
export const FILES = {
  xs: [18, 134], y: 82, w: 104, h: 122,
  tab: { dx: 8, y: 67, w: 52, h: 15 },
  photo: { dx: 6, dy: 8, w: 38, h: 44 },
  rules: [160, 172, 184, 196],
  stamp: { dx: 52, y: 186 },
};
export const SILL = 56;

const grain = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;

// Two value ramps with a checker at each seam, top to bottom through [a, b, c].
const ramp = (r, x, y, [a, b, c]) => (r < 0.14 ? a : r < 0.2 ? ((x + y) % 2 ? a : b) : r < 0.8 ? b : r < 0.86 ? ((x + y) % 2 ? b : c) : c);

function folder(g, fx) {
  const { y, w, h, tab, photo, rules } = FILES;
  rect(g, fx + 4, y + 4, w, h, 5);
  rect(g, fx + tab.dx + 3, tab.y + 3, tab.w, 12, 5);
  bevel(g, fx - 2, y - 4, w + 4, h + 4, { outline: 1, light: 9, dark: 8, fill: 8 });
  bevel(g, fx + tab.dx, tab.y, tab.w, tab.h + 4, { outline: 1, light: 10, dark: 8, fill: 9 });
  [[0, 0], [tab.w - 1, 0]].forEach(([dx, dy]) => put(g, fx + tab.dx + dx, tab.y + dy, 6));
  rect(g, fx + 4, y - 3, w - 8, 3, 11);
  rect(g, fx + 4, y - 4, w - 8, 1, 1);
  bevel(g, fx, y, w, h, { outline: 1, light: 11, dark: 8, fill: 9 });
  for (let yy = y + 2; yy < y + h - 2; yy++) {
    for (let xx = fx + 2; xx < fx + w - 2; xx++) {
      const speck = grain(xx, yy) % 29;
      put(g, xx, yy, speck === 0 ? 8 : speck === 1 ? 11 : ramp((yy - y) / h, xx, yy, [10, 9, 8]));
    }
  }
  const px = fx + photo.dx;
  const py = y + photo.dy;
  bevel(g, px, py, photo.w, photo.h, { outline: 1, light: 13, dark: 12, fill: 14 });
  for (let yy = py + 2; yy < py + photo.h - 2; yy++) {
    for (let xx = px + 2; xx < px + photo.w - 2; xx++) put(g, xx, yy, ramp((yy - py) / photo.h, xx, yy, [14, 14, 15]));
  }
  for (const ry of rules) { rect(g, fx + 6, ry, w - 12, 1, 8); rect(g, fx + 6, ry + 1, w - 12, 1, 11); }
  draw(g, fx + w - 18, y - 10, ['.111.', '1DCD1', 'D1.1C', 'D1.1C', 'D1.1C', 'D1.1C', 'D1.1C', 'D1.1C', 'D1.1C', 'D1.1C', 'D1.1C', 'D.1.C', 'D...C', 'D...C', 'D...C', '1CCC1', '.111.']);
}

// The office at night: the window (sky left clear for BG2's skyline) with steel mullions and sill,
// a walnut desk, a green blotter with leather corners, and the two personnel files on it.
function selectPicture() {
  const g = canvas(COLS * TILE, ROWS * TILE);
  for (const x of [84, 168]) { rect(g, x, 0, 4, SILL, 12); rect(g, x + 1, 0, 1, SILL, 13); }
  rect(g, 0, SILL - 5, 256, 4, 13);
  rect(g, 0, SILL - 1, 256, 1, 12);
  for (let y = SILL; y < 224; y++) {
    for (let x = 0; x < 256; x++) {
      const band = (y + ((x >> 5) % 3) * 2) % 9;
      put(g, x, y, grain(x, y) % 37 === 0 ? 2 : band === 0 ? 2 : band < 6 ? 3 : 4);
    }
  }
  rect(g, 0, SILL, 256, 1, 1);
  bevel(g, 8, 62, 240, 160, { outline: 1, light: 7, dark: 5, fill: 6 });
  for (let y = 64; y < 220; y++) {
    for (let x = 10; x < 246; x++) {
      const speck = grain(x, y) % 23;
      put(g, x, y, speck === 0 ? 5 : speck === 1 ? 7 : ramp((y - 62) / 160, x, y, [7, 6, 5]));
    }
  }
  for (const [cx, cy, sx, sy] of [[9, 63, 1, 1], [246, 63, -1, 1], [9, 220, 1, -1], [246, 220, -1, -1]]) {
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16 - j; i++) put(g, cx + i * sx, cy + j * sy, i + j === 15 - 1 ? 4 : i + j === 15 ? 1 : 2);
  }
  FILES.xs.forEach((fx) => folder(g, fx));
  return g;
}

// APPROVED in a double box: the ink mask a stamp leaves.
const APPROVED = (() => {
  const words = textMask('APPROVED', 1, 2);
  const w = words[0].length + 13;
  const m = canvas(w, 21);
  rect(m, 0, 0, w, 2, 1); rect(m, 0, 19, w, 2, 1); rect(m, 0, 0, 2, 21, 1); rect(m, w - 2, 0, 2, 21, 1);
  rect(m, 3, 3, w - 6, 1, 1); rect(m, 3, 17, w - 6, 1, 1); rect(m, 3, 3, 1, 15, 1); rect(m, w - 4, 3, 1, 15, 1);
  words.forEach((row, y) => row.forEach((v, x) => { if (v) { put(m, 6 + x, 7 + y, 1); put(m, 7 + x, 7 + y, 1); } }));
  return m;
})();

export const STAMP_FRAMES = 4;
const STAMP_SCALE = [2.4, 1.7, 1.2, 1];

// Frame k of the stamp coming down: its lit pixels about its centre, shrinking to rest by the last
// frame, which misses a scatter of pixels the way worn ink does.
export function approvedStamp(k) {
  const s = STAMP_SCALE[Math.min(Math.max(0, k), STAMP_FRAMES - 1)];
  const w = Math.round(APPROVED[0].length * s);
  const h = Math.round(APPROVED.length * s);
  const pts = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const mx = Math.floor(x / s);
      const my = Math.floor(y / s);
      if (!on(APPROVED, mx, my) || (s === 1 && (mx * 7 + my * 13) % 11 === 0)) continue;
      pts.push([x - (w >> 1), y - (h >> 1)]);
    }
  }
  return pts;
}

// --- the HUD, on BG3 --------------------------------------------------------------------------

const BAR = {
  capL: ['.1111111', '13333333', '12222222', '12222222', '12222222', '11111111'],
  full: ['11111111', '33333333', '22222222', '22222222', '22222222', '11111111'],
  half: ['11111111', '33331111', '22221111', '22221111', '22221111', '11111111'],
  empty: ['11111111', '11111111', '11111111', '11111111', '11111111', '11111111'],
  capR: ['1111111.', '3333331.', '2222221.', '2222221.', '2222221.', '1111111.'],
};

const ICONS = {
  // brass: the portrait frame, a fedora for a life
  frame: ['2222222222222222', '2333333333333332', '2311111111111122', '2310000000000122', '2310000000000122', '2310000000000122',
    '2310000000000122', '2310000000000122', '2310000000000122', '2310000000000122', '2310000000000122', '2310000000000122',
    '2310000000000122', '2311111111111122', '2322222222222222', '2222222222222221'],
  life: ['..1111..', '.132221.', '.122221.', '11111111', '13222221', '.111111.', '........', '........'],
  // notice (red): an envelope with a wax seal
  notice: ['................', '1111111111111111', '1333333333333331', '1233333333333321', '1323333333333231', '1332333333332331',
    '1333233333323331', '1333322112233331', '1333331221333331', '1333312222133331', '1333312222133331', '1333331221333331',
    '1333333113333331', '1333333333333331', '1111111111111111', '................'],
  // carbon copy (blue): two sheets, one offset behind the other
  carbonCopy: ['.11111111111....', '.12222222221....', '.12222222221....', '.122211111111111', '.122213333333331', '.122213111113331',
    '.122213333333331', '.122213111111131', '.122213333333331', '.122213111113331', '.111113333333331', '.....13111111131',
    '.....13333333331', '.....13333333331', '.....11111111111', '................'],
  // red tape (red): a ribbon tied in a bow
  redTape: ['......1..1......', '.....121121.....', '....12311321....', '...1233113321...', '..122311113221..', '..1222122122211.',
    '...11112211111..', '......1221......', '.....122221.....', '....12311321....', '...1231..1321...', '..1231....1321..',
    '..121......121..', '...1........1...', '................', '................'],
  // margin (brass): a ruled page with its margin line
  margin: ['..111111111111..', '..133213333331..', '..133213333331..', '..111211111111..', '..133213333331..', '..133213333331..',
    '..111211111111..', '..133213333331..', '..133213333331..', '..111211111111..', '..133213333331..', '..133213333331..',
    '..133213333311..', '..13321333311...', '..1111111111....', '................'],
};

function hudLayer() {
  const cells = grid();
  const pic = (rows) => { const g = canvas(rows[0].length, rows.length); draw(g, 0, 0, rows); return g; };
  const bar = (state) => { const g = canvas(TILE, TILE); draw(g, 0, 1, BAR[state]); return g; };
  stamp(cells, pic(ICONS.frame), PAL.hudBrass, 1, 1);
  const health = ['capL', 'full', 'full', 'full', 'full', 'full', 'full', 'half', 'empty', 'empty', 'capR'];
  health.forEach((s, i) => stamp(cells, bar(s), PAL.hudRed, 4 + i, 1));
  ['capL', 'full', 'full', 'full', 'empty', 'capR'].forEach((s, i) => stamp(cells, bar(s), PAL.hudBlue, 4 + i, 2));
  [0, 1, 2].forEach((i) => stamp(cells, pic(ICONS.life), PAL.hudBrass, 16 + i, 1));
  [['notice', PAL.hudRed], ['carbonCopy', PAL.hudBlue], ['redTape', PAL.hudRed], ['margin', PAL.hudBrass]]
    .forEach(([name, p], i) => stamp(cells, pic(ICONS[name]), p, 22 + i * 2, 1));
  return toLayer(3, cells, [0, 0]);
}

// --- GAME OVER and THE END --------------------------------------------------------------------

// Worn red ink: speckled where the stamp missed, darker along its lower-right edges.
function ink(g, m, ox, oy) {
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[0].length; x++) {
      if (!on(m, x, y)) continue;
      const wear = (x * 7 + y * 13) % 17;
      const v = wear === 0 ? 0 : !on(m, x + 1, y) || !on(m, x, y + 1) ? 1 : wear < 4 ? 3 : 2;
      if (v) put(g, ox + x, oy + y, v);
    }
  }
}

function gameOverPicture() {
  const g = canvas(COLS * TILE, ROWS * TILE);
  bevel(g, 32, 64, 192, 96, { outline: 7, light: 4, dark: 6, fill: 4 });
  for (let y = 80; y < 152; y += 8) rect(g, 40, y, 176, 1, 5);
  for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) put(g, 212 + i, 64 + j, i > j ? 0 : i === j || j === 11 ? 7 : i === 0 ? 4 : 5);
  const box = canvas(172, 44);
  rect(box, 0, 0, 172, 2, 1); rect(box, 0, 42, 172, 2, 1); rect(box, 0, 0, 2, 44, 1); rect(box, 170, 0, 2, 44, 1);
  rect(box, 4, 4, 164, 1, 1); rect(box, 4, 39, 164, 1, 1); rect(box, 4, 4, 1, 36, 1); rect(box, 167, 4, 1, 36, 1);
  ink(g, box, 42, 90);
  const words = textMask('GAME OVER', 3, 2);
  ink(g, words, Math.floor((256 - words[0].length) / 2), 102);
  return g;
}

function theEndLayer() {
  const cells = skyline.near.map.map((row) => [...row].map((ch) => skyline.near.legend[ch] ?? null));
  const words = textMask('THE END', 3, 4);
  const g = canvas(136, 32);
  emboss(g, words, 2, 3, BRASS);
  stamp(cells, g, PAL.logo, 7, 4);
  return toLayer(1, cells, [0.5, 0]);
}

const NIGHT = rgb15(2, 2, 7);
const title = screen(NIGHT, [skyline.far, skyline.near]);

// --- After Hours: the office tower over the skyline -------------------------------------------

// Sixteen floors; every lit window on a floor is that floor's own palette entry, so a floor goes
// dark by one palette write and no tile changes. Floors 0-11 take entries 4-15 of the first tower
// palette, 12-15 entries 4-7 of the second; entries 1-3 are the frame in both.
export const FLOORS = 16;
export const KEPT_FLOOR = 12;
export const FLOOR_ORDER = Array.from({ length: FLOORS }, (_, k) => k).filter((k) => k !== KEPT_FLOOR);
const TOWER = { cols: [11, 21], parapet: 4, floor0: 5 };
const TOWER_PAL = [4, 5];
const FRAME = [rgb15(1, 1, 4), rgb15(4, 4, 9), rgb15(8, 8, 14)];
export const DARK_WINDOW = rgb15(2, 3, 7);
export const litWindow = (k) => (k % 5 === 3 ? rgb15(22, 28, 25) : rgb15(29, 24, 11));
export const floorEntry = (k) => (k < 12 ? [TOWER_PAL[0], k + 4] : [TOWER_PAL[1], k - 8]);

// Palette writes for `dark` floors out, top down, skipping the one that stays lit.
export function setFloors(pals, dark) {
  const [slot, entry] = floorEntry(KEPT_FLOOR);
  pals[slot][entry - 1] = litWindow(KEPT_FLOOR);
  FLOOR_ORDER.forEach((k, i) => {
    const [slot, entry] = floorEntry(k);
    pals[slot][entry - 1] = i < dark ? DARK_WINDOW : litWindow(k);
  });
  return pals;
}

function towerLayer() {
  const cells = grid();
  const [c0, c1] = TOWER.cols;
  const w = (c1 - c0) * TILE;
  for (const slot of [0, 1]) {
    const floors = Array.from({ length: FLOORS }, (_, k) => k).filter((k) => floorEntry(k)[0] === TOWER_PAL[slot]);
    for (const k of floors) {
      const g = canvas(w, TILE);
      rect(g, 0, 0, w, TILE, 2);
      rect(g, 0, 0, 1, TILE, 3);
      rect(g, w - 1, 0, 1, TILE, 1);
      rect(g, 1, 7, w - 2, 1, 1);
      for (let x = 3; x + 4 <= w - 2; x += 6) rect(g, x, 2, 4, 4, floorEntry(k)[1]);
      stamp(cells, g, TOWER_PAL[slot], c0, TOWER.floor0 + k);
    }
  }
  const top = canvas(w, 2 * TILE);
  rect(top, (w >> 1) - 1, 0, 2, TILE, 1);
  rect(top, 0, TILE + 2, w, TILE - 2, 1);
  rect(top, 1, TILE + 3, w - 2, 1, 3);
  stamp(cells, top, TOWER_PAL[0], c0, TOWER.parapet - 1);
  const base = canvas(w, (ROWS - TOWER.floor0 - FLOORS) * TILE);
  // The lobby: a canopy, dark granite pillars with lit edges, and the night lamp over the doors.
  rect(base, 0, 0, w, base.length, 1);
  checker(base, 1, 0, w - 2, 2, 2, 1);
  rect(base, 0, 4, w, 2, 3);
  rect(base, 0, 6, w, 1, 1);
  for (let x = 4; x < w - 4; x += 12) { rect(base, x, 7, 4, base.length - 7, 2); rect(base, x, 7, 1, base.length - 7, 3); }
  rect(base, (w >> 1) - 6, 12, 12, 1, 3);
  checker(base, (w >> 1) - 5, 13, 10, 10, 2, 1);
  rect(base, 0, 0, 1, base.length, 2);
  stamp(cells, base, TOWER_PAL[0], c0, TOWER.floor0 + FLOORS);
  return toLayer(1, cells, [0, 0]);
}

// Night at the top to a violet dusk at the street: fixed-colour add on the backdrop, eight lines a step.
const SKY_STEPS = 7;
const SKY_LINES = 24;
const skyGradient = [
  ...Array.from({ length: SKY_STEPS }, (_, k) => [SKY_LINES, 'add', rgb15(Math.round((8 * k) / SKY_STEPS), Math.round((2 * k) / SKY_STEPS), Math.round((6 * k) / SKY_STEPS)), [0]]),
  [224 - SKY_LINES * SKY_STEPS, 'none'],
];

// The city behind the tower has gone home: dark silhouettes with a few dim windows, so the tower is
// the only bright thing on the screen. 1 building, 2 lit edge, 3 dim warm window, 4 dim cool window, 5 street.
const CITY = [rgb15(3, 3, 7), rgb15(5, 5, 10), rgb15(10, 8, 5), rgb15(6, 8, 10), rgb15(2, 2, 4)];
const CITY_BASE = 176;

function citySkyline() {
  const g = canvas(SKY_COLS * TILE, ROWS * TILE);
  for (let n = 0, x = 0; x < g[0].length; n++) {
    const w = 16 + ((n * 7) % 14);
    const top = CITY_BASE - 30 - ((n * 37) % 60);
    rect(g, x, top, w, CITY_BASE - top, 1);
    rect(g, x, top, w, 1, 2);
    for (let wy = top + 4; wy < CITY_BASE - 3; wy += 6) {
      for (let wx = x + 3; wx < x + w - 3; wx += 4) if ((wx * 5 + wy * 3 + n) % 7 < 2) rect(g, wx, wy, 2, 2, (wx + wy) % 3 ? 3 : 4);
    }
    x += w + ((n * 5) % 3) * 4;
  }
  rect(g, 0, CITY_BASE, g[0].length, g.length - CITY_BASE, 5);
  return g;
}

const afterHoursPalettes = () => setFloors(palettes.map((p) => [...p]), 0)
  .map((p, i) => (TOWER_PAL.includes(i) ? [...FRAME, ...p.slice(3)] : i === PAL.far ? pad(CITY) : p));

export const afterHours = () => {
  const s = screen(NIGHT, [toLayer(2, stamp(grid(SKY_COLS), citySkyline(), PAL.far), [0.5, 0]), towerLayer()]);
  return { ...s, palettes: afterHoursPalettes(), math: skyGradient };
};

export const screens = {
  title,
  select: screen(NIGHT, [{ ...skyline.far, scroll: [0, 0] }, toLayer(1, stamp(grid(), selectPicture(), PAL.frame), [0, 0])]),
  hud: screen(NIGHT, [skyline.far, skyline.near, hudLayer()]),
  gameover: screen(rgb15(1, 0, 1), [{ ...skyline.far, scroll: [0, 0] }, toLayer(1, stamp(grid(), gameOverPicture(), PAL.stamp), [0, 0])]),
  theend: screen(NIGHT, [{ ...skyline.far, scroll: [0, 0] }, { ...theEndLayer(), scroll: [0, 0] }]),
};

export default title;

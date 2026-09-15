// The SNES front end as Mode 1 backgrounds (src/snes/layers.mjs): the night skyline in two parallax
// layers, the select frame, the BG3 HUD, GAME OVER and THE END, plus the FINAL NOTICE logo as a Mode 7
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
  // frame: 1 outline, 2-4 walnut, 5-7 brass, 8-9 portrait well, 10-11 felt
  pad([rgb15(3, 2, 3), rgb15(8, 4, 3), rgb15(12, 7, 4), rgb15(16, 10, 6), rgb15(17, 11, 3), rgb15(24, 18, 6), rgb15(30, 26, 14), rgb15(2, 2, 5), rgb15(4, 4, 9), rgb15(10, 2, 6), rgb15(14, 4, 8)]),
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

// Walnut and felt: a header plate for the prompt, two brass-framed portrait wells and name plates.
function selectPicture() {
  const g = canvas(COLS * TILE, ROWS * TILE);
  rect(g, 0, 0, g[0].length, g.length, 10);
  for (let y = 0; y < g.length; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < g[0].length; x += 4) put(g, x, y, 11);
  bevel(g, 0, 0, 256, 224, { outline: 1, light: 4, dark: 2, fill: 3 });
  for (let y = 3; y < 221; y += 4) { rect(g, 2, y, 12, 1, 2); rect(g, 242, y, 12, 1, 2); }
  bevel(g, 14, 14, 228, 196, { outline: 1, light: 7, dark: 5, fill: 6 });
  bevel(g, 16, 16, 224, 192, { outline: 1, light: 11, dark: 1, fill: 10 });
  for (let y = 18; y < 206; y += 4) for (let x = (y / 4) % 2 ? 20 : 18; x < 238; x += 4) put(g, x, y, 11);
  bevel(g, 56, 24, 144, 24, { outline: 1, light: 4, dark: 2, fill: 3 });
  bevel(g, 60, 28, 136, 16, { outline: 1, light: 7, dark: 5, fill: 6 });
  for (const x of [32, 136]) {
    bevel(g, x, 56, 88, 112, { outline: 1, light: 7, dark: 5, fill: 6 });
    bevel(g, x + 4, 60, 80, 104, { outline: 1, light: 1, dark: 5, fill: 9 });
    checker(g, x + 6, 62, 76, 4, 8, 9);
    checker(g, x + 6, 62, 4, 100, 8, 9);
    rect(g, x + 6, 62, 76, 2, 8);
    rect(g, x + 6, 62, 2, 100, 8);
    bevel(g, x, 176, 88, 16, { outline: 1, light: 7, dark: 5, fill: 6 });
    for (const rx of [x + 4, x + 82]) draw(g, rx, 182, ['75', '51']);
  }
  return g;
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

export const screens = {
  title,
  select: screen(rgb15(3, 2, 3), [toLayer(1, stamp(grid(), selectPicture(), PAL.frame), [0, 0])]),
  hud: screen(NIGHT, [skyline.far, skyline.near, hudLayer()]),
  gameover: screen(rgb15(1, 0, 1), [{ ...skyline.far, scroll: [0, 0] }, toLayer(1, stamp(grid(), gameOverPicture(), PAL.stamp), [0, 0])]),
  theend: screen(NIGHT, [{ ...skyline.far, scroll: [0, 0] }, { ...theEndLayer(), scroll: [0, 0] }]),
};

export default title;

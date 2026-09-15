// Stage 1, Claims & Adjustments: Reception and the Service Floor as Mode 1 layers.
// ?snes&art=claims (&area=2 for the Service Floor, &x=<pixels> to pin the camera).
//
// The style the other background modules copy:
// - Each area is painted on a pixel canvas per layer, then cut into 8x8 tiles and deduplicated, so
//   the tile budget is whatever the painting costs; a tile that mixes two palettes throws.
// - One stage-wide set of 8 palettes. Ramps are 3 steps, dark to light, lit from the upper left.
//   A palette holding a prop (desk, cart) repeats the wall's first 6 colours so the prop's tiles
//   can carry the wall behind it.
//     0 night view   navy sky 1-3, star 4, moon 5-6, towers 7-8, lit windows 9-A
//     1 salmon stone slab 1-3, grout 4, vein 5, polish 6
//     2 desk         wall 1-6, marble 7-9, brass A-C, outline D, shadow E, mahogany F
//     3 cart         wall 1-6, metal 7-9, yellow A-B, bag C, bottle D, outline E, mop F
//     4 carpet       burgundy 1-3, gold lane 4-5, shadow 6
//     5 cubicles     fabric 1-3, frame 4-6, beige 7-8, shade green 9-A, brass B, glow C-E, bulb F
//     6 far wall     ceiling 1-2, tube 3-4, seafoam panel 5-7, seam 8, rail 9-A, clock B-C, glass D-E, lit F
//     7 reception    plaster 1-3, wood 4-6, bronze 7-9, cornice A, outline B, shadow C
// - Tile budget (unique tiles, test/snes-layers.test.mjs keeps it under 384 an area, of the 1024
//   a tileset allows): Reception BG2 86, BG1 145; Service Floor BG2 48, BG1 61. Texture repeats on
//   a period of 24, 48, 96 or 128 px so it dedupes; per-pixel noise would cost a tile a cell.
// - Dither only as a 2x2 checker, only on backgrounds. BG1 ends at the floor's top line so the hdma
//   perspective never shears a prop; props stand with their feet on that line.
// - Colour math: glass is a half blend of a cool colour over BG2 on the window lines (BG1's wall is
//   not enabled, so only the view through the openings tints); the floor darkens toward the wall by
//   a stepped subtract on BG1's floor lines. Lamp glows are dithered onto the partitions, since one
//   fixed colour cannot light two lamps without tinting the whole band.
import { rgb15 } from '../color.mjs';
import { floorTable, TILE } from '../layers.mjs';

const COLS = 64;
const ROWS = 28;
export const FLOOR = 152;

export const pad = (c) => [...c, ...Array(15 - c.length).fill(c[c.length - 1])];
const WALL = [rgb15(13, 8, 10), rgb15(17, 11, 12), rgb15(21, 15, 14), rgb15(6, 3, 3), rgb15(10, 5, 4), rgb15(15, 8, 6)];

export const palettes = [
  pad([rgb15(1, 1, 6), rgb15(2, 3, 9), rgb15(4, 5, 12), rgb15(26, 26, 30), rgb15(30, 29, 24), rgb15(21, 21, 20), rgb15(1, 1, 4), rgb15(4, 5, 9), rgb15(30, 24, 10), rgb15(21, 13, 6)]),
  pad([rgb15(19, 9, 7), rgb15(24, 13, 10), rgb15(28, 18, 14), rgb15(12, 6, 5), rgb15(30, 23, 19), rgb15(31, 27, 23)]),
  pad([...WALL, rgb15(16, 15, 17), rgb15(23, 22, 24), rgb15(29, 29, 30), rgb15(14, 10, 3), rgb15(24, 18, 6), rgb15(31, 27, 14), rgb15(3, 2, 3), rgb15(9, 5, 7), rgb15(8, 2, 3)]),
  pad([...WALL, rgb15(8, 9, 11), rgb15(15, 16, 18), rgb15(24, 25, 27), rgb15(20, 15, 2), rgb15(29, 24, 6), rgb15(6, 8, 14), rgb15(10, 16, 26), rgb15(3, 2, 3), rgb15(26, 25, 22)]),
  pad([rgb15(9, 2, 4), rgb15(13, 3, 6), rgb15(17, 5, 8), rgb15(18, 12, 6), rgb15(25, 18, 8), rgb15(5, 1, 2)]),
  pad([rgb15(6, 11, 11), rgb15(9, 16, 15), rgb15(13, 21, 19), rgb15(8, 8, 9), rgb15(14, 14, 15), rgb15(21, 21, 22), rgb15(17, 14, 10), rgb15(23, 20, 14), rgb15(3, 11, 6), rgb15(6, 17, 9), rgb15(24, 18, 6), rgb15(15, 20, 14), rgb15(20, 24, 16), rgb15(25, 27, 18), rgb15(31, 29, 18)]),
  pad([rgb15(5, 6, 7), rgb15(9, 10, 11), rgb15(27, 30, 28), rgb15(18, 22, 21), rgb15(7, 14, 13), rgb15(10, 19, 17), rgb15(14, 24, 21), rgb15(4, 8, 8), rgb15(12, 7, 5), rgb15(18, 11, 7), rgb15(26, 26, 22), rgb15(6, 6, 8), rgb15(2, 3, 9), rgb15(7, 9, 16), rgb15(26, 21, 9)]),
  pad([...WALL, rgb15(9, 6, 3), rgb15(17, 12, 5), rgb15(26, 20, 10), rgb15(27, 24, 19), rgb15(3, 2, 3), rgb15(9, 5, 7)]),
];

export const noise = (x, y) => {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h ^ (h >>> 16)) & 255;
};

export function canvas(cols) {
  const w = cols * TILE;
  const h = ROWS * TILE;
  const v = new Uint8Array(w * h);
  const pal = new Int8Array(cols * ROWS).fill(-1);
  const c = {
    cols, w, h, v, pal,
    set(x, y, val) { if (x >= 0 && y >= 0 && x < w && y < h) v[y * w + x] = val; },
    get: (x, y) => v[y * w + x],
    rect(x, y, rw, rh, val) { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) c.set(i, j, val); },
    checker(x, y, rw, rh, val, keep = () => true) {
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (((i + j) & 1) === 0 && keep(i, j)) c.set(i, j, val);
    },
    palette(x, y, rw, rh, p) {
      for (let ty = Math.floor(y / TILE); ty < Math.ceil((y + rh) / TILE); ty++) {
        for (let tx = Math.floor(x / TILE); tx < Math.ceil((x + rw) / TILE); tx++) if (tx >= 0 && tx < cols && ty < ROWS) pal[ty * cols + tx] = p;
      }
    },
  };
  return c;
}

// Cut a canvas into deduplicated tiles: answers the layer's map and legend and fills `tiles`.
export function cut(c, prefix, tiles) {
  const seen = new Map();
  const legend = {};
  const map = [];
  for (let ty = 0; ty < ROWS; ty++) {
    let row = '';
    for (let tx = 0; tx < c.cols; tx++) {
      const pixels = [];
      for (let y = 0; y < TILE; y++) {
        let r = '';
        for (let x = 0; x < TILE; x++) r += c.get(tx * TILE + x, ty * TILE + y).toString(16).toUpperCase();
        pixels.push(r);
      }
      if (pixels.every((r) => r === '00000000')) { row += '.'; continue; }
      const palette = c.pal[ty * c.cols + tx];
      if (palette < 0) throw new Error(`${prefix} tile ${tx},${ty} has no palette`);
      const key = `${palette}:${pixels.join('')}`;
      if (!seen.has(key)) {
        const ch = String.fromCharCode(0x100 + seen.size);
        const name = `${prefix}${seen.size}`;
        seen.set(key, ch);
        tiles[name] = { palette, pixels };
        legend[ch] = name;
      }
      row += seen.get(key);
    }
    map.push(row);
  }
  return { map, legend };
}

// The floor darkens toward the wall in 8-line steps of subtract.
export const floorMath = () => Array.from({ length: 9 }, (_, i) => (8 - i ? [8, 'sub', rgb15(8 - i, 8 - i, 8 - i), [1]] : [8, 'none']));

function nightView() {
  const c = canvas(COLS);
  c.palette(0, 0, c.w, FLOOR, 0);
  for (let y = 0; y < FLOOR; y++) c.rect(0, y, c.w, 1, y < 48 ? 1 : y < 96 ? 2 : 3);
  c.checker(0, 44, c.w, 4, 2);
  c.checker(0, 92, c.w, 4, 3);
  for (let i = 0; i < 90; i++) {
    const x = (noise(i, 1) % 128) + 128 * (i % 4);
    const y = noise(i, 2) % 70;
    if (x < c.w) c.set(x, y + 4, 4);
  }
  let x = 0;
  for (let n = 0; x < 128; n++) {
    const bw = 24 + (noise(n % 5, 3) % 5) * 8;
    const top = 60 + (noise(n % 5, 4) % 7) * 8;
    c.rect(x, top, bw, FLOOR - top, 7);
    c.rect(x + bw - 2, top, 2, FLOOR - top, 8);
    c.rect(x, top, bw, 1, 8);
    if (noise(n % 5, 5) % 3 === 0) c.rect(x + (bw >> 1), top - 10, 1, 10, 8);
    for (let wy = top + 5; wy < FLOOR - 4; wy += 7) {
      for (let wx = x + 4; wx < x + bw - 5; wx += 5) {
        const k = noise((wx - x) + n % 5, wy) % 7;
        if (k < 2) c.rect(wx, wy, 2, 3, k ? 10 : 9);
      }
    }
    x += bw + (noise(n % 5, 6) % 2) * 8;
  }
  for (let y = 0; y < FLOOR; y++) for (let px = 128; px < c.w; px++) c.set(px, y, c.get(px % 128, y));
  for (let y = -9; y <= 9; y++) for (let mx = -9; mx <= 9; mx++) {
    if (mx * mx + y * y <= 81) c.set(150 + mx, 30 + y, (mx + 3) * (mx + 3) + (y + 3) * (y + 3) > 70 ? 6 : 5);
  }
  return c;
}

const WINDOWS = [16, 104, 312, 408];

function receptionWall() {
  const c = canvas(COLS);
  c.palette(0, 0, c.w, FLOOR, 7);
  c.rect(0, 0, c.w, 4, 11);
  c.rect(0, 4, c.w, 8, 10);
  c.rect(0, 7, c.w, 1, 5);
  c.rect(0, 12, c.w, 4, 12);
  c.rect(0, 16, c.w, 32, 3);
  c.checker(0, 40, c.w, 8, 2);
  c.rect(0, 48, c.w, 40, 2);
  c.checker(0, 88, c.w, 8, 1);
  c.rect(0, 96, c.w, 16, 1);
  c.rect(0, 16, c.w, 2, 12);
  for (const wx of WINDOWS) {
    c.rect(wx - 2, 22, 60, 90, 12);
    c.checker(wx - 4, 20, 64, 2, 12);
    c.rect(wx, 24, 56, 88, 8);
    c.rect(wx, 24, 56, 2, 9);
    c.rect(wx, 24, 2, 88, 9);
    c.rect(wx + 54, 24, 2, 88, 7);
    c.rect(wx + 4, 28, 48, 80, 0);
    c.rect(wx + 26, 28, 4, 80, 8);
    c.rect(wx + 26, 28, 1, 80, 9);
    c.rect(wx + 4, 62, 48, 3, 8);
    c.rect(wx + 4, 62, 48, 1, 9);
  }
  c.rect(0, 112, c.w, 2, 9);
  c.rect(0, 114, c.w, 4, 8);
  c.rect(0, 118, c.w, 2, 7);
  c.rect(0, 120, c.w, 24, 5);
  for (let px = 0; px < c.w; px += 32) {
    c.rect(px + 4, 124, 24, 16, 4);
    c.rect(px + 5, 125, 22, 14, 5);
    c.rect(px + 5, 125, 22, 1, 6);
    c.rect(px + 5, 125, 1, 14, 6);
  }
  c.rect(0, 144, c.w, 8, 4);
  c.rect(0, 144, c.w, 1, 6);
  desk(c, 184);
  cart(c, 472);
  return c;
}

function desk(c, x) {
  c.palette(x, 96, 96, 56, 2);
  c.rect(x + 2, 104, 92, 48, 13);
  c.rect(x + 4, 112, 88, 38, 15);
  c.rect(x + 4, 116, 88, 2, 11);
  c.rect(x + 4, 116, 88, 1, 12);
  for (let px = x + 12; px < x + 88; px += 20) {
    c.rect(px, 122, 12, 22, 4);
    c.rect(px + 1, 123, 10, 20, 5);
    c.rect(px + 1, 123, 10, 1, 6);
    c.rect(px + 5, 131, 2, 4, 11);
  }
  c.rect(x + 4, 146, 88, 4, 4);
  c.rect(x, 104, 96, 8, 8);
  c.rect(x, 104, 96, 2, 9);
  c.checker(x, 108, 96, 3, 7);
  c.rect(x, 111, 96, 1, 14);
  for (let i = 0; i < 12; i++) c.set(x + noise(i, 9) % 90 + 3, 106 + (noise(i, 10) % 4), 7);
  c.rect(x + 16, 100, 9, 4, 11);
  c.rect(x + 18, 98, 5, 2, 12);
  c.rect(x + 20, 97, 1, 1, 12);
  c.rect(x + 16, 103, 9, 1, 10);
  c.rect(x + 60, 101, 22, 3, 10);
  c.rect(x + 60, 101, 22, 1, 12);
  c.rect(x + 64, 102, 14, 1, 11);
}

function cart(c, x) {
  c.palette(x, 104, 32, 48, 3);
  c.rect(x + 2, 110, 2, 38, 7);
  c.rect(x + 28, 110, 2, 38, 7);
  c.rect(x + 2, 110, 1, 38, 8);
  c.rect(x + 1, 120, 30, 3, 8);
  c.rect(x + 1, 120, 30, 1, 9);
  c.rect(x + 1, 141, 30, 3, 8);
  c.rect(x + 1, 141, 30, 1, 9);
  c.rect(x + 6, 114, 3, 6, 13);
  c.rect(x + 11, 112, 3, 8, 13);
  c.rect(x + 6, 114, 1, 6, 9);
  c.rect(x + 20, 123, 9, 18, 12);
  c.rect(x + 20, 123, 2, 18, 13);
  c.rect(x + 4, 130, 14, 11, 11);
  c.rect(x + 4, 130, 14, 2, 10);
  c.rect(x + 16, 130, 2, 11, 10);
  c.rect(x + 10, 106, 1, 26, 6);
  c.rect(x + 7, 126, 7, 5, 15);
  c.rect(x + 2, 148, 4, 4, 14);
  c.rect(x + 26, 148, 4, 4, 14);
  c.rect(x + 3, 148, 2, 1, 8);
  c.rect(x + 27, 148, 2, 1, 8);
}

export function stoneFloor(c) {
  c.palette(0, FLOOR, c.w, c.h - FLOOR, 1);
  for (let y = FLOOR; y < c.h; y++) {
    const row = Math.floor((y - FLOOR) / 24);
    const shift = row & 1 ? 24 : 0;
    for (let x = 0; x < c.w; x++) {
      const sx = (x + shift) % 48;
      const sy = (y - FLOOR) % 24;
      const slab = ((((x + shift) / 48) | 0) + row) % 2;
      const lit = sx + sy * 2 + slab * 12;
      const band = (t) => (lit < t - 3 ? 0 : lit > t + 3 ? 1 : (x + y) & 1);
      let val = 3 - band(34) - band(74);
      if (slab === 0 && sy > 2 && sx === (10 + sy + (noise(sy, 3) & 1)) % 48) val = 5;
      if (sx === 0 || sy === 0) val = 4;
      else if (sx === 1 || sy === 1) val = 6;
      c.set(x, y, val);
    }
  }
  c.rect(0, FLOOR, c.w, 2, 4);
}

function reception() {
  const tiles = {};
  const view = cut(nightView(), 'rn', tiles);
  const wall = receptionWall();
  stoneFloor(wall);
  const play = cut(wall, 'rw', tiles);
  return {
    name: 'Reception',
    backdrop: rgb15(1, 1, 4),
    palettes,
    tiles,
    layers: [
      { bg: 2, ...view, scroll: [0.5, 0] },
      { bg: 1, ...play, scroll: [1, 0], hdma: floorTable({ top: FLOOR, horizon: FLOOR - 160 }) },
    ],
    math: [[28, 'none'], [80, 'half', rgb15(7, 11, 15), [2]], [44, 'none'], ...floorMath()],
  };
}

function serviceWall() {
  const c = canvas(COLS);
  c.palette(0, 0, c.w, FLOOR, 6);
  c.rect(0, 0, c.w, 24, 1);
  c.checker(0, 0, c.w, 24, 2);
  for (let px = 8; px < c.w; px += 64) {
    c.rect(px - 2, 10, 44, 8, 4);
    c.rect(px, 12, 40, 4, 3);
  }
  c.rect(0, 24, c.w, 4, 8);
  c.rect(0, 28, c.w, 124, 6);
  for (let px = 0; px < c.w; px += 48) {
    c.rect(px, 28, 1, 124, 8);
    c.rect(px + 1, 28, 2, 124, 7);
    c.rect(px + 45, 28, 3, 124, 5);
  }
  for (let px = 0; px < c.w; px += 96) {
    c.rect(px + 8, 40, 32, 36, 12);
    c.rect(px + 10, 42, 28, 32, 13);
    c.checker(px + 10, 42, 28, 14, 14);
    for (let i = 0; i < 10; i++) c.rect(px + 12 + (noise(i, 7) % 24), 58 + (noise(i, 8) % 14), 1, 2, 15);
    c.rect(px + 23, 42, 2, 32, 12);
  }
  c.rect(0, 88, c.w, 8, 9);
  c.rect(0, 88, c.w, 1, 10);
  for (const cx of [264, 520]) {
    for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) {
      const d = x * x + y * y;
      if (d <= 100) c.set(cx + x, 56 + y, d > 72 ? 12 : 11);
    }
    c.rect(cx, 48, 1, 8, 12);
    c.rect(cx, 56, 6, 1, 12);
  }
  return c;
}

function cubicles(c) {
  for (let x = 0; x < c.w; x += 96) {
    c.palette(x, 80, 96, 72, 5);
    c.rect(x, 104, 88, 48, 2);
    c.checker(x, 108, 88, 6, 3);
    c.checker(x, 128, 88, 8, 1);
    c.rect(x, 136, 88, 12, 1);
    for (let j = 112; j < 148; j += 4) c.checker(x + 4, j, 80, 1, j < 130 ? 3 : 2, (i) => i % 4 === 0);
    c.rect(x, 104, 88, 4, 5);
    c.rect(x, 104, 88, 1, 6);
    c.rect(x, 104, 3, 48, 5);
    c.rect(x, 104, 1, 48, 6);
    c.rect(x + 85, 104, 3, 48, 4);
    c.rect(x, 148, 88, 4, 4);
    c.rect(x + 14, 86, 24, 18, 7);
    c.rect(x + 14, 86, 24, 1, 8);
    c.rect(x + 17, 89, 18, 11, 4);
    c.checker(x + 18, 90, 16, 9, 10, (i, j) => j % 3 === 0);
    c.rect(x + 22, 100, 8, 4, 8);
    for (let y = 108; y < 132; y++) {
      for (let i = x + 46; i < x + 82; i++) {
        const d = Math.hypot((i - (x + 64)) / 1.6, y - 104);
        if (d < 10 && ((i + y) & 1) === 0) c.set(i, y, 14);
        else if (d < 18 && ((i + y) & 1) === 0) c.set(i, y, 13);
        else if (d < 24 && ((i + y) & 3) === 0) c.set(i, y, 12);
      }
    }
    c.rect(x + 60, 100, 9, 4, 11);
    c.rect(x + 64, 92, 1, 8, 11);
    c.rect(x + 56, 88, 16, 5, 10);
    c.rect(x + 56, 88, 16, 1, 9);
    c.rect(x + 56, 92, 16, 1, 9);
    c.rect(x + 61, 93, 6, 1, 15);
  }
}

export function carpet(c) {
  c.palette(0, FLOOR, c.w, c.h - FLOOR, 4);
  for (let y = FLOOR; y < c.h; y++) {
    const ly = (y - FLOOR) % 24;
    const lane = Math.floor((y - FLOOR) / 24) % 2 ? 2 : 1;
    for (let x = 0; x < c.w; x++) {
      const dx = Math.abs(((x + lane * 12) % 24) - 12);
      let val = lane;
      if (ly === 22) val = 5;
      else if (ly === 23) val = 4;
      else if (ly < 2 && (x + y) & 1) val = 6;
      else if (ly > 18 && (x + y) & 1) val = lane + 1;
      else if (Math.abs(ly - 11) + dx === 5 && !(x & 1)) val = lane + 1;
      c.set(x, y, val);
    }
  }
  c.rect(0, FLOOR, c.w, 2, 6);
  c.checker(0, FLOOR + 2, c.w, 4, 6);
}

function serviceFloor() {
  const tiles = {};
  const far = cut(serviceWall(), 'sw', tiles);
  const floor = canvas(96);
  cubicles(floor);
  carpet(floor);
  const play = cut(floor, 'sf', tiles);
  return {
    name: 'Service Floor',
    backdrop: rgb15(5, 6, 7),
    palettes,
    tiles,
    layers: [
      { bg: 2, ...far, scroll: [0.5, 0] },
      { bg: 1, ...play, scroll: [1, 0], hdma: floorTable({ top: FLOOR, horizon: FLOOR - 160 }) },
    ],
    math: [[28, 'add', rgb15(3, 4, 3), [2]], [124, 'none'], ...floorMath()],
  };
}

const areas = [reception(), serviceFloor()];

export default { ...areas[0], areas };

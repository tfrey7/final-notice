// SNES Mode 1 background layers, as data. A background module in src/snes/bg/<name>.mjs
// default-exports one scene:
//
//   export default {
//     backdrop: rgb15(...),                    // colour 0 of the screen, behind every layer
//     palettes: [[15 rgb15], ...],             // at most 8 background palettes, shared by all layers
//     tiles: {
//       wall: { palette: 2, pixels: ['0123...', ...] },   // 8 rows of 8 chars 0-9A-F, 0 transparent
//     },
//     layers: [
//       {
//         bg: 1,                               // 1 play layer, 2 far layer (16 colours); 3 HUD (4 colours)
//         map: ['..ww..', ...],                // rows of equal length, one char a tile, '.' empty
//         legend: { w: 'wall' },               // char to tile name
//         scroll: [1, 0],                      // camera x and y multipliers; [0, 0] is fixed (HUD)
//         hdma: [[160, 1], [1, 1.02], ...],    // optional: runs of [lines, x multiplier] from line 0
//       },
//     ],
//     math: [[16, 'none'], [96, 'half', rgb15(...), [2]], ...],   // optional colour math, see below
//   };
//
// `math` is the fixed-colour half of colour math (CGADSUB + COLDATA rewritten by two hdma channels):
// runs of [lines, op, colour, layers] from line 0, op one of none/add/sub/half. On those lines a
// pixel whose topmost layer is in `layers` gets the colour added, subtracted, or averaged in. The
// layers enabled per run stand in for a window: glass on BG2 seen through BG1's openings tints
// only the view, and a floor darkened toward the horizon is a sub gradient on BG1's floor lines.
// Layer 0 is the backdrop, so a sky gradient is an add on the backdrop that grows line by line.
//
// A tile uses one palette. BG1 and BG2 tiles draw values 1-F as that palette's colours 1-15; BG3
// tiles only 1-3, its first three. The map wraps like the hardware's, so a layer tiles sideways
// forever. Priority, back to front: backdrop, BG2, BG1, BG3 (Mode 1 with the BG3 priority bit, so
// the HUD sits over everything). `hdma` replaces the layer's x multiplier line by line, the way an
// HDMA channel rewrites the scroll register each scanline: a floor whose multiplier grows toward
// the bottom of the screen bends into perspective. Lines past the table keep its last multiplier.
// sceneProblems() checks all of it; test/snes-layers.test.mjs runs it on every bg module.

import { WIDTH, HEIGHT } from './screen.mjs';
import { hex, rgb, isRgb15 } from './color.mjs';
import { BG_PALETTES, paletteSetProblems } from './limits.mjs';
import { MAX_DRIFT_BANDS, MAX_DRIFT_SLOTS } from './descent.mjs';

export const TILE = 8;
export const MAX_MAP_TILES = 128;
export const MAX_TILESET = 1024;
export const HDMA_CHANNELS = 8;
export const MAX_RUN = 127;
export const DEPTHS = { 2: 0, 1: 1, 3: 2 };
const TOP_VALUE = { 1: 15, 2: 15, 3: 3 };
const ROW = /^[0-9A-F]{8}$/;
const EMPTY = '.';

export function hdmaProblems(table, height = HEIGHT) {
  if (!Array.isArray(table)) return ['an hdma table is a list of [lines, multiplier] runs'];
  const problems = [];
  let lines = 0;
  table.forEach(([n, f], i) => {
    if (!Number.isInteger(n) || n < 1 || n > MAX_RUN) problems.push(`hdma run ${i} is ${n} lines, not 1-${MAX_RUN}`);
    if (!Number.isFinite(f)) problems.push(`hdma run ${i} has no multiplier`);
    lines += n;
  });
  if (lines > height) problems.push(`hdma table covers ${lines} lines, the screen has ${height}`);
  return problems;
}

export function sceneProblems(scene) {
  const problems = [];
  const palettes = scene.palettes ?? [];
  problems.push(...paletteSetProblems({ bg: palettes }));
  const tiles = scene.tiles ?? {};
  if (Object.keys(tiles).length > MAX_TILESET) problems.push(`more than ${MAX_TILESET} tiles`);
  for (const [name, t] of Object.entries(tiles)) {
    if (!(Number.isInteger(t.palette) && t.palette >= 0 && t.palette < Math.min(BG_PALETTES, palettes.length))) problems.push(`tile ${name} names no palette`);
    if (!Array.isArray(t.pixels) || t.pixels.length !== TILE || !t.pixels.every((r) => typeof r === 'string' && ROW.test(r))) {
      problems.push(`tile ${name} is not ${TILE} rows of ${TILE} values 0-9A-F`);
    }
  }
  const layers = scene.layers ?? [];
  const seen = new Set();
  let channels = 0;
  for (const layer of layers) {
    const at = `bg${layer.bg}`;
    if (!(layer.bg in DEPTHS)) { problems.push(`a layer's bg is ${layer.bg}, Mode 1 has 1, 2 and 3`); continue; }
    if (seen.has(layer.bg)) problems.push(`${at} appears twice`);
    seen.add(layer.bg);
    const map = layer.map ?? [];
    const w = map[0]?.length ?? 0;
    if (!w || !map.every((r) => typeof r === 'string' && r.length === w)) problems.push(`${at} map is not rows of equal length`);
    if (w > MAX_MAP_TILES || map.length > MAX_MAP_TILES) problems.push(`${at} map is over ${MAX_MAP_TILES} tiles a side`);
    const used = new Set(map.join(''));
    used.delete(EMPTY);
    for (const ch of used) {
      const t = tiles[layer.legend?.[ch]];
      if (!t) { problems.push(`${at} map char ${ch} names no tile`); continue; }
      const top = Math.max(...(t.pixels ?? []).join('').split('').map((v) => parseInt(v, 16)));
      if (top > TOP_VALUE[layer.bg]) problems.push(`${at} tile ${layer.legend[ch]} uses value ${top.toString(16).toUpperCase()}, the layer draws 0-${TOP_VALUE[layer.bg]}`);
    }
    const s = layer.scroll ?? [1, 1];
    if (!(Array.isArray(s) && s.length === 2 && s.every(Number.isFinite))) problems.push(`${at} scroll is not [x, y] multipliers`);
    if (layer.hdma) {
      channels++;
      problems.push(...hdmaProblems(layer.hdma).map((m) => `${at}: ${m}`));
    }
  }
  if (scene.math) {
    channels += 2;
    problems.push(...mathProblems(scene.math));
  }
  if (scene.drift) {
    channels++;
    problems.push(...hdmaProblems(scene.drift.map(([n]) => [n, 1])).map((m) => `drift: ${m.replace('hdma ', '')}`));
    if (scene.drift.length > MAX_DRIFT_BANDS) problems.push(`drift has ${scene.drift.length} bands, at most ${MAX_DRIFT_BANDS}`);
    if (scene.drift.some(([, w]) => w.length > MAX_DRIFT_SLOTS)) problems.push(`drift rewrites more than ${MAX_DRIFT_SLOTS} slots a band`);
  }
  if (channels > HDMA_CHANNELS) problems.push(`more than ${HDMA_CHANNELS} hdma channels`);
  return problems;
}

export const MATH_OPS = ['none', 'add', 'sub', 'half'];

export function mathProblems(runs, height = HEIGHT) {
  if (!Array.isArray(runs)) return ['math is a list of [lines, op, colour, layers] runs'];
  const problems = hdmaProblems(runs.map(([n]) => [n, 1]), height).map((m) => `math: ${m.replace('hdma ', '')}`);
  runs.forEach(([, op, colour, layers], i) => {
    if (!MATH_OPS.includes(op)) problems.push(`math run ${i} op is ${op}, not ${MATH_OPS.join('/')}`);
    if (op === 'none') return;
    if (!isRgb15(colour)) problems.push(`math run ${i} colour is not rgb15`);
    if (!(Array.isArray(layers) && layers.length && layers.every((b) => b === 0 || b in DEPTHS))) problems.push(`math run ${i} layers are not among 0, 1, 2, 3`);
  });
  return problems;
}

// One { op, rgb, layers } per scanline, or null where no math runs.
export function mathLines(runs, height = HEIGHT) {
  const out = new Array(height).fill(null);
  let y = 0;
  for (const [n, op, colour, layers] of runs ?? []) {
    const m = op === 'none' ? null : { op, rgb: rgb(colour), layers: new Set(layers) };
    for (let i = 0; i < n && y < height; i++) out[y++] = m;
  }
  return out;
}

const OPS = {
  add: (a, b) => Math.min(255, a + b),
  sub: (a, b) => Math.max(0, a - b),
  half: (a, b) => (a + b) >> 1,
};

// One multiplier per scanline, from a layer's hdma table (or its plain x multiplier).
export function lineFactors(layer, height = HEIGHT) {
  const base = (layer.scroll ?? [1, 1])[0];
  const out = new Array(height).fill(base);
  if (!layer.hdma) return out;
  let y = 0;
  let last = base;
  for (const [n, f] of layer.hdma) {
    for (let i = 0; i < n && y < height; i++) out[y++] = f;
    last = f;
  }
  for (; y < height; y++) out[y] = last;
  return out;
}

const wrap = (v, size) => ((Math.floor(v) % size) + size) % size;

// A layer's scroll registers for a camera position: [x, y] in map pixels, wrapped to the map.
export function layerScroll(layer, camX, camY, factor = (layer.scroll ?? [1, 1])[0]) {
  const w = layer.map[0].length * TILE;
  const h = layer.map.length * TILE;
  return [wrap(camX * factor, w), wrap(camY * (layer.scroll ?? [1, 1])[1], h)];
}

// Run-length hdma table that bends a floor: lines above `top` keep multiplier 1, the floor's top
// line moves with the wall (1) and each line below moves faster, as (y - horizon) / (top - horizon),
// so the line at `horizon` would stand still. That is exact perspective for a flat floor.
export function floorTable({ top, bottom = HEIGHT, horizon }) {
  if (!(horizon < top && top < bottom)) throw new RangeError('floorTable wants horizon < top < bottom');
  const runs = [];
  for (let left = top; left > 0; left -= MAX_RUN) runs.push([Math.min(MAX_RUN, left), 1]);
  for (let y = top; y < bottom; y++) runs.push([1, (y - horizon) / (top - horizon)]);
  return runs;
}

// Every map pixel of a layer as 0xRRGGBB + 1, 0 transparent: baked once, read per scanline.
export function bakeLayer(scene, layer) {
  const w = layer.map[0].length * TILE;
  const h = layer.map.length * TILE;
  const px = new Int32Array(w * h);
  const idx = scene.drift ? new Int16Array(w * h) : null;
  const top = TOP_VALUE[layer.bg];
  layer.map.forEach((row, ty) => [...row].forEach((ch, tx) => {
    const t = scene.tiles[layer.legend?.[ch]];
    if (ch === EMPTY || !t) return;
    const pal = scene.palettes[t.palette];
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const v = parseInt(t.pixels[y][x], 16);
        if (!v || v > top) continue;
        const i = (ty * TILE + y) * w + tx * TILE + x;
        px[i] = hex(pal[v - 1]) + 1;
        if (idx) idx[i] = t.palette * 16 + v;
      }
    }
  }));
  return { layer, w, h, px, idx };
}

// A scene's `drift` (descent.mjs driftTable): per scanline, a lookup from palette * 16 + slot to
// 0xRRGGBB + 1, the scene's palettes with that band's CGRAM writes applied.
export function driftLuts(scene, height = HEIGHT) {
  const base = new Int32Array(BG_PALETTES * 16);
  scene.palettes.forEach((pal, p) => pal.forEach((c, s) => { base[p * 16 + s + 1] = hex(c) + 1; }));
  const out = new Array(height).fill(base);
  let y = 0;
  for (const [n, writes] of scene.drift) {
    const lut = base.slice();
    for (const [p, s, c] of writes) lut[p * 16 + s] = hex(c) + 1;
    for (let i = 0; i < n && y < height; i++) out[y++] = lut;
  }
  return out;
}

export const bakeScene = (scene) => scene.layers
  .map((l) => bakeLayer(scene, l))
  .sort((a, b) => DEPTHS[a.layer.bg] - DEPTHS[b.layer.bg]);

// The whole picture for a camera position as RGBA bytes, one scanline at a time: each line reads
// every layer at that line's scroll, back to front, over the backdrop.
export function composeFrame(scene, baked, camX, camY, out = new Uint8ClampedArray(WIDTH * HEIGHT * 4)) {
  const back = hex(scene.backdrop ?? 0);
  const factors = baked.map((b) => lineFactors(b.layer));
  const ys = baked.map((b) => layerScroll(b.layer, camX, camY)[1]);
  const maths = mathLines(scene.math);
  const luts = scene.drift ? driftLuts(scene) : null;
  const row = new Int32Array(WIDTH);
  const src = new Int8Array(WIDTH);
  for (let y = 0; y < HEIGHT; y++) {
    row.fill(back + 1);
    src.fill(0);
    baked.forEach((b, i) => {
      const [sx] = layerScroll(b.layer, camX, camY, factors[i][y]);
      const my = (ys[i] + y) % b.h;
      const base = my * b.w;
      const lut = luts && b.idx ? luts[y] : null;
      for (let x = 0; x < WIDTH; x++) {
        const at = base + ((sx + x) % b.w);
        const c = lut ? (b.idx[at] && lut[b.idx[at]]) : b.px[at];
        if (c) { row[x] = c; src[x] = b.layer.bg; }
      }
    });
    const m = maths[y];
    const f = m && OPS[m.op];
    for (let x = 0; x < WIDTH; x++) {
      const c = row[x] - 1;
      const o = (y * WIDTH + x) * 4;
      out[o] = (c >> 16) & 255; out[o + 1] = (c >> 8) & 255; out[o + 2] = c & 255; out[o + 3] = 255;
      if (f && m.layers.has(src[x])) {
        out[o] = f(out[o], m.rgb[0]); out[o + 1] = f(out[o + 1], m.rgb[1]); out[o + 2] = f(out[o + 2], m.rgb[2]);
      }
    }
  }
  return out;
}

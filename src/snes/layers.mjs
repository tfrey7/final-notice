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
//   };
//
// A tile uses one palette. BG1 and BG2 tiles draw values 1-F as that palette's colours 1-15; BG3
// tiles only 1-3, its first three. The map wraps like the hardware's, so a layer tiles sideways
// forever. Priority, back to front: backdrop, BG2, BG1, BG3 (Mode 1 with the BG3 priority bit, so
// the HUD sits over everything). `hdma` replaces the layer's x multiplier line by line, the way an
// HDMA channel rewrites the scroll register each scanline: a floor whose multiplier grows toward
// the bottom of the screen bends into perspective. Lines past the table keep its last multiplier.
// sceneProblems() checks all of it; test/snes-layers.test.mjs runs it on every bg module.

import { WIDTH, HEIGHT } from './screen.mjs';
import { hex } from './color.mjs';
import { BG_PALETTES, paletteSetProblems } from './limits.mjs';

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
  if (channels > HDMA_CHANNELS) problems.push(`more than ${HDMA_CHANNELS} hdma channels`);
  return problems;
}

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
  const top = TOP_VALUE[layer.bg];
  layer.map.forEach((row, ty) => [...row].forEach((ch, tx) => {
    const t = scene.tiles[layer.legend?.[ch]];
    if (ch === EMPTY || !t) return;
    const pal = scene.palettes[t.palette];
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const v = parseInt(t.pixels[y][x], 16);
        if (v && v <= top) px[(ty * TILE + y) * w + tx * TILE + x] = hex(pal[v - 1]) + 1;
      }
    }
  }));
  return { layer, w, h, px };
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
  for (let y = 0; y < HEIGHT; y++) {
    const row = new Int32Array(WIDTH).fill(back + 1);
    baked.forEach((b, i) => {
      const [sx] = layerScroll(b.layer, camX, camY, factors[i][y]);
      const my = (ys[i] + y) % b.h;
      const base = my * b.w;
      for (let x = 0; x < WIDTH; x++) {
        const c = b.px[base + ((sx + x) % b.w)];
        if (c) row[x] = c;
      }
    });
    for (let x = 0; x < WIDTH; x++) {
      const c = row[x] - 1;
      const o = (y * WIDTH + x) * 4;
      out[o] = (c >> 16) & 255; out[o + 1] = (c >> 8) & 255; out[o + 2] = c & 255; out[o + 3] = 255;
    }
  }
  return out;
}

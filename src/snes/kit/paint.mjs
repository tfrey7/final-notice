// A layer canvas painted by material, not by palette slot. Each pixel remembers its material's
// palette, so cutting to 8x8 tiles picks the palette itself and refuses a tile that mixes two
// (common materials - outline, shadow, wall - fit in any).
import { TILE } from '../layers.mjs';
import { MAT } from './palettes.mjs';

export const ROWS = 28;

export function painter(cols, rows = ROWS) {
  const w = cols * TILE;
  const h = rows * TILE;
  const v = new Uint8Array(w * h);
  const pal = new Int8Array(w * h).fill(-1);
  const look = (name, step = 0) => {
    const m = MAT[name];
    if (!m) throw new Error(`no material ${name}`);
    return [m.pal, m.values[Math.max(0, Math.min(m.values.length - 1, step))]];
  };
  const p = {
    cols, rows, w, h, v, pal,
    // x wraps, as the layer's map does, so a prop straddling the seam paints both ends.
    set(x, y, name, step) {
      if (y < 0 || y >= h) return;
      const i = y * w + (((x % w) + w) % w);
      [pal[i], v[i]] = look(name, step);
    },
    clear(x, y) { if (y >= 0 && y < h) { const i = y * w + (((x % w) + w) % w); v[i] = 0; pal[i] = -1; } },
    get: (x, y) => v[y * w + (((x % w) + w) % w)],
    rect(x, y, rw, rh, name, step) { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) p.set(i, j, name, step); },
    // The one dither: a 2x2 checker, phase 0 or 1.
    checker(x, y, rw, rh, name, step, phase = 0) {
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (((i + j) & 1) === phase) p.set(i, j, name, step);
    },
    hole(x, y, rw, rh) { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) p.clear(i, j); },
    // A box lit from the upper left: light top and left edge, dark right and bottom, mid body.
    box(x, y, rw, rh, name, { edge = true } = {}) {
      const n = MAT[name].values.length;
      p.rect(x, y, rw, rh, name, n > 2 ? 1 : 0);
      if (!edge) return;
      p.rect(x, y, rw, 1, name, n - 1);
      p.rect(x, y, 1, rh, name, n - 1);
      p.rect(x + rw - 1, y + 1, 1, rh - 1, name, 0);
      p.rect(x + 1, y + rh - 1, rw - 1, 1, name, 0);
    },
    // Offset view for drawing a prop at its anchor.
    at(ox, oy) {
      const o = {};
      for (const k of ['set', 'clear', 'get', 'rect', 'checker', 'hole', 'box']) o[k] = (x, y, ...rest) => p[k](x + ox, y + oy, ...rest);
      return o;
    },
  };
  return p;
}

// Cut into deduplicated tiles, adding to `tiles` (shared across an area's layers under `prefix`).
export function cut(p, prefix, tiles, fallback) {
  const seen = new Map();
  const legend = {};
  const map = [];
  for (let ty = 0; ty < p.rows; ty++) {
    let row = '';
    for (let tx = 0; tx < p.cols; tx++) {
      const pixels = [];
      const pals = new Set();
      for (let y = 0; y < TILE; y++) {
        let r = '';
        for (let x = 0; x < TILE; x++) {
          const i = (ty * TILE + y) * p.w + tx * TILE + x;
          r += p.v[i].toString(16).toUpperCase();
          if (p.v[i] && p.pal[i] >= 0) pals.add(p.pal[i]);
        }
        pixels.push(r);
      }
      if (pixels.every((r) => r === '00000000')) { row += '.'; continue; }
      if (pals.size > 1) throw new Error(`${prefix} tile ${tx},${ty} mixes palettes ${[...pals].join(' and ')}`);
      const palette = pals.size ? [...pals][0] : fallback;
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

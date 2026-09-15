// SNES art as data. Every module in src/snes/art/<name>.mjs default-exports one object:
//
//   export default {
//     palette: [rgb15(...), ...],             // 15 colours; pixel value 0 is transparent, 1-F index them
//     frames: {
//       idle: { w: 48, h: 56, origin: [24, 55], pixels: ['00011110...', ...] },  // h rows of w chars 0-9A-F
//     },
//     animations: { walk: { fps: 8, frames: ['walk1', 'walk2'] } },            // optional
//   };
//
// Each frame is cut into 16x16 and 32x32 OAM entries (cutFrame), checked against the limits and baked
// to one texture per entry. test/snes.test.mjs checks every module against artProblems().

import { hex } from './color.mjs';
import { MAX_OAM, paletteProblems, frameEntries } from './limits.mjs';

const ROW = /^[0-9A-F]+$/;

export const pixelAt = (frame, x, y) => (x < 0 || y < 0 || x >= frame.w || y >= frame.h ? 0 : parseInt(frame.pixels[y][x], 16));

// The opaque pixels' bounding box inside a square, or null when it is empty.
function opaqueBox(frame, sx, sy, size) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -1; let y1 = -1;
  for (let y = sy; y < Math.min(frame.h, sy + size); y++) {
    for (let x = sx; x < Math.min(frame.w, sx + size); x++) {
      if (!pixelAt(frame, x, y)) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Covers a frame's opaque pixels with OAM entries, one 32x32 cell at a time: content that fits a
// 16x16 takes one, content in two quadrants takes two, anything more takes the 32x32. Each entry
// draws only its own cell's pixels (`clip`), so neighbours never paint a pixel twice.
export function cutFrame(frame) {
  const entries = [];
  for (let cy = 0; cy < frame.h; cy += 32) {
    for (let cx = 0; cx < frame.w; cx += 32) {
      const box = opaqueBox(frame, cx, cy, 32);
      if (!box) continue;
      const clip = { x: cx, y: cy, size: 32 };
      if (box.w <= 16 && box.h <= 16) {
        entries.push({ x: Math.min(box.x, cx + 16), y: Math.min(box.y, cy + 16), size: 16, clip });
        continue;
      }
      const quads = [[0, 0], [16, 0], [0, 16], [16, 16]].filter(([qx, qy]) => opaqueBox(frame, cx + qx, cy + qy, 16));
      if (quads.length <= 2) quads.forEach(([qx, qy]) => entries.push({ x: cx + qx, y: cy + qy, size: 16, clip }));
      else entries.push({ x: cx, y: cy, size: 32, clip });
    }
  }
  return entries;
}

// An entry's pixel values, size x size, blank outside its cell.
export function entryValues(frame, e) {
  const c = e.clip ?? { x: e.x, y: e.y, size: e.size };
  return Array.from({ length: e.size }, (_, dy) => Array.from({ length: e.size }, (_, dx) => {
    const x = e.x + dx;
    const y = e.y + dy;
    return x >= c.x && y >= c.y && x < c.x + c.size && y < c.y + c.size ? pixelAt(frame, x, y) : 0;
  }));
}

// RGBA bytes for rows of pixel values; value v is palette[v - 1], 0 transparent.
export function valuesRGBA(values, palette) {
  const h = values.length;
  const w = values[0]?.length ?? 0;
  const out = new Uint8ClampedArray(w * h * 4);
  values.forEach((row, y) => row.forEach((v, x) => {
    if (!v) return;
    const c = hex(palette[v - 1]);
    const o = (y * w + x) * 4;
    out[o] = (c >> 16) & 255; out[o + 1] = (c >> 8) & 255; out[o + 2] = c & 255; out[o + 3] = 255;
  }));
  return out;
}

export function artProblems(def) {
  const problems = paletteProblems(def.palette);
  const frames = def.frames ?? {};
  if (!Object.keys(frames).length) problems.push('no frames');
  for (const [name, f] of Object.entries(frames)) {
    if (!(Number.isInteger(f.w) && f.w > 0 && Number.isInteger(f.h) && f.h > 0)) { problems.push(`frame ${name} has no whole w and h`); continue; }
    if (!Array.isArray(f.pixels) || f.pixels.length !== f.h ||
      !f.pixels.every((row) => typeof row === 'string' && row.length === f.w && ROW.test(row))) {
      problems.push(`frame ${name} is not ${f.h} rows of ${f.w} values 0-9A-F`);
      continue;
    }
    const entries = cutFrame(f);
    if (entries.length > MAX_OAM) problems.push(`frame ${name} needs more than ${MAX_OAM} OAM entries`);
    else if (frameEntries(entries, f.h).stats.dropped) problems.push(`frame ${name} loses entries to the scanline limit on its own`);
  }
  for (const [name, a] of Object.entries(def.animations ?? {})) {
    for (const f of a.frames ?? []) if (!frames[f]) problems.push(`animation ${name} names a missing frame ${f}`);
  }
  return problems;
}

function putPixels(scene, key, w, h, data) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  const img = tex.context.createImageData(w, h);
  img.data.set(data);
  tex.context.putImageData(img, 0, 0);
  tex.refresh();
  return key;
}

const registry = new Map();

export function registerArt(name, def) {
  registry.set(name, def);
  return def;
}

// The modules in src/snes/art/, so a name with no art fails here instead of as a 404 in the console.
export const ART_MODULES = ['test', 'ward'];

export async function loadArt(name) {
  if (!registry.has(name) && !ART_MODULES.includes(name)) throw new Error(`no SNES art "${name}"`);
  if (!registry.has(name)) registerArt(name, (await import(`./art/${name}.mjs`)).default);
  return registry.get(name);
}

// A handle on named art: frame(name, ms, x, y, flipX) answers OAM entries { key, x, y, size, flipX,
// palette } with the frame's origin at (x, y); `name` is a frame or an animation. Unregistered art is
// a flat box in the fallback's three colours (edge, fill, mark), cut the same way.
export function artOr(scene, name, fallback = { w: 32, h: 32, palette: [0x0000, 0x4210, 0x7fff] }) {
  const def = registry.get(name);
  return def ? handle(scene, `snes:${name}`, name, def, false) : handle(scene, `snes:stand:${name}:${fallback.w}x${fallback.h}`, name, standInArt(fallback), true);
}

function handle(scene, prefix, name, def, standIn) {
  const cuts = new Map();
  const cut = (frameName) => {
    if (!cuts.has(frameName)) {
      const f = def.frames[frameName];
      cuts.set(frameName, cutFrame(f).map((e, i) => ({
        ...e,
        key: putPixels(scene, `${prefix}:${frameName}:${i}`, e.size, e.size, valuesRGBA(entryValues(f, e), def.palette)),
      })));
    }
    return cuts.get(frameName);
  };
  const palette = def.palette.join();
  return {
    name,
    standIn,
    frames: Object.keys(def.frames),
    animations: Object.keys(def.animations ?? {}),
    cut: (frameName) => cut(frameName),
    frame(which = Object.keys(def.frames)[0], ms = 0, x = 0, y = 0, flipX = false) {
      const a = def.animations?.[which];
      const frameName = a ? a.frames[Math.floor((ms * (a.fps ?? 8)) / 1000) % a.frames.length] : (def.frames[which] ? which : Object.keys(def.frames)[0]);
      const f = def.frames[frameName];
      const [ox, oy] = f.origin ?? [0, 0];
      return cut(frameName).map((e) => ({
        key: e.key,
        size: e.size,
        palette,
        flipX,
        x: x - (flipX ? f.w - ox : ox) + (flipX ? f.w - e.x - e.size : e.x),
        y: y - oy + e.y,
      }));
    },
  };
}

function standInArt({ w, h, palette: [edge, fill, mark] }) {
  const pixels = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return '1';
    return x === y || x === w - 1 - y ? '3' : '2';
  }).join(''));
  return { palette: [edge, fill, mark, ...Array(12).fill(fill)], frames: { stand: { w, h, pixels } } };
}

// Draws a frame's OAM entries, in priority order, through every sprite limit (frameEntries);
// `stats` holds what the limits did.
export class SpriteLayer {
  constructor(scene, depth = 10) {
    this.scene = scene;
    this.depth = depth;
    this.pool = [];
    this.stats = null;
    this.shown = new Set();
  }

  draw(entries) {
    const list = entries.slice(0, MAX_OAM);
    const { shown, stats } = frameEntries(entries);
    this.stats = stats;
    this.shown = shown;
    list.forEach((e, i) => {
      let img = this.pool[i];
      if (!img) {
        img = this.scene.add.image(0, 0, e.key).setOrigin(0).setDepth(this.depth);
        this.pool[i] = img;
      }
      img.setTexture(e.key).setPosition(Math.round(e.x), Math.round(e.y))
        .setFlipX(Boolean(e.flipX)).setVisible(shown.has(i));
    });
    for (let i = list.length; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }
}

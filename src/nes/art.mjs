/* global Phaser */
// Art as data. Every art module in src/art/<name>.mjs default-exports one object:
//
//   export default {
//     palettes: [[0x0f, 0x16, 0x30]],        // 1-4 sprite palettes, 3 NES indices each; value 0 is transparent
//     tiles: {                               // 8x8 tiles, 8 strings of 0-3 (0 transparent / backdrop)
//       top: ['00111100', '01222210', '12233221', '12333321', '12333321', '12233221', '01222210', '00111100'],
//     },
//     animations: {                          // named animations of frames
//       idle: { fps: 4, frames: [
//         { palette: 0, parts: [{ tile: 'top', x: 0, y: 0 }, { tile: 'top', x: 8, y: 0, flipX: true }] },
//       ] },
//     },
//     backgrounds: {                         // optional tile backgrounds
//       floor: {
//         backdrop: 0x0f,                    // the one shared colour behind value 0
//         palettes: [[..3], [..3], [..3], [..3]], // 4 bg palettes
//         cols: 4, rows: 2,
//         nametable: ['top', 'top', 'top', 'top', 'top', 'top', 'top', 'top'], // tile names, row by row
//         attributes: [0, 1],                // one bg palette per 16x16 area, ceil(cols/2) x ceil(rows/2)
//       },
//     },
//   };
//
// Parts are 8x8 hardware sprites at (x, y) inside the frame; a frame uses one palette. `?art=<name>`
// plays every animation, and test/nes.test.mjs checks every module against artProblems().

import { nes, isIndex, paletteSetProblems } from './palette.mjs';
import { TILE, MAX_SPRITES, tileValid, frameOnePalette, attributeProblems, visibleSprites } from './limits.mjs';

export function tilePalettes({ cols, rows, attributes }) {
  const areaCols = Math.ceil(cols / 2);
  return Array.from({ length: cols * rows }, (_, i) => attributes[Math.floor(i / cols / 2) * areaCols + Math.floor((i % cols) / 2)]);
}

export function artProblems(def) {
  const problems = [];
  const tiles = def.tiles ?? {};
  for (const [name, rows] of Object.entries(tiles)) {
    if (!tileValid(rows)) problems.push(`tile ${name} is not 8 rows of 8 values 0-3`);
  }
  const palettes = def.palettes ?? [];
  if (palettes.length > 4) problems.push('more than 4 sprite palettes');
  palettes.forEach((p, i) => {
    if (!Array.isArray(p) || p.length !== 3 || !p.every(isIndex)) problems.push(`sprite palette ${i} is not 3 NES indices`);
  });
  for (const [anim, { frames = [] }] of Object.entries(def.animations ?? {})) {
    frames.forEach((f, i) => {
      const at = `${anim}[${i}]`;
      if (!frameOnePalette(f.parts, f.palette) || !palettes[f.palette]) problems.push(`${at} does not use one sprite palette`);
      if (f.parts.length > MAX_SPRITES) problems.push(`${at} has more than ${MAX_SPRITES} sprites`);
      for (const p of f.parts) if (!tiles[p.tile]) problems.push(`${at} names a missing tile ${p.tile}`);
    });
  }
  for (const [name, bg] of Object.entries(def.backgrounds ?? {})) {
    const at = `background ${name}`;
    const set = paletteSetProblems({ backdrop: bg.backdrop, bg: bg.palettes, sprite: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]] });
    problems.push(...set.map((p) => `${at}: ${p}`));
    if (bg.nametable?.length !== bg.cols * bg.rows) problems.push(`${at} nametable is not cols x rows`);
    else for (const t of new Set(bg.nametable)) if (!tiles[t]) problems.push(`${at} names a missing tile ${t}`);
    if (bg.attributes?.length !== Math.ceil(bg.cols / 2) * Math.ceil(bg.rows / 2)) problems.push(`${at} attributes are not one per 16x16 area`);
    else if (attributeProblems({ cols: bg.cols, rows: bg.rows, palettes: tilePalettes(bg) }).length) problems.push(`${at} breaks a 16x16 attribute area`);
  }
  return problems;
}

// RGBA bytes for one tile; colours[v] is an 0xRRGGBB or null for transparent.
export function tileRGBA(rows, colours) {
  const out = new Uint8ClampedArray(TILE * TILE * 4);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const c = colours[Number(rows[y][x])];
      if (c == null) continue;
      const o = (y * TILE + x) * 4;
      out[o] = (c >> 16) & 255; out[o + 1] = (c >> 8) & 255; out[o + 2] = c & 255; out[o + 3] = 255;
    }
  }
  return out;
}

// A frame's parts placed at (x, y), mirrored across the frame's width when flipX.
export function placeFrame(frame, x, y, flipX = false) {
  const w = Math.max(...frame.parts.map((p) => p.x + TILE));
  return frame.parts.map((p) => ({
    tile: p.tile,
    x: x + (flipX ? w - p.x - TILE : p.x),
    y: y + p.y,
    flipX: Boolean(p.flipX) !== flipX,
    flipY: Boolean(p.flipY),
  }));
}

function putPixels(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  const img = tex.context.createImageData(w, h);
  draw(img.data);
  tex.context.putImageData(img, 0, 0);
  tex.refresh();
  return key;
}

export function bakeTile(scene, key, rows, colours) {
  return putPixels(scene, key, TILE, TILE, (data) => data.set(tileRGBA(rows, colours)));
}

export function bakeBackground(scene, key, def, bg) {
  const pals = tilePalettes(bg);
  return putPixels(scene, key, bg.cols * TILE, bg.rows * TILE, (data) => {
    bg.nametable.forEach((name, i) => {
      const pal = bg.palettes[pals[i]];
      const px = tileRGBA(def.tiles[name], [nes(bg.backdrop), nes(pal[0]), nes(pal[1]), nes(pal[2])]);
      const tx = (i % bg.cols) * TILE;
      const ty = Math.floor(i / bg.cols) * TILE;
      for (let y = 0; y < TILE; y++) {
        const from = y * TILE * 4;
        data.set(px.subarray(from, from + TILE * 4), ((ty + y) * bg.cols * TILE + tx) * 4);
      }
    });
  });
}

const registry = new Map();

export function registerArt(name, def) {
  registry.set(name, def);
  return def;
}

export async function loadArt(name) {
  if (!registry.has(name)) registerArt(name, (await import(`../art/${name}.mjs`)).default);
  return registry.get(name);
}

// A handle on named art: frame(anim, ms) answers hardware sprites { key, x, y, flipX, flipY }
// at the frame's origin. Unregistered art is a flat 3-colour box of 8x8 sprites.
export function artOr(scene, name, fallback = { w: 16, h: 16, palette: [0x0f, 0x00, 0x10] }) {
  const def = registry.get(name);
  if (!def) return standIn(scene, name, fallback);
  const keyFor = (tile, pal) => {
    const [a, b, c] = def.palettes[pal];
    return bakeTile(scene, `nes:${name}:${tile}:${pal}`, def.tiles[tile], [null, nes(a), nes(b), nes(c)]);
  };
  return {
    name,
    standIn: false,
    animations: Object.keys(def.animations ?? {}),
    background: (bg) => bakeBackground(scene, `nes:${name}:bg:${bg}`, def, def.backgrounds[bg]),
    frame(anim, ms = 0, x = 0, y = 0, flipX = false) {
      const a = def.animations[anim] ?? Object.values(def.animations)[0];
      const f = a.frames[Math.floor((ms * (a.fps ?? 8)) / 1000) % a.frames.length];
      return placeFrame(f, x, y, flipX).map((p) => ({ ...p, key: keyFor(p.tile, f.palette) }));
    },
  };
}

function standIn(scene, name, { w, h, palette }) {
  const [edge, fill, mark] = palette;
  const cols = Math.ceil(w / TILE);
  const rows = Math.ceil(h / TILE);
  const parts = [];
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const grid = Array.from({ length: TILE }, (_, y) => Array.from({ length: TILE }, (_, x) => {
        const px = tx * TILE + x;
        const py = ty * TILE + y;
        if (px >= w || py >= h) return '0';
        if (px === 0 || py === 0 || px === w - 1 || py === h - 1) return '1';
        return px === py || px === w - 1 - py ? '3' : '2';
      }).join(''));
      const key = bakeTile(scene, `nes:stand:${name}:${w}x${h}:${tx},${ty}`, grid, [null, nes(edge), nes(fill), nes(mark)]);
      parts.push({ key, x: tx * TILE, y: ty * TILE, flipX: false, flipY: false });
    }
  }
  return {
    name,
    standIn: true,
    animations: [],
    background: () => null,
    frame: (_anim, _ms, x = 0, y = 0) => parts.map((p) => ({ ...p, x: p.x + x, y: p.y + y })),
  };
}

// Draws a frame's worth of hardware sprites, in priority order, through the 8-a-scanline limit.
export class SpriteLayer {
  constructor(scene, depth = 10) {
    this.scene = scene;
    this.depth = depth;
    this.pool = [];
    this.frameNo = 0;
  }

  draw(sprites) {
    const list = sprites.slice(0, MAX_SPRITES);
    const shown = visibleSprites(list, this.frameNo++);
    list.forEach((s, i) => {
      let img = this.pool[i];
      if (!img) {
        img = this.scene.add.image(0, 0, s.key).setOrigin(0).setDepth(this.depth);
        this.pool[i] = img;
      }
      img.setTexture(s.key).setPosition(Math.round(s.x), Math.round(s.y))
        .setFlip(Boolean(s.flipX), Boolean(s.flipY)).setVisible(shown.has(i));
    });
    for (let i = list.length; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }
}

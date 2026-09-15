// What the SNES title, select and game over screens share: a 15-bit screen buffer drawn through
// src/snes/fx.mjs, the mosaic-and-fade transitions, the Mode 7 logo zoom and the select spotlight.
// Mosaic and colour math touch the backgrounds only, as on the hardware; master brightness dims the
// sprites too, by tint.
import { WIDTH, HEIGHT } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { MAX_MOSAIC, LEVELS, screen, brightnessPass, mosaicPass, toRgba } from '../fx.mjs';

export const IN_FRAMES = 16;
export const OUT_FRAMES = 24;
export const ZOOM_FRAMES = 20;
export const PRESS_FROM = 2.6;
const EMPTY = 0xffff;
const TOP = LEVELS - 1;

// Coming in: the mosaic shrinks from 16 px to 1 while brightness climbs to 15.
export function inStep(frame) {
  const f = Math.max(0, frame);
  return {
    mosaic: Math.max(1, MAX_MOSAIC - f),
    level: Math.min(TOP, Math.floor((f * TOP) / IN_FRAMES)),
    done: f >= IN_FRAMES,
  };
}

// Going out: the mosaic grows to 16 px while brightness falls to 0; `done` starts the next screen.
export function outStep(frame) {
  const f = Math.max(0, frame);
  return {
    mosaic: Math.min(MAX_MOSAIC, 1 + Math.floor((f * MAX_MOSAIC) / OUT_FRAMES)),
    level: Math.max(0, TOP - Math.ceil((f * TOP) / OUT_FRAMES)),
    done: f >= OUT_FRAMES,
  };
}

// The logo's Mode 7 press: scale only, 260% down to 100%, easing out as it lands.
export function logoZoom(frame) {
  const p = Math.min(1, Math.max(0, frame) / ZOOM_FRAMES);
  const ease = 1 - (1 - p) ** 3;
  return { scale: PRESS_FROM - (PRESS_FROM - 1) * ease, done: p >= 1 };
}

// Every menu confirms on Start, the NES A and the SNES A (which the pad names `injunction`).
export const confirmed = (pad) => ['start', 'a', 'injunction'].some((b) => pad.pressed.has(b));

// A lamp cone for the sub screen: warm light at its centre fading out to nothing at its edge.
export function spotSub(cx, cy, rx, ry, out = screen(), peak = 12) {
  out.fill(0);
  for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(HEIGHT, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(WIDTH, Math.ceil(cx + rx)); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d >= 1) continue;
      const v = Math.round(peak * (1 - d));
      out[y * WIDTH + x] = rgb15(v, Math.round(v * 0.85), v >> 1);
    }
  }
  return out;
}

// A 176x80 palette picture as a Mode 7 texture: value v is palette[v - 1], 0 transparent.
export function mode7Texture({ w, h, pixels, palette }) {
  const px = new Uint16Array(w * h).fill(EMPTY);
  pixels.forEach((row, y) => [...row].forEach((ch, x) => {
    const v = parseInt(ch, 16);
    if (v) px[y * w + x] = palette[v - 1];
  }));
  return { w, h, px };
}

// fill(x, y, w, h, rgb15) into a screen buffer, clipped, for src/snes/text.mjs.
export const bufferFill = (buf) => (x, y, w, h, c) => {
  for (let yy = Math.max(0, y); yy < Math.min(HEIGHT, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(WIDTH, x + w); xx++) buf[yy * WIDTH + xx] = c;
  }
};

// The canvas a front-end scene shows its buffer on, with the transition passes applied last.
export class FrontScreen {
  constructor(scene, key) {
    this.tex = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, WIDTH, HEIGHT);
    this.pixels = this.tex.context.createImageData(WIDTH, HEIGHT);
    scene.add.image(0, 0, key).setOrigin(0);
    this.a = screen();
    this.b = screen();
  }

  show(buf, { mosaic = 1, level = TOP } = {}, sprites = null) {
    let frame = buf;
    if (mosaic > 1) frame = mosaicPass(frame, mosaic, frame === this.a ? this.b : this.a);
    if (level < TOP) frame = brightnessPass(frame, level, frame === this.a ? this.b : this.a);
    toRgba(frame, this.pixels.data);
    this.tex.context.putImageData(this.pixels, 0, 0);
    this.tex.refresh();
    if (sprites) {
      const v = Math.round((255 * level) / TOP);
      sprites.pool.forEach((img) => img.setTint(Math.round((img.dim ?? 1) * v) * 0x10101));
    }
  }
}

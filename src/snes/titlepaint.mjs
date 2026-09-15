// The SNES title picture, a digitized live-action still (src/snes/titleart.mjs): BG1 city and tower,
// far rain, Ward and Mercer as sprites, near rain over them. The tower crown's tiles own the `glow`
// palettes, so its glow breathes by rewriting those alone; every pixel is baked as palette * 16 + slot
// and read through a lookup table rebuilt when the glow level changes.
import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb15 } from './color.mjs';
import { TITLE_ART } from './titleart.mjs';

const TILE = 8;
const GLOW = new Set(TITLE_ART.glow);
const GLOW_STEPS = 8;
const GLOW_PERIOD = 300;
const CLEAR = 0xffff;
const BACKDROP = rgb15(...TITLE_ART.backdrop);

function decode(layer) {
  const cols = WIDTH / TILE;
  const out = new Uint8Array(WIDTH * HEIGHT);
  layer.pixels.forEach((row, y) => {
    for (let x = 0; x < WIDTH; x++) {
      const v = parseInt(row[x], 16);
      if (v) out[y * WIDTH + x] = parseInt(layer.tiles[(y >> 3) * cols + (x >> 3)], 16) * 16 + v;
    }
  });
  return out;
}

const back = decode(TITLE_ART.back);
const front = decode(TITLE_ART.front);
const frontLut = TITLE_ART.front.palettes.flatMap((pal) => [CLEAR, ...pal.map(([r, g, b]) => rgb15(r, g, b))]);

// The back palettes with the crown's scaled to glow step `k` of GLOW_STEPS, as palette * 16 + slot.
function backLut(k) {
  return TITLE_ART.back.palettes.flatMap((pal, p) => [BACKDROP, ...pal.map((c) => {
    const s = GLOW.has(p) ?0.55 + (0.45 * k) / GLOW_STEPS : 1;
    return rgb15(...c.map((v) => Math.min(31, Math.round(v * s))));
  })]);
}
const luts = Array.from({ length: GLOW_STEPS + 1 }, (_, k) => backLut(k));

// The crown's glow step at frame `f`: up from dim through the intro, then a slow breath.
export function glowStep(f, intro = 0) {
  const breath = 0.72 + 0.28 * (0.5 - 0.5 * Math.cos((2 * Math.PI * f) / GLOW_PERIOD));
  const rise = intro > 0 ? Math.min(1, Math.max(0, f) / intro) : 1;
  return Math.round(GLOW_STEPS * breath * rise);
}

const hash = (i, s) => {
  let a = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(s, 0x85ebca6b);
  a = Math.imul(a ^ (a >>> 15), 0x2c1b3c6d);
  return ((a ^ (a >>> 13)) >>> 0) / 4294967296;
};

// Two sheets of rain: far drops are short, slow and half-blended; near drops are long, fast and bright.
export const RAIN = {
  far: { count: 120, speed: 4, length: 4, colour: [14, 16, 22], half: true, seed: 1 },
  near: { count: 34, speed: 10, length: 9, colour: [22, 24, 29], half: false, seed: 2 },
};

// Each drop of a sheet at frame f as [x, y] of its head; it slants one pixel left every four down.
export function drops(sheet, f) {
  const out = [];
  const span = HEIGHT + sheet.length;
  for (let i = 0; i < sheet.count; i++) {
    const y = Math.floor(hash(i, sheet.seed) * span + f * sheet.speed * (0.8 + 0.4 * hash(i, sheet.seed + 9))) % span;
    const x = (Math.floor(hash(i, sheet.seed + 5) * WIDTH) - (y >> 2) + WIDTH * 4) % WIDTH;
    out.push([x, y]);
  }
  return out;
}

const mix = (a, [r, g, b]) => rgb15(((a & 31) + r) >> 1, (((a >> 5) & 31) + g) >> 1, (((a >> 10) & 31) + b) >> 1);

function drawRain(buf, sheet, f) {
  const solid = rgb15(...sheet.colour);
  for (const [hx, hy] of drops(sheet, f)) {
    for (let j = 0; j < sheet.length; j++) {
      const y = hy - j;
      const x = (hx + (j >> 2)) % WIDTH;
      if (y < 0 || y >= HEIGHT) continue;
      const i = y * WIDTH + x;
      buf[i] = sheet.half || j === sheet.length - 1 ? mix(buf[i], sheet.colour) : solid;
    }
  }
}

// The whole title picture at frame `f` into a 15-bit screen buffer.
export function paintArt(buf, f, intro = 0) {
  const lut = luts[glowStep(f, intro)];
  for (let i = 0; i < buf.length; i++) buf[i] = lut[back[i]];
  drawRain(buf, RAIN.far, f);
  for (let i = 0; i < buf.length; i++) if (front[i]) buf[i] = frontLut[front[i]];
  drawRain(buf, RAIN.near, f);
  return buf;
}

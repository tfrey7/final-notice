// The SNES title's key art, painted for the title alone: a night glass tower against an ink-violet
// sky, warm lit windows, one red beacon, a small figure on the plaza and thin wide-tracked type
// (docs/research/corporate-wave.md). Four layers of palette indices at 256x224, each with its own
// 15-colour rgb15 palette, so the intro can scroll the sky, tower and plaza apart and fade the logo.
import { rgb15 } from './color.mjs';

export const W = 256;
export const H = 224;
export const LAYERS = ['sky', 'tower', 'ground', 'logo'];

const P = (list) => list.map(([r, g, b]) => rgb15(r, g, b));

export const PALETTES = {
  // 1-8 the sky from zenith to horizon glow, 9 haze, 10-11 stars, 12-13 far skyline, 14-15 far windows
  sky: P([[1, 0, 4], [2, 1, 6], [3, 1, 8], [4, 2, 10], [6, 3, 12], [8, 4, 13], [10, 5, 14], [13, 6, 15],
    [16, 8, 15], [16, 16, 23], [27, 27, 31], [2, 1, 6], [4, 3, 9], [13, 7, 6], [21, 13, 7]]),
  // 1 ink, 2-4 glass dark to sky-lit, 5 cyan edge, 6-7 shade face, 8-10 amber windows, 11 mullion,
  // 12 brass, 13-14 crown stone shade and light, 15 neighbouring blocks
  tower: P([[0, 0, 3], [2, 3, 7], [3, 5, 10], [5, 8, 14], [11, 16, 22], [1, 1, 6], [2, 3, 8],
    [14, 8, 6], [23, 15, 9], [29, 24, 17], [4, 4, 11], [22, 17, 7], [7, 6, 8], [14, 12, 12], [3, 2, 8]]),
  // 1 seams, 2-3 marble, 4-7 reflections, 8-9 coat, 10 rim light, 11 skin, 12 hair, 13 shadow,
  // 14 briefcase, 15 amber glint
  ground: P([[1, 1, 4], [2, 2, 6], [4, 3, 9], [3, 4, 10], [6, 8, 14], [12, 8, 6], [19, 13, 8],
    [2, 2, 5], [6, 6, 11], [26, 18, 10], [19, 12, 9], [4, 2, 3], [0, 0, 1], [9, 5, 3], [31, 27, 18]]),
  // 1 ivory type, 2 its shadow, 3 the rules
  logo: P([[27, 26, 22], [1, 1, 5], [9, 8, 15], ...Array(12).fill([0, 0, 0])]),
};

export const CONCEPTS = {
  a: { name: 'Look up', cx: 124, w: 100, side: 20, top: 62, taper: true, hz: 170, fx: 158, logoY: 204, seed: 7 },
  b: { name: 'The plaza', cx: 178, w: 74, side: 14, top: 26, taper: false, hz: 160, fx: 62, logoY: 196, seed: 11 },
  c: { name: 'Across the street', cx: 128, w: 62, side: 10, top: 64, taper: false, hz: 192, fx: 44, logoY: 22, seed: 3 },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const dither = (v, x, y) => {
  const base = Math.floor(v);
  return base + ((v - base) * 16 > BAYER[y & 3][x & 3] ? 1 : 0);
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function layer() {
  const px = new Uint8Array(W * H);
  const set = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = v; };
  const get = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? px[y * W + x] : 0);
  return { px, set, get };
}

function paintSky(c, rand) {
  const L = layer();
  for (let y = 0; y < H; y++) {
    const t = Math.min(1, y / c.hz);
    for (let x = 0; x < W; x++) {
      const halo = Math.max(0, 1 - Math.hypot(x - c.cx, y - crown(c).capY - 3) / 64) * 2.4;
      L.set(x, y, clamp(dither(1 + t ** 1.7 * 7.6 + halo, x, y), 1, 9));
    }
  }
  for (let y = 0; y < c.hz * 0.5; y++) {
    for (let x = 0; x < W; x++) if (rand() < 0.0035) L.set(x, y, rand() < 0.2 ? 11 : 10);
  }
  for (let x = 0; x < W;) {
    const bw = 8 + Math.floor(rand() * 16);
    const top = c.hz - 12 - Math.floor(rand() * 42);
    for (let y = top; y < H; y++) {
      for (let i = 0; i < bw - 1 && x + i < W; i++) {
        let v = y === top ? 13 : 12;
        if (y > top + 1 && i % 3 === 1 && (y - top) % 3 === 1 && rand() < 0.16) v = rand() < 0.4 ? 15 : 14;
        L.set(x + i, y, v);
      }
    }
    if (rand() < 0.35) for (let y = top - 2 - Math.floor(rand() * 5); y < top; y++) L.set(x + (bw >> 2), y, 13);
    x += bw;
  }
  return L;
}

function paintBlock(L, x0, x1, top, bottom, rand) {
  for (let y = top; y < bottom; y++) {
    for (let x = x0; x < x1; x++) {
      let v = y === top || x === x1 - 1 ? 7 : 15;
      if (y > top + 2 && (x - x0) % 4 === 2 && (y - top) % 4 === 2 && rand() < 0.14) v = 8;
      L.set(x, y, v);
    }
  }
}

function paintTower(c, rand) {
  const L = layer();
  const hw = c.w >> 1;
  paintBlock(L, c.cx - hw - 44, c.cx - hw + 8, c.hz - 96, H, rand);
  paintBlock(L, c.cx + hw + c.side - 10, c.cx + hw + c.side + 40, c.hz - 70, H, rand);

  const span = c.hz - c.top;
  const scale = (y) => (c.taper ? 0.76 + 0.24 * clamp((y - c.top) / span, 0, 1) : 1);
  const cols = Math.floor(c.w / 4);
  const floors = Math.ceil(span / 4);
  const lit = Array.from({ length: floors }, (_, f) => {
    const busy = rand() < (f < 3 ? 0.9 : 0.3);
    let on = false;
    let tone = 2;
    return Array.from({ length: cols }, () => {
      if (rand() < (on ? 0.22 : busy ? 0.3 : 0.04)) {
        on = !on;
        tone = rand() < 0.2 ? 3 : rand() < 0.35 ? 1 : 2;
      }
      return on ? tone : 0;
    });
  });

  for (let y = c.top; y < H; y++) {
    const k = scale(y);
    const x0 = Math.round(c.cx - hw * k);
    const x1 = Math.round(c.cx + hw * k);
    const sw = Math.round(c.cx + (hw + c.side) * k) - x1;
    const fy = y - c.top;
    const fl = Math.min(floors - 1, Math.floor(fy / 4));
    const spandrel = fy % 4 === 3;
    for (let x = x0; x < x1; x++) {
      const ci = Math.floor(((x - x0) * cols) / (x1 - x0));
      const mullion = x > x0 && ci % 2 === 0 && ci !== Math.floor(((x - 1 - x0) * cols) / (x1 - x0));
      let v;
      if (x === x0) v = 1;
      else if (x === x0 + 1) v = 5;
      else if (x === x1 - 1) v = 1;
      else if (spandrel || mullion) v = 11;
      else if (lit[fl][ci]) v = 7 + lit[fl][ci];
      else {
        const u = (x - x0) / (x1 - x0);
        const streak = ((x - x0) + fy * 0.6) % 46 < 4 ? 1 : 0;
        v = clamp(Math.round(2 + 1.2 * (1 - u) * (1 - fy / span)) + streak, 2, 3 + streak);
      }
      L.set(x, y, v);
    }
    for (let x = x1; x < x1 + sw; x++) {
      let v = x === x1 + sw - 1 ? 1 : dither(6 + 0.8 * (1 - fy / span), x, y);
      if (!spandrel && (x - x1) % 3 === 1 && (lit[fl][(x - x1) % cols] === 2)) v = 8;
      if (spandrel) v = 6;
      L.set(x, y, v);
    }
  }

  const { tiers, capY } = crown(c);
  for (const t of tiers) {
    const high = t.i >= tiers.length - 2;
    for (let y = t.top; y < t.top + TIER; y++) {
      const ledge = y === t.top;
      for (let x = c.cx - t.half - ledge; x <= t.right + ledge; x++) {
        const bay = (((x - c.cx) % 4) + 4) % 4;
        let v;
        if (x > c.cx + t.half) v = ledge ? 13 : x === t.right ? 1 : 6;
        else if (ledge) v = 12;
        else if (x === c.cx - t.half) v = 1;
        else if (bay === 2 && y === t.top + 2) v = high ? 9 : 8;
        else if (bay === 0) v = 13;
        else v = x < c.cx + t.half * 0.4 ? 14 : 13;
        L.set(x, y, v);
      }
    }
  }
  for (let r = 0; r < 7; r++) {
    const half = (r + 1) >> 1;
    for (let x = c.cx - half; x <= c.cx + half; x++) {
      let v = x === c.cx - half || x === c.cx + half || r === 6 ? 12 : 10;
      if (r === 4) v = x === c.cx ? 1 : Math.abs(x - c.cx) === 1 ? 9 : v;
      L.set(x, capY + r, v);
    }
  }
  return L;
}

const TIER = 5;

// The stepped stone crown: tiers inset 5 pixels a side above the glass, then the capstone.
function crown(c) {
  const k = c.taper ? 0.76 : 1;
  const topHalf = Math.round((c.w >> 1) * k);
  const side = Math.round(c.side * k);
  const tiers = [];
  for (let i = 0, half = topHalf - 2; half >= 6; i++, half -= 5) {
    tiers.push({ i, half, top: c.top - (i + 1) * TIER, right: c.cx + half + Math.round((side * half) / topHalf) });
  }
  return { tiers, capY: tiers.at(-1).top - 7 };
}

const FIGURE = [
  '...hhh....',
  '..hhhhh...',
  '..shhhh...',
  '...sss....',
  '..rcccc...',
  '.rcccccc..',
  '.rccccccc.',
  '.rlcccccc.',
  '.rlcccccc.',
  '.rlccccc..',
  '.rlccccc..',
  '.rlcccccb.',
  '.rlccccbbb',
  '.rlccccbbb',
  '..rcccc...',
  '..rcc.cc..',
  '..rc..cc..',
  '..rc...c..',
  '..rc...c..',
  '.rrc...cc.',
  '.ccc...cc.',
];
const FIGURE_INK = { c: 8, l: 9, r: 10, s: 11, h: 12, b: 14 };

function paintGround(c, tower) {
  const L = layer();
  const depth = H - c.hz;
  const seams = new Set([0, 3, 8, 15, 25, 38]);
  for (let y = c.hz; y < H; y++) {
    const d = y - c.hz;
    const fade = 1 - d / depth;
    const my = c.hz - 1 - Math.floor(d * 1.7);
    for (let x = 0; x < W; x++) {
      const vx = ((x - c.cx) * 50) / (50 + d);
      const seam = seams.has(d) || Math.abs(((vx % 40) + 40) % 40) < 40 / (50 + d);
      let v = d === 0 ? 1 : seam ? 2 : clamp(dither(2.4 + 0.8 * (d / depth), x, y), 2, 3);
      if (d > 0 && my >= 0 && fade * (seam ? 8 : 14) > BAYER[y & 3][x & 3]) {
        const src = tower.get(x, my);
        if (src === 10) v = 7;
        else if (src === 8 || src === 9) v = 6;
        else if (src === 4 || src === 5) v = 5;
        else if (src === 2 || src === 3) v = 4;
      }
      L.set(x, y, v);
    }
  }
  const fy = c.hz + 16;
  const top = fy - FIGURE.length;
  FIGURE.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return;
    L.set(c.fx + rx, top + ry, FIGURE_INK[ch]);
    const shadowY = fy + (FIGURE.length - 1 - ry);
    if (ry > 3 && (shadowY + c.fx + rx) % 2 === 0) L.set(c.fx + rx + 1, shadowY, 13);
  }));
  return L;
}

const GLYPHS = {
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  I: ['1', '1', '1', '1', '1', '1', '1'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
};
const TRACK = 4;
const SPACE = 8;

export function textWidth(text) {
  return [...text].reduce((w, ch, i) => w + (ch === ' ' ? SPACE : GLYPHS[ch][0].length) + (i ? TRACK : 0), 0);
}

function paintLogo(c, text = 'FINAL NOTICE') {
  const L = layer();
  const tw = textWidth(text);
  const x0 = (W - tw) >> 1;
  for (let x = 20; x < W - 20; x++) if (x < x0 - 10 || x >= x0 + tw + 10) L.set(x, c.logoY + 3, 3);
  for (const pass of [2, 1]) {
    let x = x0;
    for (const ch of text) {
      if (ch === ' ') { x += SPACE + TRACK; continue; }
      GLYPHS[ch].forEach((row, ry) => [...row].forEach((bit, rx) => {
        if (bit === '1') L.set(x + rx + (pass === 2), c.logoY + ry + (pass === 2), pass);
      }));
      x += GLYPHS[ch][0].length + TRACK;
    }
  }
  return L;
}

// The key art for one composition: { layers: { sky, tower, ground, logo } } of palette indices, 0 clear.
export function paintKeyArt(concept = CONCEPTS.a) {
  const rand = rng(concept.seed);
  const sky = paintSky(concept, rand);
  const tower = paintTower(concept, rand);
  const ground = paintGround(concept, tower);
  const logo = paintLogo(concept);
  return { concept, layers: { sky: sky.px, tower: tower.px, ground: ground.px, logo: logo.px } };
}

// All four layers flattened, back to front, as rgb15 values.
export function flatten(art, only = LAYERS) {
  const out = new Uint16Array(W * H);
  for (const name of only) {
    const px = art.layers[name];
    const pal = PALETTES[name];
    for (let i = 0; i < px.length; i++) if (px[i]) out[i] = pal[px[i] - 1];
  }
  return out;
}

// The ?snes&hw test art: balls at both OAM sizes and a 48x56 clerk that cuts into mixed entries.
import { rgb15 } from '../color.mjs';

const OUTLINE = 1;
const SKIN = [2, 3, 4];
const SUIT = [5, 6, 7];
const TIE = [8, 9, 10];
const LEGS = [13, 14];

const palette = [
  rgb15(4, 3, 6),
  rgb15(31, 25, 20), rgb15(27, 19, 14), rgb15(21, 13, 10),
  rgb15(10, 14, 24), rgb15(6, 9, 18), rgb15(3, 5, 12),
  rgb15(31, 10, 8), rgb15(24, 5, 5), rgb15(16, 2, 4),
  rgb15(31, 27, 10), rgb15(31, 31, 31),
  rgb15(12, 12, 14), rgb15(8, 8, 10), rgb15(20, 20, 22),
];

const hexDigit = (v) => v.toString(16).toUpperCase();

// Fills a w x h grid by `paint`, then outlines every opaque pixel that touches transparency.
function draw(w, h, paint) {
  const grid = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => paint(x, y)));
  const clear = (x, y) => x < 0 || y < 0 || x >= w || y >= h || !grid[y][x];
  const rows = grid.map((row, y) => row.map((v, x) => (v && (clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1)) ? OUTLINE : v)));
  return rows.map((row) => row.map(hexDigit).join(''));
}

function ball(size) {
  const r = size / 2 - 0.5;
  return {
    w: size,
    h: size,
    pixels: draw(size, size, (x, y) => {
      const dx = x - r; const dy = y - r;
      const d = Math.hypot(dx, dy);
      if (d > r) return 0;
      if (Math.hypot(dx + r / 3, dy + r / 3) < r / 4) return 12;
      return d < r * 0.5 ? TIE[0] : d < r * 0.8 ? TIE[1] : TIE[2];
    }),
  };
}

const ramp = (tones, x, left, right) => tones[x < left + (right - left) / 3 ? 0 : x < left + (2 * (right - left)) / 3 ? 1 : 2];

const clerk = {
  w: 48,
  h: 56,
  origin: [24, 55],
  pixels: draw(48, 56, (x, y) => {
    if (Math.hypot(x - 24, y - 10) <= 8) return ramp(SKIN, x, 16, 32);
    if (y >= 19 && y <= 43 && x >= 12 && x <= 35) {
      if (x >= 23 && x <= 24 && y <= 34) return y < 22 ? 11 : TIE[1];
      return ramp(SUIT, x, 12, 35);
    }
    if (y >= 20 && y <= 38 && (x === 10 || x === 11 || x === 36 || x === 37)) return y > 35 ? SKIN[1] : SUIT[2];
    if (y >= 44 && ((x >= 14 && x <= 21) || (x >= 26 && x <= 33))) return y > 52 ? LEGS[1] : LEGS[0] - (x % 8 < 3 ? -2 : 0);
    return 0;
  }),
};

export default {
  palette,
  frames: { ball8: ball(8), ball32: ball(32), clerk },
};

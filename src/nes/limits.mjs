// Pure checks of the NES's picture limits.
import { HEIGHT } from './screen.mjs';

export const TILE = 8;
export const MAX_PER_LINE = 8;
export const MAX_SPRITES = 64;

// A tile is 8 rows of 8 values, each 0-3.
export function tileValid(rows) {
  return Array.isArray(rows) && rows.length === TILE &&
    rows.every((row) => String(row).length === TILE && /^[0-3]{8}$/.test(String(row)));
}

// Every hardware sprite in a frame draws from the same sprite palette.
export function frameOnePalette(parts, framePalette) {
  return parts.every((p) => (p.palette ?? framePalette) === framePalette) &&
    Number.isInteger(framePalette) && framePalette >= 0 && framePalette < 4;
}

// A nametable gives each tile a bg palette (0-3); every 16x16 area must share one.
// Answers the areas that break the rule, as [areaCol, areaRow].
export function attributeProblems({ cols, rows, palettes }) {
  const bad = [];
  for (let ay = 0; ay < Math.ceil(rows / 2); ay++) {
    for (let ax = 0; ax < Math.ceil(cols / 2); ax++) {
      const seen = new Set();
      for (let ty = ay * 2; ty < Math.min(rows, ay * 2 + 2); ty++) {
        for (let tx = ax * 2; tx < Math.min(cols, ax * 2 + 2); tx++) seen.add(palettes[ty * cols + tx]);
      }
      if (seen.size > 1 || [...seen].some((p) => !(p >= 0 && p < 4))) bad.push([ax, ay]);
    }
  }
  return bad;
}

// Which 8x8 sprites draw on each scanline: at most 8, taken in priority order (index 0
// first) after rotating that order by the frame number, so the dropped ones flicker.
export function scanlineVisible(sprites, frame, height = HEIGHT) {
  const n = Math.min(sprites.length, MAX_SPRITES);
  const start = n ? ((frame % n) + n) % n : 0;
  const lines = Array.from({ length: height }, () => []);
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    const top = Math.floor(sprites[i].y);
    for (let y = Math.max(0, top); y < Math.min(height, top + TILE); y++) {
      if (lines[y].length < MAX_PER_LINE) lines[y].push(i);
    }
  }
  return lines;
}

// The sprites that draw whole this frame: on every scanline they cover.
export function visibleSprites(sprites, frame, height = HEIGHT) {
  const lines = scanlineVisible(sprites, frame, height);
  const shown = new Set();
  sprites.slice(0, MAX_SPRITES).forEach((s, i) => {
    const top = Math.floor(s.y);
    let whole = true;
    for (let y = Math.max(0, top); y < Math.min(height, top + TILE); y++) {
      if (!lines[y].includes(i)) { whole = false; break; }
    }
    if (whole) shown.add(i);
  });
  return shown;
}

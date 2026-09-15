// Pure checks of the NES's picture limits.
import { HEIGHT } from './screen.mjs';

export const TILE = 8;
export const MAX_PER_LINE = 8;
export const MAX_SPRITES = 64;
export const MAX_PALETTES = 4;

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

// Which 8x8 sprites draw on each scanline: at most 8. Sprites marked `keep` (the player, a boss, a
// shot aimed at the player) claim their lines first and never flicker (docs/NES-CLASSICS.md L5);
// the rest follow in priority order rotated by the frame number, so the dropped ones flicker.
// Sprites marked `off` take no lines at all.
export function scanlineVisible(sprites, frame, height = HEIGHT) {
  const list = sprites.slice(0, MAX_SPRITES);
  const kept = [];
  const rest = [];
  list.forEach((s, i) => { if (!s.off) (s.keep ? kept : rest).push(i); });
  const start = rest.length ? ((frame % rest.length) + rest.length) % rest.length : 0;
  const lines = Array.from({ length: height }, () => []);
  for (const i of [...kept, ...rest.slice(start), ...rest.slice(0, start)]) {
    const top = Math.floor(list[i].y);
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
    if (s.off) return;
    const top = Math.floor(s.y);
    let whole = true;
    for (let y = Math.max(0, top); y < Math.min(height, top + TILE); y++) {
      if (!lines[y].includes(i)) { whole = false; break; }
    }
    if (whole) shown.add(i);
  });
  return shown;
}

// Marks sprites that must never flicker.
export const keep = (sprites, yes = true) => (yes ? sprites.map((s) => ({ ...s, keep: true })) : sprites);

// How many sprites want each scanline, before the limit drops any.
export function lineDemand(sprites, height = HEIGHT) {
  const counts = new Array(height).fill(0);
  for (const s of sprites) {
    if (s.off) continue;
    const top = Math.floor(s.y);
    for (let y = Math.max(0, top); y < Math.min(height, top + TILE); y++) counts[y]++;
  }
  return counts;
}

// One frame through every sprite limit: the first 64, the first 4 distinct sprite palettes (kept
// sprites choose first, so the player never loses its colours), then 8 a scanline with flicker.
// A sprite's `palette` is any value naming its 3 colours; sprites without one are not counted.
export function frameSprites(sprites, frame, height = HEIGHT) {
  const list = sprites.slice(0, MAX_SPRITES);
  const order = [...list.keys()].sort((a, b) => Number(Boolean(list[b].keep)) - Number(Boolean(list[a].keep)) || a - b);
  const slots = [];
  const offPalette = new Set();
  for (const i of order) {
    const p = list[i].palette;
    if (p == null || slots.includes(p)) continue;
    if (slots.length < MAX_PALETTES) slots.push(p);
    else offPalette.add(i);
  }
  const legal = list.map((s, i) => (offPalette.has(i) ? { ...s, off: true } : s));
  const shown = visibleSprites(legal, frame, height);
  return {
    shown,
    stats: {
      count: list.length,
      dropped: sprites.length - list.length,
      palettes: slots.length,
      offPalette: offPalette.size,
      flicker: list.length - offPalette.size - shown.size,
      lines: lineDemand(legal, height),
    },
  };
}

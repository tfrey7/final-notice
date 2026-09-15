// Pure checks of the SNES's picture limits (docs/SNES-PLAN.md section 2).
import { HEIGHT } from './screen.mjs';
import { isRgb15 } from './color.mjs';

export const BG_PALETTES = 8;
export const SPRITE_PALETTES = 8;
export const COLOURS = 15;
export const MAX_OAM = 128;
export const MAX_PER_LINE = 32;
export const MAX_TILES_PER_LINE = 34;
// The sizes this game cuts art into; the hardware also has 8 and 64.
export const SIZES = [16, 32];
export const OAM_SIZES = [8, 16, 32, 64];

export function paletteProblems(palette) {
  if (!Array.isArray(palette) || palette.length !== COLOURS) return [`a palette is ${COLOURS} colours plus transparent`];
  return palette.every(isRgb15) ? [] : ['a palette colour is not a 15-bit rgb15 value'];
}

// Every palette in the set is legal and there are at most 8 of a kind.
export function paletteSetProblems({ bg = [], sprite = [] }) {
  const problems = [];
  if (bg.length > BG_PALETTES) problems.push(`more than ${BG_PALETTES} background palettes`);
  if (sprite.length > SPRITE_PALETTES) problems.push(`more than ${SPRITE_PALETTES} sprite palettes`);
  bg.forEach((p, i) => problems.push(...paletteProblems(p).map((m) => `bg ${i}: ${m}`)));
  sprite.forEach((p, i) => problems.push(...paletteProblems(p).map((m) => `sprite ${i}: ${m}`)));
  return problems;
}

// An OAM entry is { x, y, size }; its width counts as size/8 tiles on a line, so a line of 16x16
// entries meets the 34-tile limit (17 entries) before the 32-entry one, which only 8x8 entries reach.
const tilesOf = (e) => e.size / 8;

// Which entries draw on each scanline. List order is priority (OAM index 0 first). Past 32 entries
// on a line (range over) or 34 tiles' worth (time over) the lowest-priority entries vanish from that
// line; the SNES drops, it never rotates, so the same entries are gone every frame.
export function scanlines(entries, height = HEIGHT) {
  const list = entries.slice(0, MAX_OAM);
  const lines = Array.from({ length: height }, () => ({ shown: [], wanted: 0, tiles: 0 }));
  list.forEach((e, i) => {
    if (e.off) return;
    const top = Math.floor(e.y);
    for (let y = Math.max(0, top); y < Math.min(height, top + e.size); y++) {
      const line = lines[y];
      line.wanted++;
      if (line.shown.length < MAX_PER_LINE && line.tiles + tilesOf(e) <= MAX_TILES_PER_LINE) {
        line.shown.push(i);
        line.tiles += tilesOf(e);
      }
    }
  });
  return lines;
}

// One frame through every sprite limit: the first 128 entries, the first 8 distinct sprite
// palettes, then the per-line drop. `shown` holds the entries that draw whole.
export function frameEntries(entries, height = HEIGHT) {
  const list = entries.slice(0, MAX_OAM);
  const slots = [];
  const offPalette = new Set();
  list.forEach((e, i) => {
    if (e.palette == null || slots.includes(e.palette)) return;
    if (slots.length < SPRITE_PALETTES) slots.push(e.palette);
    else offPalette.add(i);
  });
  const legal = list.map((e, i) => (offPalette.has(i) ? { ...e, off: true } : e));
  const lines = scanlines(legal, height);
  const shown = new Set();
  legal.forEach((e, i) => {
    if (e.off) return;
    const top = Math.floor(e.y);
    for (let y = Math.max(0, top); y < Math.min(height, top + e.size); y++) if (!lines[y].shown.includes(i)) return;
    shown.add(i);
  });
  return {
    shown,
    stats: {
      count: list.length,
      overOam: entries.length - list.length,
      palettes: slots.length,
      offPalette: legal.filter((e) => e.off).length,
      dropped: legal.filter((e) => !e.off).length - shown.size,
      lines: lines.map((l) => l.wanted),
    },
  };
}

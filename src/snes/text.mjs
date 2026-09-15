// SNES text on BG3 (docs/SNES-PLAN.md sections 2 and 7): a variable-width 8 px-high font cut from the
// NES glyphs, word wrap by pixel width, and the window a text box sits in. BG3 has 4 colours, so the
// window frame, the text and its shadow share one palette; the blue fill is a per-scanline gradient
// (HDMA on the fixed colour), not tile colours. Everything draws through fill(x, y, w, h, rgb15).
import { GLYPHS } from '../text/font.mjs';
import { rgb15, channels } from './color.mjs';

export const FONT_H = 8;
export const GAP = 1;
export const SPACE = 3;
export const LINE_H = 12;

// BG3's 4 colours: 0 clear, 1 edge and text shadow, 2 frame, 3 text.
export const BG3_PALETTE = [0, rgb15(2, 2, 6), rgb15(24, 24, 28), rgb15(31, 31, 31)];

export const BOX = { x: 8, y: 160, w: 240, h: 56, pad: 8, rows: 3 };

// Each glyph trimmed to its lit columns: { w, rows } with rows FONT_H strings of w characters.
function trim(rows) {
  const lit = [...Array(8).keys()].filter((c) => rows.some((r) => r[c] === '#'));
  if (!lit.length) return { w: SPACE, rows: rows.map(() => '.'.repeat(SPACE)) };
  const [a, b] = [lit[0], lit[lit.length - 1]];
  return { w: b - a + 1, rows: rows.map((r) => r.slice(a, b + 1)) };
}

export const SNES_GLYPHS = Object.fromEntries(Object.entries(GLYPHS).map(([ch, rows]) => [ch, trim(rows)]));

export const glyph = (ch) => SNES_GLYPHS[ch] ?? SNES_GLYPHS['?'];

// Pixel width of a run of text: each glyph's width plus one pixel between neighbours.
export function measure(text) {
  const chars = [...text];
  return chars.reduce((w, ch) => w + glyph(ch).w, 0) + Math.max(0, chars.length - 1) * GAP;
}

// Word-wraps text to lines no wider than maxWidth pixels, grouped into pages of `rows` lines.
// A word wider than a whole line is broken between letters.
export function wrapText(text, maxWidth = BOX.w - 2 * BOX.pad, rows = BOX.rows) {
  const lines = [];
  let line = '';
  const push = () => { if (line) lines.push(line); line = ''; };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) { line = candidate; continue; }
    push();
    let rest = word;
    while (measure(rest) > maxWidth) {
      let n = 1;
      while (measure(rest.slice(0, n + 1)) <= maxWidth) n++;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    line = rest;
  }
  push();
  const pages = [];
  for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows));
  return pages.length ? pages : [[]];
}

// The page's lines with only the first `shown` letters typed.
export function typed(lines, shown) {
  let left = Math.max(0, shown);
  return lines.map((l) => {
    const part = l.slice(0, left);
    left -= Math.min(left, l.length);
    return part;
  });
}

export const pageLength = (lines) => lines.reduce((n, l) => n + l.length, 0);

// One rgb15 colour per scanline, top colour to bottom colour, each channel stepped evenly.
export function windowGradient(lines, top = rgb15(4, 6, 20), bottom = rgb15(0, 1, 6)) {
  const [a, b] = [channels(top), channels(bottom)];
  return Array.from({ length: lines }, (_, y) => {
    const t = lines > 1 ? y / (lines - 1) : 0;
    return rgb15(...a.map((v, i) => Math.round(v + (b[i] - v) * t)));
  });
}

export function drawString(fill, text, x, y, colour = BG3_PALETTE[3], shadow = BG3_PALETTE[1]) {
  for (const [dx, dy, c] of shadow == null ? [[0, 0, colour]] : [[1, 1, shadow], [0, 0, colour]]) {
    let cx = x;
    for (const ch of text) {
      const g = glyph(ch);
      g.rows.forEach((row, r) => {
        for (let i = 0; i < g.w; i++) if (row[i] === '#') fill(cx + i + dx, y + r + dy, 1, 1, c);
      });
      cx += g.w + GAP;
    }
  }
}

// The window: the gradient fill, then a two-colour frame with its corners cut.
export function drawWindow(fill, box = BOX, gradient = windowGradient(box.h)) {
  const { x, y, w, h } = box;
  gradient.forEach((c, i) => fill(x + 2, y + i, w - 4, 1, c));
  fill(x + 1, y + 1, 1, h - 2, gradient[Math.floor(h / 2)]);
  fill(x + w - 2, y + 1, 1, h - 2, gradient[Math.floor(h / 2)]);
  const [, edge, frame] = BG3_PALETTE;
  fill(x + 2, y, w - 4, 1, edge); fill(x + 2, y + h - 1, w - 4, 1, edge);
  fill(x, y + 2, 1, h - 4, edge); fill(x + w - 1, y + 2, 1, h - 4, edge);
  fill(x + 2, y + 1, w - 4, 1, frame); fill(x + 2, y + h - 2, w - 4, 1, frame);
  fill(x + 1, y + 2, 1, h - 4, frame); fill(x + w - 2, y + 2, 1, h - 4, frame);
}

// A whole text box: window, the speaker's name on a tab over its top edge, the typed page and,
// once the page is done, a blinking arrow.
export function drawTextBox(fill, { speaker, lines, shown, blink = true }, box = BOX) {
  if (speaker) {
    const tab = { x: box.x + 6, y: box.y - 15, w: measure(speaker) + 14, h: 17 };
    drawWindow(fill, tab, windowGradient(tab.h));
    drawString(fill, speaker, tab.x + 7, tab.y + 4);
  }
  drawWindow(fill, box);
  typed(lines, shown).forEach((l, i) => drawString(fill, l, box.x + box.pad, box.y + box.pad - 1 + i * LINE_H));
  if (shown >= pageLength(lines) && blink) drawString(fill, '▼', box.x + box.w - 14, box.y + box.h - 11);
}

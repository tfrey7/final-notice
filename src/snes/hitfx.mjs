// Placeholder hit effects over the SNES fight: star sparks where blows land, the combo counter
// (a count that pops, a rating word and the timer bar before it drops) and the combo-route map.
// Plain shapes and the menu font until art lands. `g` is a Phaser Graphics, `fill` draws rgb15.
import { rgb15 } from './color.mjs';
import { inputDevice } from '../controls.mjs';
import { drawString, measure } from './text.mjs';
import { capWidth, drawCap } from './prompt.mjs';
import { GUIDE_FADE, comboRating, comboScale, guideTree, routeLights } from '../stage1/combo.mjs';

const SPARK = { light: [7, 0xffd030], heavy: [10, 0xffa020], finisher: [14, 0xff6020] };

// Each spark a cross and an X that grow and thin out over its life.
export function drawSparks(g, sparks = [], dx, tune, lift = 34) {
  for (const s of sparks) {
    const [size, colour] = SPARK[s.weight] ?? SPARK.light;
    const k = s.t / (tune.sparkFrames || 1);
    const r = Math.round(size * (0.5 + k));
    const x = Math.round(s.x + dx);
    const y = Math.round(s.y - lift - s.z);
    const a = 1 - k * 0.8;
    g.fillStyle(0x201008, a).fillRect(x - r - 1, y - 2, r * 2 + 2, 4).fillRect(x - 2, y - r - 1, 4, r * 2 + 2);
    g.fillStyle(colour, a).fillRect(x - r, y - 1, r * 2, 2).fillRect(x - 1, y - r, 2, r * 2);
    const d = Math.round(r * 0.6);
    for (let i = -d; i <= d; i += 2) g.fillRect(x + i, y + i, 2, 2).fillRect(x + i, y - i, 2, 2);
  }
}

const INK = { count: rgb15(31, 26, 8), hot: rgb15(31, 12, 6), word: rgb15(31, 31, 31), dim: rgb15(16, 16, 18) };

// The count, right-aligned at (right, top), scaled up about its own corner by fill-size blocks.
export function drawCombo(g, fill, combo, tune, { right, top }) {
  if (!combo || combo.hits < 2) return;
  const s = comboScale(combo);
  const text = String(combo.hits);
  const w = measure(text) * 2 * s;
  const ox = right - w - 30;
  const big = (x, y, bw, bh, c) => fill(ox + (x - ox) * 2 * s, top + (y - top) * 2 * s, Math.ceil(bw * 2 * s), Math.ceil(bh * 2 * s), c);
  drawString(big, text, ox, top, combo.hits >= 8 ? INK.hot : INK.count);
  drawString(fill, 'HITS', right - 26, top + Math.round(10 * s), INK.word);
  const word = comboRating(combo.hits);
  if (word) drawString(fill, word, right - measure(word), top + Math.round(20 * s) + 4, combo.pop % 6 < 3 ? INK.hot : INK.word);
  const bar = 40;
  g.fillStyle(0x18181c).fillRect(right - bar, top - 5, bar, 3);
  g.fillStyle(0xe8c050).fillRect(right - bar, top - 5, Math.round(bar * combo.t / (tune.comboDrop || 1)), 3);
}

const GOLD = 0xe8c050;

// The combo guide: a small branching map of the chain, no plate behind it. Pressed buttons sit on the
// top line framed in gold, each way on hangs off it, and each route ends in a star and its name.
// `guide` is guideStep's state; `fill` takes a 0-15 opacity step as its last argument.
export function drawGuide(g, fill, guide, { x, y, device = inputDevice() }) {
  const a = Math.min(1, (2 * guide.t) / GUIDE_FADE);
  const ink = (px, py, w, h, c) => fill(px, py, w, h, c, Math.max(1, Math.round(15 * a)));
  const nodes = guideTree(guide.routes);
  const keyW = (k) => capWidth(k, device);
  const widths = [];
  for (const n of nodes) widths[n.col] = Math.max(widths[n.col] ?? 0, keyW(n.key));
  const colX = [];
  widths.reduce((cx, w, i) => { colX[i] = cx; return cx + w + 6; }, x);
  const rowY = (r) => y + r * 13;
  for (const n of nodes) {
    if (n.parent < 0) continue;
    const p = nodes[n.parent];
    const px = colX[p.col] + keyW(p.key);
    const my = rowY(n.row) + 5;
    g.fillStyle(n.lit ? GOLD : 0x808088, a);
    if (p.row !== n.row) g.fillRect(px + 2, rowY(p.row) + 10, 1, my - rowY(p.row) - 10);
    g.fillRect(p.row !== n.row ? px + 2 : px, my, colX[n.col] - px - (p.row !== n.row ? 2 : 0), 1);
  }
  for (const n of nodes) {
    const cx = colX[n.col];
    const cy = rowY(n.row);
    const bw = keyW(n.key);
    g.fillStyle(0x000000, 0.5 * a).fillRect(cx + 1, cy + 1, bw, 10);
    if (n.lit) g.fillStyle(GOLD, a).fillRect(cx - 1, cy - 1, bw + 2, 12);
    drawCap(ink, n.key, cx, cy, { device });
    if (!n.end) continue;
    const sx = cx + bw + 6;
    const hot = n.done && guide.t % 8 < 4;
    g.fillStyle(hot ? 0xff6020 : 0xffb020, a).fillRect(sx - 1, cy + 1, 3, 9).fillRect(sx - 4, cy + 4, 9, 3).fillRect(sx - 2, cy + 3, 5, 5);
    drawString(ink, n.end, sx + 7, cy + 1, n.done ? INK.count : rgb15(24, 24, 26));
  }
}

// One row per route: its button icons, lit up to where the auditor's chain is, then the route's name.
export function drawRouteMap(g, fill, p, tune, { x, y }) {
  const rows = routeLights(p, tune);
  const keyW = (k) => capWidth(k);
  const nameX = x + Math.max(...rows.map((r) => r.keys.reduce((n, k) => n + keyW(k) + 2, 0))) + 4;
  const panelW = nameX - x + Math.max(...rows.map((r) => measure(r.name))) + 6;
  g.fillStyle(0x101014, 0.75).fillRect(x - 3, y - 3, panelW, rows.length * 13 + 4);
  rows.forEach((r, i) => {
    let cx = x;
    const ry = y + i * 13;
    r.keys.forEach((k, j) => {
      cx += drawCap(fill, k, cx, ry, { off: !(r.on && j < r.lit) }) + 2;
    });
    const done = r.on && r.lit === r.keys.length;
    drawString(fill, r.name, nameX, ry + 1, !r.on ? INK.dim : done ? INK.count : rgb15(22, 22, 24));
  });
}

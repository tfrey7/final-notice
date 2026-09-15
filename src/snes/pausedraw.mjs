// Form 13-B drawn into a 15-bit screen buffer, from the item-1975 mockup: the field dimmed by a
// subtract that deepens down the screen, a colour-math drop shadow, the carbon copy added at half,
// grained paper with a gradient header band, embossed ledger rules, a highlighter row (subtract blue),
// shaded attachment slots and the ON HOLD stamp in worn ink (subtract cyan). PauseOverlay shows the
// form's rectangle above the sprites; the dim under the rest reaches sprites by tint.
import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb15 as c, channels } from './color.mjs';
import { drawString, measure } from './text.mjs';
import { attachment, onAttachments, stampPose } from './pause.mjs';
import { toRgba } from './fx.mjs';

const INK = c(3, 3, 9);
const RED = c(22, 3, 3);
const OUT = c(1, 1, 4);
export const FORM = { x: (WIDTH - 200) >> 1, y: 18, w: 200, h: 188 };
// The whole patch the form touches: carbon copy up and right, shadow down and right.
export const FORM_PATCH = { x: FORM.x, y: FORM.y - 4, w: FORM.w + 6, h: FORM.h + 10 };
// Sprites outside the form take the field's dim as a grey tint.
export const DIM_TINT = 0x7a7a88;

const clamp = (v) => Math.max(0, Math.min(31, v));
const mix = (a, b, t) => { const A = channels(a); const B = channels(b); return c(...A.map((v, i) => Math.round(v + (B[i] - v) * t))); };
const noise = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };

function painter(px) {
  const ok = (i, j) => i >= 0 && j >= 0 && i < WIDTH && j < HEIGHT;
  const fill = (x, y, w, h, col) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (ok(i, j)) px[j * WIDTH + i] = col; };
  const math = (x, y, w, h, col, op, half = false, keep = () => true) => {
    const f = channels(col);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (!ok(i, j) || !keep(i, j)) continue;
      const k = j * WIDTH + i;
      const m = channels(px[k] & 0x7fff);
      px[k] = c(...m.map((v, n) => { const r = op === 'add' ? v + f[n] : v - f[n]; return clamp(half ? r >> 1 : r); }));
    }
  };
  const grad = (x, y, w, h, top, bot) => { for (let j = 0; j < h; j++) fill(x, y + j, w, 1, mix(top, bot, h > 1 ? j / (h - 1) : 0)); };
  const frame = (x, y, w, h, o, l, d) => {
    fill(x + 1, y, w - 2, 1, o); fill(x + 1, y + h - 1, w - 2, 1, o); fill(x, y + 1, 1, h - 2, o); fill(x + w - 1, y + 1, 1, h - 2, o);
    fill(x + 1, y + 1, w - 2, 1, l); fill(x + 1, y + 1, 1, h - 2, l); fill(x + 1, y + h - 2, w - 2, 1, d); fill(x + w - 2, y + 2, 1, h - 3, d);
  };
  const paper = (x, y, w, h, top = c(29, 27, 21), bot = c(19, 16, 10)) => {
    for (let j = 0; j < h; j++) {
      const base = mix(top, bot, j / (h - 1));
      for (let i = 0; i < w; i++) {
        const n = noise(x + i, y + j) % 37;
        fill(x + i, y + j, 1, 1, n === 0 ? mix(base, c(16, 13, 8), 0.35) : n === 1 ? mix(base, c(31, 31, 31), 0.4) : base);
      }
    }
  };
  const text = (t, x, y, col = INK) => drawString(fill, t, x, y, col, null);
  return { fill, math, grad, frame, paper, text };
}

function drawStamp(s, label, x, y, pose) {
  const w = measure(label) + 14;
  const h = 20;
  const top = y - pose.drop;
  const mask = new Set();
  for (let i = 0; i < w; i++) for (const j of [0, 1, h - 2, h - 1]) mask.add(`${x + i},${top + j}`);
  for (let j = 0; j < h; j++) for (const i of [0, 1, w - 2, w - 1]) mask.add(`${x + i},${top + j}`);
  drawString((i, j) => mask.add(`${i},${j}`), label, x + 7, top + 6, 0, null);
  // Worn ink: more of the stamp's face takes as it presses down.
  const skipEvery = pose.landed ? 6 : 2;
  const cyan = c(Math.round(4 * pose.ink), Math.round(22 * pose.ink), Math.round(24 * pose.ink));
  for (const k of mask) {
    const [i, j] = k.split(',').map(Number);
    if (noise(i * 3, j) % skipEvery !== 0) s.math(i, j, 1, 1, cyan, 'sub');
  }
}

function drawSlot(s, x, y, key, held) {
  s.math(x + 2, y + 2, 30, 30, c(8, 8, 8), 'sub');
  if (held) { s.grad(x, y, 30, 30, c(31, 27, 10), c(18, 10, 1)); s.frame(x, y, 30, 30, OUT, c(31, 31, 22), c(13, 7, 1)); }
  else s.frame(x, y, 30, 30, c(12, 10, 6), c(31, 30, 26), c(18, 15, 9));
  s.grad(x + 3, y + 3, 24, 24, c(22, 20, 15), c(27, 25, 19));
  const [cx, cy] = [x + 15, y + 15];
  if (!key) {
    for (let i = 0; i < 18; i += 3) s.fill(x + 6 + i, cy, 2, 1, c(18, 15, 9));
  } else if (key === 'notice') {
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
      if (dx * dx + dy * dy > 49) continue;
      s.fill(cx + dx, cy + dy, 1, 1, mix(c(30, 8, 5), c(14, 1, 1), Math.max(0, Math.min(1, (dx + dy + 7) / 14))));
    }
    s.fill(cx - 3, cy - 1, 6, 2, c(31, 22, 12)); s.fill(cx - 1, cy - 3, 2, 6, c(31, 22, 12));
  } else if (key === 'carbonCopy') {
    s.math(cx - 5, cy - 8, 12, 15, c(4, 10, 31), 'add', true);
    s.paper(cx - 8, cy - 5, 12, 15); s.frame(cx - 8, cy - 5, 12, 15, c(10, 8, 5), c(31, 31, 28), c(19, 16, 10));
    for (const dy of [0, 3, 6]) s.fill(cx - 6, cy + dy - 1, 8, 1, c(18, 21, 27));
  } else if (key === 'redTape') {
    for (let i = -9; i <= 9; i++) {
      const j = Math.round(Math.sin(i / 3) * 3);
      s.fill(cx + i, cy + j - 1, 1, 1, c(31, 12, 10)); s.fill(cx + i, cy + j, 1, 2, c(24, 4, 4)); s.fill(cx + i, cy + j + 2, 1, 1, c(12, 1, 2));
    }
  } else {
    for (let dy = -6; dy <= 6; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx * 4 + dy * dy > 36) continue;
      s.fill(cx + dx, cy + dy + 1, 1, 1, mix(c(14, 18, 31), c(4, 6, 20), (dx + 3) / 6));
    }
    s.fill(cx - 1, cy - 8, 2, 3, c(4, 6, 20));
  }
}

// The four combo routes as SNES button caps (Y green, X blue) with each route's name beside them.
function drawRoutes(s, routes, x, y) {
  const keyW = (k) => Math.max(10, measure(k) + 4);
  const nameX = x + Math.max(...routes.map((r) => r.keys.reduce((n, k) => n + keyW(k) + 2, 0))) + 4;
  routes.forEach((r, i) => {
    const ry = y + i * 13;
    let cx = x;
    r.keys.forEach((k, j) => {
      const bw = keyW(k);
      const face = !r.on ? c(20, 18, 14) : k === 'X' ? c(5, 9, 25) : k === 'Y' ? c(4, 18, 7) : c(9, 8, 11);
      const lit = r.on && j < r.lit;
      s.math(cx + 1, ry + 1, bw, 10, c(8, 8, 8), 'sub');
      s.fill(cx, ry, bw, 10, lit ? mix(face, c(31, 31, 31), 0.4) : face);
      s.fill(cx, ry, bw, 1, mix(face, c(31, 31, 31), 0.5));
      drawString(s.fill, k, cx + ((bw - measure(k)) >> 1), ry + 1, c(31, 31, 30), null);
      cx += bw + 2;
    });
    const done = r.on && r.lit > 0 && r.lit === r.keys.length;
    s.text(r.name, nameX, ry + 1, !r.on ? c(18, 15, 9) : done ? RED : INK);
  });
}

// menu: the state from ./pause.mjs; `frame` animates the pencil tick.
export function drawPause(px, menu, frame = 0) {
  const s = painter(px);
  for (let j = 0; j < HEIGHT; j++) {
    const k = Math.round((j / HEIGHT) * 7);
    s.math(0, j, WIDTH, 1, c(9 + k, 9 + k, 6 + Math.round((j / HEIGHT) * 5)), 'sub', true);
  }
  const { x: X, y: Y, w: W, h: H } = FORM;
  s.math(X + 6, Y + 6, W, H, c(12, 12, 12), 'sub');
  s.math(X + 5, Y - 4, W, H, c(4, 10, 31), 'add', true);
  s.frame(X + 5, Y - 4, W, H, c(3, 5, 16), c(12, 16, 30), c(3, 5, 16));
  s.paper(X, Y, W, H);
  s.frame(X, Y, W, H, c(10, 8, 5), c(31, 31, 28), c(19, 16, 10));
  s.grad(X + 2, Y + 2, W - 4, 16, c(10, 9, 14), c(3, 3, 7));
  drawString(s.fill, 'FORM 13-B', X + 8, Y + 6, c(30, 28, 20), OUT);
  drawString(s.fill, 'HOLDINGS', X + W - 10 - measure('HOLDINGS'), Y + 6, c(31, 10, 8), OUT);
  s.fill(X + 2, Y + 19, W - 4, 1, c(24, 6, 5)); s.fill(X + 2, Y + 21, W - 4, 1, c(24, 6, 5));
  s.text('ITEM', X + 16, Y + 26, RED); s.text('QTY', X + W - 32, Y + 26, RED);

  const rowY = (i) => Y + 40 + i * 14;
  // Four ruled lines whatever the holdings; the unused ones stay blank, as on a real form.
  for (let i = 0; i < 4; i++) {
    const y = rowY(i);
    if (i === menu.cursor) s.math(X + 8, y - 3, W - 16, 13, c(0, 1, 12), 'sub');
    s.fill(X + 8, y + 10, W - 16, 1, c(12, 15, 22)); s.fill(X + 8, y + 11, W - 16, 1, c(31, 31, 30));
  }
  menu.rows.slice(0, 4).forEach(([name, n], i) => {
    const y = rowY(i);
    s.text(name, X + 16, y);
    const q = String(n);
    s.text(q, X + W - 24 - measure(q), y);
  });

  const slotY = Y + 114;
  const slots = [X + 16, X + 72];
  const tick = (Math.floor(frame / 8) % 2);
  const pencil = (px0, py0) => {
    s.fill(px0, py0, 7, 5, c(24, 5, 4)); s.fill(px0, py0, 7, 1, c(31, 14, 12)); s.fill(px0, py0 + 4, 7, 1, c(14, 2, 2));
    s.fill(px0 + 7, py0, 2, 5, c(26, 21, 14)); s.fill(px0 + 9, py0 + 1, 1, 3, c(26, 21, 14)); s.fill(px0 + 10, py0 + 2, 1, 1, OUT);
  };

  if (menu.routes) {
    s.text('COMBO ROUTES', X + 16, Y + 102, RED);
    drawRoutes(s, menu.routes, X + 16, Y + 116);
  } else {
    s.text('ATTACHMENTS', X + 16, Y + 102, RED);
    menu.carried.forEach((key, i) => {
      drawSlot(s, slots[i], slotY, key, i === menu.hand);
      s.text(i ? 'B' : 'A', slots[i] + 32, slotY + 2, RED);
    });
    const held = attachment(menu.carried[menu.hand]);
    s.text(held.name, X + 16, Y + 150);
    s.text(held.effect, X + 16, Y + 162);
  }

  if (onAttachments(menu)) pencil(slots[menu.hand] - 13 + tick, slotY + 12);
  else pencil(X + 4 + tick, rowY(menu.cursor) + 1);

  drawStamp(s, 'ON HOLD', X + (menu.routes ? 136 : 118), Y + 122, stampPose(menu.stampT));
  s.fill(X + 2, Y + 172, W - 4, 1, c(18, 21, 27));
  s.text('START: RESUME   B: FILE AWAY', X + 10, Y + 176);
  return px;
}

// The form's patch as an image above the sprite layer; everything outside it is left transparent.
export class PauseOverlay {
  constructor(scene, depth = 40) {
    const key = 'snes-pause-form';
    this.tex = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, WIDTH, HEIGHT);
    this.pixels = this.tex.context.createImageData(WIDTH, HEIGHT);
    this.image = scene.add.image(0, 0, key).setOrigin(0).setDepth(depth).setScrollFactor(0).setVisible(false);
  }

  show(buf) {
    const data = toRgba(buf, this.pixels.data);
    const { x, y, w, h } = FORM_PATCH;
    for (let j = 0; j < HEIGHT; j++) for (let i = 0; i < WIDTH; i++) {
      if (i < x || i >= x + w || j < y || j >= y + h) data[(j * WIDTH + i) * 4 + 3] = 0;
    }
    this.tex.context.putImageData(this.pixels, 0, 0);
    this.tex.refresh();
    this.image.setVisible(true);
  }

  hide() {
    this.image.setVisible(false);
  }
}

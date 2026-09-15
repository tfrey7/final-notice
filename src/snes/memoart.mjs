// Draws the title's memo slip and its settings page into a 15-bit screen buffer, SNES-grade: a
// colour-math drop shadow and a see-through carbon copy behind grained paper, a bevelled frame, a
// per-line gradient header band with gradient lettering, ledger rules, a highlighter by colour math
// on the chosen row and a shaded red pencil that nudges back and forth.
import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb15 as c, channels } from './color.mjs';
import { drawString, drawWindow, measure, windowGradient } from './text.mjs';
import { LABS, PAPER_STOCKS, SETTING_ROWS, SOUND_TABS, STOCK, slideIn } from './memo.mjs';

const OUT = c(1, 1, 4);
const RED = c(22, 3, 3);
const clamp = (v) => Math.max(0, Math.min(31, v));
const mix = (a, b, t) => {
  const [A, B] = [channels(a), channels(b)];
  return c(...A.map((v, i) => Math.round(v + (B[i] - v) * t)));
};
const noise = (x, y) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

function painter(buf) {
  const ok = (i, j) => i >= 0 && j >= 0 && i < WIDTH && j < HEIGHT;
  const fill = (x, y, w, h, col) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (ok(i, j)) buf[j * WIDTH + i] = col;
  };
  const math = (x, y, w, h, col, op, half = false) => {
    const f = channels(col);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (!ok(i, j)) continue;
      const k = j * WIDTH + i;
      buf[k] = c(...channels(buf[k]).map((v, n) => {
        const r = op === 'add' ? v + f[n] : v - f[n];
        return clamp(half ? r >> 1 : r);
      }));
    }
  };
  const grad = (x, y, w, h, top, bot) => {
    for (let j = 0; j < h; j++) fill(x, y + j, w, 1, mix(top, bot, h > 1 ? j / (h - 1) : 0));
  };
  const frame = (x, y, w, h, o, l, d) => {
    fill(x + 1, y, w - 2, 1, o); fill(x + 1, y + h - 1, w - 2, 1, o); fill(x, y + 1, 1, h - 2, o); fill(x + w - 1, y + 1, 1, h - 2, o);
    fill(x + 1, y + 1, w - 2, 1, l); fill(x + 1, y + 1, 1, h - 2, l); fill(x + 1, y + h - 2, w - 2, 1, d); fill(x + w - 2, y + 2, 1, h - 3, d);
  };
  const paper = (x, y, w, h, top, bot) => {
    for (let j = 0; j < h; j++) {
      const base = mix(top, bot, h > 1 ? j / (h - 1) : 0);
      for (let i = 0; i < w; i++) {
        const n = noise(x + i, y + j) % 37;
        fill(x + i, y + j, 1, 1, n === 0 ? mix(base, c(16, 13, 8), 0.35) : n === 1 ? mix(base, c(31, 31, 31), 0.4) : base);
      }
    }
  };
  const text = (t, x, y, col = OUT) => drawString(fill, t, x, y, col, null);
  const gtext = (t, x, y, top, bot, shadow = OUT) => {
    drawString(fill, t, x + 1, y + 1, shadow, null);
    drawString((i, j) => fill(i, j, 1, 1, mix(top, bot, Math.min(1, Math.max(0, (j - y) / 7)))), t, x, y, 0, null);
  };
  return { fill, math, grad, frame, paper, text, gtext };
}

// The slip in its stock: shadow, carbon copy, paper, bevel, gradient header band and a shaded paper clip.
function slip(s, st, x, y, w, h, heading, tag) {
  s.math(x + 5, y + 6, w, h, c(16, 16, 16), 'sub');
  s.math(x + 4, y - 4, w, h, st.carbon, 'add', true);
  s.frame(x + 4, y - 4, w, h, mix(st.carbon, OUT, 0.6), mix(st.carbon, c(31, 31, 31), 0.5), mix(st.carbon, OUT, 0.6));
  s.paper(x, y, w, h, st.top, st.bottom);
  s.frame(x, y, w, h, st.outline, st.light, st.dark);
  s.grad(x + 2, y + 2, w - 4, 15, ...st.band);
  s.fill(x + 2, y + 17, w - 4, 1, st.dark);
  s.gtext(heading, x + 8, y + 5, c(31, 31, 31), mix(st.band[1], c(31, 31, 31), 0.4), st.outline);
  s.text(tag, x + w - 8 - measure(tag), y + 5, RED);
  const cx = x + w - 30;
  s.grad(cx, y - 6, 3, 18, c(29, 29, 31), c(11, 11, 14));
  s.grad(cx + 5, y - 3, 2, 12, c(24, 24, 27), c(9, 9, 12));
  s.fill(cx + 1, y - 7, 5, 1, c(20, 20, 23));
  s.fill(cx + 3, y + 12, 2, 1, c(14, 14, 17));
}

function rules(s, st, x, y, w) {
  s.fill(x, y, w, 1, st.rule);
  s.fill(x, y + 1, w, 1, st.light);
}

// A shaded red pencil pointing right at (x, y), nudged by the frame count.
function pencil(s, x, y, frame) {
  const nx = x + [0, 1, 2, 1][(frame >> 4) & 3];
  s.math(nx + 1, y + 1, 11, 5, c(10, 10, 10), 'sub');
  s.fill(nx - 2, y, 2, 5, c(28, 26, 22)); s.fill(nx - 2, y + 1, 1, 3, c(20, 18, 15));
  s.fill(nx, y, 7, 5, c(24, 5, 4)); s.fill(nx, y, 7, 1, c(31, 14, 12)); s.fill(nx, y + 4, 7, 1, c(14, 2, 2));
  s.fill(nx + 7, y, 2, 5, c(26, 21, 14)); s.fill(nx + 9, y + 1, 1, 3, c(26, 21, 14)); s.fill(nx + 10, y + 2, 1, 1, OUT);
}

function highlight(s, x, y, w) {
  s.math(x, y, w, 11, c(0, 1, 13), 'sub');
}

function arrow(s, x, y, dir, col) {
  for (let i = 0; i < 4; i++) s.fill(dir > 0 ? x + i : x + 3 - i, y + i, 1, 7 - 2 * i, col);
}

const SETTINGS = { w: 236, h: 150 };
const SOUND = { w: 256, h: 178 };
const LAB_ROW = 24;
const LIST_ROW = 13;
const LIST_ROWS = 9;
const boxFor = (m) => ({
  memo: { w: 150, h: 50 + m.rows.length * 16 },
  settings: SETTINGS,
  sound: SOUND,
  labs: { w: 220, h: 40 + LABS.length * LAB_ROW + 18 },
})[m.page];

export function drawMemo(buf, m, frame = 0) {
  const s = painter(buf);
  const st = STOCK[m.settings.paper];
  const box = boxFor(m);
  const x = (WIDTH - box.w) >> 1;
  const rest = HEIGHT - box.h - 8;
  const y = Math.round(HEIGHT + 8 - (HEIGHT + 8 - rest) * slideIn(m.slide));
  const draw = { memo: drawMemoPage, settings: drawSettingsPage, sound: drawSoundPage, labs: drawLabsPage }[m.page];
  draw(s, st, m, x, y, frame, box);
}

// The sound test: MUSIC, EFFECTS and VOICES tabs over a numbered list that scrolls nine rows at a time.
function drawSoundPage(s, st, m, x, y, frame, { w, h }) {
  slip(s, st, x, y, w, h, 'SOUND TEST', 'S-SMP');
  let tx = x + 24;
  SOUND_TABS.forEach(({ label }, i) => {
    const on = i === m.tab;
    if (on) highlight(s, tx - 4, y + 21, measure(label) + 8);
    s.text(label, tx, y + 23, on ? RED : st.dark);
    tx += measure(label) + 20;
  });
  arrow(s, x + 12, y + 23, -1, RED);
  arrow(s, x + w - 16, y + 23, 1, RED);
  rules(s, st, x + 6, y + 35, w - 12);
  const { cues } = SOUND_TABS[m.tab];
  const first = Math.max(0, Math.min(cues.length - LIST_ROWS, m.row - (LIST_ROWS >> 1)));
  cues.slice(first, first + LIST_ROWS).forEach(([name, label], k) => {
    const i = first + k;
    const ry = y + 41 + k * LIST_ROW;
    const on = i === m.row;
    if (on) highlight(s, x + 18, ry - 2, w - 36);
    s.text(String(i + 1).padStart(2, '0'), x + 26, ry, RED);
    s.text(label.toUpperCase(), x + 44, ry, on ? OUT : st.dark);
    if (m.tab === 0 && name === m.playing) s.text('▶', x + w - 30, ry, RED);
    if (on) pencil(s, x + 7, ry + 1, frame);
  });
  const listEnd = y + 41 + LIST_ROWS * LIST_ROW;
  if (first > 0) arrow90(s, x + w - 14, y + 42, -1, st.dark);
  if (first + LIST_ROWS < cues.length) arrow90(s, x + w - 14, listEnd - 8, 1, st.dark);
  rules(s, st, x + 6, listEnd, w - 12);
  const song = SOUND_TABS[0].cues.find(([name]) => name === m.playing);
  s.text(`NOW: ${song ? song[1].toUpperCase() : '-'}`, x + 12, listEnd + 6, st.dark);
  const help = 'X: STOP  B: BACK';
  s.text(help, x + w - 12 - measure(help), y + h - 14, st.dark);
}

// The labs: each grey-box lab with a line on what it tests; choosing one boots it.
function drawLabsPage(s, st, m, x, y, frame, { w, h }) {
  slip(s, st, x, y, w, h, 'LABS', 'GREY BOX');
  LABS.forEach(({ label, what }, i) => {
    const ry = y + 26 + i * LAB_ROW;
    const on = i === m.row;
    if (on) highlight(s, x + 18, ry - 3, w - 36);
    s.text(label, x + 28, ry, on ? OUT : st.dark);
    s.text(what, x + 28, ry + 10, on ? RED : st.rule);
    rules(s, st, x + 18, ry + 20, w - 36);
    if (on) pencil(s, x + 8, ry + 1, frame);
  });
  s.text('B: BACK', x + w - 20 - measure('B: BACK'), y + h - 16, st.dark);
}

function arrow90(s, x, y, dir, col) {
  for (let i = 0; i < 4; i++) s.fill(x + i, dir > 0 ? y + i : y + 3 - i, 7 - 2 * i, 1, col);
}

function drawMemoPage(s, st, m, x, y, frame, { w, h }) {
  slip(s, st, x, y, w, h, 'MEMO', 'RUSH');
  s.text('TO: AUDITORS', x + 10, y + 22, st.dark);
  rules(s, st, x + 6, y + 33, w - 12);
  const top = y + h - 10 - m.rows.length * 16;
  m.rows.forEach((label, i) => {
    const ry = top + i * 16;
    if (i === m.row) highlight(s, x + 18, ry - 2, w - 36);
    s.text(label, x + 28, ry, i === m.row ? OUT : st.dark);
    rules(s, st, x + 18, ry + 11, w - 36);
    if (i === m.row) pencil(s, x + 8, ry + 1, frame);
  });
}

function drawSettingsPage(s, st, m, x, y, frame) {
  const { w, h } = SETTINGS;
  slip(s, st, x, y, w, h, 'SETTINGS', 'FORM 2-S');
  SETTING_ROWS.forEach(({ key, label }, i) => {
    const ry = y + 26 + i * 20;
    const on = i === m.row;
    if (on) highlight(s, x + 18, ry - 3, w - 36);
    s.text(label, x + 24, ry, on ? OUT : st.dark);
    const value = m.settings[key].toUpperCase();
    const vx = x + w - 30 - measure(value);
    s.text(value, vx, ry, RED);
    if (on) { arrow(s, vx - 9, ry, -1, RED); arrow(s, x + w - 26, ry, 1, RED); }
    rules(s, st, x + 18, ry + 12, w - 36);
    if (on) pencil(s, x + 7, ry + 1, frame);
  });
  // The three stocks as swatches, the chosen one lifted and framed.
  PAPER_STOCKS.forEach((name, i) => {
    const k = STOCK[name];
    const sx = x + 22 + i * 26;
    const sy = y + 92 - (name === m.settings.paper ? 2 : 0);
    s.math(sx + 2, sy + 2, 20, 14, c(9, 9, 9), 'sub');
    s.paper(sx, sy, 20, 14, k.top, k.bottom);
    s.frame(sx, sy, 20, 14, name === m.settings.paper ? RED : k.outline, k.light, k.dark);
  });
  // A text window in the chosen stock, as every window in the game will be.
  const win = { x: x + 104, y: y + 86, w: 110, h: 28 };
  s.math(win.x + 3, win.y + 3, win.w, win.h, c(10, 10, 10), 'sub');
  drawWindow(s.fill, win, windowGradient(win.h, ...st.window));
  drawString(s.fill, 'SAMPLE TEXT', win.x + 10, win.y + 10);
  const done = m.row === SETTING_ROWS.length;
  const dy = y + h - 22;
  if (done) highlight(s, x + 18, dy - 3, w - 36);
  s.text('FILE IT', x + 24, dy, done ? OUT : st.dark);
  if (done) pencil(s, x + 7, dy + 1, frame);
  s.text('B: BACK', x + w - 24 - measure('B: BACK'), dy, st.dark);
}

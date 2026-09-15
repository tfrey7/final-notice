// Draws the title's menus into a 15-bit screen buffer the Final Fight way (Tim's pick, item 2314): a
// black strip slides up under the picture, plain words sit centred in it, the chosen line lit white and
// the rest dimmed, with a red arrow nudging beside it. Headings take the logo's gold.
import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb15 as c } from './color.mjs';
import { drawString, measure } from './text.mjs';
import { LABS, SETTING_ROWS, SOUND_TABS, slideIn } from './memo.mjs';

const WHITE = c(31, 31, 31);
const DIM = c(13, 13, 15);
const FAINT = c(8, 8, 10);
const RED = c(31, 5, 4);
const GOLD = c(28, 21, 8);
const ROW = 12;
const PAD = 7;
const HEAD = 18;
const LIST_ROWS = 9;
const LAB_ROW = 24;

function painter(buf) {
  return (x, y, w, h, col) => {
    for (let j = Math.max(0, y); j < Math.min(HEIGHT, y + h); j++) {
      for (let i = Math.max(0, x); i < Math.min(WIDTH, x + w); i++) buf[j * WIDTH + i] = col;
    }
  };
}

const text = (fill, t, x, y, col) => drawString(fill, t, x, y, col, null);
const centreX = (t) => (WIDTH - measure(t)) >> 1;
const centred = (fill, t, y, col) => text(fill, t, centreX(t), y, col);
const cursor = (fill, x, y, frame) => text(fill, '▶', x - 10 + [0, 1, 2, 1][(frame >> 4) & 3], y, RED);

function arrow(fill, x, y, dir, col) {
  for (let i = 0; i < 4; i++) fill(dir > 0 ? x + i : x + 3 - i, y + i, 1, 7 - 2 * i, col);
}

function arrow90(fill, x, y, dir, col) {
  for (let i = 0; i < 4; i++) fill(x + i, dir > 0 ? y + i : y + 3 - i, 7 - 2 * i, 1, col);
}

const heightOf = (m) => ({
  memo: 2 * PAD + m.rows.length * ROW,
  settings: 2 * PAD + HEAD + (SETTING_ROWS.length + 2) * ROW + 10,
  sound: 2 * PAD + HEAD + 14 + LIST_ROWS * ROW + 2 * ROW + 6,
  labs: 2 * PAD + HEAD + LABS.length * LAB_ROW + ROW + 4,
})[m.page];

export function drawMemo(buf, m, frame = 0) {
  const fill = painter(buf);
  const top = Math.round(HEIGHT - heightOf(m) * slideIn(m.slide));
  fill(0, top, WIDTH, HEIGHT - top, 0);
  const draw = { memo: drawMemoPage, settings: drawSettingsPage, sound: drawSoundPage, labs: drawLabsPage }[m.page];
  draw(fill, m, top + PAD, frame);
}

function drawMemoPage(fill, m, y, frame) {
  m.rows.forEach((label, i) => {
    const ry = y + i * ROW;
    const on = i === m.row;
    text(fill, label, centreX(label), ry, on ? WHITE : DIM);
    if (on) cursor(fill, centreX(label), ry, frame);
  });
}

function drawSettingsPage(fill, m, y, frame) {
  centred(fill, 'SETTINGS', y, GOLD);
  const [left, vx] = [40, 146];
  SETTING_ROWS.forEach(({ key, label }, i) => {
    const ry = y + HEAD + i * ROW;
    const on = i === m.row;
    text(fill, label, left, ry, on ? WHITE : DIM);
    const value = m.settings[key].toUpperCase();
    text(fill, value, vx, ry, on ? WHITE : DIM);
    if (on) {
      cursor(fill, left, ry, frame);
      arrow(fill, vx - 9, ry, -1, RED);
      arrow(fill, vx + measure(value) + 5, ry, 1, RED);
    }
  });
  const dy = y + HEAD + SETTING_ROWS.length * ROW + 6;
  const done = m.row === SETTING_ROWS.length;
  centred(fill, 'DONE', dy, done ? WHITE : DIM);
  if (done) cursor(fill, centreX('DONE'), dy, frame);
  centred(fill, 'B: BACK', dy + ROW + 4, FAINT);
}

// The sound test: MUSIC, EFFECTS and VOICES tabs over a numbered list that scrolls nine rows at a time.
function drawSoundPage(fill, m, y, frame) {
  centred(fill, 'SOUND TEST', y, GOLD);
  const gap = 16;
  const total = SOUND_TABS.reduce((w, { label }) => w + measure(label), 0) + gap * (SOUND_TABS.length - 1);
  const ty = y + HEAD;
  let tx = (WIDTH - total) >> 1;
  arrow(fill, tx - 12, ty, -1, RED);
  arrow(fill, tx + total + 8, ty, 1, RED);
  SOUND_TABS.forEach(({ label }, i) => {
    const on = i === m.tab;
    text(fill, label, tx, ty, on ? WHITE : DIM);
    if (on) fill(tx, ty + 10, measure(label), 1, RED);
    tx += measure(label) + gap;
  });
  const { cues } = SOUND_TABS[m.tab];
  const first = Math.max(0, Math.min(cues.length - LIST_ROWS, m.row - (LIST_ROWS >> 1)));
  const listY = ty + 14;
  cues.slice(first, first + LIST_ROWS).forEach(([name, label], k) => {
    const i = first + k;
    const ry = listY + k * ROW;
    const on = i === m.row;
    text(fill, String(i + 1).padStart(2, '0'), 48, ry, on ? RED : FAINT);
    text(fill, label.toUpperCase(), 66, ry, on ? WHITE : DIM);
    if (m.tab === 0 && name === m.playing) text(fill, '▶', WIDTH - 44, ry, RED);
    if (on) cursor(fill, 48, ry, frame);
  });
  const listEnd = listY + LIST_ROWS * ROW;
  if (first > 0) arrow90(fill, WIDTH - 30, listY + 1, -1, DIM);
  if (first + LIST_ROWS < cues.length) arrow90(fill, WIDTH - 30, listEnd - 8, 1, DIM);
  const song = SOUND_TABS[0].cues.find(([name]) => name === m.playing);
  centred(fill, `NOW: ${song ? song[1].toUpperCase() : '-'}`, listEnd + 4, DIM);
  centred(fill, 'X: STOP  B: BACK', listEnd + 4 + ROW, FAINT);
}

// The labs: each grey-box lab with a line on what it tests; choosing one boots it.
function drawLabsPage(fill, m, y, frame) {
  centred(fill, 'LABS', y, GOLD);
  LABS.forEach(({ label, what }, i) => {
    const ry = y + HEAD + i * LAB_ROW;
    const on = i === m.row;
    text(fill, label, centreX(label), ry, on ? WHITE : DIM);
    centred(fill, what, ry + 10, on ? RED : FAINT);
    if (on) cursor(fill, centreX(label), ry, frame);
  });
  centred(fill, 'B: BACK', y + HEAD + LABS.length * LAB_ROW + 4, FAINT);
}

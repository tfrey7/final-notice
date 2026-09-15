// The title's memo slip (docs/SNES-HUD-MENUS.md section 5, "Title flow"): NEW AUDIT, CONTINUE when a
// save exists, SETTINGS. Settings borrow Final Fantasy VI's window colour as "paper stock", plus text
// speed and stereo or mono, kept in localStorage. Pure logic; src/snes/memoart.mjs draws it.
import { rgb15 as c } from './color.mjs';
import { confirmed } from './scenes/front.mjs';

export const SETTINGS_KEY = 'final-notice.settings';
export const SAVE_KEY = 'final-notice.save';
export const SLIDE_FRAMES = 14;

export const PAPER_STOCKS = ['manila', 'carbon blue', 'pink copy'];
export const TEXT_SPEEDS = ['slow', 'normal', 'fast'];
export const SOUNDS = ['stereo', 'mono'];
export const SETTING_ROWS = [
  { key: 'paper', label: 'PAPER STOCK', values: PAPER_STOCKS },
  { key: 'text', label: 'TEXT SPEED', values: TEXT_SPEEDS },
  { key: 'sound', label: 'SOUND', values: SOUNDS },
];
export const DEFAULTS = { paper: 'carbon blue', text: 'normal', sound: 'stereo' };

// Frames per typed letter at each text speed.
export const LETTER_FRAMES = { slow: 4, normal: 2, fast: 1 };

// Each stock's paper (light, for the memo itself) and window (dark, behind white text box lettering).
export const STOCK = {
  manila: {
    top: c(30, 28, 20), bottom: c(18, 13, 6), light: c(31, 31, 28), dark: c(11, 7, 3), outline: c(4, 2, 1),
    rule: c(15, 11, 5), band: [c(22, 16, 8), c(10, 6, 2)], carbon: c(4, 9, 26), window: [c(14, 10, 4), c(3, 2, 0)],
  },
  'carbon blue': {
    top: c(25, 28, 31), bottom: c(9, 12, 22), light: c(31, 31, 31), dark: c(4, 5, 14), outline: c(1, 1, 5),
    rule: c(7, 9, 19), band: [c(12, 15, 26), c(4, 6, 15)], carbon: c(10, 4, 24), window: [c(4, 6, 20), c(0, 1, 6)],
  },
  'pink copy': {
    top: c(31, 27, 28), bottom: c(21, 11, 15), light: c(31, 31, 31), dark: c(12, 4, 7), outline: c(5, 1, 3),
    rule: c(18, 8, 12), band: [c(24, 12, 17), c(12, 4, 8)], carbon: c(4, 12, 24), window: [c(18, 5, 10), c(5, 1, 3)],
  },
};

const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);

export function readSettings(storage) {
  let raw = {};
  try { raw = JSON.parse(storage?.getItem(SETTINGS_KEY) ?? '{}') ?? {}; } catch { raw = {}; }
  return Object.fromEntries(SETTING_ROWS.map(({ key, values }) => [key, pick(raw[key], values, DEFAULTS[key])]));
}

export function writeSettings(storage, settings) {
  try { storage?.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private window: this visit only */ }
}

export function hasSave(storage) {
  try { return storage?.getItem(SAVE_KEY) != null; } catch { return false; }
}

export const memoRows = (save) => (save ? ['NEW AUDIT', 'CONTINUE', 'SETTINGS'] : ['NEW AUDIT', 'SETTINGS']);

export function openMemo(settings, save, page = 'memo') {
  return { page, row: 0, rows: memoRows(save), slide: 0, settings, event: null };
}

const wrap = (i, n) => (i + n) % n;

function cycle(settings, row, dir) {
  const { key, values } = SETTING_ROWS[row];
  return { ...settings, [key]: values[wrap(values.indexOf(settings[key]) + dir, values.length)] };
}

// One frame of the memo. `event` is what the title acts on: new, continue, back, change, move, open, done.
export function memoStep(m, pad) {
  const p = pad.pressed;
  const base = { ...m, event: null };
  if (m.slide < SLIDE_FRAMES) return { ...base, slide: confirmed(pad) ? SLIDE_FRAMES : m.slide + 1 };
  const dy = (p.has('down') ? 1 : 0) - (p.has('up') ? 1 : 0);
  if (m.page === 'memo') {
    if (dy) return { ...base, row: wrap(m.row + dy, m.rows.length), event: 'move' };
    if (p.has('b')) return { ...base, event: 'back' };
    if (!confirmed(pad)) return base;
    const choice = m.rows[m.row];
    if (choice === 'SETTINGS') return { ...base, page: 'settings', row: 0, slide: 0, event: 'open' };
    return { ...base, event: choice === 'CONTINUE' ? 'continue' : 'new' };
  }
  const rows = SETTING_ROWS.length + 1;
  const toMemo = { ...base, page: 'memo', row: m.rows.indexOf('SETTINGS'), slide: SLIDE_FRAMES, event: 'done' };
  if (dy) return { ...base, row: wrap(m.row + dy, rows), event: 'move' };
  if (p.has('b')) return toMemo;
  const onDone = m.row === SETTING_ROWS.length;
  if (onDone) return confirmed(pad) ? toMemo : base;
  const dx = (p.has('right') || confirmed(pad) ? 1 : 0) - (p.has('left') ? 1 : 0);
  if (!dx) return base;
  return { ...base, settings: cycle(m.settings, m.row, dx), event: 'change' };
}

// How far up the slip has slid, 0 hidden to 1 in place, easing out.
export const slideIn = (slide) => 1 - (1 - Math.min(1, slide / SLIDE_FRAMES)) ** 3;

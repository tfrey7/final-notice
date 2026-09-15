// The title's memo slip (docs/SNES-HUD-MENUS.md section 5, "Title flow"): NEW AUDIT, CONTINUE when a
// save exists, SETTINGS. Settings are text speed, stereo or mono and the combo guide, kept in
// localStorage. Pure logic; src/snes/memoart.mjs draws it.
import { confirmed } from './scenes/front.mjs';
import { SOUND_TEST } from './audio/soundtest.mjs';

export const SETTINGS_KEY = 'final-notice.settings';
export const SAVE_KEY = 'final-notice.save';
export const SLIDE_FRAMES = 14;

export const TEXT_SPEEDS = ['slow', 'normal', 'fast'];
export const SOUNDS = ['stereo', 'mono'];
export const SETTING_ROWS = [
  { key: 'text', label: 'TEXT SPEED', values: TEXT_SPEEDS },
  { key: 'sound', label: 'SOUND', values: SOUNDS },
  { key: 'guide', label: 'COMBO GUIDE', values: ['on', 'off'] },
];
export const DEFAULTS = { text: 'normal', sound: 'stereo', guide: 'on' };

// Frames per typed letter at each text speed.
export const LETTER_FRAMES = { slow: 4, normal: 2, fast: 1 };

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

export const memoRows = (save) => ['NEW AUDIT', ...(save ? ['CONTINUE'] : []), 'SOUND TEST', 'LABS', 'SETTINGS'];

// The sound test's three lists, from src/snes/audio/soundtest.mjs; songs play as music, the rest as effects.
export const SOUND_TABS = [
  { label: 'MUSIC', cues: SOUND_TEST.music, kind: 'song' },
  { label: 'EFFECTS', cues: SOUND_TEST.effects, kind: 'sfx' },
  { label: 'VOICES', cues: SOUND_TEST.voices, kind: 'sfx' },
];

// Every grey-box lab, as the boot address that opens it.
export const LABS = [
  { label: 'BRAWL LAB', what: 'STAGE 1 FIGHTS, LIVE DIALS', url: '?snes&go=lab' },
  { label: 'CLIMB LAB', what: 'STAGE 2 RUN AND CAST', url: '?snes&go=climblab' },
];

const PAGE_ROW = { settings: 'SETTINGS', sound: 'SOUND TEST', labs: 'LABS' };

export function openMemo(settings, save, page = 'memo') {
  return { page, row: 0, tab: 0, rows: memoRows(save), slide: 0, settings, event: null };
}

const wrap = (i, n) => (i + n) % n;
const backToMemo = (base, page) => ({ ...base, page: 'memo', row: base.rows.indexOf(PAGE_ROW[page]), slide: SLIDE_FRAMES, event: 'done' });

function soundStep(base, pad, dy) {
  const p = pad.pressed;
  const tab = SOUND_TABS[base.tab];
  if (dy) return { ...base, row: wrap(base.row + dy, tab.cues.length), event: 'move' };
  const dx = (p.has('right') ? 1 : 0) - (p.has('left') ? 1 : 0);
  if (dx) return { ...base, tab: wrap(base.tab + dx, SOUND_TABS.length), row: 0, event: 'tab' };
  if (p.has('b')) return backToMemo(base, 'sound');
  if (p.has('swap')) return { ...base, event: 'stop' };
  if (confirmed(pad)) return { ...base, event: 'play', cue: { kind: tab.kind, name: tab.cues[base.row][0] } };
  return base;
}

function labsStep(base, pad, dy) {
  if (dy) return { ...base, row: wrap(base.row + dy, LABS.length), event: 'move' };
  if (pad.pressed.has('b')) return backToMemo(base, 'labs');
  if (confirmed(pad)) return { ...base, event: 'lab', url: LABS[base.row].url };
  return base;
}

function cycle(settings, row, dir) {
  const { key, values } = SETTING_ROWS[row];
  return { ...settings, [key]: values[wrap(values.indexOf(settings[key]) + dir, values.length)] };
}

// One frame of the memo. `event` is what the title acts on: new, continue, back, change, move, open, done,
// tab, play (with `cue`), stop, or lab (with the lab's `url`).
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
    const page = Object.keys(PAGE_ROW).find((k) => PAGE_ROW[k] === choice);
    if (page) return { ...base, page, row: 0, tab: 0, slide: 0, event: 'open' };
    return { ...base, event: choice === 'CONTINUE' ? 'continue' : 'new' };
  }
  if (m.page === 'sound') return soundStep(base, pad, dy);
  if (m.page === 'labs') return labsStep(base, pad, dy);
  const rows = SETTING_ROWS.length + 1;
  const toMemo = backToMemo(base, 'settings');
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

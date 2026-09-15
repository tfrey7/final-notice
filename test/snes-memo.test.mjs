import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULTS, LABS, SAVE_KEY, SETTINGS_KEY, SETTING_ROWS, SLIDE_FRAMES, SOUND_TABS, hasSave, memoStep, openMemo, readSettings, writeSettings,
} from '../src/snes/memo.mjs';

const pad = (...buttons) => ({ pressed: new Set(buttons) });
const store = (init = {}) => {
  const data = { ...init };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
};
const slid = (m) => ({ ...m, slide: SLIDE_FRAMES });

test('CONTINUE shows only when a save exists', () => {
  assert.deepEqual(openMemo(DEFAULTS, hasSave(store())).rows, ['NEW AUDIT', 'SOUND TEST', 'LABS', 'SETTINGS']);
  assert.deepEqual(openMemo(DEFAULTS, hasSave(store({ [SAVE_KEY]: '{}' }))).rows, ['NEW AUDIT', 'CONTINUE', 'SOUND TEST', 'LABS', 'SETTINGS']);
});

const onRow = (m, label) => ({ ...m, row: m.rows.indexOf(label) });

test('SOUND TEST pages its three lists, plays and stops, and B backs out to its row', () => {
  let m = memoStep(onRow(slid(openMemo(DEFAULTS, false)), 'SOUND TEST'), pad('a'));
  assert.equal(m.page, 'sound');
  m = slid(m);
  assert.deepEqual(memoStep(m, pad('start')).cue, { kind: 'song', name: SOUND_TABS[0].cues[0][0] });
  assert.equal(memoStep(m, pad('up')).row, SOUND_TABS[0].cues.length - 1);
  assert.equal(memoStep(m, pad('swap')).event, 'stop');
  m = memoStep(memoStep(m, pad('down')), pad('left'));
  assert.equal(m.event, 'tab');
  assert.deepEqual([m.tab, m.row], [2, 0]);
  assert.deepEqual(memoStep(m, pad('injunction')).cue, { kind: 'sfx', name: SOUND_TABS[2].cues[0][0] });
  m = memoStep(m, pad('b'));
  assert.deepEqual([m.page, m.rows[m.row], m.event], ['memo', 'SOUND TEST', 'done']);
});

test('LABS lists every lab and boots the chosen one; B backs out to its row', () => {
  assert.deepEqual(LABS.map((l) => l.url), ['?snes&go=lab', '?snes&go=climblab']);
  let m = slid(memoStep(onRow(slid(openMemo(DEFAULTS, true)), 'LABS'), pad('a')));
  assert.equal(m.page, 'labs');
  m = memoStep(m, pad('down'));
  assert.deepEqual([memoStep(m, pad('a')).event, memoStep(m, pad('a')).url], ['lab', '?snes&go=climblab']);
  m = memoStep(m, pad('b'));
  assert.deepEqual([m.page, m.rows[m.row]], ['memo', 'LABS']);
});

test('the old sound test page sends you to the game menu\'s Sound Test', () => {
  const html = readFileSync(new URL('../sound.html', import.meta.url), 'utf8');
  assert.match(html, /location\.replace\('index\.html\?snes&memo=sound'\)/);
});

test('the slip slides up before it takes a choice, and Start skips the slide', () => {
  let m = openMemo(DEFAULTS, false);
  m = memoStep(m, pad('down'));
  assert.equal(m.row, 0);
  assert.equal(m.slide, 1);
  m = memoStep(m, pad('start'));
  assert.equal(m.slide, SLIDE_FRAMES);
  assert.equal(m.event, null);
});

test('the cursor wraps, NEW AUDIT and CONTINUE confirm, B backs out to PUSH START', () => {
  let m = slid(openMemo(DEFAULTS, true));
  assert.equal(memoStep(m, pad('up')).row, 4);
  assert.equal(memoStep(m, pad('a')).event, 'new');
  m = memoStep(m, pad('down'));
  assert.equal(memoStep(m, pad('start')).event, 'continue');
  assert.equal(memoStep(m, pad('b')).event, 'back');
});

test('SETTINGS opens, cycles each value both ways and returns to the SETTINGS row', () => {
  let m = slid(openMemo(DEFAULTS, false));
  m = memoStep(memoStep(m, pad('up')), pad('a'));
  assert.equal(m.page, 'settings');
  m = slid(m);
  m = memoStep(m, pad('right'));
  assert.equal(m.event, 'change');
  assert.equal(m.settings.paper, 'pink copy');
  m = memoStep(m, pad('right'));
  assert.equal(m.settings.paper, 'manila');
  m = memoStep(m, pad('left'));
  assert.equal(m.settings.paper, 'pink copy');
  m = memoStep(memoStep(m, pad('down')), pad('a'));
  assert.equal(m.settings.text, 'fast');
  m = memoStep(memoStep(m, pad('down')), pad('left'));
  assert.equal(m.settings.sound, 'mono');
  m = memoStep(memoStep(m, pad('down')), pad('a'));
  assert.equal(m.settings.guide, 'off');
  m = memoStep(memoStep(m, pad('down')), pad('a'));
  assert.equal(m.event, 'done');
  assert.equal(m.page, 'memo');
  assert.equal(m.rows[m.row], 'SETTINGS');
  assert.equal(m.settings.sound, 'mono');
});

test('settings survive a round trip through storage and junk falls back to the defaults', () => {
  const s = store();
  assert.deepEqual(readSettings(s), DEFAULTS);
  writeSettings(s, { paper: 'manila', text: 'slow', sound: 'mono', guide: 'off' });
  assert.deepEqual(readSettings(s), { paper: 'manila', text: 'slow', sound: 'mono', guide: 'off' });
  s.setItem(SETTINGS_KEY, '{"paper":"vellum","text":"fast"');
  assert.deepEqual(readSettings(s), DEFAULTS);
  s.setItem(SETTINGS_KEY, '{"paper":"vellum","text":"fast"}');
  assert.deepEqual(readSettings(s), { ...DEFAULTS, text: 'fast' });
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.deepEqual(readSettings(broken), DEFAULTS);
  assert.doesNotThrow(() => writeSettings(broken, DEFAULTS));
  assert.equal(hasSave(broken), false);
  assert.equal(SETTING_ROWS.length, 4);
});

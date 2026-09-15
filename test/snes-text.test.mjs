import test from 'node:test';
import assert from 'node:assert/strict';
import { isRgb15, channels } from '../src/snes/color.mjs';
import { WIDTH } from '../src/snes/screen.mjs';
import { SCENES, SCENE_ORDER, AUDITORS, beatsFor } from '../src/story/script.mjs';
import {
  FONT_H, BOX, BG3_PALETTE, glyph, measure, wrapText, typed, pageLength, windowGradient, drawTextBox,
} from '../src/snes/text.mjs';
import { hudLayout, hudBoxes, inScreen, overlaps, hudBrightness, hudWatch, HOLD_MS, FADE_MS, drawHud } from '../src/snes/hud.mjs';

const inner = BOX.w - 2 * BOX.pad;

test('the font is 8 px high and variable width', () => {
  for (const ch of 'AiWl.') assert.equal(glyph(ch).rows.length, FONT_H);
  assert.ok(glyph('i').w < glyph('W').w);
  assert.equal(measure('il'), glyph('i').w + 1 + glyph('l').w);
  assert.equal(measure(''), 0);
});

test('BG3 text uses 4 colours, the first clear', () => {
  assert.equal(BG3_PALETTE.length, 4);
  assert.equal(BG3_PALETTE[0], 0);
  assert.ok(BG3_PALETTE.every(isRgb15));
});

test('wrapText keeps every line inside the box and loses no word', () => {
  const text = 'Final notice: the account is overdue by three hundred years and the Firm would like a word.';
  const pages = wrapText(text);
  for (const page of pages) {
    assert.ok(page.length <= BOX.rows);
    for (const line of page) assert.ok(measure(line) <= inner, line);
  }
  assert.equal(pages.flat().join(' '), text);
});

test('wrapText breaks a word wider than the line between letters', () => {
  const pages = wrapText('W'.repeat(60), 40, 99);
  assert.ok(pages[0].length > 1);
  assert.ok(pages[0].every((l) => measure(l) <= 40));
  assert.equal(pages[0].join(''), 'W'.repeat(60));
});

test('every story line wraps into the box', () => {
  for (const scene of SCENE_ORDER) for (const who of AUDITORS) for (const beat of beatsFor(scene, who)) {
    for (const line of wrapText(beat.line).flat()) assert.ok(measure(line) <= inner, `${SCENES[scene].title}: ${line}`);
  }
});

test('typed shows letters in order across lines', () => {
  const lines = ['abc', 'de'];
  assert.deepEqual(typed(lines, 0), ['', '']);
  assert.deepEqual(typed(lines, 4), ['abc', 'd']);
  assert.deepEqual(typed(lines, 99), lines);
  assert.equal(pageLength(lines), 5);
});

test('windowGradient steps from the top colour to the bottom one', () => {
  const g = windowGradient(BOX.h);
  assert.equal(g.length, BOX.h);
  assert.ok(g.every(isRgb15));
  const blue = g.map((c) => channels(c)[2]);
  for (let i = 1; i < blue.length; i++) assert.ok(blue[i] <= blue[i - 1]);
});

test('a text box draws inside the screen', () => {
  const rects = [];
  drawTextBox((x, y, w, h) => rects.push({ x, y, w, h }), { speaker: 'WARD', lines: ['Hello.'], shown: 99 });
  assert.ok(rects.length > 0);
  assert.ok(rects.every(inScreen));
});

const play = { name: 'ward', hp: 5, lives: 3, meter: 2, carried: ['notice', 'redTape'], hand: 1, boss: { name: 'Vellum', hp: 7, maxHp: 12 } };

test('the HUD layout stays on screen and nothing in it overlaps', () => {
  const boxes = hudBoxes(hudLayout(play));
  assert.ok(boxes.every(inScreen));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    assert.ok(!overlaps(boxes[i], boxes[j]), `${JSON.stringify(boxes[i])} and ${JSON.stringify(boxes[j])}`);
  }
});

test('bars fill in proportion and clamp', () => {
  const inside = (l) => l.health.w - 2;
  assert.equal(hudLayout({ ...play, hp: 8 }).health.fill, inside(hudLayout(play)));
  assert.equal(hudLayout({ ...play, hp: 0 }).health.fill, 0);
  assert.equal(hudLayout({ ...play, hp: 99 }).health.fill, inside(hudLayout(play)));
  assert.equal(hudLayout({ ...play, hp: 4 }).health.fill, 32);
  assert.deepEqual(hudLayout(play).meter.map((m) => m.full), [true, true, false, false]);
  const boss = hudLayout(play).boss;
  assert.equal(boss.bar.fill, Math.round((94 * 7) / 12));
  assert.equal(boss.name.x + measure('VELLUM'), WIDTH - 8);
});

test('the enchantments and boss bar appear only when there are some', () => {
  const plain = hudLayout({ name: 'mercer', hp: 8, lives: 2, meter: 0 });
  assert.equal(plain.enchant, null);
  assert.equal(plain.boss, null);
  assert.deepEqual(hudLayout(play).enchant.map((e) => e.held), [false, true]);
});

test('the HUD holds while things change and fades out when idle', () => {
  assert.equal(hudBrightness(0), 15);
  assert.equal(hudBrightness(HOLD_MS), 15);
  const mid = hudBrightness(HOLD_MS + FADE_MS / 2);
  assert.ok(mid > 0 && mid < 15);
  assert.equal(hudBrightness(HOLD_MS + FADE_MS), 0);
  const watch = hudWatch();
  assert.equal(watch.see({ hp: 5 }, 1000), 0);
  assert.equal(watch.see({ hp: 5 }, 4000), 3000);
  assert.equal(watch.see({ hp: 4 }, 4100), 0);
});

test('drawHud draws only inside the screen', () => {
  const rects = [];
  drawHud((x, y, w, h) => rects.push({ x, y, w, h }), hudLayout(play));
  assert.ok(rects.every(inScreen));
});

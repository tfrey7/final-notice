import test from 'node:test';
import assert from 'node:assert/strict';
import { isRgb15, channels, rgb15 } from '../src/snes/color.mjs';
import { WIDTH, HEIGHT } from '../src/snes/screen.mjs';
import { SCENES, SCENE_ORDER, AUDITORS, beatsFor } from '../src/story/script.mjs';
import {
  FONT_H, BOX, BG3_PALETTE, glyph, measure, wrapText, typed, pageLength, windowGradient, drawTextBox, drawString, inkRamp,
} from '../src/snes/text.mjs';
import {
  hudLayout, hudBoxes, inScreen, overlaps, drainStep, blend15, fadeFill,
  PALE_FRAMES, DRAIN_PER_FRAME, HUD_COLOURS, drawHud,
} from '../src/snes/hud.mjs';

const inner = BOX.w - 2 * BOX.pad;

test('the font is variable width on an 8 px cap height, with descenders below', () => {
  for (const ch of 'AiWl.') assert.equal(glyph(ch).rows.length, FONT_H);
  assert.ok(glyph('i').w < glyph('W').w);
  assert.equal(measure('il'), glyph('i').w + 1 + glyph('l').w);
  assert.equal(measure(''), 0);
  const lit = (ch) => glyph(ch).rows.map((r, i) => (r.includes('#') ? i : -1)).filter((i) => i >= 0);
  for (const ch of 'AHZ0') assert.deepEqual([lit(ch)[0], lit(ch).at(-1)], [0, 7], ch);
  assert.equal(lit('g').at(-1), FONT_H - 1);
  const every = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?\'":;-/()';
  for (const ch of every) assert.ok(glyph(ch) !== glyph('?') || ch === '?', ch);
  assert.equal(new Set([...'0123456789'].map((d) => glyph(d).w)).size, 1, 'digits share a width');
});

test('each glyph is shaded in three inks under a one-pixel shadow', () => {
  const inks = new Map();
  drawString((x, y, w, h, c) => inks.set(c, (inks.get(c) ?? 0) + 1), 'H', 0, 0, rgb15(24, 24, 28), rgb15(2, 2, 6));
  assert.equal(inks.size, 4);
  assert.deepEqual(inkRamp(rgb15(20, 20, 20)).map((c) => channels(c)[0]), [22, 20, 17]);
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
  assert.equal(boss.name.x + measure('OVERDUE: VELLUM'), WIDTH - 8);
});

test('the enchantments and boss bar appear only when there are some', () => {
  const plain = hudLayout({ name: 'mercer', hp: 8, lives: 2, meter: 0 });
  assert.equal(plain.enchant, null);
  assert.equal(plain.boss, null);
  assert.deepEqual(hudLayout(play).enchant.map((e) => e.held), [false, true]);
});

test('the HUD never fades: every part draws at full strength', () => {
  const steps = new Set();
  drawHud((x, y, w, h, c, step = 15) => steps.add(step), hudLayout({ ...play, receipt: { count: 2, ms: 0 }, now: 1000 }));
  assert.ok(steps.size > 0);
  assert.ok([...steps].every((s) => s >= 7), [...steps].join());
});

test('a hit leaves the lost slice pale for 20 frames, then it drains', () => {
  let d = drainStep(null, 8);
  d = drainStep(d, 5);
  assert.equal(d.pale, 8);
  for (let f = 0; f < PALE_FRAMES; f++) d = drainStep(d, 5);
  assert.equal(d.pale, 8);
  d = drainStep(d, 5);
  assert.equal(d.pale, 8 - DRAIN_PER_FRAME);
  let frames = 1;
  while (d.pale > 5) { d = drainStep(d, 5); frames++; }
  assert.equal(frames, 3 / DRAIN_PER_FRAME);
  assert.equal(drainStep(drainStep(d, 3), 8).pale, 8, 'a heal past the pale slice replaces it');
  const layout = hudLayout({ ...play, hp: 4, pale: 6 });
  assert.equal(layout.health.fill, 32);
  assert.equal(layout.health.pale, 48);
});

test('a hit during the pale hold keeps the oldest value and restarts the hold', () => {
  let d = drainStep(drainStep(null, 8), 6);
  for (let f = 0; f < 10; f++) d = drainStep(d, 6);
  d = drainStep(d, 4);
  assert.deepEqual(d, { hp: 4, pale: 8, hold: PALE_FRAMES });
});

test('fading steps a colour toward what is under it and step 0 draws nothing', () => {
  const red = rgb15(31, 0, 0);
  const blue = rgb15(0, 0, 31);
  assert.equal(blend15(blue, red, 15), red);
  assert.equal(blend15(blue, red, 0), blue);
  const buf = new Uint16Array(WIDTH * HEIGHT).fill(blue);
  const fill = fadeFill(buf);
  fill(0, 0, 2, 1, red, 0);
  assert.equal(buf[0], blue);
  fill(0, 0, 2, 1, red, 8);
  assert.ok(buf[0] !== blue && buf[0] !== red);
  fill(0, 0, 2, 1, red);
  assert.equal(buf[1], red);
});

test('drawHud draws only inside the screen, and a faded-out group not at all', () => {
  const rects = [];
  drawHud((x, y, w, h, c, step) => rects.push({ x, y, w, h, step }), hudLayout(play));
  assert.ok(rects.length && rects.every(inScreen));
  const lit = [];
  drawHud((x, y, w, h, c, step) => lit.push({ x, y, step }), hudLayout(play), { health: 0, meter: 0, enchant: 0, boss: 9 });
  assert.ok(lit.length && lit.every((r) => r.y >= 36 && r.step <= 9));
});

test('a full Notice segment is a gold box with a red stamp, an empty one has none', () => {
  const colours = (meter) => {
    const out = new Set();
    drawHud((x, y, w, h, c) => out.add(c), hudLayout({ ...play, meter }), { health: 0, enchant: 0, boss: 0 });
    return out;
  };
  assert.ok(!colours(0).has(HUD_COLOURS.stamp));
  assert.ok(colours(1).has(HUD_COLOURS.stamp) && colours(1).has(HUD_COLOURS.meter));
});

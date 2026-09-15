import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH } from '../src/snes/screen.mjs';
import { channels } from '../src/snes/color.mjs';
import {
  hudLayout, hudBoxes, inScreen, overlaps, drawHud, receiptSlide, postReceipt, bossColour,
  HUD_COLOURS, RECEIPT_MS, SLIDE_MS, CARBON_LAG_MS, RECEIPT,
} from '../src/snes/hud.mjs';

const play = { name: 'ward', hp: 5, lives: 3, meter: 2 };

test('the receipt slides in, holds, slides out and is gone at 2.5 s', () => {
  assert.equal(receiptSlide(null), 0);
  assert.equal(receiptSlide(-1), 0);
  assert.equal(receiptSlide(0), 0);
  assert.equal(receiptSlide(SLIDE_MS / 2), 0.5);
  assert.equal(receiptSlide(SLIDE_MS), 1);
  assert.equal(receiptSlide(RECEIPT_MS / 2), 1);
  assert.equal(receiptSlide(RECEIPT_MS - SLIDE_MS), 1);
  assert.equal(receiptSlide(RECEIPT_MS - SLIDE_MS / 2), 0.5);
  assert.equal(receiptSlide(RECEIPT_MS), 0);
  let last = 0;
  for (let ms = 0; ms <= SLIDE_MS; ms += 10) assert.ok(receiptSlide(ms) >= last), (last = receiptSlide(ms));
});

test('each pickup posts a new receipt with the count one higher', () => {
  const a = postReceipt(null, 100);
  assert.deepEqual(a, { count: 1, ms: 100 });
  assert.deepEqual(postReceipt(a, 900), { count: 2, ms: 900 });
});

test('the tab sits top right, its carbon copy one step behind, then both leave', () => {
  const receipt = { count: 12, ms: 1000 };
  const held = hudLayout({ ...play, receipt, now: 2000 }).receipt;
  assert.equal(held.x + held.w, WIDTH - 8);
  assert.equal(held.y, 8);
  assert.deepEqual([held.carbon.x - held.x, held.carbon.y - held.y], [RECEIPT.carbon, RECEIPT.carbon]);
  const coming = hudLayout({ ...play, receipt, now: 1000 + SLIDE_MS / 2 }).receipt;
  assert.ok(coming.x > held.x && coming.carbon.x - coming.x > RECEIPT.carbon, 'the copy trails on the way in');
  const going = hudLayout({ ...play, receipt, now: 1000 + RECEIPT_MS }).receipt;
  assert.ok(going.x > WIDTH, 'the tab has left');
  assert.ok(going.carbon.x < WIDTH, 'the copy is still leaving');
  assert.equal(hudLayout({ ...play, receipt, now: 1000 + RECEIPT_MS + CARBON_LAG_MS }).receipt, null);
  assert.equal(hudLayout({ ...play, receipt: null, now: 2000 }).receipt, null);
});

test('a held receipt stays on screen and clear of the rest of the HUD', () => {
  const receipt = { count: 3, ms: 0 };
  const stage1 = { ...play, boss: { name: 'Mr Vellum', hp: 5, maxHp: 12 }, receipt, now: 1000 };
  const stage2 = { ...stage1, carried: ['notice', 'redTape'], hand: 0 };
  for (const state of [stage1, stage2]) {
    const boxes = hudBoxes(hudLayout(state));
    assert.ok(boxes.every(inScreen));
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) assert.ok(!overlaps(boxes[i], boxes[j]));
  }
});

test('the receipt draws RCPT in ink and the count in red over paper', () => {
  const colours = new Set();
  drawHud((x, y, w, h, c) => colours.add(c), hudLayout({ ...play, receipt: { count: 4, ms: 0 }, now: 1000 }));
  for (const c of ['paper', 'carbon', 'receiptInk', 'receiptRed']) assert.ok(colours.has(HUD_COLOURS[c]), c);
});

test('the boss is an overdue account whose bar darkens at half health', () => {
  const boss = (hp) => hudLayout({ ...play, boss: { name: 'Vellum', hp, maxHp: 12 } }).boss;
  assert.equal(boss(12).name.text, 'OVERDUE: VELLUM');
  assert.equal(bossColour(12, 12), HUD_COLOURS.boss);
  assert.equal(bossColour(7, 12), HUD_COLOURS.boss);
  assert.equal(bossColour(6, 12), HUD_COLOURS.bossLate);
  assert.equal(bossColour(0, 12), HUD_COLOURS.bossLate);
  assert.equal(bossColour(5, 11), HUD_COLOURS.bossLate);
  assert.equal(bossColour(6, 11), HUD_COLOURS.boss);
  const sum = (c) => channels(c).reduce((a, b) => a + b, 0);
  assert.ok(sum(HUD_COLOURS.bossLate) < sum(HUD_COLOURS.boss), 'the second colour is darker');
  assert.equal(boss(7).bar.colour, HUD_COLOURS.boss);
  assert.equal(boss(6).bar.colour, HUD_COLOURS.bossLate);
  const drawn = (hp) => {
    const out = new Set();
    drawHud((x, y, w, h, c) => out.add(c), hudLayout({ ...play, boss: { name: 'Vellum', hp, maxHp: 12 } }), { health: 0, meter: 0 });
    return out;
  };
  assert.ok(drawn(9).has(HUD_COLOURS.boss) && !drawn(9).has(HUD_COLOURS.bossLate));
  assert.ok(drawn(4).has(HUD_COLOURS.bossLate) && !drawn(4).has(HUD_COLOURS.boss));
});

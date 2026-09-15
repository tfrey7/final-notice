import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESTAMP_MS, STAMP_FRAMES, attachment, closePause, holdings, onAttachments, openPause, stampPose, stepPause } from '../src/snes/pause.mjs';

const pad = (...buttons) => ({ pressed: new Set(buttons), held: new Set(buttons) });
const open = (carried = ['notice', 'redTape'], hand = 0) => openPause(0, null, { rows: holdings({ lives: 3, meter: 2 }), carried, hand });

test('holdings are ledger rows of name and quantity', () => {
  assert.deepEqual(holdings({ lives: 3, meter: 2 }), [['CASE FILES', 3], ['NOTICE STAMPS', 2]]);
});

test('the cursor walks the item rows down to the attachments row and stops at both ends', () => {
  let menu = open();
  menu = stepPause(menu, pad('up')).menu;
  assert.equal(menu.cursor, 0);
  for (let i = 0; i < 5; i++) menu = stepPause(menu, pad('down')).menu;
  assert.equal(menu.cursor, 2);
  assert.ok(onAttachments(menu));
});

test('left or right swaps the held attachment only on the attachments row', () => {
  let menu = open();
  assert.equal(stepPause(menu, pad('right')).menu.hand, 0);
  menu = stepPause(stepPause(menu, pad('down')).menu, pad('down')).menu;
  const swapped = stepPause(menu, pad('right'));
  assert.equal(swapped.action, 'swap');
  assert.equal(swapped.menu.hand, 1);
  assert.equal(stepPause(swapped.menu, pad('left')).menu.hand, 0);
});

test('with one attachment there is nothing to swap to', () => {
  let menu = open(['notice', null]);
  menu = { ...menu, cursor: menu.rows.length };
  const r = stepPause(menu, pad('left'));
  assert.equal(r.menu.hand, 0);
  assert.notEqual(r.action, 'swap');
});

test('a form showing combo routes has no attachments row to walk to or swap on', () => {
  let menu = openPause(0, null, { rows: holdings({ lives: 3, meter: 2 }), carried: ['notice', 'redTape'], routes: [] });
  for (let i = 0; i < 5; i++) menu = stepPause(menu, pad('down')).menu;
  assert.equal(menu.cursor, 1);
  assert.ok(!onAttachments(menu));
  assert.notEqual(stepPause(menu, pad('right')).action, 'swap');
});

test('Start resumes and B files it away', () => {
  assert.equal(stepPause(open(), pad('start')).action, 'resume');
  assert.equal(stepPause(open(), pad('b')).action, 'close');
});

test('the stamp lands once, in four frames, with one thud', () => {
  let menu = open();
  const actions = [];
  for (let i = 0; i < 10; i++) {
    const r = stepPause(menu, pad());
    menu = r.menu;
    actions.push(r.action);
  }
  assert.deepEqual(actions.filter(Boolean), ['thud']);
  assert.equal(actions.indexOf('thud'), STAMP_FRAMES - 1);
  assert.ok(stampPose(menu.stampT).landed);
  assert.ok(!stampPose(0).landed && stampPose(0).drop > 0);
});

test('reopening within three seconds of closing skips the stamp; later it lands again', () => {
  const first = closePause(open(), 10_000);
  const soon = openPause(10_000 + RESTAMP_MS - 1, first, { rows: [] });
  assert.equal(soon.stampT, STAMP_FRAMES);
  assert.equal(stepPause(soon, pad()).action, null);
  assert.equal(openPause(10_000 + RESTAMP_MS, first, { rows: [] }).stampT, 0);
});

test('every enchantment has a name and a one-line effect that fits the form', () => {
  for (const key of ['notice', 'carbonCopy', 'redTape', 'margin']) {
    const a = attachment(key);
    assert.ok(a.name && a.effect.length <= 22, key);
  }
  assert.equal(attachment(null), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTRACT_AFTER, ATTRACT_LENGTH, blinkOn, selectStep, skyline, titleStep } from '../src/scenes/menu.mjs';
import { createPad, updatePad } from '../src/input.mjs';
import { AUDITORS, next, jumpTo } from '../src/flow.mjs';
import { SELECT } from '../src/story/script.mjs';
import { missingGlyphs } from '../src/text/font.mjs';

const press = (...buttons) => updatePad(createPad(), buttons, 0);
const idle = press();

test('PUSH START blinks on then off', () => {
  assert.equal(blinkOn(0), true);
  assert.equal(blinkOn(40), false);
  assert.equal(blinkOn(48), true);
});

test('Start on the title starts, other buttons only reset the idle clock', () => {
  assert.equal(titleStep({ idle: 50, demo: false }, press('start')).event, 'start');
  assert.deepEqual(titleStep({ idle: 50, demo: false }, press('a')), { idle: 0, demo: false, event: null });
});

test('20 idle seconds show the attract note, which ends on any button or by itself', () => {
  let t = { idle: 0, demo: false };
  for (let i = 0; i < ATTRACT_AFTER - 1; i++) t = titleStep(t, idle);
  assert.equal(t.demo, false);
  t = titleStep(t, idle);
  assert.deepEqual(t, { idle: 0, demo: true, event: 'attract' });
  assert.equal(titleStep(t, press('start')).event, 'back');
  for (let i = 0; i < ATTRACT_LENGTH; i++) t = titleStep(t, idle);
  assert.equal(t.demo, false);
});

test('select moves the cursor without wrapping and confirms on A', () => {
  assert.deepEqual(selectStep(0, press('right')), { choice: 1, moved: true, confirm: false });
  assert.deepEqual(selectStep(1, press('right')), { choice: 1, moved: false, confirm: false });
  assert.deepEqual(selectStep(1, press('left')), { choice: 0, moved: true, confirm: false });
  assert.equal(selectStep(0, press('a')).confirm, true);
});

test('the chosen auditor carries into the game', () => {
  const after = next(jumpTo('select'), { type: 'start', auditor: AUDITORS[selectStep(0, press('right')).choice] });
  assert.equal(after.screen, 'scene1');
  assert.equal(after.auditor, 'mercer');
});

test('every select name and line is in the font, and the skyline spans the screen', () => {
  for (const a of AUDITORS) assert.deepEqual(missingGlyphs(SELECT[a].name + SELECT[a].line), []);
  const towers = skyline(1989, 256);
  assert.deepEqual(towers, skyline(1989, 256));
  const last = towers.at(-1);
  assert.ok(towers[0].x === 0 && last.x + last.w >= 256);
});

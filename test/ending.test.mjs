import test from 'node:test';
import assert from 'node:assert/strict';
import { CREDITS, SYSTEM } from '../src/story/script.mjs';
import { CREDITS_AT, END_HOLD, STAMP_AT, creditsEnd, endingAt, endingStep } from '../src/story/ending.mjs';
import { BOSS_HP, FOE_HP, cheapen } from '../src/fast.mjs';
import { CONTINUES, gameOverChoices, jumpTo, next } from '../src/flow.mjs';
import { missingGlyphs } from '../src/text/font.mjs';

const pad = (...buttons) => ({ pressed: new Set(buttons) });

test('the ending stamps the file, rolls the credits, then holds THE END', () => {
  assert.deepEqual([endingAt(0).phase, endingAt(0).stamped], ['stamp', false]);
  assert.equal(endingAt(STAMP_AT).stamped, true);
  const rolling = [endingAt(CREDITS_AT).rollY, endingAt(CREDITS_AT + 100).rollY];
  assert.equal(endingAt(CREDITS_AT).phase, 'credits');
  assert.ok(rolling[1] < rolling[0]);
  assert.equal(endingAt(creditsEnd()).phase, 'end');
});

test('Start skips to THE END, and THE END goes back to the title on Start or after its hold', () => {
  assert.deepEqual(endingStep(10, pad('start')), { frame: creditsEnd(), event: null });
  assert.equal(endingStep(10, pad('a')).frame, 11);
  assert.equal(endingStep(creditsEnd(), pad('start')).event, 'title');
  assert.equal(endingStep(creditsEnd(), pad()).event, null);
  assert.equal(endingStep(creditsEnd() + END_HOLD, pad()).event, 'title');
  assert.equal(next(jumpTo('ending'), { type: 'start' }).screen, 'title');
});

test('game over offers CONTINUE only while continues remain', () => {
  const over = next(jumpTo('stage2'), { type: 'gameOver' });
  assert.deepEqual(gameOverChoices(over), ['continue', 'end']);
  assert.equal(over.continues, CONTINUES);
  assert.deepEqual(gameOverChoices({ ...over, continues: 0 }), ['end']);
});

test('?fast caps foes and bosses but never the auditor', () => {
  const [player, foe, boss, low] = cheapen([
    { team: 'player', hp: 8 }, { hp: 6, maxHp: 6 }, { boss: true, hp: 16, maxHp: 16 }, { hp: 0 },
  ]);
  assert.equal(player.hp, 8);
  assert.deepEqual([foe.hp, foe.maxHp], [FOE_HP, FOE_HP]);
  assert.deepEqual([boss.hp, boss.maxHp], [BOSS_HP, BOSS_HP]);
  assert.equal(low.hp, 0);
  assert.doesNotThrow(() => cheapen([null, undefined]));
});

test('every ending and game over word has a glyph', () => {
  for (const text of [...CREDITS, ...Object.values(SYSTEM), 'LEDGER - ACCOUNT ZERO', 'CONTINUES 3', '▶']) {
    assert.deepEqual(missingGlyphs(text), [], text);
  }
});

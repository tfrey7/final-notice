import test from 'node:test';
import assert from 'node:assert/strict';
import { GLYPHS, CELL, BOX_COLS, BOX_ROWS, measure, wrap, missingGlyphs } from '../src/text/font.mjs';
import { SCENES, SCENE_ORDER, AUDITORS, REMARKS, PROMPTS, SELECT, SYSTEM, CREDITS, lineFor, beatsFor } from '../src/story/script.mjs';

test('every glyph is an 8x8 grid of # and .', () => {
  const need = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?\'"-:;/() ♥▶▼';
  assert.deepEqual(missingGlyphs(need), []);
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    assert.equal(rows.length, CELL, ch);
    for (const row of rows) assert.match(row, /^[#.]{8}$/, ch);
    assert.equal(rows.every((row) => row[7] === '.'), true, `${ch} keeps column 7 as the gap`);
  }
});

test('measure is fixed width', () => {
  assert.equal(measure('GAME OVER'), 72);
});

test('wrap breaks on words into pages of 3 lines of 28', () => {
  assert.deepEqual(wrap('Your inspection is suspended. Surrender the original documents.'), [
    ['Your inspection is', 'suspended. Surrender the', 'original documents.'],
  ]);
  assert.deepEqual(wrap('a b c d', 1, 3), [['a', 'b', 'c'], ['d']]);
  assert.deepEqual(wrap('abcdefgh', 3, 3), [['abc', 'def', 'gh']]);
});

test('every beat has a line for both auditors, and each fits one 28x3 box', () => {
  for (const name of SCENE_ORDER) {
    for (const beat of SCENES[name].beats) {
      for (const auditor of AUDITORS) {
        const line = lineFor(beat, auditor);
        assert.ok(line, `${name} ${beat.picture} has no ${auditor} line`);
        assert.deepEqual(missingGlyphs(line), [], line);
        const pages = wrap(line);
        assert.equal(pages.length, 1, `${line} needs ${pages.length} pages`);
        for (const page of pages) {
          assert.ok(page.length <= BOX_ROWS);
          for (const row of page) assert.ok(row.length <= BOX_COLS, row);
        }
      }
    }
  }
});

test('only the chosen auditor speaks in a scene', () => {
  for (const name of SCENE_ORDER) {
    assert.ok(!beatsFor(name, 'ward').some((b) => b.speaker === 'MERCER'));
    assert.ok(!beatsFor(name, 'mercer').some((b) => b.speaker === 'WARD'));
  }
});

test('remarks, prompts, select lines and end text all fit and draw', () => {
  const short = [...PROMPTS, ...Object.values(SYSTEM), ...CREDITS];
  for (const text of short) {
    assert.deepEqual(missingGlyphs(text), [], text);
    assert.ok(text.length <= BOX_COLS, text);
  }
  for (const remark of Object.values(REMARKS)) {
    for (const auditor of AUDITORS) {
      assert.deepEqual(missingGlyphs(remark[auditor]), []);
      assert.equal(wrap(remark[auditor]).flat().length <= 2, true, remark[auditor]);
    }
  }
  for (const auditor of AUDITORS) {
    assert.ok(SELECT[auditor].name.length <= 14);
    assert.ok(wrap(SELECT[auditor].line, 14).flat().length <= 3, SELECT[auditor].line);
  }
});

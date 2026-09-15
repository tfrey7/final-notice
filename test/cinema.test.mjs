import test from 'node:test';
import assert from 'node:assert/strict';
import { BOX_COLS, BOX_ROWS } from '../src/text/font.mjs';
import { SCENE_IDS, FRAMES_PER_LETTER, cinemaPages, letters, startPlayer, tick, press, visibleLines, fadeIndex, fadeSteps } from '../src/story/cinema.mjs';

test('every scene page fits the box and has a backdrop', () => {
  for (const id of Object.values(SCENE_IDS)) {
    for (const who of ['ward', 'mercer']) {
      for (const page of cinemaPages(id, who)) {
        assert.ok(page.lines.length >= 1 && page.lines.length <= BOX_ROWS);
        for (const line of page.lines) assert.ok(line.length <= BOX_COLS, line);
        assert.ok(page.backdrop);
      }
    }
  }
});

test('only the chosen auditor speaks', () => {
  const mercer = cinemaPages('assignment', 'mercer');
  assert.deepEqual(mercer[1].lines, ['Forty-seven?']);
  assert.equal(mercer[1].portrait, 'mercer');
  assert.ok(!mercer.some((p) => p.speaker === 'ward'));
  assert.ok(!cinemaPages('documents', 'ward').some((p) => p.speaker === 'mercer'));
});

test('scene 2 sounds the alarm at "This one."', () => {
  const alarm = cinemaPages('incident', 'ward').filter((p) => p.sound === 'alarm');
  assert.deepEqual(alarm.map((p) => p.lines), [['This one.']]);
});

test('text types a letter at a time, A finishes the page then turns it', () => {
  let p = startPlayer('assignment', 'ward');
  for (let i = 0; i < FRAMES_PER_LETTER * 3; i++) p = tick(p).player;
  assert.equal(p.typed, 3);
  assert.deepEqual(visibleLines(p.pages[0], 3), ['The', '', ''].slice(0, p.pages[0].lines.length));
  p = press(p, 'a');
  assert.equal(p.typed, letters(p.pages[0]));
  p = press(p, 'b');
  assert.equal(p.page, 1);
  assert.equal(p.typed, 0);
});

test('Start skips, and A past the last page ends the scene', () => {
  assert.equal(press(startPlayer('incident', 'ward'), 'start').done, true);
  let p = startPlayer('documents', 'mercer');
  for (let i = 0; i < 40 && !p.done; i++) p = press(p, 'a');
  assert.equal(p.done, true);
});

test('palette fade steps down to black and back', () => {
  assert.equal(fadeIndex(0x30, 1), 0x20);
  assert.equal(fadeIndex(0x30, 3), 0x00);
  assert.equal(fadeIndex(0x30, 4), 0x0f);
  assert.equal(fadeIndex(0x2d, 1), 0x0f);
  assert.deepEqual(fadeSteps(null, 1), [[1, 3], [1, 2], [1, 1], [1, 0]]);
  assert.equal(fadeSteps(0, 1).length, 8);
});

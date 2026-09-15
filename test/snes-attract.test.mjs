import test from 'node:test';
import assert from 'node:assert/strict';
import {
  END_AT, FPS, LINES, PUNCH_FROM, PUNCH_TO, SHOTS, SHOT_AT, SHOT_H, SHOT_W, SUB, TITLE_FROM, TITLE_SONG_AT,
  attractAt, attractCues, attractStep, cameraPixel, lineFrame, shotAt, subtitleAt,
} from '../src/snes/attract.mjs';
import { measure } from '../src/snes/text.mjs';
import { INTRO_FRAMES } from '../src/snes/lights.mjs';
import { ZOOM_FRAMES } from '../src/snes/scenes/front.mjs';

const pad = (...buttons) => ({ pressed: new Set(buttons) });

test('the intro is the script: eight shots in 75 seconds', () => {
  assert.equal(SHOTS.length, 8);
  assert.equal(END_AT, 75 * FPS);
  assert.equal(shotAt(0), 1);
  assert.equal(shotAt(SHOT_AT[3]), 4);
  assert.equal(shotAt(END_AT - 1), 8);
});

test('any button skips to the title from any frame; otherwise it runs to the hand-off', () => {
  for (const f of [0, 300, SHOT_AT[5], END_AT - 2]) {
    for (const b of ['start', 'a', 'b', 'left']) assert.equal(attractStep(f, pad(b)).event, 'skip');
  }
  assert.deepEqual(attractStep(10, pad()), { frame: 11, event: null });
  assert.equal(attractStep(END_AT - 1, pad()).event, 'end');
});

test('every line starts once, inside its own shot, and ends before the shot does', () => {
  const heard = [];
  for (let f = 0; f < END_AT; f++) heard.push(...attractCues(f).filter((c) => c.startsWith('line:')));
  assert.deepEqual(heard, LINES.map((l) => `line:${l.clip}`));
  for (const line of LINES) {
    assert.equal(shotAt(lineFrame(line)), line.shot, line.clip);
    assert.ok(line.at + line.s <= SHOTS[line.shot - 1].s, `${line.clip} runs past its shot`);
  }
  for (const [a, b] of LINES.slice(1).map((l, i) => [LINES[i], l]).filter(([a, b]) => a.shot === b.shot)) {
    assert.ok(a.at + a.s < b.at, `${a.clip} talks over ${b.clip}`);
  }
});

test('a change of place mosaics through the cut; a cut inside a conversation is hard', () => {
  for (let i = 1; i < SHOTS.length; i++) {
    const peak = Math.max(attractAt(SHOT_AT[i] - 1).mosaic, attractAt(SHOT_AT[i]).mosaic);
    if (SHOTS[i].mosaic) assert.equal(peak, 16, `shot ${i + 1}`);
    else assert.equal(peak, 1, `shot ${i + 1}`);
  }
  assert.equal(attractAt(SHOT_AT[3] + 40).mosaic, 1);
});

test('it fades up from black and down to black at the hand-off', () => {
  assert.equal(attractAt(0).level, 0);
  assert.equal(attractAt(40).level, 15);
  assert.equal(attractAt(END_AT - 40).level, 15);
  assert.equal(attractAt(END_AT - 1).level, 0);
});

test('the title melody starts under the tower so the logo press lands on its downbeat', () => {
  assert.equal(TITLE_FROM, INTRO_FRAMES - ZOOM_FRAMES - 40);
  assert.equal(END_AT - TITLE_SONG_AT, TITLE_FROM);
  assert.equal(shotAt(TITLE_SONG_AT), 8);
  assert.deepEqual(attractCues(TITLE_SONG_AT), ['title']);
  assert.deepEqual(attractCues(0), ['music']);
});

test('the punch clock hits on the beat through shot 6 only', () => {
  const punches = [];
  for (let f = 0; f < END_AT; f++) if (attractCues(f).includes('punch')) punches.push(f);
  assert.ok(punches.length >= 10);
  assert.ok(punches.every((f) => shotAt(f) === 6 && f >= PUNCH_FROM && f < PUNCH_TO));
});

test('every spoken line is subtitled while it sounds, under the picture, and nothing else is', () => {
  for (const line of LINES) {
    const from = lineFrame(line);
    for (let f = from; f < from + Math.round(line.s * FPS); f += 7) {
      const sub = subtitleAt(f);
      assert.equal(sub?.who, line.who, `${line.clip} at ${f}`);
      assert.ok(line.text.includes(sub.lines[0].split(' ')[0]));
    }
  }
  assert.equal(subtitleAt(0), null);
  assert.equal(subtitleAt(SHOT_AT[5] + 60), null);
  assert.equal(subtitleAt(END_AT - 1), null);
  assert.ok(SUB.y >= (224 - SHOT_H) / 2 + SHOT_H);
  assert.ok(SUB.y + SUB.rows * 12 <= 224);
});

test('a long subtitle pages through the whole line in two plain rows', () => {
  const line = LINES[0];
  const seen = new Set();
  for (let f = lineFrame(line); f < lineFrame(line) + Math.round(line.s * FPS); f++) {
    const { lines } = subtitleAt(f);
    assert.ok(lines.length <= SUB.rows);
    for (const l of lines) assert.ok(measure(l) <= SUB.w);
    seen.add(lines.join(' '));
  }
  assert.equal([...seen].join(' '), line.text);
});

test('the camera never reads outside the shot', () => {
  for (let f = 0; f < END_AT; f += 37) {
    const cam = attractAt(f);
    for (const [dx, dy] of [[0, 0], [SHOT_W - 1, 0], [0, SHOT_H - 1], [SHOT_W - 1, SHOT_H - 1]]) {
      const [sx, sy] = cameraPixel(cam, dx, dy);
      assert.ok(sx >= 0 && sx < SHOT_W && sy >= 0 && sy < SHOT_H);
    }
  }
  assert.deepEqual(cameraPixel({ zoom: 1, x: 0, y: 0 }, 10, 20), [10, 20]);
});

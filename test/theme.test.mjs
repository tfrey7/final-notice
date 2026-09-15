import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_CHANNELS as CHANNELS, VRC6_CHANNELS, FRAME_HZ, noteToMidi } from '../src/audio/apu.mjs';
import { compileSong, parseRows } from '../src/audio/player.mjs';
import title, { MELODY, CHORDS, KEY, WAVE_CHORDS, VOICINGS } from '../src/audio/songs/title.mjs';
import scene from '../src/audio/songs/scene.mjs';
import titleV1 from '../src/audio/songs/title-v1.mjs';
import sceneV1 from '../src/audio/songs/scene-v1.mjs';

const inKey = new Set(KEY.map((n) => noteToMidi(`${n}4`) % 12));
const seconds = (song) => (song.length * song.tempo) / FRAME_HZ;

for (const [name, def] of [['title', title], ['scene', scene], ['title-v1', titleV1], ['scene-v1', sceneV1]]) {
  test(`${name}: every channel is whole 8-row bars and ends with the others`, () => {
    const song = compileSong(def);
    assert.equal(song.length % 8, 0);
    for (const ch of CHANNELS) {
      if (!def[ch]) continue;
      const bars = def[ch].rows.split('|').map((b) => b.trim().split(/\s+/).length);
      assert.ok(bars.every((n) => n === 8), `${ch} bar sizes ${bars}`);
      assert.equal(bars.length * 8, song.length, ch);
    }
  });

  test(`${name}: every pitched note and every chord tone is in F major`, () => {
    const song = compileSong(def);
    for (const ch of ['pulse1', 'pulse2', 'triangle', ...VRC6_CHANNELS]) {
      for (const note of song.channels[ch]) {
        if (!note) continue;
        const shifts = new Set(def.instruments[note.inst].pitch ?? [0]);
        for (const s of shifts) {
          if (!Number.isInteger(s)) continue;
          assert.ok(inKey.has((note.pitch + s) % 12), `${ch} row ${note.start} +${s}`);
        }
      }
    }
  });

  test(`${name}: loops and runs 40-60 s`, () => {
    const song = compileSong(def);
    assert.equal(song.loop, 0);
    const s = seconds(song);
    assert.ok(s >= 40 && s <= 60, `${s} s`);
  });
}

test('the theme is 24 bars with a chord for each', () => {
  assert.equal(MELODY.length, 24);
  assert.equal(CHORDS.length, 24);
});

test('the corporate wave harmony lands on each bar\'s root, with ii-V approaches and colour tones', () => {
  assert.equal(WAVE_CHORDS.length, 24);
  const lastRoot = (bar) => /^[A-G]b?/.exec(bar.split(' ').at(-1))[0];
  WAVE_CHORDS.forEach((bar, i) => assert.equal(lastRoot(bar), lastRoot(CHORDS[i]).replace('m', ''), `bar ${i + 1}`));
  for (const v of VOICINGS.flat()) assert.ok(v.third >= 55 && v.seventh <= 75, v.symbol);
});

test('title has all seven channels; scene is thinner, slower and plays the same melody', () => {
  const t = compileSong(title);
  for (const ch of CHANNELS) assert.ok(t.channels[ch].some(Boolean), ch);
  assert.ok(scene.tempo > title.tempo);
  assert.equal(scene.noise, undefined);
  assert.equal(scene.instruments[scene.pulse1.inst].duty, 0);
  const pitches = (text) => parseRows('pulse1', text, 'x').filter((n, i, a) => n && a.indexOf(n) === i).map((n) => n.pitch);
  assert.deepEqual(pitches(scene.pulse1.rows), pitches(MELODY.slice(0, 16).join(' ')));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS, FRAME_HZ, noteToMidi } from '../src/audio/apu.mjs';
import { compileSong, parseRows } from '../src/audio/player.mjs';
import { KEY } from '../src/audio/songs/title.mjs';
import boss from '../src/audio/songs/boss-v1.mjs';
import ending from '../src/audio/songs/ending-v1.mjs';

const inKey = new Set(KEY.map((n) => noteToMidi(`${n}4`) % 12));
const seconds = (song, from = 0) => ((song.length - from) * song.tempo) / FRAME_HZ;

for (const [name, def] of [['boss (v1)', boss], ['ending (v1)', ending]]) {
  test(`${name}: every channel's rows add up to whole bars and all channels end together`, () => {
    const song = compileSong(def);
    for (const ch of CHANNELS) {
      assert.ok(def[ch], `${name} plays ${ch}`);
      const bars = def[ch].rows.split('|').map((b) => b.trim().split(/\s+/).length);
      assert.ok(bars.every((n) => n === 8), `${ch} bar sizes ${bars}`);
      assert.equal(bars.length * 8, song.length, ch);
    }
  });

  test(`${name}: every pitched note is in F major`, () => {
    const song = compileSong(def);
    for (const ch of ['pulse1', 'pulse2', 'triangle']) {
      for (const note of song.channels[ch]) {
        if (!note) continue;
        const shift = def.instruments[note.inst].pitch;
        if (shift && shift.some((s) => s >= 3)) continue;
        assert.ok(inKey.has(note.pitch % 12), `${ch} row ${note.start}`);
      }
    }
  });
}

const pitches = (text) =>
  parseRows('pulse1', text, 'x').filter((n, i, a) => n && a.indexOf(n) === i).map((n) => n.pitch);
const hook = pitches('C5 F5 A5 G5 F5 E5 C5');

test('boss (v1) loops a 30-45 s ostinato built from the hook', () => {
  const song = compileSong(boss);
  assert.ok(song.loop > 0 && song.loop % 8 === 0);
  const s = seconds(song, song.loop);
  assert.ok(s >= 30 && s <= 45, `${s} s`);
  const cell = pitches(boss.pulse2.rows.split('|')[0]).slice(0, 7);
  assert.deepEqual(cell.map((p) => p - cell[0]), hook.map((p) => p - hook[0]));
});

test('ending (v1) plays the melody once, about 60 s, and stops unresolved', () => {
  const song = compileSong(ending);
  assert.equal(song.loop, null);
  const s = seconds(song);
  assert.ok(s >= 55 && s <= 65, `${s} s`);
  assert.deepEqual(pitches(ending.pulse1.rows).slice(0, 7), hook);
  const last = song.channels.pulse1.filter(Boolean).at(-1);
  assert.notEqual(last.pitch % 12, noteToMidi('F4') % 12, 'the last melody note is not the tonic');
  const bass = song.channels.triangle.filter(Boolean).at(-1);
  assert.notEqual(bass.pitch % 12, noteToMidi('F4') % 12, 'the last bass note is not the tonic');
});

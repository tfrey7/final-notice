import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS, FRAME_HZ, noteToMidi } from '../src/audio/apu.mjs';
import { compileSong, parseRows } from '../src/audio/player.mjs';
import { MELODY, KEY } from '../src/audio/songs/title.mjs';
import title from '../src/audio/songs/title-v2.mjs';
import stage2 from '../src/audio/songs/stage2-v1.mjs';

const inKey = new Set(KEY.map((n) => noteToMidi(`${n}4`) % 12));
const tokens = (text) => text.split(/\s+/).filter((t) => t && t !== '|');

test('stage2 (v1):every channel is whole 8-row bars and ends with the others', () => {
  const song = compileSong(stage2);
  assert.equal(song.length % 8, 0);
  for (const ch of CHANNELS) {
    assert.ok(stage2[ch], ch);
    const bars = stage2[ch].rows.split('|').map((b) => b.trim().split(/\s+/).length);
    assert.ok(bars.every((n) => n === 8), `${ch} bar sizes ${bars}`);
    assert.equal(bars.length * 8, song.length, ch);
  }
});

test('stage2 (v1):loops 60-90 s, faster than the title, and nothing holds across the loop point', () => {
  const song = compileSong(stage2);
  const seconds = ((song.length - song.loop) * song.tempo) / FRAME_HZ;
  const whole = (song.length * song.tempo) / FRAME_HZ;
  assert.ok(whole >= 60 && whole <= 90, `${whole} s`);
  assert.ok(seconds >= 40, `${seconds} s looped`);
  assert.ok(stage2.tempo < title.tempo);
  assert.equal(song.loop % 8, 0);
  for (const ch of CHANNELS) {
    const t = tokens(stage2[ch].rows);
    assert.notEqual(t[song.loop], '-', ch);
    assert.notEqual(t[0], '-', ch);
  }
});

test('stage2 (v1):the loop starts on the hook, and pulse 1 plays the theme', () => {
  const song = compileSong(stage2);
  const lead = tokens(stage2.pulse1.rows);
  assert.deepEqual(lead.slice(song.loop, song.loop + 16), tokens(`${MELODY[0]} ${MELODY[1]}`));
  const pitches = (text) => parseRows('pulse1', text, 'x').filter((n, i, a) => n && a.indexOf(n) === i).map((n) => n.pitch);
  assert.deepEqual(pitches(lead.slice(song.loop, song.loop + 24 * 8).join(' ')), pitches(MELODY.join(' ')));
});

test('stage2 (v1):pitched notes stay in F major, and pulse 2 has a detuned phrase', () => {
  const song = compileSong(stage2);
  let detuned = 0;
  for (const ch of ['pulse1', 'pulse2', 'triangle']) {
    for (const note of song.channels[ch]) {
      if (!note) continue;
      const shifts = stage2.instruments[note.inst].pitch ?? [0];
      if (ch === 'pulse2' && shifts.every((s) => !Number.isInteger(s) && s < 0)) detuned++;
      for (const s of new Set(shifts)) {
        if (!Number.isInteger(s)) continue;
        assert.ok(inKey.has((note.pitch + s) % 12), `${ch} row ${note.start} +${s}`);
      }
    }
  }
  assert.ok(detuned > 100, `${detuned} detuned rows`);
});

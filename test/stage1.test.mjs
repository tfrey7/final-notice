import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS, FRAME_HZ, noteToMidi } from '../src/audio/apu.mjs';
import { compileSong, parseRows } from '../src/audio/player.mjs';
import { MELODY, KEY } from '../src/audio/songs/title.mjs';
import stage1 from '../src/audio/songs/stage1-v1.mjs';

const BAR = 24;
const song = compileSong(stage1);
const inKey = new Set(KEY.map((n) => noteToMidi(`${n}4`) % 12));
const starts = (ch, pick = () => true) => song.channels[ch].filter((n, i) => n && n.start === i && pick(n));

test('stage1 (v1):every channel is whole 24-row bars and ends with the others', () => {
  assert.equal(BAR % 8, 0);
  for (const ch of CHANNELS) {
    const bars = stage1[ch].rows.split('|').map((b) => b.trim().split(/\s+/).length);
    assert.ok(bars.every((n) => n === BAR), `${ch} bar sizes ${bars}`);
    assert.equal(bars.length * BAR, song.length, ch);
  }
});

test('stage1 (v1):loops on a bar line, runs 60-90 s, and the looped part is at least 40 s', () => {
  assert.equal(song.loop % BAR, 0);
  assert.ok(song.loop > 0 && song.loop < song.length);
  const seconds = (rows) => (rows * song.tempo) / FRAME_HZ;
  assert.ok(seconds(song.length) >= 60 && seconds(song.length) <= 90, `${seconds(song.length)} s`);
  assert.ok(seconds(song.length - song.loop) >= 40);
});

test('stage1 (v1):every pitched note and chord tone is in F major', () => {
  for (const ch of ['pulse1', 'pulse2', 'triangle']) {
    for (const note of song.channels[ch]) {
      if (!note) continue;
      for (const s of new Set(stage1.instruments[note.inst].pitch ?? [0])) {
        if (!Number.isInteger(s)) continue;
        assert.ok(inKey.has((note.pitch + s) % 12), `${ch} row ${note.start} +${s}`);
      }
    }
  }
});

test('stage1 (v1):the hook opens the song and opens the loop, in swung eighths', () => {
  const pitches = (notes) => notes.filter((n, i, a) => n && a.indexOf(n) === i).map((n) => n.pitch);
  const hook = pitches(parseRows('pulse1', MELODY.slice(0, 2).join(' '), 'x'));
  assert.deepEqual(pitches(song.channels.pulse1.slice(0, 2 * BAR)), hook);
  assert.deepEqual(pitches(song.channels.pulse1.slice(song.loop, song.loop + 2 * BAR)), hook);
  // Bar 1 is C5 - F5 - A5 - G5 F5: G5 lands on beat 4 (row 18) and F5 on its swung off-beat (row 22).
  const bar1 = song.channels.pulse1.slice(0, BAR);
  assert.equal(bar1[18].pitch, noteToMidi('G5'));
  assert.equal(bar1[22].pitch, noteToMidi('F5'));
  assert.equal(bar1[22].start, 22);
});

test('stage1 (v1):busy bass, ninth-chord stabs, a soft echo, drums with room for punches', () => {
  const bars = song.length / BAR;
  assert.ok(starts('triangle').length / bars >= 8, 'at least eight bass notes a bar');
  const stabs = starts('pulse2', (n) => n.inst !== 'echo');
  assert.ok(stabs.length / bars <= 4, 'no more than four stabs a bar');
  for (const s of stabs) assert.equal(stage1.instruments[s.inst].env.at(-1), 0, s.inst);
  assert.ok(stabs.some((s) => stage1.instruments[s.inst].pitch.includes(14)), 'ninths');
  const echo = starts('pulse2', (n) => n.inst === 'echo');
  const lead = starts('pulse1');
  assert.ok(echo.length > 0);
  const leadAt = new Map(lead.map((n) => [n.start, n.pitch]));
  for (const e of echo) assert.equal(leadAt.get(e.start - 3), e.pitch, `echo row ${e.start}`);
  const openNoise = song.channels.noise.filter((n) => !n).length / song.length;
  assert.ok(openNoise >= 0.35, `noise open on ${openNoise}`);
});

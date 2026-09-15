import test from 'node:test';
import assert from 'node:assert/strict';
import title, { LEADS, BAR_ROWS } from '../src/snes/audio/songs/title.mjs';
import { FORM, LOOP_BAR } from '../src/audio/songs/title.mjs';
import { compileSong, renderSong, VOICE_NAMES, SAMPLES } from '../src/snes/audio/player.mjs';
import { sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import { noteToMidi } from '../src/audio/apu.mjs';

const song = compileSong(title);

test('the SNES title parses, fills all eight voices and every voice ends on a whole bar', () => {
  assert.equal(VOICE_NAMES.length, 8);
  for (const v of VOICE_NAMES) {
    const tokens = title[v].rows.split(/\s+/).filter((t) => t !== '|');
    assert.equal(tokens.length, FORM.length * BAR_ROWS, `${v} rows`);
    assert.ok(song.voices[VOICE_NAMES.indexOf(v)].some(Boolean), `${v} plays`);
  }
  assert.equal(song.loop, LOOP_BAR * BAR_ROWS);
});

test('the lead keeps the NES title melody note for note, the sax, strings and brass an octave down', () => {
  const shape = (rows) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? '♪' : t));
  const played = title.v1.rows.replaceAll(' | ', ' ');
  assert.deepEqual(shape(played), shape(LEADS.join(' ')));
  const heard = played.split(' ').filter((t) => /^[A-G]/.test(t));
  const written = LEADS.join(' ').split(' ').filter((t) => /^[A-G]/.test(t));
  heard.forEach((t, i) => {
    const drop = noteToMidi(written[i]) - noteToMidi(t.split(':')[0]);
    assert.ok(drop === 0 || drop === 12, `note ${i}: ${written[i]} played as ${t}`);
    if (/:brass/.test(t)) assert.ok(noteToMidi(t.split(':')[0]) <= noteToMidi('D5'), `brass at ${t}`);
  });
});

test('the samples it uses and its echo buffer fit the 64 KB of sound RAM', () => {
  const used = new Set(Object.values(title.instruments).map((i) => i.sample));
  const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + title.echo.edl * 2048;
  assert.ok(bytes <= 64 * 1024, `${bytes} bytes`);
});

test('the loop seam: the loop bar sounds the same on the second pass, with nothing clipped', () => {
  const rowSec = title.tempo / 60;
  const loopSec = song.loop * rowSec;
  const endSec = song.length * rowSec;
  const barSec = BAR_ROWS * rowSec;
  const { left, right } = renderSong(title, endSec + loopSec + barSec + 0.5);
  const measure = (from) => {
    let sum = 0;
    const a = Math.round(from * DSP_HZ);
    const b = Math.round((from + barSec) * DSP_HZ);
    for (let i = a; i < b; i++) sum += left[i] ** 2 + right[i] ** 2;
    return Math.sqrt(sum / (2 * (b - a)));
  };
  const first = measure(loopSec);
  const second = measure(endSec);
  assert.ok(first > 0.05, `loop bar rms ${first}`);
  assert.ok(Math.abs(first - second) / first < 0.1, `loop bar rms ${first} then ${second}`);
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  assert.ok(peak < 0.95, `peak ${peak}`);
});

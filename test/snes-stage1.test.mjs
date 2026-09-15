import test from 'node:test';
import assert from 'node:assert/strict';
import stage1, { LEADS, BAR_ROWS } from '../src/snes/audio/songs/stage1.mjs';
import { FORM, LOOP_BAR } from '../src/audio/songs/stage1.mjs';
import { compileSong, renderSong, VOICE_NAMES } from '../src/snes/audio/player.mjs';
import { SAMPLES, sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';

const song = compileSong(stage1);

test('the SNES stage 1 parses, fills all eight voices and every voice ends on a whole bar', () => {
  assert.equal(VOICE_NAMES.length, 8);
  for (const v of VOICE_NAMES) {
    const tokens = stage1[v].rows.split(/\s+/).filter((t) => t !== '|');
    assert.equal(tokens.length, FORM.length * BAR_ROWS, `${v} rows`);
    assert.ok(song.voices[VOICE_NAMES.indexOf(v)].some(Boolean), `${v} plays`);
  }
  assert.equal(song.loop, LOOP_BAR * BAR_ROWS);
});

test('the lead keeps the NES stage 1 melody note for note', () => {
  const pitches = (rows) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? t.split(':')[0] : t));
  assert.deepEqual(pitches(stage1.v1.rows.replaceAll(' | ', ' ')), pitches(LEADS.join(' ')));
});

test('voices 7 and 8, the ones effects steal, carry only hats and a harmony that rests most of the song', () => {
  const insts = (v) => new Set(song.voices[VOICE_NAMES.indexOf(v)].filter(Boolean).map((n) => n.inst));
  assert.deepEqual([...insts('v7')].sort(), ['chat', 'ohat']);
  assert.deepEqual([...insts('v8')], ['harm']);
  const bars = stage1.v8.rows.split(' | ');
  const silent = bars.filter((bar) => !/[A-G]/.test(bar)).length;
  assert.ok(silent / bars.length >= 0.6, `v8 silent in ${silent} of ${bars.length} bars`);
});

test('the samples it uses and its echo buffer fit the 64 KB of sound RAM', () => {
  const used = new Set(Object.values(stage1.instruments).map((i) => i.sample));
  const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + stage1.echo.edl * 2048;
  assert.ok(bytes <= 64 * 1024, `${bytes} bytes`);
});

test('the loop seam: the loop bar sounds the same on the second pass, with nothing clipped', () => {
  const rowSec = stage1.tempo / 60;
  const loopSec = song.loop * rowSec;
  const endSec = song.length * rowSec;
  const barSec = BAR_ROWS * rowSec;
  const { left, right } = renderSong(stage1, endSec + loopSec + barSec + 0.5);
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

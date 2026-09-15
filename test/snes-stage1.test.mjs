import test from 'node:test';
import assert from 'node:assert/strict';
import stage1, { BAR_ROWS, FORM, LOOP_BAR } from '../src/snes/audio/songs/stage1.mjs';
import { compileSong, renderSong, VOICE_NAMES, SAMPLES } from '../src/snes/audio/player.mjs';
import { sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';

const song = compileSong(stage1);
const rowSec = stage1.tempo / 60;

test('stage 1 is a full-length song: eight voices of whole bars, two to three minutes before it loops', () => {
  for (const v of VOICE_NAMES) {
    const tokens = stage1[v].rows.split(/\s+/).filter((t) => t !== '|');
    assert.equal(tokens.length, FORM.length * BAR_ROWS, `${v} rows`);
    assert.ok(song.voices[VOICE_NAMES.indexOf(v)].some(Boolean), `${v} plays`);
  }
  assert.equal(song.loop, LOOP_BAR * BAR_ROWS);
  const seconds = song.length * rowSec;
  assert.ok(seconds >= 120 && seconds <= 180, `${seconds} s`);
});

test('the lead is ornamented note by note and layers leave and return by section', () => {
  const marks = song.voices[0].filter((n, i, all) => n && all[i - 1] !== n);
  assert.ok(marks.some((n) => n.vibrato !== undefined) && marks.some((n) => n.glide !== undefined) && marks.some((n) => n.bend !== undefined));
  assert.ok(stage1.drops.length >= 12);
  assert.ok(new Set(stage1.drops.flatMap((d) => d.voices)).size >= 4);
});

test('the samples it uses and its echo buffer fit the 1 MB of sound RAM', () => {
  const used = new Set(Object.values(stage1.instruments).map((i) => i.sample));
  const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + song.echo.edl * 2048;
  assert.ok(bytes <= 1024 * 1024, `${bytes} bytes`);
});

test('the loop seam matches on the second pass and the mix keeps its headroom', () => {
  const loopSec = song.loop * rowSec;
  const endSec = song.length * rowSec;
  const barSec = BAR_ROWS * rowSec;
  const { left, right } = renderSong(stage1, endSec + barSec + 0.5);
  const measure = (from) => {
    let sum = 0;
    const a = Math.round(from * DSP_HZ);
    const b = Math.round((from + barSec) * DSP_HZ);
    for (let i = a; i < b; i++) sum += left[i] ** 2 + right[i] ** 2;
    return Math.sqrt(sum / (2 * (b - a)));
  };
  const first = measure(loopSec);
  const second = measure(endSec);
  assert.ok(first > 0.02, `loop bar rms ${first}`);
  assert.ok(Math.abs(first - second) / first < 0.15, `loop bar rms ${first} then ${second}`);
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  assert.ok(peak < 0.7, `peak ${peak}`);
});

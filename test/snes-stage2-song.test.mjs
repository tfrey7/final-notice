import test from 'node:test';
import assert from 'node:assert/strict';
import stage2, { BAR_ROWS, FORM, LOOP_BAR } from '../src/snes/audio/songs/stage2.mjs';
import { compileSong, renderSong, VOICE_NAMES, SAMPLES } from '../src/snes/audio/player.mjs';
import { PREFIX } from '../src/snes/audio/recorded.mjs';
import { sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';

const song = compileSong(stage2);
const rowSec = stage2.tempo / 60;

test('the SNES stage 2 parses, fills all eight voices on whole bars and runs two to three minutes', () => {
  assert.equal(VOICE_NAMES.length, 8);
  for (const v of VOICE_NAMES) {
    const tokens = stage2[v].rows.split(/\s+/).filter((t) => t !== '|');
    assert.equal(tokens.length, FORM.length * BAR_ROWS, `${v} rows`);
    assert.ok(song.voices[VOICE_NAMES.indexOf(v)].some(Boolean), `${v} plays`);
  }
  assert.equal(song.loop, LOOP_BAR * BAR_ROWS);
  const seconds = song.length * rowSec;
  assert.ok(seconds >= 120 && seconds <= 180, `${seconds} s`);
});

test('its form has an intro, A, B, a breakdown in a new key and a turnaround home to the loop', () => {
  const parts = [...new Set(FORM.map((b) => b.part))];
  assert.deepEqual(parts, ['intro', 'A', 'B', 'break', 'bridge', 'turn']);
  assert.equal(FORM[LOOP_BAR].part, 'A');
  assert.ok(FORM.some((b) => b.part === 'break' && b.shift !== 0));
  assert.equal(FORM.at(-1).part, 'turn');
  assert.equal(FORM.at(-1).shift, 0);
});

test('every instrument is a recorded sample, and they and the echo fit the 64 KB of sound RAM', () => {
  for (const [name, inst] of Object.entries(stage2.instruments)) assert.ok(inst.sample.startsWith(PREFIX), name);
  const used = new Set(Object.values(stage2.instruments).map((i) => i.sample));
  const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + stage2.echo.edl * 2048;
  assert.ok(bytes <= 64 * 1024, `${bytes} bytes`);
});

test('the loop seam: the loop bar sounds the same on the second pass, with nothing clipped', () => {
  const loopSec = song.loop * rowSec;
  const endSec = song.length * rowSec;
  const barSec = BAR_ROWS * rowSec;
  const { left, right } = renderSong(stage2, endSec + barSec + 0.5);
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
  assert.ok(Math.abs(first - second) / first < 0.15, `loop bar rms ${first} then ${second}`);
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  assert.ok(peak < 0.95, `peak ${peak}`);
});

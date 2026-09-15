import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import climb, { BAR_ROWS, FORM, LOOP_BAR } from '../src/snes/audio/songs/archive-climb.mjs';
import { compileSong, renderSong, SAMPLES, VOICE_NAMES } from '../src/snes/audio/player.mjs';
import { sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import { ARCHIVE_CLIMB_SONG } from '../src/snes/audio/cues.mjs';

test('the climb plays all eight voices on recorded samples within 1 MB', () => {
  const song = compileSong(climb);
  assert.equal(song.length, FORM.length * BAR_ROWS);
  for (const [i, v] of VOICE_NAMES.entries()) assert.ok(song.voices[i].some(Boolean), `${v} plays`);
  const used = new Set(Object.values(climb.instruments).map((i) => i.sample));
  for (const key of used) assert.match(key, /^rec-/);
  const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + song.echo.edl * 2048;
  assert.ok(bytes <= 1024 * 1024, `${bytes} bytes`);
});

test('the climb loops from the top of A after 40 to 90 s, rising a tone on its second A', () => {
  const song = compileSong(climb);
  assert.equal(song.loop, LOOP_BAR * BAR_ROWS);
  assert.equal(FORM[LOOP_BAR].part, 'A');
  const loop = ((song.length - song.loop) * climb.tempo) / 60;
  assert.ok(loop >= 40 && loop <= 90, `${loop} s`);
  assert.ok(FORM.some((b) => b.part === 'A' && b.shift > 0), 'a lifted A');
  assert.ok(existsSync(new URL(`../src/snes/audio/songs/${ARCHIVE_CLIMB_SONG}.mjs`, import.meta.url)));
});

test('the climb loop seam holds its level on the second pass, nothing clipped', () => {
  const song = compileSong(climb);
  const rowSec = climb.tempo / 60;
  const barSec = BAR_ROWS * rowSec;
  const endSec = song.length * rowSec;
  const out = renderSong(climb, endSec + barSec + 0.5);
  const rms = (from) => {
    let sum = 0;
    const a = Math.round(from * DSP_HZ);
    const n = Math.round(barSec * DSP_HZ);
    for (let i = a; i < a + n; i++) sum += out.left[i] ** 2 + out.right[i] ** 2;
    return Math.sqrt(sum / (2 * n));
  };
  const first = rms(song.loop * rowSec);
  const second = rms(endSec);
  assert.ok(first > 0.05, `loop bar rms ${first}`);
  assert.ok(Math.abs(first - second) / first < 0.1, `loop bar rms ${first} then ${second}`);
  const peak = out.left.reduce((p, _, i) => Math.max(p, Math.abs(out.left[i]), Math.abs(out.right[i])), 0);
  assert.ok(peak < 0.95, `peak ${peak}`);
});

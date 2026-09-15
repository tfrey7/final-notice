import test from 'node:test';
import assert from 'node:assert/strict';
import boss, { LEADS as BOSS_LEADS, BAR_ROWS } from '../src/snes/audio/songs/boss.mjs';
import scene, { MELODY_BARS, BARS as SCENE_BARS, BAR_ROWS as SCENE_ROWS } from '../src/snes/audio/songs/scene.mjs';
import ending, { LEADS as ENDING_LEADS, LAST, TAIL_BARS } from '../src/snes/audio/songs/ending.mjs';
import { FORM as BOSS_FORM, LOOP_BAR } from '../src/audio/songs/boss.mjs';
import { FORM as ENDING_FORM } from '../src/audio/songs/ending.mjs';
import { compileSong, renderSong, VOICE_NAMES, SAMPLES } from '../src/snes/audio/player.mjs';
import { sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';

const CUES = { boss: [boss, BOSS_FORM.length * BAR_ROWS], scene: [scene, SCENE_BARS * SCENE_ROWS], ending: [ending, (ENDING_FORM.length + TAIL_BARS) * BAR_ROWS] };
const pitches = (rows) => rows.split(/\s+/).filter((t) => t !== '|').map((t) => (/^[A-G]/.test(t) ? t.split(':')[0] : t));
const bars = (rows, size) => {
  const t = pitches(rows);
  return Array.from({ length: t.length / size }, (_, b) => t.slice(b * size, (b + 1) * size).join(' '));
};

for (const [name, [def, rows]] of Object.entries(CUES)) {
  test(`the SNES ${name} parses and plays on all eight voices, every one a whole song long`, () => {
    const song = compileSong(def);
    for (const [i, v] of VOICE_NAMES.entries()) {
      assert.equal(pitches(def[v].rows).length, rows, `${v} rows`);
      assert.ok(song.voices[i].some(Boolean), `${v} plays`);
    }
  });

  test(`the SNES ${name} uses only recorded samples, and they and its echo fit 64 KB`, () => {
    const used = new Set(Object.values(def.instruments).map((i) => i.sample));
    for (const key of used) assert.match(key, /^rec-/);
    const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + def.echo.edl * 2048;
    assert.ok(bytes <= 64 * 1024, `${bytes} bytes`);
  });
}

test('the boss lead keeps the NES boss melody note for note after the intro', () => {
  const got = bars(boss.v1.rows, BAR_ROWS).slice(4);
  assert.deepEqual(got, BOSS_LEADS.slice(4).map((b) => pitches(b).join(' ')));
  assert.equal(compileSong(boss).loop, LOOP_BAR * BAR_ROWS);
});

test('the scene melody is the theme\'s first sixteen bars', () => {
  assert.deepEqual(bars(scene.v1.rows, SCENE_ROWS), MELODY_BARS);
});

test('the ending keeps the NES melody until its last bar, which hangs unresolved into silence', () => {
  const got = bars(ending.v1.rows, BAR_ROWS);
  const nes = ENDING_FORM.map((b) => pitches(b.lead).join(' '));
  const shifted = ENDING_LEADS.map((b) => pitches(b).join(' '));
  assert.deepEqual(got.slice(0, LAST), shifted.slice(0, LAST));
  assert.notEqual(got[LAST], nes[LAST]);
  assert.doesNotMatch(got[LAST], /^E\d/, 'the last note is not the tonic');
  assert.equal(compileSong(ending).loop, null);
});

test('the ending echo still rings in the silent tail, and nothing clips', () => {
  const song = compileSong(ending);
  const rowSec = ending.tempo / 60;
  const tailStart = (song.length - TAIL_BARS * BAR_ROWS) * rowSec;
  const { left, right } = renderSong(ending, song.length * rowSec);
  const rms = (from, sec) => {
    let sum = 0;
    const a = Math.round(from * DSP_HZ);
    const b = Math.round((from + sec) * DSP_HZ);
    for (let i = a; i < b; i++) sum += left[i] ** 2 + right[i] ** 2;
    return Math.sqrt(sum / (2 * (b - a)));
  };
  assert.ok(rms(tailStart + 1, 1) > 0.01, `tail rms ${rms(tailStart + 1, 1)}`);
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  assert.ok(peak < 0.95, `peak ${peak}`);
});

test('the boss loop seam sounds the same on the second pass, with nothing clipped', () => {
  const song = compileSong(boss);
  const rowSec = boss.tempo / 60;
  const loopSec = song.loop * rowSec;
  const endSec = song.length * rowSec;
  const barSec = BAR_ROWS * rowSec;
  const { left, right } = renderSong(boss, endSec + barSec + 0.5);
  const measure = (from) => {
    let sum = 0;
    for (let i = Math.round(from * DSP_HZ); i < Math.round((from + barSec) * DSP_HZ); i++) sum += left[i] ** 2 + right[i] ** 2;
    return Math.sqrt(sum / (2 * Math.round(barSec * DSP_HZ)));
  };
  const first = measure(loopSec);
  const second = measure(endSec);
  assert.ok(first > 0.05, `loop bar rms ${first}`);
  assert.ok(Math.abs(first - second) / first < 0.1, `loop bar rms ${first} then ${second}`);
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  assert.ok(peak < 0.95, `peak ${peak}`);
});

test('the scene stays soft: a quiet cue under dialogue, nothing clipped', () => {
  const { left, right } = renderSong(scene, 20);
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  assert.ok(peak > 0.05 && peak < 0.95, `peak ${peak}`);
});

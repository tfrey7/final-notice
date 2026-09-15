import test from 'node:test';
import assert from 'node:assert/strict';
import boss, { BAR_ROWS, FORM as BOSS_FORM, LOOP_BAR as BOSS_LOOP } from '../src/snes/audio/songs/boss.mjs';
import scene, { FORM as SCENE_FORM, LOOP_BAR as SCENE_LOOP } from '../src/snes/audio/songs/scene.mjs';
import ending, { FORM as ENDING_FORM, LAST, TAIL_BARS } from '../src/snes/audio/songs/ending.mjs';
import { compileSong, renderSong, VOICE_NAMES, SAMPLES } from '../src/snes/audio/player.mjs';
import { sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';

const CUES = {
  boss: [boss, BOSS_FORM, BOSS_FORM.length],
  scene: [scene, SCENE_FORM, SCENE_FORM.length],
  ending: [ending, ENDING_FORM, ENDING_FORM.length + TAIL_BARS],
};
const pitches = (rows) => rows.split(/\s+/).filter((t) => t !== '|').map((t) => (/^[A-G]/.test(t) ? t.split(':')[0] : t));
const peakOf = ({ left, right }) => left.reduce((p, _, i) => Math.max(p, Math.abs(left[i]), Math.abs(right[i])), 0);

for (const [name, [def, form, barCount]] of Object.entries(CUES)) {
  test(`the SNES ${name} parses and plays on all eight voices, every one a whole song long`, () => {
    const song = compileSong(def);
    for (const [i, v] of VOICE_NAMES.entries()) {
      assert.equal(pitches(def[v].rows).length, barCount * BAR_ROWS, `${v} rows`);
      assert.ok(song.voices[i].some(Boolean), `${v} plays`);
    }
  });

  test(`the SNES ${name} uses only recorded samples, and they and its echo fit 1 MB`, () => {
    const used = new Set(Object.values(def.instruments).map((i) => i.sample));
    for (const key of used) assert.match(key, /^rec-/);
    const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + def.echo.edl * 2048;
    assert.ok(bytes <= 1024 * 1024, `${bytes} bytes`);
  });

  test(`the SNES ${name} is a whole song: two to three minutes, an intro, A, B and a key change`, () => {
    const loopBar = def.loop === null ? 0 : def.loop / BAR_ROWS;
    const seconds = ((form.length - loopBar) * BAR_ROWS * def.tempo) / 60;
    assert.ok(seconds >= 110 && seconds <= 190, `${seconds} s`);
    const parts = new Set(form.map((b) => b.part));
    for (const part of ['intro', 'A', 'B']) assert.ok(parts.has(part), part);
    assert.ok(form.some((b) => b.shift !== 0), 'a key change');
  });
}

test('the boss and scene loop to the top of their A section', () => {
  assert.equal(compileSong(boss).loop, BOSS_LOOP * BAR_ROWS);
  assert.equal(compileSong(scene).loop, SCENE_LOOP * BAR_ROWS);
  assert.equal(BOSS_FORM[BOSS_LOOP].part, 'A');
  assert.equal(SCENE_FORM[SCENE_LOOP].part, 'A');
});

test('the scene and ending are corporate wave: no plucked keys, bells or orchestra hits', () => {
  for (const def of [scene, ending]) {
    for (const inst of Object.values(def.instruments)) assert.doesNotMatch(inst.sample, /epiano|bell|orch/);
  }
});

test('the ending hangs unresolved on its last bar, then its echo rings in the silent tail', () => {
  const last = pitches(ending.v1.rows).slice(LAST * BAR_ROWS, (LAST + 1) * BAR_ROWS).filter((t) => /^[A-G]/.test(t));
  assert.ok(last.length && last.every((t) => !/^E\d/.test(t)), `last bar ${last}`);
  const song = compileSong(ending);
  assert.equal(song.loop, null);
  const rowSec = ending.tempo / 60;
  const tailStart = (song.length - TAIL_BARS * BAR_ROWS) * rowSec;
  const out = renderSong(ending, song.length * rowSec);
  const { left, right } = out;
  let sum = 0;
  const a = Math.round((tailStart + 0.1) * DSP_HZ);
  const n = Math.round(0.5 * DSP_HZ);
  for (let i = a; i < a + n; i++) sum += left[i] ** 2 + right[i] ** 2;
  assert.ok(Math.sqrt(sum / (2 * n)) > 0.01, `tail rms ${Math.sqrt(sum / (2 * n))}`);
  assert.ok(peakOf(out) < 0.95, `peak ${peakOf(out)}`);
});

test('the boss loop seam sounds the same on the second pass, with nothing clipped', () => {
  const song = compileSong(boss);
  const rowSec = boss.tempo / 60;
  const loopSec = song.loop * rowSec;
  const endSec = song.length * rowSec;
  const barSec = BAR_ROWS * rowSec;
  const out = renderSong(boss, endSec + barSec + 0.5);
  const measure = (from) => {
    let sum = 0;
    for (let i = Math.round(from * DSP_HZ); i < Math.round((from + barSec) * DSP_HZ); i++) sum += out.left[i] ** 2 + out.right[i] ** 2;
    return Math.sqrt(sum / (2 * Math.round(barSec * DSP_HZ)));
  };
  const first = measure(loopSec);
  const second = measure(endSec);
  assert.ok(first > 0.05, `loop bar rms ${first}`);
  assert.ok(Math.abs(first - second) / first < 0.1, `loop bar rms ${first} then ${second}`);
  assert.ok(peakOf(out) < 0.95, `peak ${peakOf(out)}`);
});

test('the scene stays soft under dialogue, nothing clipped', () => {
  const peak = peakOf(renderSong(scene, 40));
  assert.ok(peak > 0.05 && peak < 0.95, `peak ${peak}`);
});

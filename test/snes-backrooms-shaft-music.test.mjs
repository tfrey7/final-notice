import test from 'node:test';
import assert from 'node:assert/strict';
import backrooms, * as B from '../src/snes/audio/songs/backrooms.mjs';
import shaft, * as S from '../src/snes/audio/songs/shaft.mjs';
import { compileSong, renderSong, SAMPLES, VOICE_NAMES } from '../src/snes/audio/player.mjs';
import { sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import { SHAFT_SONG } from '../src/snes/audio/cues.mjs';
import { SONGS } from '../src/flow.mjs';

const SONG_SET = [['backrooms', backrooms, B], ['shaft', shaft, S]];

test('Stage 3 plays the Backrooms song and Stage 4 the shaft song', () => {
  assert.equal(SONGS.stage3, 'backrooms');
  assert.equal(SHAFT_SONG, 'shaft');
});

for (const [name, def, mod] of SONG_SET) {
  test(`${name} plays all eight voices on recorded samples within 64 KB, no brass`, () => {
    const song = compileSong(def);
    assert.equal(song.length, mod.FORM.length * mod.BAR_ROWS);
    for (const [i, v] of VOICE_NAMES.entries()) assert.ok(song.voices[i].some(Boolean), `${v} plays`);
    const used = new Set(Object.values(def.instruments).map((i) => i.sample));
    for (const key of used) assert.match(key, /^rec-/);
    assert.ok(!used.has('rec-brass'));
    const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + song.echo.edl * 2048;
    assert.ok(bytes <= 64 * 1024, `${bytes} bytes`);
  });

  test(`${name} loops from the top of A after 40 to 90 s, its seam level and nothing clipped`, () => {
    const song = compileSong(def);
    assert.equal(song.loop, mod.LOOP_BAR * mod.BAR_ROWS);
    assert.equal(mod.FORM[mod.LOOP_BAR].part, 'A');
    const rowSec = def.tempo / 60;
    const loop = (song.length - song.loop) * rowSec;
    assert.ok(loop >= 40 && loop <= 90, `${loop} s`);
    const barSec = mod.BAR_ROWS * rowSec;
    const endSec = song.length * rowSec;
    const out = renderSong(def, endSec + barSec + 0.5);
    const rms = (from) => {
      let sum = 0;
      const a = Math.round(from * DSP_HZ);
      const n = Math.round(barSec * DSP_HZ);
      for (let i = a; i < a + n; i++) sum += out.left[i] ** 2 + out.right[i] ** 2;
      return Math.sqrt(sum / (2 * n));
    };
    const first = rms(song.loop * rowSec);
    const second = rms(endSec);
    assert.ok(first > 0.03, `loop bar rms ${first}`);
    assert.ok(Math.abs(first - second) / first < 0.1, `loop bar rms ${first} then ${second}`);
    const peak = out.left.reduce((p, _, i) => Math.max(p, Math.abs(out.left[i]), Math.abs(out.right[i])), 0);
    assert.ok(peak < 0.95, `peak ${peak}`);
  });
}

test('the Backrooms phrase is seven bars and its figure comes back a semitone wrong', () => {
  assert.equal(B.FORM.filter((b) => b.part === 'A').length, 7);
  const a = B.FORM.filter((b) => b.part === 'A').map((b) => b.lead);
  const a2 = B.FORM.filter((b) => b.part === 'A2').map((b) => b.lead);
  assert.notDeepEqual(a, a2);
});

test('the shaft riff climbs a semitone each time round before B', () => {
  const heads = S.FORM.filter((b, i) => b.part === 'A' && b.bar === 0 && S.FORM.indexOf(S.FORM.find((x) => x.part === 'B')) > i);
  assert.deepEqual(heads.map((b) => b.shift), S.CLIMB);
});

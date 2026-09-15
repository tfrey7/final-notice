import test from 'node:test';
import assert from 'node:assert/strict';
import * as sketchA from '../src/snes/audio/songs/stage2-chase-a.mjs';
import * as sketchB from '../src/snes/audio/songs/stage2-chase-b.mjs';
import { compileSong, renderSong, VOICE_NAMES, SAMPLES } from '../src/snes/audio/player.mjs';
import { PREFIX } from '../src/snes/audio/recorded.mjs';
import { sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';

for (const [label, { default: def, BAR_ROWS, CHORDS }] of [['sketch A', sketchA], ['sketch B', sketchB]]) {
  const song = compileSong(def);
  const rowSec = def.tempo / 60;

  test(`stage 2 chase ${label} parses, fills all eight voices on whole bars and runs about 20 seconds`, () => {
    assert.equal(VOICE_NAMES.length, 8);
    for (const v of VOICE_NAMES) {
      const tokens = def[v].rows.split(/\s+/).filter((t) => t !== '|');
      assert.equal(tokens.length, CHORDS.length * BAR_ROWS, `${v} rows`);
      assert.ok(song.voices[VOICE_NAMES.indexOf(v)].some(Boolean), `${v} plays`);
    }
    const seconds = song.length * rowSec;
    assert.ok(seconds >= 19.5 && seconds <= 21, `${seconds} s`);
  });

  test(`stage 2 chase ${label} uses only recorded samples and fits the 64 KB of sound RAM`, () => {
    for (const [name, inst] of Object.entries(def.instruments)) assert.ok(inst.sample.startsWith(PREFIX), name);
    const used = new Set(Object.values(def.instruments).map((i) => i.sample));
    const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + def.echo.edl * 2048;
    assert.ok(bytes <= 64 * 1024, `${bytes} bytes`);
  });

  test(`stage 2 chase ${label} loops cleanly with nothing clipped`, () => {
    const loopSec = song.loop * rowSec;
    const endSec = song.length * rowSec;
    const barSec = BAR_ROWS * rowSec;
    const { left, right } = renderSong(def, endSec + barSec + 0.5);
    const rms = (from) => {
      let sum = 0;
      const a = Math.round(from * DSP_HZ);
      const b = Math.round((from + barSec) * DSP_HZ);
      for (let i = a; i < b; i++) sum += left[i] ** 2 + right[i] ** 2;
      return Math.sqrt(sum / (2 * (b - a)));
    };
    const first = rms(loopSec);
    const second = rms(endSec);
    assert.ok(first > 0.05, `loop bar rms ${first}`);
    assert.ok(Math.abs(first - second) / first < 0.15, `loop bar rms ${first} then ${second}`);
    let peak = 0;
    for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    assert.ok(peak < 0.95, `peak ${peak}`);
  });
}

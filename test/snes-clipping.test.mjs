// No song or effect may clip (item 2259): each renders a whole pass and back into its loop, and every
// sample stays under -1 dBFS with nothing hitting the DSP's 16-bit rails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { barkEffect, barkFrames, compileSong, createSequencer, SFX } from '../src/snes/audio/player.mjs';
import BARKS from '../src/snes/audio/barks-brr.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';

const CEILING = 10 ** (-1 / 20);
const STAGE_ECHO = { mvol: 100, evol: 30, efb: 40, edl: 4, fir: [12, 33, 43, 43, 19, -2, -13, -7] };
const dbfs = (x) => `${(20 * Math.log10(x)).toFixed(2)} dBFS`;

function measure(seq, seconds) {
  const n = Math.round(seconds * DSP_HZ);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  seq.render(left, right, n);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  return { peak, clips: seq.dsp.clips() };
}

const songsDir = new URL('../src/snes/audio/songs/', import.meta.url);
const songs = readdirSync(songsDir).filter((f) => f.endsWith('.mjs'));

for (const file of songs) {
  test(`${file.slice(0, -4)} never clips over a whole pass and into its loop`, async () => {
    const { default: def } = await import(new URL(file, songsDir));
    if (!def?.instruments) return;
    const song = compileSong(def);
    const seq = createSequencer();
    seq.play(song);
    const { peak, clips } = measure(seq, (song.length * song.tempo) / 60 + 4);
    assert.equal(clips, 0, `${clips} samples hit the rails`);
    assert.ok(peak < CEILING, `peak ${dbfs(peak)}`);
  });
}

test('no sound effect or partner line clips through the stage echo', () => {
  const sounds = [
    ...Object.entries(SFX).map(([name, def]) => [name, def, 3]),
    ...Object.keys(BARKS).map((id) => [`bark ${id}`, barkEffect(id), barkFrames(id) / 60 + 1]),
  ];
  for (const [name, def, seconds] of sounds) {
    const seq = createSequencer();
    seq.dsp.setEcho(STAGE_ECHO);
    seq.sfx(def);
    const { peak, clips } = measure(seq, seconds);
    assert.equal(clips, 0, `${name}: ${clips} samples hit the rails`);
    assert.ok(peak < CEILING, `${name} peaks at ${dbfs(peak)}`);
  }
});

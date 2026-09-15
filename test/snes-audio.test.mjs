import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAUSS, gaussian, brrEncode, brrDecode, makeSample, stepEnvelope, firStep, noiseStep, modulatedPitch, createDsp, DSP_HZ,
} from '../src/snes/audio/spc.mjs';
import { compileSong, stealVoice, createSequencer, renderSong, notePitch, SFX } from '../src/snes/audio/player.mjs';
import testTune from '../src/snes/audio/songs/test.mjs';

test('the Gaussian table rises and its four taps always sum to about unity', () => {
  assert.equal(GAUSS.length, 512);
  for (let i = 1; i < 512; i++) assert.ok(GAUSS[i] >= GAUSS[i - 1], `rises at ${i}`);
  for (let f = 0; f < 256; f++) {
    const sum = GAUSS[255 - f] + GAUSS[511 - f] + GAUSS[256 + f] + GAUSS[f];
    assert.ok(sum > 2030 && sum < 2066, `phase ${f} sums to ${sum}`);
  }
  assert.ok(Math.abs(gaussian(1000, 1000, 1000, 1000, 77) - 1000) < 20, 'a flat signal stays flat');
});

test('BRR-style blocks are 16 nibbles of -8 to 7 and decode close to the source', () => {
  const sine = Array.from({ length: 256 }, (_, i) => 12000 * Math.sin((2 * Math.PI * i) / 64));
  const brr = brrEncode(sine, 64);
  assert.equal(brr.blocks.length, 16);
  assert.equal(brr.loop, 4);
  for (const b of brr.blocks) {
    assert.equal(b.nibbles.length, 16);
    assert.ok(b.nibbles.every((n) => n >= -8 && n <= 7));
    assert.ok(b.shift >= 0 && b.shift <= 12 && b.filter >= 0 && b.filter <= 3);
  }
  assert.equal(brr.blocks[0].filter, 0);
  assert.equal(brr.blocks[4].filter, 0, 'the loop block restarts with no prediction');
  const out = brrDecode(brr);
  const rms = Math.sqrt(sine.reduce((a, x, i) => a + (x - out[i]) ** 2, 0) / sine.length);
  assert.ok(rms < 400, `error ${rms}`);
  assert.equal(makeSample(sine, 70).loop, 64, 'loop points snap to a block');
});

test('ADSR attacks, decays to the sustain level and releases to silence', () => {
  const v = { env: 0, phase: 'attack', adsr: [15, 7, 3, 0] };
  stepEnvelope(v, 1);
  stepEnvelope(v, 2);
  assert.equal(v.env, 0x7ff, 'attack 15 is two samples');
  assert.equal(v.phase, 'decay');
  let t = 3;
  while (v.phase === 'decay' && t < 100000) stepEnvelope(v, t++);
  assert.equal(v.phase, 'sustain');
  assert.equal(v.env >> 8, 3);
  const held = v.env;
  for (let i = 0; i < 5000; i++) stepEnvelope(v, t++);
  assert.equal(v.env, held, 'sustain rate 0 holds');
  v.phase = 'release';
  for (let i = 0; i < 256; i++) stepEnvelope(v, t++);
  assert.equal(v.env, 0);

  const slow = { env: 0, phase: 'attack', adsr: [0, 0, 7, 0] };
  for (let i = 1; i <= 4096; i++) stepEnvelope(slow, i);
  assert.equal(slow.env, 64, 'attack 0 steps 32 every 2048 samples');
});

test('GAIN sets, ramps and bends the envelope', () => {
  assert.equal(stepEnvelope({ env: 0, phase: 'attack', gain: { mode: 'direct', value: 100 } }, 1), 1600);
  const up = { env: 0x5f0, phase: 'attack', gain: { mode: 'bentinc', rate: 31 } };
  stepEnvelope(up, 1);
  stepEnvelope(up, 2);
  assert.equal(up.env, 0x5f0 + 32 + 8);
  const down = { env: 0x100, phase: 'attack', gain: { mode: 'lindec', rate: 31 } };
  for (let i = 1; i < 20; i++) stepEnvelope(down, i);
  assert.equal(down.env, 0);
});

test('the echo FIR weighs its history by the taps over 128', () => {
  assert.equal(firStep([1000, 0, 0, 0, 0, 0, 0, 0], [128, 0, 0, 0, 0, 0, 0, 0]), 1000);
  assert.equal(firStep([0, 0, 1280, 0, 0, 0, 0, 0], [0, 0, 64, 0, 0, 0, 0, 0]), 640);
  const lowpass = [12, 33, 43, 43, 19, -2, -13, -7];
  assert.equal(firStep(Array(8).fill(4096), lowpass), 4096);
});

test('noise is a 15-bit LFSR and pitch modulation bends by the previous voice', () => {
  let r = 0x4000;
  const seen = new Set();
  for (let i = 0; i < 32767; i++) {
    seen.add(r);
    r = noiseStep(r);
  }
  assert.equal(r, 0x4000);
  assert.equal(seen.size, 32767);
  assert.equal(modulatedPitch(0x1000, 0), 0x1000);
  assert.ok(modulatedPitch(0x1000, 16000) > 0x1000 && modulatedPitch(0x1000, -16000) < 0x1000);
});

test('a keyed voice through the DSP sounds its sample at the pitch it is given', () => {
  const dsp = createDsp();
  const cycle = Array.from({ length: 32 }, (_, i) => 16000 * Math.sin((2 * Math.PI * i) / 32));
  dsp.keyOn(0, { sample: makeSample(cycle, 0), adsr: [15, 7, 7, 0], volL: 127, volR: 127 }, 0x1000);
  const L = new Float32Array(DSP_HZ / 2);
  const R = new Float32Array(DSP_HZ / 2);
  dsp.render(L, R, 0, L.length);
  let crossings = 0;
  for (let i = 1; i < L.length; i++) if (L[i - 1] < 0 !== L[i] < 0) crossings++;
  assert.ok(Math.abs(crossings / 2 / 0.5 - DSP_HZ / 32) < 10, `${crossings} crossings`);
  assert.ok(L.every(Number.isFinite));
});

test('the test tune fills eight voices with rows the player can read', () => {
  const song = compileSong(testTune);
  assert.equal(song.voices.length, 8);
  assert.equal(song.length, 128);
  assert.ok(song.voices.every((rows) => rows.some(Boolean)));
  assert.equal(notePitch({ sample: 'saw' }, 72) > 0x1000, true, 'C5 sits just above the saw loop root');
});

test('an effect steals voice 8, then 7, and gives the voice back to the song', () => {
  assert.equal(stealVoice([]), 7);
  assert.equal(stealVoice([, , , , , , , {}]), 6);
  const seq = createSequencer();
  seq.play(compileSong(testTune));
  const L = new Float32Array(32000);
  const R = new Float32Array(32000);
  seq.sfx(SFX.pickup);
  seq.sfx(SFX.punch);
  seq.render(L, R, 1600);
  assert.equal(seq.owner(7), 'sfx');
  assert.equal(seq.owner(6), 'sfx');
  seq.render(L, R, 32000);
  assert.equal(seq.owner(7), 'song');
  assert.equal(seq.owner(6), 'song');
});

test('the test tune renders at a sane level with nothing broken', () => {
  const { left, right } = renderSong(testTune, 4);
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < left.length; i++) {
    sum += left[i] ** 2 + right[i] ** 2;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const rms = Math.sqrt(sum / (2 * left.length));
  assert.ok(rms > 0.03 && rms < 0.5, `rms ${rms}`);
  assert.ok(peak < 1, `peak ${peak}`);
});

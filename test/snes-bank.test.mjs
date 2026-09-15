import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLES, INSTRUMENTS, BUDGET_BYTES, bankBytes, sampleBytes, demoSong } from '../src/snes/audio/bank.mjs';
import { compileSong, renderSong, SAMPLES as PLAYER_SAMPLES } from '../src/snes/audio/player.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';

const PLAN = [
  'DX electric piano', 'warm pad', 'bell', 'slap bass', 'synth bass', 'alto sax', 'brass stab', 'square lead',
  'gated kick', 'gated snare', 'closed hat', 'open hat', 'clap', 'orchestra hit',
];
const DRUMS = ['gkick', 'gsnare', 'chat', 'ohat', 'clap', 'orch'];

test('the bank holds the plan\'s fourteen instruments, each on its own sample with a valid ADSR', () => {
  assert.deepEqual(Object.values(INSTRUMENTS).map((i) => i.label), PLAN);
  for (const [key, inst] of Object.entries(INSTRUMENTS)) {
    assert.ok(SAMPLES[inst.sample], `${key} has a sample`);
    assert.equal(PLAYER_SAMPLES[inst.sample], SAMPLES[inst.sample], `${key} reaches the player`);
    const [a, d, s, sr] = inst.adsr;
    assert.ok(a >= 0 && a <= 15 && d >= 0 && d <= 7 && s >= 0 && s <= 7 && sr >= 0 && sr <= 31, `${key} adsr`);
    assert.ok(inst.demo.length >= 1 && inst.demo.length <= 3);
    for (const rows of inst.demo) assert.equal(rows.split(/\s+/).length, 20, `${key} demo is 20 rows`);
  }
});

test('every sample is BRR-style 4-bit blocks, and the whole bank fits the 60 KB budget', () => {
  for (const [key, s] of Object.entries(SAMPLES)) {
    assert.equal(s.pcm.length, s.brr.blocks.length * 16, key);
    assert.ok(s.brr.blocks.every((b) => b.nibbles.every((n) => n >= -8 && n <= 7)), key);
    assert.equal(sampleBytes(s), s.brr.blocks.length * 9);
  }
  const total = bankBytes();
  assert.ok(total <= BUDGET_BYTES, `bank is ${total} bytes`);
  assert.ok(total > 10000, `bank is ${total} bytes, suspiciously small`);
});

test('melodic samples loop on a block with a seamless seam; drums are one-shots', () => {
  for (const [key, s] of Object.entries(SAMPLES)) {
    if (DRUMS.includes(key)) {
      assert.equal(s.loop, null, `${key} is a one-shot`);
      continue;
    }
    assert.ok(s.loop !== null && s.loop % 16 === 0 && s.loop < s.pcm.length, `${key} loops`);
    let step = 0;
    for (let i = s.loop + 1; i < s.pcm.length; i++) step = Math.max(step, Math.abs(s.pcm[i] - s.pcm[i - 1]));
    const seam = Math.abs(s.pcm[s.loop] - s.pcm[s.pcm.length - 1]);
    assert.ok(seam <= step * 1.5 + 600, `${key} seam ${seam} against steps of ${step}`);
  }
});

test('the bank walk sounds every instrument in turn, with nothing clipped', () => {
  const keys = Object.keys(INSTRUMENTS);
  const song = compileSong(demoSong());
  assert.equal(song.length, keys.length * 20);
  const { left, right } = renderSong(demoSong(), keys.length * 2);
  let peak = 0;
  keys.forEach((key, j) => {
    let sum = 0;
    const from = j * 2 * DSP_HZ;
    const to = from + 2 * DSP_HZ;
    for (let i = from; i < to; i++) {
      sum += left[i] ** 2 + right[i] ** 2;
      peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    }
    const rms = Math.sqrt(sum / (4 * DSP_HZ));
    assert.ok(rms > 0.01 && rms < 0.4, `${key} rms ${rms}`);
  });
  assert.ok(peak < 0.95, `peak ${peak}`);
});

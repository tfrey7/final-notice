import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLES, INSTRUMENTS, BUDGET_BYTES, recordedSong, unpack } from '../src/snes/audio/recorded.mjs';
import { INSTRUMENTS as V1 } from '../src/snes/audio/bank.mjs';
import { compileSong, renderSong, SAMPLES as PLAYER_SAMPLES, INSTRUMENTS_V1 } from '../src/snes/audio/player.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import DATA from '../src/snes/audio/recorded-brr.mjs';
import { pack, RECIPES } from '../tools/snes-bank.mjs';

const DRUMS = ['gkick', 'gsnare', 'chat', 'ohat', 'clap', 'orch', 'ltom', 'htom', 'crash'];
const BRIEF = ['epiano', 'pad', 'strings', 'choir', 'bell', 'slap', 'synbass', 'sax', 'brass', 'piano', 'slowstr', 'subbass', 'timpani', ...DRUMS];

test('the recorded bank covers the brief, and the synthesised bank stays as v1', () => {
  for (const key of BRIEF) assert.ok(INSTRUMENTS[key], key);
  assert.equal(INSTRUMENTS_V1, V1);
  for (const [key, inst] of Object.entries(INSTRUMENTS)) {
    assert.equal(PLAYER_SAMPLES[inst.sample], SAMPLES[inst.sample], `${key} reaches the player`);
    assert.ok(DATA[key].preset && DATA[key].sample, `${key} names its source`);
    for (const rows of inst.demo) assert.equal(rows.split(/\s+/).length, 20, `${key} demo is 20 rows`);
  }
});

test('every recipe keeps the treble lift light, so the top stays soft', () => {
  for (const [key, recipe] of Object.entries(RECIPES)) assert.ok(recipe.bright <= 0.25, `${key} lifts ${recipe.bright}`);
});

test('the stored blocks round-trip through the 9-byte BRR packing and fit 64 KB', () => {
  let bytes = 0;
  for (const [key, d] of Object.entries(DATA)) {
    const blocks = unpack(d.brr);
    assert.equal(pack({ blocks }), d.brr, key);
    bytes += blocks.length * 9;
  }
  assert.ok(bytes <= BUDGET_BYTES && bytes > 20000, `bank is ${bytes} bytes`);
});

test('melodic samples loop on a block with a smooth seam; drums are one-shots', () => {
  for (const [name, s] of Object.entries(SAMPLES)) {
    const key = name.slice(4);
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

test('the recorded bank walk sounds every instrument, with nothing clipped', () => {
  const keys = Object.keys(INSTRUMENTS);
  assert.equal(compileSong(recordedSong()).length, keys.length * 20);
  const { left, right } = renderSong(recordedSong(), keys.length * 2);
  let peak = 0;
  keys.forEach((key, j) => {
    let sum = 0;
    for (let i = j * 2 * DSP_HZ; i < (j + 1) * 2 * DSP_HZ; i++) {
      sum += left[i] ** 2 + right[i] ** 2;
      peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    }
    const rms = Math.sqrt(sum / (4 * DSP_HZ));
    assert.ok(rms > 0.01 && rms < 0.4, `${key} rms ${rms}`);
  });
  assert.ok(peak < 0.95, `peak ${peak}`);
});

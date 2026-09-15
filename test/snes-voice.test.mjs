import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CAST, castNames, digitize, parseWav, renderLine, voiceOf } from '../src/snes/audio/voice.mjs';
import { takePath } from '../tools/voice.mjs';
import { wav } from '../tools/snes-render.mjs';
import { noise } from '../src/snes/audio/bank.mjs';

const CHARACTERS = ['ward', 'mercer', 'vellum', 'bellwether', 'tuesday', 'associate', 'supervisor', 'manager', 'counsel', 'speaker'];

const fakeTake = () => {
  const n = noise(7);
  const pcm = Float64Array.from({ length: 24000 }, (_, i) => 0.4 * Math.sin((2 * Math.PI * 140 * i) / 24000) * Math.sin((Math.PI * i) / 24000) + 0.05 * n());
  return { pcm, rate: 24000 };
};

test('the whole cast is there, with Bellwether turning cold', () => {
  for (const who of CHARACTERS) assert.ok(CAST[who], who);
  assert.ok(castNames().includes('bellwether:cold'));
  assert.ok(voiceOf('bellwether:cold').pitch < voiceOf('bellwether').pitch);
  assert.throws(() => voiceOf('nobody'), /no voice/);
});

test('every voice is distinct', () => {
  const keys = castNames().map((who) => JSON.stringify(['voice', 'pitch', 'speed', 'drive'].map((k) => voiceOf(who)[k])));
  assert.equal(new Set(keys).size, keys.length);
  const kokoro = CHARACTERS.map((who) => voiceOf(who).voice);
  assert.equal(new Set(kokoro).size, kokoro.length);
});

test('the same take and character always give the same sample', () => {
  const a = digitize('mercer', fakeTake());
  assert.deepEqual(digitize('mercer', fakeTake()).pcm, a.pcm);
  assert.notDeepEqual(digitize('speaker', fakeTake()).pcm, a.pcm);
  assert.equal(a.pcm.length % 16, 0);
});

test('a WAV reads back as the take it was written from', () => {
  const left = Float32Array.from([0, 0.5, -0.5, 0.25]);
  const back = parseWav(wav({ left, right: left, sampleRate: 32000 }));
  assert.equal(back.rate, 32000);
  back.pcm.forEach((x, i) => assert.ok(Math.abs(x - left[i]) < 1e-3));
});

test('every sample line has its take recorded and sounds through the S-DSP, unclipped', () => {
  for (const who of castNames()) {
    const path = takePath(who, voiceOf(who).sample);
    assert.ok(existsSync(path), `${who} take recorded`);
    const { left } = renderLine(who, parseWav(readFileSync(path)));
    let sum = 0;
    let peak = 0;
    for (const x of left) {
      sum += x * x;
      peak = Math.max(peak, Math.abs(x));
    }
    assert.ok(Math.sqrt(sum / left.length) > 0.01, `${who} is silent`);
    assert.ok(peak < 1, `${who} peaks at ${peak}`);
  }
});

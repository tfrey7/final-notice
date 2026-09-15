import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAST, CRUSH, CRUSH_DEFAULT, CRUSH_LEVELS, VOICE_BUDGET, castNames, crushLevel, digitize, masterClip, parseWav, renderLine, voiceOf } from '../src/snes/audio/voice.mjs';
import INTRO_BRR, { CRUSH_AT } from '../src/snes/audio/intro-brr.mjs';
import { LINES } from '../src/snes/attract.mjs';
import { takePath } from '../tools/voice.mjs';
import { wav } from '../tools/snes-render.mjs';
import { noise } from '../src/snes/audio/bank.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

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

test('the crush is a dial, and it never touches the master', () => {
  const master = fakeTake();
  const before = Float64Array.from(master.pcm);
  const samples = CRUSH_LEVELS.map((at) => digitize('ward', master, at));
  assert.deepEqual(master.pcm, before, 'the master came back untouched');
  const lengths = samples.map((s) => s.pcm.length);
  assert.equal(new Set(lengths).size, lengths.length, 'each level stores the line at its own rate');
  for (const at of CRUSH_LEVELS) assert.equal(voiceOf('ward', at).rate, CRUSH[at].rate);
  assert.ok(CRUSH.light.rate > CRUSH.house.rate && CRUSH.house.rate > CRUSH.hard.rate);
  assert.throws(() => digitize('ward', master, 'nope'), /no crush/);
  assert.equal(crushLevel(), CRUSH_DEFAULT);
});

test('the clean master is kept whole, and is not what the game plays', () => {
  const master = fakeTake();
  const clean = masterClip(master);
  assert.equal(clean.sampleRate, master.rate, 'a master keeps its own full rate');
  assert.ok(clean.sampleRate > CRUSH[crushLevel()].rate, 'and it is higher than any crush');
  const src = readdirSync(join(ROOT, 'src', 'snes', 'scenes')).concat(readdirSync(join(ROOT, 'src', 'snes')));
  for (const name of src.filter((f) => f.endsWith('.mjs'))) {
    for (const dir of ['scenes', '']) {
      const path = join(ROOT, 'src', 'snes', dir, name);
      if (!existsSync(path)) continue;
      const text = readFileSync(path, 'utf8');
      assert.ok(!/new URL\([^)]*assets\/voice/.test(text), `${name} fetches a clean master`);
    }
  }
});

test('every intro line is baked crushed, inside the 1 MB voice budget', () => {
  assert.ok(CRUSH[CRUSH_AT], `baked at a real level: ${CRUSH_AT}`);
  let bytes = 0;
  for (const line of LINES) {
    const baked = INTRO_BRR[line.clip];
    assert.ok(baked, `${line.clip} baked`);
    assert.equal(baked.who, line.who);
    assert.ok(baked.frames > 0 && baked.brr.length > 0);
    assert.ok(existsSync(join(ROOT, 'assets', 'voice', 'intro', `${line.clip}.wav`)), `${line.clip} master kept`);
    bytes += (baked.brr.length * 3) / 4;
  }
  assert.ok(bytes < VOICE_BUDGET, `${(bytes / 1024).toFixed(0)} KB of ${VOICE_BUDGET / 1024} KB`);
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

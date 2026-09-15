import test from 'node:test';
import assert from 'node:assert/strict';
import { SFX as NES_SFX } from '../src/audio/sfx.mjs';
import { SFX, FX_SAMPLES, soundBytes, BUDGET_BYTES } from '../src/snes/audio/sfx.mjs';
import { compileSong, createSequencer, renderSong, SAMPLES } from '../src/snes/audio/player.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';

const JINGLES = ['stageStart', 'stageClear', 'lifeLost', 'gameOver', 'continue', 'pickup'];
const BOSS_LINES = ['vellumLine', 'custodianLine', 'sealLine'];

const frames = (layer) => (layer.delay ?? 0) + layer.steps.reduce((sum, [, , n]) => sum + n, 0);

test('every NES effect name has an SNES effect, plus a voice line per boss', () => {
  for (const name of [...Object.keys(NES_SFX), ...BOSS_LINES]) assert.ok(SFX[name], `${name} has an SNES version`);
});

test('effects are at most two layers on known samples, and under a second bar the voice lines', () => {
  for (const [name, def] of Object.entries(SFX)) {
    assert.ok(def.layers.length >= 1 && def.layers.length <= 2, name);
    for (const layer of def.layers) {
      for (const [inst] of layer.steps) if (inst) assert.ok(SAMPLES[inst.sample], `${name} plays ${inst.sample}`);
      assert.ok(frames(layer) <= (BOSS_LINES.includes(name) ? 72 : 60), `${name} is ${frames(layer)} frames`);
    }
  }
});

test('the bank and the effect samples together stay within the 60 KB budget', () => {
  const total = soundBytes();
  assert.ok(total <= BUDGET_BYTES, `${total} bytes`);
  for (const [key, s] of Object.entries(FX_SAMPLES)) assert.ok(s.pcm.length > 0 && s.pcm.every(Number.isFinite), key);
});

test('a two-layer effect takes voices 8 and 7 from the song and gives both back', () => {
  const seq = createSequencer();
  seq.play(compileSong({ tempo: 6, loop: 0, instruments: { k: { sample: 'epiano' } }, v7: { inst: 'k', rows: 'C4 - - -' }, v8: { inst: 'k', rows: 'C4 - - -' } }));
  const L = new Float32Array(DSP_HZ * 2);
  const R = new Float32Array(DSP_HZ * 2);
  assert.deepEqual(seq.sfx(SFX.hit), [7, 6]);
  seq.render(L, R, 1600);
  assert.equal(seq.owner(7), 'sfx');
  assert.equal(seq.owner(6), 'sfx');
  seq.render(L, R, DSP_HZ);
  assert.equal(seq.owner(7), 'song');
  assert.equal(seq.owner(6), 'song');
});

test('every effect sounds, with nothing clipped', () => {
  for (const [name, def] of Object.entries(SFX)) {
    const seq = createSequencer();
    seq.dsp.setEcho({ mvol: 100, evol: 30, efb: 40, edl: 4, fir: [12, 33, 43, 43, 19, -2, -13, -7] });
    seq.sfx(def);
    const n = Math.round(DSP_HZ * 1.3);
    const L = new Float32Array(n);
    const R = new Float32Array(n);
    seq.render(L, R, n);
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
      sum += L[i] ** 2;
    }
    assert.ok(Math.sqrt(sum / n) > 0.003, `${name} is silent`);
    assert.ok(peak < 1, `${name} peaks at ${peak}`);
  }
});

test('the six jingles load by name, play once and sound', async () => {
  for (const name of JINGLES) {
    const def = (await import(`../src/snes/audio/songs/${name}.mjs`)).default;
    const song = compileSong(def);
    assert.equal(song.loop, null, name);
    const seconds = (song.length * song.tempo) / 60;
    assert.ok(seconds >= 1 && seconds <= 5, `${name} is ${seconds} s`);
    const { left } = renderSong(def, seconds);
    let sum = 0;
    let peak = 0;
    for (const x of left) {
      sum += x * x;
      peak = Math.max(peak, Math.abs(x));
    }
    const rms = Math.sqrt(sum / left.length);
    assert.ok(rms > 0.01 && rms < 0.5, `${name} rms ${rms}`);
    assert.ok(peak < 1, `${name} peak ${peak}`);
  }
});

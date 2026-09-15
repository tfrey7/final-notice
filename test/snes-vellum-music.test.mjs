import test from 'node:test';
import assert from 'node:assert/strict';
import vellum, { A_CHORDS, A_LEAD, A_LEAD_2, B_CHORDS, B_LEAD_2, BAR_ROWS, FORM, LOOP_BAR, arrange } from '../src/snes/audio/songs/vellum.mjs';
import { triad } from '../src/snes/audio/songs/chase-kit.mjs';
import { noteToMidi } from '../src/audio/apu.mjs';
import pinch, { FORM as PINCH_FORM } from '../src/snes/audio/songs/vellum-pinch.mjs';
import { compileSong, renderSong, SAMPLES, VOICE_NAMES } from '../src/snes/audio/player.mjs';
import { sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import { vellumPinch } from '../src/snes/audio/cues.mjs';

const seconds = (def, song) => ((song.length - song.loop) * def.tempo) / 60;

for (const [name, def, form] of [['vellum', vellum, FORM], ['vellum-pinch', pinch, PINCH_FORM]]) {
  test(`${name} plays all eight voices for the whole form, on recorded samples within 64 KB`, () => {
    const song = compileSong(def);
    assert.equal(song.length, form.length * BAR_ROWS);
    for (const [i, v] of VOICE_NAMES.entries()) assert.ok(song.voices[i].some(Boolean), `${v} plays`);
    const used = new Set(Object.values(def.instruments).map((i) => i.sample));
    for (const key of used) assert.match(key, /^rec-/);
    const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + song.echo.edl * 2048;
    assert.ok(bytes <= 64 * 1024, `${bytes} bytes`);
  });
}

test('the duel loops for 90 to 120 s from the top of A, and the pinch is shorter and faster', () => {
  const song = compileSong(vellum);
  assert.equal(song.loop, LOOP_BAR * BAR_ROWS);
  assert.equal(FORM[LOOP_BAR].part, 'A');
  const loop = seconds(vellum, song);
  assert.ok(loop >= 90 && loop <= 120, `${loop} s`);
  assert.ok(FORM.some((b) => b.shift !== 0), 'a key change');
  assert.ok(pinch.tempo < vellum.tempo);
  assert.ok(seconds(pinch, compileSong(pinch)) < 30);
});

test('the duel loop seam holds its level on the second pass, nothing clipped', () => {
  const song = compileSong(vellum);
  const rowSec = vellum.tempo / 60;
  const barSec = BAR_ROWS * rowSec;
  const endSec = song.length * rowSec;
  const out = renderSong(vellum, endSec + barSec + 0.5);
  const rms = (from) => {
    let sum = 0;
    const a = Math.round(from * DSP_HZ);
    const n = Math.round(barSec * DSP_HZ);
    for (let i = a; i < a + n; i++) sum += out.left[i] ** 2 + out.right[i] ** 2;
    return Math.sqrt(sum / (2 * n));
  };
  const first = rms(song.loop * rowSec);
  const second = rms(endSec);
  assert.ok(first > 0.05, `loop bar rms ${first}`);
  assert.ok(Math.abs(first - second) / first < 0.1, `loop bar rms ${first} then ${second}`);
  const peak = out.left.reduce((p, _, i) => Math.max(p, Math.abs(out.left[i]), Math.abs(out.right[i])), 0);
  assert.ok(peak < 0.95, `peak ${peak}`);
});

const note = (t) => {
  const [head, ...marks] = t.split('/');
  const [name, inst] = head.split(':');
  return { name, inst, marks: marks.join('/') };
};

for (const [name, form, pinched, sources] of [
  ['vellum', FORM, false, { A: [A_CHORDS, A_LEAD], A2: [A_CHORDS, A_LEAD_2] }],
  ['vellum-pinch', PINCH_FORM, true, { A: [A_CHORDS, A_LEAD], B: [B_CHORDS, B_LEAD_2] }],
]) {
  test(`${name}'s key-changed lead moves once with the harmony, marks kept`, () => {
    const v1 = arrange(form, { pinch: pinched }).v1;
    const moved = form.filter((b) => b.shift !== 0);
    assert.ok(moved.length);
    for (const b of moved) {
      const i = form.indexOf(b);
      const [chords, leads] = sources[b.part];
      assert.equal(b.c.root, triad(chords[b.bar]).root + b.shift);
      const src = leads[b.bar].split(' ');
      const out = v1[i].split(' ');
      assert.equal(out.length, src.length);
      src.forEach((t, j) => {
        if (!/^[A-G]/.test(t)) return assert.equal(out[j], t);
        const [a, z] = [note(t), note(out[j])];
        assert.match(z.name, /^[A-G][#b]?[2-7]$/, `${b.part} bar ${b.bar}: ${out[j]}`);
        assert.equal(noteToMidi(z.name) - noteToMidi(a.name), b.shift - 12, `${b.part} bar ${b.bar}: ${t} -> ${out[j]}`);
        assert.equal(z.marks, a.marks, `${b.part} bar ${b.bar}: ${t} -> ${out[j]}`);
      });
    }
  });
}

test('the duel\'s first A+1 lead note is a semitone above the first A note', () => {
  const v1 = arrange(FORM).v1;
  const first = (part, shift) => note(v1[FORM.findIndex((b) => b.part === part && b.shift === shift)].split(' ')[0]);
  assert.equal(noteToMidi(first('A', 1).name) - noteToMidi(first('A', 0).name), 1);
});

test('the pinch starts at a third of Vellum\'s health, never once he is down', () => {
  assert.equal(vellumPinch(40, 40), false);
  assert.equal(vellumPinch(14, 40), false);
  assert.equal(vellumPinch(13, 40), true);
  assert.equal(vellumPinch(0, 40), false);
});

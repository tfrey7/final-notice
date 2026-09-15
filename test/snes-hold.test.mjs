import test from 'node:test';
import assert from 'node:assert/strict';
import { noteToMidi } from '../src/audio/apu.mjs';
import { HOOK } from '../src/audio/songs/title.mjs';
import hold, { LEAD } from '../src/snes/audio/songs/hold.mjs';
import { DUCK_FRAMES, compileSong, createSequencer, renderSong } from '../src/snes/audio/player.mjs';
import { SFX } from '../src/snes/audio/sfx.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';

const notes = (rows) => rows.split(/\s+/).filter((t) => /^[A-G]/.test(t)).map((t) => noteToMidi(t.split(':')[0]));
const frames = (seq, n) => {
  const samples = Math.round((n * DSP_HZ) / 60);
  seq.render(new Float32Array(samples), new Float32Array(samples), samples);
};

test('the hold music quotes the title hook and loops whole bars', () => {
  assert.deepEqual(notes(LEAD[0]), notes(HOOK));
  const song = compileSong(hold);
  assert.equal(song.loop, 0);
  assert.equal(song.length % 16, 0);
  const seconds = (song.length * song.tempo) / 60;
  assert.ok(seconds >= 15 && seconds <= 40, `${seconds} s a pass`);
});

test('the hold music sounds, unclipped, and its loop matches its first pass', () => {
  const song = compileSong(hold);
  const pass = (song.length * song.tempo) / 60;
  const { left } = renderSong(hold, pass * 2);
  const rms = (from, to) => {
    let sum = 0;
    for (let i = from; i < to; i++) sum += left[i] ** 2;
    return Math.sqrt(sum / (to - from));
  };
  const bar = Math.round(((16 * song.tempo) / 60) * DSP_HZ);
  const one = Math.round(pass * DSP_HZ);
  const first = rms(bar, 2 * bar);
  assert.ok(first > 0.01 && first < 0.4, `rms ${first}`);
  assert.ok(Math.abs(rms(one + bar, one + 2 * bar) - first) / first < 0.1);
  assert.ok(left.every((x) => Math.abs(x) < 1));
});

test('hold ducks the song, and endHold brings it back at the row it left', () => {
  const stage = compileSong({ tempo: 6, loop: 0, echo: { mvol: 90 }, instruments: { k: { sample: 'epiano' } }, v1: { inst: 'k', rows: 'C4 - - - E4 - - - G4 - - - C5 - - -' } });
  const seq = createSequencer();
  seq.play(stage);
  frames(seq, 30);
  const left = seq.at().pos + DUCK_FRAMES;
  seq.hold(compileSong(hold));
  frames(seq, DUCK_FRAMES / 2);
  assert.ok(seq.dsp.reg.mvol < 90 && seq.dsp.reg.mvol > 0, 'fading');
  frames(seq, DUCK_FRAMES / 2 + 1);
  assert.ok(seq.holding());
  frames(seq, 300);
  assert.notEqual(seq.at().song, stage);
  seq.endHold();
  assert.equal(seq.at().song, stage);
  assert.ok(Math.abs(seq.at().pos - left) <= 1, `back at ${seq.at().pos}, left at ${left}`);
  frames(seq, DUCK_FRAMES);
  assert.equal(seq.dsp.reg.mvol, 90);
});

test('closing pause before the duck finishes fades the song straight back', () => {
  const seq = createSequencer();
  seq.play(compileSong({ tempo: 6, loop: 0, echo: { mvol: 80 }, instruments: { k: { sample: 'epiano' } }, v1: { inst: 'k', rows: 'C4 - - -' } }));
  seq.hold(compileSong(hold));
  frames(seq, 4);
  seq.endHold();
  frames(seq, DUCK_FRAMES);
  assert.equal(seq.holding(), false);
  assert.equal(seq.dsp.reg.mvol, 80);
});

test('menus have a pencil cursor, a stamp to confirm and a paper slide to cancel', () => {
  for (const name of ['pencil', 'stampOk', 'paperSlide']) assert.ok(SFX[name], name);
});

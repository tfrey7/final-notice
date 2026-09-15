import test from 'node:test';
import assert from 'node:assert/strict';
import { compileSong, createSequencer, expression, notePitch, parseRows, ROOMS } from '../src/snes/audio/player.mjs';
import { INSTRUMENTS } from '../src/snes/audio/recorded.mjs';

const lead = { ...INSTRUMENTS.brass };

test('expression marks read off a note and a glide starts from the voice\'s last note', () => {
  const [a, , b] = parseRows('v1', 'C5/@90>40 - E5/p4/v8/b-2 -', 'lead');
  assert.deepEqual([a.vol, a.volTo], [90, 40]);
  assert.deepEqual([b.glide, b.vibrato, b.bend, b.from], [4, 8, -2, a.pitch]);
  assert.throws(() => parseRows('v1', 'C5/q', 'lead'), /cannot read mark/);
});

test('vibrato waits out its delay, a glide arrives, a bend reaches its target and volume ramps', () => {
  const [note] = parseRows('v1', 'C5/v12 - - -', 'lead');
  assert.equal(expression(note, lead, 12, 6).midi, note.pitch);
  assert.ok(Math.abs(expression(note, lead, 20, 6).midi - note.pitch) > 0.1);
  const [, glide] = parseRows('v1', 'G4 C5/p6', 'lead');
  assert.equal(expression(glide, lead, 0, 6).midi, glide.from);
  assert.equal(expression(glide, lead, 6, 6).midi, glide.pitch);
  const [bend] = parseRows('v1', 'C5/b+2 -', 'lead');
  assert.equal(expression(bend, lead, 11, 6).midi, bend.pitch + 2);
  const [swell] = parseRows('v1', 'C5/@20>100 -', 'lead');
  assert.deepEqual([expression(swell, lead, 0, 6).vol, expression(swell, lead, 11, 6).vol], [20, 100]);
});

test('the sequencer moves the DSP pitch under a vibrato note and a part pan outranks its instrument', () => {
  const seq = createSequencer();
  seq.play(compileSong({ tempo: 6, instruments: { lead }, v1: { inst: 'lead', pan: -100, rows: 'C5/v2 - - -' } }));
  const out = new Float32Array(32000);
  const pitches = new Set();
  for (let k = 0; k < 20; k++) {
    seq.render(out, out, 533);
    pitches.add(seq.dsp.voices[0].pitch);
  }
  assert.ok(pitches.size > 3);
  assert.ok(seq.dsp.voices[0].volL > seq.dsp.voices[0].volR);
  assert.notEqual(notePitch(lead, 72.3), notePitch(lead, 72));
});

test('a song picks a room, keeps its own overrides, and every room is bounded', () => {
  const song = compileSong({ echo: { room: 'cathedral', evol: 20, mvol: 40 }, instruments: {} });
  assert.deepEqual(song.echo, { ...ROOMS.cathedral, evol: 20, mvol: 40 });
  for (const room of Object.values(ROOMS)) {
    assert.equal(room.fir.reduce((a, b) => a + b, 0) <= 128, true);
    assert.ok(room.efb <= 96 && room.edl <= 15);
  }
  assert.throws(() => compileSong({ echo: { room: 'closet' } }), /no room/);
});

test('a dropped layer stays silent for its rows and comes back after', () => {
  const def = {
    tempo: 1, instruments: { lead },
    v1: { inst: 'lead', rows: 'C5 - - - - - - -' },
    v2: { inst: 'lead', rows: 'G4 - G4 - G4 - G4 -' },
    drops: [{ from: 2, to: 6, voices: ['v2'] }],
  };
  const seq = createSequencer();
  seq.play(compileSong(def));
  const out = new Float32Array(600);
  const phases = [];
  for (let row = 0; row < 8; row++) {
    seq.render(out, out, 534);
    phases.push(seq.dsp.voices[1].phase);
  }
  assert.equal(phases[3], 'release');
  assert.equal(phases[4], 'release');
  assert.notEqual(phases[6], 'release');
  assert.throws(() => compileSong({ ...def, drops: [{ from: 0, voices: ['v9'] }] }), /no voice/);
});

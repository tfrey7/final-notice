import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANNELS, DUTY_TABLES, noteToMidi, pulsePeriod, pulseHz, trianglePeriod, pulseAudible,
  lfsrStep, noiseSequence, triangleSteps, mixGain, channelRate, midiToHz,
  ALL_CHANNELS, VRC6_DUTY_TABLES, sawSteps, sawPeriod,
} from '../src/audio/apu.mjs';
import { parseRows, compileSong, noteAt, pitchAt, sfx, playSong } from '../src/audio/player.mjs';
import { SFX } from '../src/audio/sfx.mjs';
import demo from '../src/audio/songs/demo.mjs';

test('note names read as MIDI numbers', () => {
  assert.equal(noteToMidi('A4'), 69);
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('C#4'), 61);
  assert.equal(noteToMidi('Eb4'), 63);
  assert.equal(noteToMidi('H4'), null);
});

test('A440 lands on the 2A03 periods a tracker would write', () => {
  assert.equal(pulsePeriod(440), 253);
  assert.equal(trianglePeriod(440), 126);
  assert.ok(Math.abs(pulseHz(253) - 440) < 2);
  assert.equal(pulseAudible(7), false);
  assert.ok(channelRate('pulse1', 132) === 0, 'a note too high for the period silences');
  assert.ok(Math.abs(channelRate('triangle', 45) - midiToHz(45)) < 1);
});

test('duty tables are 8 steps at 12.5, 25, 50 and 75 percent', () => {
  assert.deepEqual(DUTY_TABLES.map((t) => t.length), [8, 8, 8, 8]);
  assert.deepEqual(DUTY_TABLES.map((t) => t.reduce((a, b) => a + b) / 8), [0.125, 0.25, 0.5, 0.75]);
});

test('the VRC6 pulses have 8 duties in 16 steps and the saw is a 14-step 5-bit staircase', () => {
  assert.deepEqual(VRC6_DUTY_TABLES.map((t) => t.reduce((a, b) => a + b)), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(VRC6_DUTY_TABLES.every((t) => t.length === 16));
  const saw = sawSteps();
  assert.equal(saw.length, 14);
  assert.equal(Math.max(...saw), 31);
  assert.equal(sawPeriod(440), 290);
  assert.ok(Math.abs(channelRate('saw', 69) - 440) < 2);
  assert.ok(Math.abs(channelRate('vrc6p1', 69) - 440) < 2);
  assert.ok(channelRate('vrc6p2', 21) > 0, 'a 12-bit period reaches notes the 2A03 cannot');
  assert.deepEqual(ALL_CHANNELS.slice(4), ['vrc6p1', 'vrc6p2', 'saw']);
});

test('a glide slides in from the previous note', () => {
  const [a, , b] = parseRows('triangle', 'C3 . G3', 'bass');
  assert.equal(b.from, a.pitch);
  const inst = { glide: 4 };
  assert.equal(pitchAt(b, inst, 0), a.pitch);
  assert.equal(pitchAt(b, inst, 2), (a.pitch + b.pitch) / 2);
  assert.equal(pitchAt(b, inst, 4), b.pitch);
  assert.equal(pitchAt(a, inst, 0), a.pitch);
});

test('the noise LFSR repeats every 32767 steps long and 93 short', () => {
  assert.equal(lfsrStep(1), 0x4000);
  assert.equal(noiseSequence(false).length, 32767);
  assert.equal(noiseSequence(true).length, 93);
});

test('the triangle is a 4-bit 32-step ramp with no volume control', () => {
  const steps = triangleSteps();
  assert.equal(steps.length, 32);
  assert.equal(Math.max(...steps), 15);
  assert.equal(Math.min(...steps), 0);
  assert.equal(mixGain('triangle', 3), mixGain('triangle', 15));
  assert.equal(mixGain('triangle', 0), 0);
  assert.ok(mixGain('noise', 15) < mixGain('pulse1', 15));
});

test('rows read notes, holds, silences and instrument overrides', () => {
  const rows = parseRows('pulse1', 'C4 - . | E4:soft', 'lead');
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], { start: 0, pitch: 60, inst: 'lead', len: 2 });
  assert.equal(rows[1], rows[0]);
  assert.equal(rows[2], null);
  assert.equal(rows[3].inst, 'soft');
  assert.equal(parseRows('noise', 'F 0:hat', 'kick')[0].pitch, 15);
  assert.throws(() => parseRows('noise', 'G', 'kick'));
});

test('a compiled song pads channels and knows where each frame is', () => {
  const song = compileSong({
    tempo: 4, loop: null, instruments: { a: { env: [15] } },
    pulse1: { inst: 'a', rows: 'C4 - D4' }, triangle: { inst: 'a', rows: 'C3' },
  });
  assert.equal(song.length, 3);
  assert.deepEqual(song.channels.triangle.slice(1), [null, null]);
  assert.deepEqual(song.channels.noise, [null, null, null]);
  const n = noteAt(song, 'pulse1', 6);
  assert.equal(n.into, 6);
  assert.equal(n.left, 2);
  assert.throws(() => compileSong({ loop: 9, instruments: {}, pulse1: { rows: '.' } }));
});

test('the demo is 8 bars with something on all four channels', () => {
  const song = compileSong(demo);
  assert.equal(song.length, 64);
  for (const ch of CHANNELS) assert.ok(song.channels[ch].some(Boolean), ch);
});

test('every effect names a channel and has frames', () => {
  for (const name of ['punch', 'jump', 'blip']) {
    assert.ok(CHANNELS.includes(SFX[name].channel), name);
    assert.ok(SFX[name].frames.length > 0, name);
  }
});

test('unknown names and no audio do nothing', async () => {
  assert.doesNotThrow(() => sfx('nope'));
  assert.doesNotThrow(() => sfx('punch'));
  await playSong('does-not-exist');
});

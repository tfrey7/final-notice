import test from 'node:test';
import assert from 'node:assert/strict';
import seal, { QUOTE, QUOTE_BAR as SEAL_QUOTE } from '../src/snes/audio/songs/seal.mjs';
import disposal, { QUOTE_BAR as DISPOSAL_QUOTE } from '../src/snes/audio/songs/disposal.mjs';
import scene from '../src/snes/audio/songs/scene.mjs';
import scene3, { DRONE } from '../src/snes/audio/songs/scene3.mjs';
import ending from '../src/snes/audio/songs/ending.mjs';
import { DISPOSAL_AREA, stage2Song } from '../src/snes/audio/cues.mjs';
import { AREAS } from '../src/stage2/areas.mjs';
import { TILE } from '../src/stage2/physics.mjs';
import { compileSong, renderSong, VOICE_NAMES } from '../src/snes/audio/player.mjs';
import { HOOK } from '../src/audio/songs/title.mjs';
import { noteToMidi } from '../src/audio/apu.mjs';

const CORPORATE = /rec-(epiano|pad|slap|sax|choir|sqlead)$/;
const bars = (def, v) => def[v].rows.split('|').map((b) => b.trim());
const notes = (bar) => bar.split(/\s+/).filter((t) => /^[A-G]/.test(t));
const midi = (t) => noteToMidi(t.split(':')[0]);
const instOf = (t) => t.split(':')[1].split('/')[0];

for (const [name, def, quoteBar] of [['Great Seal', seal, SEAL_QUOTE], ['Disposal Line', disposal, DISPOSAL_QUOTE]]) {
  test(`the ${name} cue is the gothic band: brass with vibrato, organ strings, a bell, no corporate instrument`, () => {
    const used = new Set(VOICE_NAMES.flatMap((v) => notes(def[v].rows).map(instOf)));
    for (const key of used) assert.doesNotMatch(def.instruments[key].sample, CORPORATE, key);
    const samples = [...used].map((key) => def.instruments[key].sample);
    for (const s of ['rec-brass', 'rec-strings', 'rec-bell', 'rec-synbass']) assert.ok(samples.includes(s), s);
    const lead = VOICE_NAMES.find((v) => notes(def[v].rows).some((t) => /brass|lead/.test(t)));
    const brass = def.instruments[instOf(notes(def[lead].rows)[0])];
    assert.ok(brass.pitch.some((p) => p !== 0), 'the brass has vibrato');
    const organ = notes(def.v3.rows).map(midi);
    assert.ok(organ.every((m) => m >= 48 && m < 80), 'the organ strings sit between C3 and G#5');
  });

  test(`the ${name} tolls the bell on every other downbeat and quotes the title hook in C minor once`, () => {
    const bell = bars(def, 'v4');
    bell.forEach((b, i) => {
      if (i !== quoteBar) assert.equal(/^[A-G]\S*:toll/.test(b), i % 2 === 0, `bar ${i}`);
    });
    assert.equal(bell.filter((b) => b.includes(':bell')).length, 1);
    assert.equal(bell[quoteBar], QUOTE);
    const hook = notes(HOOK).map(midi);
    const quote = notes(QUOTE).map(midi);
    assert.deepEqual(quote.map((m) => m - quote[0]), hook.map((m, i) => m - hook[0] - (i === 2 ? 1 : 0)), 'the hook, its third made minor');
    assert.equal(quote[1] % 12, 0, 'on C');
  });

  test(`the ${name} cue is a whole song and nothing clips`, () => {
    const song = compileSong(def);
    const seconds = ((song.length - song.loop) * def.tempo) / 60;
    assert.ok(seconds >= 110 && seconds <= 190, `${seconds} s`);
    const { left, right } = renderSong(def, 12);
    const peak = left.reduce((p, _, i) => Math.max(p, Math.abs(left[i]), Math.abs(right[i])), 0);
    assert.ok(peak > 0.1 && peak < 0.95, `peak ${peak}`);
  });
}

test('Stage 2 plays Disposal Line from its first column on', () => {
  assert.equal(AREAS[DISPOSAL_AREA].name, 'disposalLine');
  const start = AREAS[DISPOSAL_AREA].col * TILE;
  assert.equal(stage2Song(start - 1), 'stage2');
  assert.equal(stage2Song(start), 'disposal');
});

test('Scene 3 is the scene cue with the Seal drone held low under it', () => {
  for (const v of VOICE_NAMES.slice(0, 7)) assert.equal(scene3[v].rows, scene[v].rows, v);
  const drone = bars(scene3, 'v8');
  assert.ok(drone.every((b, i) => (i % 4 === 0 ? b.startsWith(`${DRONE}:drone`) : !/[A-G]/.test(b))));
  assert.equal(midi(DRONE) % 12, 0, 'the Seal key');
  assert.equal(scene3.instruments.drone.sample, seal.instruments.organ.sample);
  assert.ok(scene3.instruments.drone.vol <= scene.instruments.strings.vol / 2, 'at the edge of hearing');
  assert.ok(compileSong(scene3).voices[7].some(Boolean), 'the drone plays');
});

test('the drone stops on the walk out: the ending cue carries none', () => {
  assert.equal(ending.instruments.drone, undefined);
  for (const v of VOICE_NAMES) assert.doesNotMatch(ending[v].rows, /:drone/);
});

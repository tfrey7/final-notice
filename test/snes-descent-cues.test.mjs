import test from 'node:test';
import assert from 'node:assert/strict';
import seal, { FORM as SEAL_FORM } from '../src/snes/audio/songs/seal.mjs';
import disposal, { FORM as DISPOSAL_FORM } from '../src/snes/audio/songs/disposal.mjs';
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

const intervals = (ms) => ms.slice(1).map((m, i) => m - ms[i]);

for (const [name, def, form, extra] of [['Great Seal', seal, SEAL_FORM, ['rec-slowstr', 'rec-timpani']], ['Disposal Line', disposal, DISPOSAL_FORM, ['rec-piano']]]) {
  test(`the ${name} is its own song on the gothic band: strings and piano, no brass, nothing corporate`, () => {
    const used = new Set(VOICE_NAMES.flatMap((v) => notes(def[v].rows).map(instOf)));
    for (const key of used) assert.doesNotMatch(def.instruments[key].sample, CORPORATE, key);
    const samples = [...used].map((key) => def.instruments[key].sample);
    for (const s of ['rec-strings', 'rec-synbass', ...extra]) assert.ok(samples.includes(s), s);
    assert.ok(!samples.includes('rec-brass'), 'no brass');
    const tune = notes(def.v1.rows);
    for (const t of tune) assert.match(def.instruments[instOf(t)].sample, /rec-(strings|slowstr|piano)$/, t);
    assert.ok(Math.max(...tune.map(midi)) <= noteToMidi('G5'), 'the tune tops out at G5');
  });

  test(`the ${name} never plays the title hook`, () => {
    const hook = intervals(notes(HOOK).map(midi)).join();
    for (const v of VOICE_NAMES) {
      const line = intervals(notes(def[v].rows).map(midi));
      const n = hook.split(',').length;
      for (let i = 0; i + n <= line.length; i++) assert.notEqual(line.slice(i, i + n).join(), hook, `${v} at note ${i}`);
    }
  });

  test(`the ${name} cue is a whole song that loops on a bar line and nothing clips`, () => {
    const song = compileSong(def);
    assert.equal(song.length, form.length * 16);
    assert.equal(song.loop % 16, 0);
    const seconds = ((song.length - song.loop) * def.tempo) / 60;
    assert.ok(seconds >= 90 && seconds <= 190, `${seconds} s`);
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

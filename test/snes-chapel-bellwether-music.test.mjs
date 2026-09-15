import test from 'node:test';
import assert from 'node:assert/strict';
import chapel, { BAR_ROWS, FORM as CHAPEL_FORM, LOOP_BAR as CHAPEL_LOOP } from '../src/snes/audio/songs/stage5.mjs';
import bellwether, { FORM, LOOP_BAR } from '../src/snes/audio/songs/bellwether.mjs';
import phase2, { FORM as FORM2 } from '../src/snes/audio/songs/bellwether-2.mjs';
import phase3, { FORM as FORM3 } from '../src/snes/audio/songs/bellwether-3.mjs';
import { compileSong, renderSong, SAMPLES, VOICE_NAMES } from '../src/snes/audio/player.mjs';
import { sampleBytes } from '../src/snes/audio/bank.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import { BELLWETHER_SONGS, bellwetherSong } from '../src/snes/audio/cues.mjs';
import { SONGS } from '../src/flow.mjs';

const seconds = (def, song) => ((song.length - song.loop) * def.tempo) / 60;
const SONG_LIST = [['stage5', chapel, CHAPEL_FORM], ['bellwether', bellwether, FORM], ['bellwether-2', phase2, FORM2], ['bellwether-3', phase3, FORM3]];

for (const [name, def, form] of SONG_LIST) {
  test(`${name} plays all eight voices for the whole form, on recorded samples within 1 MB`, () => {
    const song = compileSong(def);
    assert.equal(song.length, form.length * BAR_ROWS);
    for (const [i, v] of VOICE_NAMES.entries()) assert.ok(song.voices[i].some(Boolean), `${v} plays`);
    const used = new Set(Object.values(def.instruments).map((i) => i.sample));
    for (const key of used) assert.match(key, /^rec-/);
    const bytes = [...used].reduce((sum, key) => sum + sampleBytes(SAMPLES[key]), 0) + song.echo.edl * 2048;
    assert.ok(bytes <= 1024 * 1024, `${bytes} bytes`);
  });

  test(`${name}'s lead names only real notes, marks after the instrument`, () => {
    for (const t of def.v1.rows.split(/\s+/).filter((x) => /^[A-G]/.test(x))) assert.match(t, /^[A-G][b#]?[1-7]:lead(\/\w+)*$/, t);
  });
}

test('the chapel is gothic: organ and choir under the lead, and Stage 5 plays it', () => {
  assert.equal(chapel.instruments.arp.sample, 'rec-organ');
  assert.equal(chapel.instruments.choir.sample, 'rec-choir');
  assert.equal(SONGS.stage5, 'stage5');
  const song = compileSong(chapel);
  assert.equal(song.loop, CHAPEL_LOOP * BAR_ROWS);
  const loop = seconds(chapel, song);
  assert.ok(loop >= 60 && loop <= 120, `${loop} s`);
});

test('Bellwether\'s phases each sound their own: a slow ominous 1, a frantic fastest 2, an epic 3 ending in C major', () => {
  const song = compileSong(bellwether);
  assert.equal(song.loop, LOOP_BAR * BAR_ROWS);
  const loop = seconds(bellwether, song);
  assert.ok(loop >= 60 && loop <= 120, `${loop} s`);
  assert.ok(phase2.tempo < phase3.tempo && phase3.tempo < bellwether.tempo);
  assert.equal(bellwether.instruments.bell.sample, 'rec-bell');
  assert.equal(bellwether.instruments.sub.sample, 'rec-subbass');
  assert.equal(phase2.instruments.hit.sample, 'rec-orch');
  assert.equal(phase3.instruments.lead.sample, 'rec-brass');
  assert.equal(phase3.instruments.choir.sample, 'rec-choir');
  assert.deepEqual(FORM3.at(-1).c.tones, [0, 4, 7]);
  assert.ok(seconds(phase2, compileSong(phase2)) <= 40 && seconds(phase3, compileSong(phase3)) <= 40);
});

test('a key-changed lead moves exactly its shift, once', () => {
  const first = (rows, bar) => rows.split(' | ')[bar].split(' ')[0];
  assert.ok(FORM2.every((b) => b.shift === 1));
  assert.equal(first(phase2.v1.rows, 0), 'Db4:lead');
  assert.equal(first(phase2.v1.rows, 1), 'A4:lead/v');
});

test('the phase picks its song, clamped to the three phases', () => {
  assert.deepEqual([1, 2, 3].map(bellwetherSong), BELLWETHER_SONGS);
  assert.equal(bellwetherSong(0), 'bellwether');
  assert.equal(bellwetherSong(4), 'bellwether-3');
});

for (const [name, def] of [['stage5', chapel], ['bellwether', bellwether]]) {
  test(`the ${name} loop seam holds its level on the second pass, nothing clipped`, () => {
    const song = compileSong(def);
    const rowSec = def.tempo / 60;
    const barSec = BAR_ROWS * rowSec;
    const endSec = song.length * rowSec;
    const out = renderSong(def, endSec + barSec + 0.5);
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
}

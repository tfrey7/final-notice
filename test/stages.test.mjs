import test from 'node:test';
import assert from 'node:assert/strict';
import { SONG_CHANNELS, FRAME_HZ, DPCM_SAMPLES, dpcmEncode, dpcmDecode } from '../src/audio/apu.mjs';
import { compileSong, parseRows } from '../src/audio/player.mjs';
import { MELODY } from '../src/audio/songs/title.mjs';
import { pitchClasses } from '../src/audio/songs/kit.mjs';
import stage1, * as s1 from '../src/audio/songs/stage1.mjs';
import stage2, * as s2 from '../src/audio/songs/stage2.mjs';

const BAR = 16;
const tokens = (text) => text.split(/\s+/).filter((t) => t && t !== '|');

for (const [name, def, mod] of [['stage1', stage1, s1], ['stage2', stage2, s2]]) {
  const song = compileSong(def);
  const bars = (ch) => def[ch].rows.split('|').map((b) => b.trim());

  test(`${name}: all eight channels, whole 16-row bars, one form entry a bar`, () => {
    for (const ch of SONG_CHANNELS) {
      assert.ok(song.channels[ch].some(Boolean), ch);
      assert.ok(bars(ch).every((b) => b.split(/\s+/).length === BAR), ch);
      assert.equal(bars(ch).length, mod.FORM.length, ch);
    }
    assert.equal(song.length, mod.FORM.length * BAR);
  });

  test(`${name}: a real form of at least 90 s, looping past the intro`, () => {
    assert.ok((song.length * song.tempo) / FRAME_HZ >= 90);
    assert.equal(song.loop, mod.LOOP_BAR * BAR);
    const parts = [...new Set(mod.FORM.map((b) => b.part))];
    for (const p of ['intro', 'A', 'B', 'breakdown', 'return']) assert.ok(parts.includes(p), p);
    assert.ok(parts.indexOf('return') > parts.indexOf('breakdown'));
    assert.ok(mod.FORM.some((b) => b.part === 'return' && b.shift !== 0), 'the return changes key');
    for (const ch of SONG_CHANNELS) assert.notEqual(tokens(def[ch].rows)[song.loop], '-', ch);
  });

  test(`${name}: every pitched note is in its bar's key`, () => {
    for (const ch of ['pulse1', 'pulse2', 'triangle', 'vrc6p1', 'vrc6p2', 'saw']) {
      for (const note of song.channels[ch]) {
        if (!note) continue;
        const scale = pitchClasses(mod.SCALE, mod.FORM[Math.floor(note.start / BAR)].shift);
        for (const s of new Set(def.instruments[note.inst].pitch ?? [0])) {
          if (Number.isInteger(s)) assert.ok(scale.has((note.pitch + s) % 12), `${ch} row ${note.start}`);
        }
      }
    }
  });

  test(`${name}: the title motif is a brief nod in the intro, and the lead rarely repeats itself`, () => {
    const lead = bars(mod.LEAD);
    for (const m of MELODY) assert.ok(!lead.some((b) => b.includes(m)), m);
    const nods = bars('pulse1').flatMap((b, i) => (b.includes(':nod') ? [mod.FORM[i].part] : []));
    assert.ok(nods.length >= 1 && nods.length <= 2 && nods.every((p) => p === 'intro'), nods.join());
    const played = lead.filter((b) => /[A-G]/.test(b));
    assert.ok(new Set(played).size / played.length >= 0.6, `${new Set(played).size} of ${played.length}`);
  });
}

test('the two stages differ in tempo, key and lead voice', () => {
  assert.ok(stage2.tempo / stage1.tempo <= 0.7);
  assert.notEqual(s1.SCALE[0], s2.SCALE[0]);
  assert.notEqual(s1.LEAD, s2.LEAD);
});

test('DPCM: the delta counter tracks a slow wave, and the kit has a long kick', () => {
  const wave = Array.from({ length: 400 }, (_, i) => 0.8 * Math.sin(i / 40));
  const decoded = dpcmDecode(dpcmEncode(wave));
  decoded.forEach((v, i) => assert.ok(Math.abs(v - (64 + 60 * wave[i])) <= 3, `sample ${i}`));
  assert.ok(decoded.every((v) => v >= 0 && v <= 127));
  assert.ok(DPCM_SAMPLES.kick.length > DPCM_SAMPLES.snare.length);
  assert.deepEqual(Object.keys(DPCM_SAMPLES), ['kick', 'snare', 'clap']);
  assert.equal(parseRows('dpcm', 'F:snare D', 'kick')[1].pitch, 13);
  assert.throws(() => parseRows('dpcm', 'C4', 'kick'));
});

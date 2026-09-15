import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_CHANNELS, FRAME_HZ, noteToMidi } from '../src/audio/apu.mjs';
import { compileSong, parseRows } from '../src/audio/player.mjs';
import title, * as T from '../src/audio/songs/title.mjs';
import boss, * as B from '../src/audio/songs/boss.mjs';
import ending, * as E from '../src/audio/songs/ending.mjs';

const SONGS = [['title', title, T], ['boss', boss, B], ['ending', ending, E]];
const PITCHED = ['pulse1', 'pulse2', 'triangle', 'vrc6p1', 'vrc6p2', 'saw'];
const seconds = (song, from = 0) => ((song.length - from) * song.tempo) / FRAME_HZ;

for (const [name, def, mod] of SONGS) {
  test(`${name}: all eight channels play whole 16-row bars, one per form entry`, () => {
    const song = compileSong(def);
    assert.equal(song.length, mod.FORM.length * 16);
    for (const ch of ALL_CHANNELS) {
      assert.ok(def[ch], `${name} plays ${ch}`);
      const bars = def[ch].rows.split('|').map((b) => b.trim().split(/\s+/).length);
      assert.ok(bars.every((n) => n === 16), `${ch} bar sizes ${bars}`);
      assert.equal(bars.length, mod.FORM.length, ch);
    }
  });

  test(`${name}: every note is in its own bar's key`, () => {
    const song = compileSong(def);
    for (const ch of PITCHED) {
      for (const note of song.channels[ch]) {
        if (!note) continue;
        const { shift } = mod.FORM[Math.floor(note.start / 16)];
        const scale = new Set(mod.SCALE.map((n) => (noteToMidi(`${n}4`) + shift) % 12));
        assert.ok(scale.has(note.pitch % 12), `${ch} row ${note.start}`);
      }
    }
  });
}

// The hook's intervals, note to note; a minor-key quote may shrink a step by a semitone.
const steps = (text) => {
  const p = parseRows('pulse1', text, 'x').filter((n, i, a) => n && a.indexOf(n) === i).map((n) => n.pitch);
  return p.slice(1, 7).map((x, i) => x - p[i]);
};
const HOOK = steps('C5 F5 A5 G5 F5 E5 C5');
const isHook = (s) => s.length === HOOK.length && s.every((d, i) => Math.abs(d - HOOK[i]) <= 1);
const quotes = (def, mod) => {
  const bars = [mod.LEAD === 'vrc6p1' ? 'vrc6p1' : 'pulse2', 'pulse1'].map((ch) => def[ch].rows.split(' | '));
  const at = bars.flatMap((ch) => ch.map((bar, i) => (isHook(steps(`${bar} ${ch[i + 1] ?? ''}`)) ? i : -1)));
  return new Set(at.filter((i) => i >= 0)).size;
};

test('the hook is a nod: the title quotes it most, boss and ending just once', () => {
  for (const hook of [T.HOOK, B.HOOK, E.HOOK]) assert.ok(isHook(steps(hook.replace('|', ''))), hook);
  const t = quotes(title, T);
  assert.ok(t >= 3 && t <= 4, `title quotes ${t}`);
  assert.equal(quotes(boss, B), 1);
  assert.equal(quotes(ending, E), 1);
});

test('title runs about 90 s and loops past its intro', () => {
  const song = compileSong(title);
  assert.equal(song.loop, T.LOOP_BAR * 16);
  const s = seconds(song);
  assert.ok(s >= 85 && s <= 95, `${s} s`);
  for (const part of ['intro', 'A', 'B', 'bridge', 'return']) assert.ok(T.FORM.some((b) => b.part === part), part);
});

test('boss loops a driving riff with a build and a phase change', () => {
  const song = compileSong(boss);
  assert.equal(song.loop, B.LOOP_BAR * 16);
  const s = seconds(song, song.loop);
  assert.ok(s >= 45 && s <= 75, `${s} s`);
  for (const part of ['riff', 'build', 'phase']) assert.ok(B.FORM.some((b) => b.part === part), part);
});

test('ending is a full arc that stops, landing on its tonic', () => {
  const song = compileSong(ending);
  assert.equal(song.loop, null);
  const s = seconds(song);
  assert.ok(s >= 80 && s <= 110, `${s} s`);
  const { shift } = E.FORM.at(-1);
  const tonic = (noteToMidi('D4') + shift) % 12;
  assert.equal(song.channels.pulse1.filter(Boolean).at(-1).pitch % 12, tonic);
  assert.equal(song.channels.saw.filter(Boolean).at(-1).pitch % 12, tonic);
});

test('each track has its own tempo, key and lead voice', () => {
  const identity = SONGS.map(([, def, mod]) => {
    const lead = def.instruments[def[mod.LEAD].inst];
    return { tempo: def.tempo, key: mod.SCALE[0], lead: `${mod.LEAD}/${lead.duty}` };
  });
  for (const k of ['tempo', 'key', 'lead']) assert.equal(new Set(identity.map((x) => x[k])).size, 3, k);
});

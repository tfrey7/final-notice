import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOUND_TEST } from '../src/snes/audio/soundtest.mjs';
import { SFX } from '../src/snes/audio/sfx.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SONGS = join(ROOT, 'src/snes/audio/songs');
// The NES audio, the song files and the effect table only define cues; naming one is not playing it.
const NOT_GAME = ['src/audio/', 'src/snes/audio/songs/', 'src/snes/audio/sfx.mjs', 'src/snes/audio/soundtest.mjs'];

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.mjs') ? [join(dir, e.name)] : []));
const game = walk(join(ROOT, 'src'))
  .filter((f) => !NOT_GAME.some((p) => relative(ROOT, f).replaceAll('\\', '/').startsWith(p)))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const named = (key) => game.includes(`'${key}'`) || game.includes(`"${key}"`);
const all = [...SOUND_TEST.music, ...SOUND_TEST.effects, ...SOUND_TEST.voices];

test('the sound test lists each cue once, with a label', () => {
  const keys = all.map(([key]) => key);
  assert.deepEqual(keys.filter((k, i) => keys.indexOf(k) !== i), []);
  for (const [key, label] of all) assert.ok(label, `${key} has no label`);
});

test('every song the sound test lists is a current take the game plays', () => {
  for (const [key] of SOUND_TEST.music) {
    assert.doesNotMatch(key, /-v\d+$/, `${key} is an old take`);
    assert.ok(existsSync(join(SONGS, `${key}.mjs`)), `no song file for ${key}`);
    assert.ok(named(key), `the sound test lists song "${key}", which the game never plays`);
  }
});

test('every effect and voice line the sound test lists is one the game plays', () => {
  for (const [key] of [...SOUND_TEST.effects, ...SOUND_TEST.voices]) {
    assert.ok(SFX[key], `no effect "${key}"`);
    assert.ok(named(key), `the sound test lists effect "${key}", which the game never plays`);
  }
});

test('every effect the game plays is in the sound test', () => {
  const listed = new Set([...SOUND_TEST.effects, ...SOUND_TEST.voices].map(([key]) => key));
  const missing = Object.keys(SFX).filter((key) => named(key) && !listed.has(key));
  assert.deepEqual(missing, [], 'add these to src/snes/audio/soundtest.mjs');
});

test('no superseded song takes are left beside the current ones', () => {
  assert.deepEqual(readdirSync(SONGS).filter((f) => /-v\d+\.mjs$/.test(f)), []);
});

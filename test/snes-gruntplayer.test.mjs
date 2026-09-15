import test from 'node:test';
import assert from 'node:assert/strict';
import GRUNTS from '../src/snes/audio/grunts-brr.mjs';
import { SOUNDS, VARIATIONS, gruntId } from '../src/snes/audio/grunts.mjs';
import { FOE_GRUNT_VOICE, gruntDef, hasGrunt, playGrunt } from '../src/snes/audio/gruntplayer.mjs';
import { FOE_BARK_VOICE } from '../src/snes/audio/barkplayer.mjs';
import { BARK_VOICE, SAMPLES } from '../src/snes/audio/player.mjs';
import { FIGHTERS } from '../tools/grunts.mjs';

test('every voiced fighter has three variations of each fight sound, and nothing else is baked', () => {
  const want = FIGHTERS.flatMap((who) => SOUNDS.flatMap((sound) => Array.from({ length: VARIATIONS }, (_, i) => gruntId(who, sound, i))));
  assert.deepEqual(Object.keys(GRUNTS).sort(), want.sort());
});

test('each grunt is a short sample that sounds', () => {
  for (const [id, g] of Object.entries(GRUNTS)) {
    const { pcm } = SAMPLES[`grunt:${id}`];
    const peak = pcm.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    assert.ok(peak > 2000, `${id} peaks at ${peak}`);
    // A death cry runs longest, and a low voice stretches it further.
    assert.ok(g.frames > 4 && g.frames <= 140, `${id} lasts ${g.frames} frames`);
  }
});

test('grunts play dry, foes on a voice clear of their spoken lines, auditors on their line voice', () => {
  const foe = gruntDef('manager-hurt-0');
  const [[inst]] = foe.layers[0].steps;
  assert.equal(inst.echo, false);
  assert.equal(foe.voice, FOE_GRUNT_VOICE);
  assert.notEqual(FOE_GRUNT_VOICE, FOE_BARK_VOICE);
  assert.notEqual(FOE_GRUNT_VOICE, BARK_VOICE);
  assert.equal(gruntDef('ward-hurt-0', { partner: true }).voice, BARK_VOICE);
  assert.ok(hasGrunt('vellum-death-2'));
  assert.equal(playGrunt('clerk-hurt-0'), false);
});

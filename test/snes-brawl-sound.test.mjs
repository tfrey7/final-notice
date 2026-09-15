import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAWL_SOUND, brawlSound } from '../src/snes/audio/brawl.mjs';
import { BRAWL_SFX, SFX, SFX_VOLUME, atVolume } from '../src/snes/audio/sfx.mjs';

test('every brawl event plays an effect that exists', () => {
  for (const [event, name] of BRAWL_SOUND) assert.ok(SFX[name], `${event} plays ${name}`);
  for (const name of BRAWL_SFX) assert.ok(SFX[name], name);
});

test('a frame plays only its biggest moment', () => {
  assert.equal(brawlSound(['punch', 'hit']), 'hitLight');
  assert.equal(brawlSound(['hit', 'heavy', 'smash', 'deskSmash']), 'deskSmash');
  assert.equal(brawlSound(['hit', 'hurt']), 'hurt');
  assert.equal(brawlSound(['heavy', 'go']), 'roomClear');
  assert.equal(brawlSound(['grab', 'pickup']), 'weaponPickup');
  assert.equal(brawlSound(['checkpoint:x', 'wave']), null);
});

test('light and heavy hits, and the telegraph, are their own sounds', () => {
  const samples = (name) => SFX[name].layers.flatMap((l) => l.steps.map(([inst]) => inst?.sample)).filter(Boolean).sort().join();
  assert.notEqual(samples('hitLight'), samples('hitHeavy'));
  assert.notEqual(samples('hitHeavy'), samples('finisher'));
  assert.notEqual(samples('telegraph'), samples('blip'));
});

test('each brawl effect has a volume, and the volume scales every step', () => {
  for (const name of BRAWL_SFX) assert.equal(SFX_VOLUME[name], 1, name);
  assert.equal(atVolume(SFX.hitLight, 1), SFX.hitLight);
  const half = atVolume(SFX.hitLight, 0.5);
  assert.equal(half.layers[0].steps[0][0].vol, Math.round(SFX.hitLight.layers[0].steps[0][0].vol / 2));
  assert.equal(atVolume(SFX.hitLight, 2).layers[0].steps[0][0].vol, 127);
});

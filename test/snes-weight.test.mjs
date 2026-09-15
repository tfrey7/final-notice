import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTune } from '../src/stage1/moves.mjs';
import { tuneFor } from '../src/stage1/player.mjs';
import { BOSS, FOES } from '../src/stage1/tuning.mjs';
import { DEFAULTS, TUNING as ESCAPE } from '../src/stage2/escape.mjs';
import { ASSOCIATE } from '../src/stage2/foes.mjs';
import { BOSS_WEIGHT, BRAWL_WEIGHT, ESCAPE_WEIGHT, FOES_WEIGHT, weighShared, weighed } from '../src/snes/weight.mjs';

const nesFoes = { ...FOES };
const nesEscape = { ...ESCAPE };

test('loading the SNES weights leaves the NES tables untouched', () => {
  assert.deepEqual(defaultTune().walkX, 1);
  assert.deepEqual(ESCAPE, DEFAULTS);
  assert.equal(FOES.windupFrames, 18);
});

test('the SNES brawler walks slower and every jab takes longer', () => {
  const nes = tuneFor('ward');
  const snes = weighed(nes, BRAWL_WEIGHT);
  assert.ok(snes.walkX < nes.walkX && snes.runX < nes.runX);
  const jab = (t) => t.punchStartup + t.punchActive;
  assert.ok(jab(snes) > jab(nes));
  assert.ok(snes.hitStopHeavy > nes.hitStopHeavy && snes.downFrames > nes.downFrames);
  assert.ok(snes.knockback > nes.knockback);
  // Input stays live: the press buffer grows with the slower cadence, so a queued jab is never dropped.
  assert.ok(snes.bufferFrames - nes.bufferFrames >= jab(snes) - jab(nes));
  for (const k of Object.keys(BRAWL_WEIGHT.frames)) assert.ok(Number.isInteger(snes[k]), k);
});

test('weighShared slows the shared foes once, however many scenes call it', () => {
  weighShared();
  weighShared();
  assert.equal(FOES.windupFrames, nesFoes.windupFrames + FOES_WEIGHT.frames.windupFrames);
  assert.ok(FOES.walkX < nesFoes.walkX);
  assert.ok(BOSS.windupFrames >= 32 + BOSS_WEIGHT.frames.windupFrames);
  assert.equal(ESCAPE.castDelay, nesEscape.castDelay + ESCAPE_WEIGHT.frames.castDelay);
  // Stage 2 keeps its stride and jump, so every pit stays clearable.
  assert.equal(ESCAPE.walk, nesEscape.walk);
  assert.equal(ESCAPE.jump, nesEscape.jump);
  assert.ok(ESCAPE.chaseSpeed > ESCAPE.scrollSpeed);
  assert.ok(ASSOCIATE.rest > 110);
});

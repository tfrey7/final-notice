import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTune } from '../src/stage1/moves.mjs';
import { tuneFor } from '../src/stage1/player.mjs';
import { KINDS as NES_KINDS } from '../src/stage1/staff.mjs';
import { BOSS, FOES } from '../src/stage1/tuning.mjs';
import { VELLUM as NES_VELLUM } from '../src/stage1/vellum.mjs';
import { DEFAULTS, TUNING as ESCAPE } from '../src/stage2/escape.mjs';
import { ASSOCIATE } from '../src/stage2/foes.mjs';
import { FIGHTERS, KINDS, SHARED, VELLUM, snesTune, useSnesTables } from '../src/snes/fight.mjs';

const nesFoes = { ...FOES };
const nesEscape = { ...ESCAPE };

test('loading the SNES tables leaves the NES tables untouched', () => {
  assert.equal(defaultTune().walkX, 1);
  assert.deepEqual(ESCAPE, DEFAULTS);
  assert.equal(FOES.windupFrames, 18);
  assert.equal(NES_KINDS.associate.windup, 16);
  assert.deepEqual(NES_VELLUM.guard, [80, 44]);
});

test('the SNES brawler walks slower and every jab takes longer', () => {
  for (const who of Object.keys(FIGHTERS)) {
    const nes = tuneFor(who);
    const snes = snesTune(who);
    assert.ok(snes.walkX < nes.walkX && snes.runX < nes.runX, who);
    const jab = (t) => t.punchStartup + t.punchActive;
    assert.ok(jab(snes) > jab(nes), who);
    assert.ok(snes.hitStopHeavy > nes.hitStopHeavy && snes.downFrames > nes.downFrames, who);
    // Input stays live: the press buffer grows with the slower cadence, so a queued jab is never dropped.
    assert.ok(snes.bufferFrames - nes.bufferFrames >= jab(snes) - jab(nes), who);
    for (const [k, v] of Object.entries(FIGHTERS[who])) if (Number.isInteger(nes[k]) && /Frames|Startup|Active|Recovery|Stop|stun|Window|Windup|Cooldown/.test(k)) assert.ok(Number.isInteger(v), `${who}.${k}`);
  }
});

test('the SNES staff and Vellum are slower than the NES ones', () => {
  for (const [kind, k] of Object.entries(KINDS)) {
    assert.ok(k.speed < NES_KINDS[kind].speed && k.windup > NES_KINDS[kind].windup && k.cooldown > NES_KINDS[kind].cooldown, kind);
  }
  assert.ok(VELLUM.guard[0] <= 32 && VELLUM.guard[1] < VELLUM.guard[0], 'a guard of about half a second');
});

test('useSnesTables slows the shared foes once, however many scenes call it', () => {
  useSnesTables();
  useSnesTables();
  for (const [table, values] of SHARED) for (const [k, v] of Object.entries(values)) assert.equal(table[k], v, k);
  assert.ok(FOES.windupFrames > nesFoes.windupFrames && FOES.walkX < nesFoes.walkX);
  assert.ok(BOSS.windupFrames > 32);
  assert.ok(ESCAPE.castDelay > nesEscape.castDelay);
  // Stage 2 keeps its stride and jump, so every pit stays clearable.
  assert.equal(ESCAPE.walk, nesEscape.walk);
  assert.equal(ESCAPE.jump, nesEscape.jump);
  assert.ok(ESCAPE.chaseSpeed > ESCAPE.scrollSpeed);
  assert.ok(ASSOCIATE.rest > 110);
});

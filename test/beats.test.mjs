// The stage rhythm (item 2336): a beat every two or three packs, never the same kind twice running,
// and each kind of beat actually doing something on the floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { player } from '../src/stage1/moves.mjs';
import { PIPS, newFloor, tuneFor } from '../src/stage1/player.mjs';
import { newStage, stepAreas } from '../src/stage1/areas.mjs';
import {
  BEAT_TABLES, FIRE_DAMAGE_EVERY, STAGE1_BEATS, STAGE3_BEATS, STAGE5_BEATS, TALK_FRAMES,
  armBeats, beatMap, rhythmOk, stepBeats,
} from '../src/stage1/beats.mjs';
import { armWorld, stageSmash } from '../src/stage1/weapons.mjs';
import { SNES_STAGE1 } from '../src/snes/stage1/waves.mjs';
import { FLOOR_TALK, talkFor } from '../src/story/script.mjs';

const tune = tuneFor('ward');
const floor = () => {
  const world = newStage(newFloor('ward', tune), tune, 0, SNES_STAGE1);
  return armBeats(armWorld(world, stageSmash(world.stage.starts)), STAGE1_BEATS);
};
const beatOf = (id) => STAGE1_BEATS.find((b) => b.id === id);

// Move the run past a lock without fighting: the beats only read run.lock and run.locked.
function clearTo(world, lock) {
  world.run.lock = lock + 1;
  world.run.locked = false;
  world.events = [];
  stepBeats(world, tune);
  return world.events;
}

test('every stage table keeps the rhythm: 1-3 packs a beat, never two of a kind in a row', () => {
  for (const [stage, beats] of Object.entries(BEAT_TABLES)) {
    assert.ok(rhythmOk(beats), `stage ${stage} breaks the rhythm`);
    assert.ok(beats.length >= 6, `stage ${stage} has too few beats`);
  }
});

test('the beat map reads as what happens where', () => {
  const map = beatMap(STAGE1_BEATS);
  assert.equal(map.length, STAGE1_BEATS.length);
  assert.deepEqual(map.map((r) => r.kind), ['pace', 'story', 'pace', 'boss', 'pace', 'story']);
  for (const row of map) assert.ok(row.what.length > 10, `${row.id} says nothing`);
});

test('Stage 1 never walks more than three packs without a beat', () => {
  const packs = SNES_STAGE1.areas.flatMap((a) => a.locks).map((l) => l.waves.length);
  let since = 0;
  for (const [lock, waves] of packs.entries()) {
    since += waves;
    if (STAGE1_BEATS.some((b) => b.lock === lock)) since = 0;
    assert.ok(since <= 3, `lock ${lock}: ${since} packs with no beat`);
  }
});

test('the smash beat puts furniture out, and a broken cabinet leaves a first-aid box', () => {
  const world = floor();
  const before = world.smash.length;
  const events = clearTo(world, 0);
  assert.ok(events.includes('beat:pace:cabinets'));
  assert.equal(world.smash.length, before + beatOf('cabinets').boxes.length);
  const box = world.smash.find((s) => s.drop === 'firstAid');
  const aid = world.firstAid.length;
  box.state = 'broken';
  world.events = [];
  stepBeats(world, tune);
  assert.ok(world.events.includes('drop:firstAid'));
  assert.equal(world.firstAid.length, aid + 1);
  // and it is not left lying about as a weapon
  assert.ok(!(world.weapons ?? []).some((w) => w.kind === 'firstAid'));
});

test('the story beat plays its lines over the fight, then gets out of the way', () => {
  const world = floor();
  const events = clearTo(world, 1);
  assert.ok(events.includes('beat:story:serviceFloor'));
  assert.equal(world.beats.talk.lines, FLOOR_TALK.serviceFloor.length);
  const lines = world.beats.talk.lines;
  for (let i = 0; i < TALK_FRAMES * lines; i++) stepBeats(world, tune);
  assert.equal(world.beats.talk, null, 'the talk should end on its own');
  // the fight is never held for it: no lock, no camera stop
  assert.equal(world.run.locked, false);
});

test('both auditors have their own words for every floor talk', () => {
  for (const id of Object.keys(FLOOR_TALK)) {
    for (const who of ['ward', 'mercer']) {
      const lines = talkFor(id, who);
      assert.ok(lines.length >= 1 && lines.every((l) => l.line && l.speaker), `${id}/${who}`);
    }
  }
});

test('an ambush is one more pack before the lock lets go, and a miniboss comes alone', () => {
  const world = floor();
  world.run.lock = 2;
  world.run.locked = true;
  world.run.wave = SNES_STAGE1.areas[1].locks[0].waves.length - 1;
  world.bench = [];
  world.fighters = world.fighters.filter((f) => f.team === 'player');
  world.events = [];
  stepAreas(world, tune);
  assert.ok(world.events.includes('ambush'), 'the lift should open before the lock releases');
  assert.ok(!world.events.includes('go'), 'and the lock should hold for it');
  assert.equal(world.run.locked, true);
  const mini = beatOf('copierGuard');
  assert.ok(mini.foes.length <= 2 && mini.hpScale > 1, 'the miniboss is one hard foe, with something to throw at him');
});

test('the photocopier fire burns whoever stands in it, and burns out', () => {
  const world = floor();
  clearTo(world, 5);
  const s = world.beats.scenery;
  assert.equal(s.id, 'fire');
  const p = player(world);
  p.x = s.x;
  p.hp = PIPS;
  for (let i = 0; i < FIRE_DAMAGE_EVERY * 2; i++) stepBeats(world, tune);
  assert.ok(p.hp < PIPS, 'standing in the fire should hurt');
  p.x = s.x + 200;
  const held = p.hp;
  for (let i = 0; i < s.frames; i++) stepBeats(world, tune);
  assert.equal(p.hp, held, 'out of the fire, no damage');
  assert.equal(world.beats.scenery, null, 'the fire should burn out');
});

test("Stage 5's window drags the fight, and Stage 3's lights stun the room", () => {
  const wind = STAGE5_BEATS.find((b) => b.scenery === 'wind');
  const dark = STAGE3_BEATS.find((b) => b.scenery === 'dark');
  assert.ok(wind && dark, 'both floors have their own scenery');
  const world = floor();
  world.beats.scenery = { id: 'wind', t: 0, frames: 60, x: 0 };
  const p = player(world);
  const x = p.x;
  stepBeats(world, tune);
  assert.ok(p.x > x, 'the wind should push');
});

test('every beat fires once and only once', () => {
  const world = floor();
  const seen = [];
  for (let lock = 0; lock <= 6; lock++) seen.push(...clearTo(world, lock).filter((e) => e.startsWith('beat:')));
  for (let i = 0; i < 300; i++) stepBeats(world, tune);
  assert.equal(new Set(seen).size, seen.length, 'a beat fired twice');
  assert.equal(seen.length, STAGE1_BEATS.filter((b) => b.sort !== 'ambush' && b.sort !== 'miniboss').length);
});

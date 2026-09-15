import test from 'node:test';
import assert from 'node:assert/strict';
import { fighter } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { CROWD, spawnStaff } from '../src/stage1/staff.mjs';
import { readLook, readout } from '../src/stage1/readout.mjs';
import { buildDials } from '../src/lab/dials.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';
import { BRAWL_WEIGHT, weighShared, weighed } from '../src/snes/weight.mjs';

const HURT = ['hurt', 'knockdown', 'bound'];
const pad = () => ({ held: new Set(), pressed: new Set(), released: new Set(), step: 0, aim: false, dash: null });

// The brawl lab's room at the SNES weight and scale, with nobody touching the pad.
function room(kinds, extraPlayer = false) {
  weighShared();
  const tune = scaledTune(weighed(tuneFor('ward'), BRAWL_WEIGHT), STAGE1.scale);
  const world = newFloor('ward', tune);
  const p = Object.assign(world.fighters.find((f) => f.team === 'player'), { x: 60, hp: 999 });
  world.fighters = [p];
  if (extraPlayer) world.fighters.push(Object.assign(fighter('player2', 'player', 240, 200, tune), { hp: 999, facing: -1 }));
  Object.assign(world, { floor: { left: 16, right: 282, top: 150, bottom: 216 }, bench: [], tapes: [], locked: true });
  spawnStaff(world, kinds, tune);
  return { world, tune };
}

function watch(world, tune, frames) {
  const foes = world.fighters.filter((f) => f.kind);
  const travel = new Map(foes.map((f) => [f, 0]));
  const states = new Map(foes.map((f) => [f, new Set()]));
  const hits = new Map(world.fighters.filter((f) => f.team === 'player').map((p) => [p.id, []]));
  const was = new Map();
  for (let t = 0; t < frames; t++) {
    const last = new Map(foes.map((f) => [f, [f.x, f.y]]));
    stepFloor(world, pad(), tune);
    for (const f of foes) {
      const [x, y] = last.get(f);
      if (t >= 60) travel.set(f, travel.get(f) + Math.abs(f.x - x) + Math.abs(f.y - y));
      states.get(f).add(f.state);
    }
    for (const p of world.fighters.filter((f) => f.team === 'player')) {
      const hurt = HURT.includes(p.state);
      if (hurt && !was.get(p.id)) hits.get(p.id).push(t);
      was.set(p.id, hurt);
    }
  }
  return { foes, travel, states, hits };
}

test('with no input every foe keeps moving and the idle auditor is hit within a few seconds, again and again', () => {
  const { world, tune } = room(['associate', 'associate', 'manager', 'supervisor']);
  const { foes, travel, states, hits } = watch(world, tune, 1200);
  for (const f of foes) {
    assert.ok(travel.get(f) > 40, `${f.id} moved only ${travel.get(f).toFixed(1)} px`);
    assert.ok(states.get(f).size >= 3, `${f.id} only ${[...states.get(f)]}`);
  }
  const times = hits.get('player');
  assert.ok(times.length >= 4, `hit ${times.length} times`);
  assert.ok(times[0] <= 240, `first hit at frame ${times[0]}`);
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  assert.ok(Math.max(...gaps) <= 240, `longest gap between hits ${Math.max(...gaps)} frames`);
});

test('waiting foes feint, taunt and step round, and taunts carry their gesture', () => {
  const { world, tune } = room(['associate', 'associate', 'supervisor', 'manager']);
  const gestures = new Set();
  const seen = new Set();
  for (let t = 0; t < 1800; t++) {
    stepFloor(world, pad(), tune);
    for (const f of world.fighters.filter((o) => o.kind)) {
      seen.add(f.state);
      if (f.state === 'taunt') gestures.add(f.gesture);
    }
  }
  for (const s of ['feint', 'taunt', 'walk', 'windup', 'punch']) assert.ok(seen.has(s), `never ${s}: ${[...seen]}`);
  assert.ok(gestures.size >= 2 && !gestures.has(null), `gestures ${[...gestures]}`);
});

test('Counsel keeps a wider circle than an Associate while they wait', () => {
  const { world, tune } = room(['associate', 'counsel']);
  const p = world.fighters[0];
  const gap = { associate: [], counsel: [] };
  for (let t = 0; t < 900; t++) {
    stepFloor(world, pad(), tune);
    p.invuln = 99;
    for (const f of world.fighters.filter((o) => o.kind && ['walk', 'idle', 'guard'].includes(o.state))) gap[f.kind].push(Math.abs(f.x - p.x));
  }
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  assert.ok(mean(gap.counsel) > mean(gap.associate) + 10, `counsel ${mean(gap.counsel)}, associate ${mean(gap.associate)}`);
});

test('the placeholder readout names taunts by gesture and marks feints and shoves', () => {
  const tune = scaledTune(tuneFor('ward'), STAGE1.scale);
  const foe = (fields) => Object.assign(fighter('a1', 'foe', 0, 0, tune), { kind: 'associate' }, fields);
  assert.equal(readLook(foe({ state: 'taunt', gesture: 'slap' })), 'taunt');
  assert.equal(readout(foe({ state: 'taunt', gesture: 'slap' }), tune).gesture, 'SLAP');
  assert.equal(readout(foe({ state: 'feint' }), tune).tag, 'FEINT');
  assert.equal(readout(foe({ state: 'shove' }), tune).tag, 'SHOVE');
  assert.equal(readout(foe({ state: 'walk' }), tune).gesture, null);
});

test('the brawl lab turns aggression, circle radius, taunts and close-in time', () => {
  const dials = buildDials(tuneFor('ward')).filter((d) => d.group === 'crowd');
  assert.deepEqual(dials.map((d) => d.key), ['aggression', 'circleRadius', 'tauntChance', 'closeIn']);
  for (const d of dials) assert.equal(d.value, CROWD[d.key]);
  const before = { ...CROWD };
  CROWD.circleRadius = 80;
  assert.equal(scaledTune(tuneFor('ward'), STAGE1.scale).crowd.circleRadius, 120);
  Object.assign(CROWD, before);
});

test('two auditors split the crowd and both are pressed', () => {
  const { world, tune } = room(['associate', 'associate', 'manager', 'supervisor'], true);
  const { hits, foes } = watch(world, tune, 900);
  assert.ok(hits.get('player').length >= 1, 'player 1 never hit');
  assert.ok(hits.get('player2').length >= 1, 'player 2 never hit');
  // A grabbed or floored auditor draws the crowd off for a moment, so count frames the crowd is split.
  let split = 0;
  for (let t = 0; t < 300; t++) {
    stepFloor(world, pad(), tune);
    if (new Set(foes.filter((f) => world.fighters.includes(f)).map((f) => f.prey)).size === 2) split++;
  }
  assert.ok(split >= 100, `split for ${split} of 300 frames`);
});

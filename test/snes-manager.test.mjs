import test from 'node:test';
import assert from 'node:assert/strict';
import { player } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { spawnStaff } from '../src/stage1/staff.mjs';
import { snesTune as snesBase } from '../src/snes/fight.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';

const snesTune = () => scaledTune(snesBase('ward'), STAGE1.scale);

function managerFloor(tune) {
  const world = newFloor('ward', tune);
  world.fighters = world.fighters.filter((f) => f.team === 'player');
  spawnStaff(world, ['manager'], tune);
  const p = player(world);
  p.hp = p.maxHp = 1e6;
  return { world, p, m: world.fighters.find((f) => f.kind === 'manager') };
}

// Walks toward the Manager and punches every 8 frames while he is in front. Punching every 8 frames
// regardless chains punches forever, so that bot never walks or turns and stalls on any foe.
function botPad(p, m, tune, frame) {
  const held = new Set();
  const dx = m.x - p.x;
  const dy = m.y - p.y;
  if (Math.abs(dx) > tune.punchReach * 0.6 || Math.sign(dx) !== p.facing) held.add(dx > 0 ? 'right' : 'left');
  if (Math.abs(dy) > tune.depthReach / 2) held.add(dy > 0 ? 'down' : 'up');
  const punch = frame % 8 === 0 && Math.sign(dx) === p.facing;
  return { held, pressed: new Set(punch ? ['b'] : []), dash: null, step: 0, aim: false };
}

function fight(tune, frames) {
  const { world, p, m } = managerFloor(tune);
  for (let t = 0; t < frames; t++) {
    if (m.state === 'ko' || !world.fighters.includes(m)) return t;
    stepFloor(world, botPad(p, m, tune, t), tune);
  }
  return null;
}

test('the SNES Manager walks no faster than the auditor', () => {
  const tune = snesTune();
  assert.ok(tune.kinds.manager.speed <= tune.walkX, `${tune.kinds.manager.speed} > ${tune.walkX}`);
});

test('a bot that walks at the SNES Manager and punches every 8 frames knocks him out within 1,200 frames', () => {
  const ko = fight(snesTune(), 1200);
  assert.ok(ko !== null, 'still standing after 1,200 frames');
});

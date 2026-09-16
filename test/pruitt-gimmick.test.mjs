// Pruitt, the Floor Manager (item 2344): fists only chip him, a rammed copier dazes him, and both
// kits have their own way of setting one rolling.
import test from 'node:test';
import assert from 'node:assert/strict';
import { player, set } from '../src/stage1/moves.mjs';
import { PIPS, newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { spawnStaff } from '../src/stage1/staff.mjs';
import { GIMMICKS, RAM, armGimmick, gimmickBoss, gimmickState, parkedRams, placeRams, shove, stepGimmicks } from '../src/stage1/gimmick.mjs';
import { STAGE1_BEATS } from '../src/stage1/beats.mjs';
import { freeInjunction } from '../src/injunction.mjs';

const MINUTE = 60 * 60;

// The copy room on its own: the auditor, Pruitt and two copiers parked either side of him.
function copyRoom(who = 'ward', rams = [{ dx: 120, y: 188 }, { dx: 210, y: 188 }]) {
  const tune = tuneFor(who);
  const world = newFloor(who, tune);
  world.fighters = world.fighters.filter((f) => f.team === 'player');
  world.floor = { left: 16, right: 240, top: 160, bottom: 216 };
  spawnStaff(world, ['pruitt'], tune);
  const boss = armGimmick(gimmickBoss(world) ?? world.fighters.find((f) => f.kind === 'pruitt'));
  Object.assign(boss, { x: 170, y: 188 });
  placeRams(world, rams);
  world.cooldown = freeInjunction();
  return { world, tune, boss };
}

const pad = ({ held = [], b = false, a = false, heavy = false, parry = false, clear = false, special = false }) => ({
  held: new Set(held), pressed: new Set([...(b ? ['b'] : []), ...(a ? ['a'] : [])]), heavy, parry, block: parry, clear, special, step: 0, dash: null,
});

// Runs the floor, answering every event the frames pushed.
function run(world, tune, frames, brain) {
  const seen = [];
  for (let i = 0; i < frames; i++) {
    stepFloor(world, pad(brain(i, world) ?? {}), tune);
    stepGimmicks(world, tune);
    seen.push(...world.events);
    world.events = [];
  }
  return seen;
}

// Walks up to whatever he is told to stand beside, from the side he is told to stand on.
const walkTo = (p, x) => (Math.abs(p.x - x) <= 2 ? [] : [p.x < x ? 'right' : 'left']);

test('the copy room puts Pruitt on the floor with his copiers', () => {
  const { world, boss } = copyRoom();
  assert.equal(boss.kind, 'pruitt');
  assert.equal(boss.boss, true);
  assert.equal(boss.gimmick.floor, Math.ceil(boss.maxHp * GIMMICKS.pruitt.floor));
  assert.equal(parkedRams(world).length, 2);
  assert.deepEqual(gimmickState(boss), { id: 'pruitt', hp: boss.hp, floor: boss.gimmick.floor, open: false, rammed: 0 });
  // The beat map sends him to the copy room instead of the old plain Account Manager.
  const beat = STAGE1_BEATS.find((b) => b.id === 'copierGuard');
  assert.deepEqual(beat.foes, ['pruitt', 'associate']);
  assert.equal(beat.gimmick, 'pruitt');
  assert.equal(beat.rams.length, 2);
});

test('fists alone chip Pruitt to his floor and can never finish him', () => {
  for (const who of ['ward', 'mercer']) {
    const { world, tune, boss } = copyRoom(who);
    world.rams = [];
    // Three in-game minutes of nothing but punching: walk into him and mash.
    run(world, tune, 3 * MINUTE, (i, w) => {
      const p = player(w);
      const b = gimmickBoss(w);
      return { held: b ? walkTo(p, b.x - p.facing * 14) : [], b: i % 4 === 0 };
    });
    assert.ok(boss.hp > 0, `${who}: fists put him down in three minutes`);
    assert.equal(boss.hp, boss.gimmick.floor, `${who}: chip stopped somewhere other than his floor`);
    assert.equal(boss.gimmick.rammed, 0);
  }
});

test('a copier rolled into him dazes him, and the combo that follows takes real hide off', () => {
  const { world, tune, boss } = copyRoom();
  shove(world, parkedRams(world)[0], 1);
  run(world, tune, 60, () => ({}));
  assert.ok(boss.gimmick.dazed > 0, 'the copier went through him');
  assert.equal(boss.gimmick.rammed, 1);
  const was = boss.hp;
  Object.assign(player(world), { x: boss.x - 14, facing: 1 });
  run(world, tune, 80, (i) => ({ b: i % 5 === 0 }));
  assert.ok(boss.hp <= was - 3, `a dazed Pruitt took only ${was - boss.hp}`);
  // The copier is spent where it hit him, and another is wheeled out later.
  assert.equal(world.rams[0].state, 'spent');
  run(world, tune, RAM.respawn, () => ({}));
  assert.equal(world.rams[0].state, 'parked');
});

test("Ward's heavy sends the copier in front of him rolling, and his room clear shoves every one", () => {
  const { world, tune } = copyRoom('ward', [{ dx: 120, y: 188 }, { dx: 60, y: 188 }]);
  const p = player(world);
  Object.assign(p, { x: 100, y: 188, facing: 1 });
  const seen = run(world, tune, 20, (i) => ({ heavy: i === 0 }));
  assert.ok(seen.includes('ram:heavy'), 'the heavy left the copier where it stood');
  assert.ok(world.rams[0].vx > 0, 'it rolled the wrong way');
  assert.equal(world.rams[1].state, 'parked', 'the heavy shoved the copier behind him too');

  const clear = copyRoom('ward', [{ dx: 120, y: 188 }, { dx: 60, y: 188 }]);
  Object.assign(player(clear.world), { x: 100, y: 188, facing: 1 });
  const fired = run(clear.world, clear.tune, 3, (i) => ({ clear: i === 0 }));
  assert.ok(fired.includes('ram:clear'), 'the room clear left the copiers standing');
  assert.ok(clear.world.rams.every((r) => r.state === 'rolling'), 'only some of them rolled');
  assert.ok(clear.world.rams[0].vx > 0 && clear.world.rams[1].vx < 0, 'they roll away from him');
});

test("Mercer's dive kick sends a copier rolling", () => {
  const { world, tune } = copyRoom('mercer', [{ dx: 150, y: 188 }]);
  const p = player(world);
  Object.assign(p, { x: 120, y: 188, facing: 1 });
  const seen = run(world, tune, 40, (i, w) => {
    const q = player(w);
    if (q.state === 'jump' && q.z > 4) return { held: ['down', 'right'], b: true };
    return { a: q.state === 'idle' };
  });
  assert.ok(seen.includes('ram:dive'), 'the dive kick went over the copier');
  assert.ok(world.rams[0].vx > 0);
});

test('a parried charge stumbles Pruitt back into the copier behind him', () => {
  const { world, tune, boss } = copyRoom('mercer', [{ dx: 210, y: 188 }]);
  const p = player(world);
  Object.assign(p, { x: 120, y: 188, facing: 1 });
  Object.assign(boss, { x: 160, y: 188, facing: -1 });
  // The parry is the auditor's, so it is the parry window that catches the charge, not a hit.
  set(boss, 'hurt');
  boss.stagger = tune.parryStagger;
  boss.t = 0;
  run(world, tune, RAM.stumbleFrames + 4, () => ({}));
  assert.equal(boss.gimmick.rammed, 1, 'the stumble missed the copier behind him');
  assert.ok(boss.gimmick.dazed > 0);
  assert.equal(world.rams[0].state, 'spent');
});

test('a rolling copier bowls ordinary staff over and keeps going', () => {
  const { world, tune } = copyRoom('ward', [{ dx: 100, y: 188 }]);
  spawnStaff(world, ['associate'], tune);
  const mook = world.fighters.find((f) => f.kind === 'associate');
  Object.assign(mook, { x: 140, y: 188 });
  const hp = mook.hp;
  shove(world, parkedRams(world)[0], 1);
  run(world, tune, 24, () => ({}));
  assert.ok(mook.hp < hp, 'the copier rolled straight through him');
  assert.ok(player(world).hp === PIPS);
});

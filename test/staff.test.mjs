import test from 'node:test';
import assert from 'node:assert/strict';
import { landHit, player } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { KINDS, MAX_ON_SCREEN, TAPE, pose, rowHit, spawnStaff } from '../src/stage1/staff.mjs';

const pad = (pressed = []) => ({ held: new Set(), pressed: new Set(pressed), dash: null });
const idle = pad();

function floor(kinds, who = 'ward') {
  const tune = tuneFor(who);
  const world = newFloor(who, tune);
  world.fighters = world.fighters.filter((f) => f.team === 'player');
  spawnStaff(world, kinds, tune);
  return { world, tune, p: player(world), foe: (kind) => world.fighters.find((f) => f.kind === kind) };
}

function run(world, tune, frames, input = () => idle, until = () => false) {
  const events = [];
  for (let i = 0; i < frames && !until(); i++) {
    stepFloor(world, input(i), tune);
    events.push(...world.events);
  }
  return events;
}

test('the hit test is gated by row: in front, within reach and on the same depth line', () => {
  const tune = tuneFor('ward');
  const a = { x: 100, y: 190, facing: 1 };
  assert.ok(rowHit(a, { x: 118, y: 193 }, 20, tune));
  assert.ok(!rowHit(a, { x: 118, y: 190 + tune.depthReach + 1 }, 20, tune), 'another row');
  assert.ok(!rowHit(a, { x: 82, y: 190 }, 20, tune), 'behind');
  assert.ok(!rowHit(a, { x: 121, y: 190 }, 20, tune), 'out of reach');
});

test('at most three foes are on screen; the fourth waits for a seat and walks on after a knock-out', () => {
  const { world, tune } = floor(['associate', 'manager', 'counsel', 'supervisor']);
  const staff = () => world.fighters.filter((f) => f.kind);
  assert.equal(staff().length, MAX_ON_SCREEN);
  assert.deepEqual(world.bench, ['supervisor']);
  const a = staff()[0];
  a.hp = 1;
  landHit(world, a, { damage: 1, heavy: false, dir: 1 }, tune);
  run(world, tune, 200, () => idle, () => a.state === 'ko');
  assert.equal(a.state, 'ko', 'a knocked-out foe sits dazed');
  assert.equal(staff().length, MAX_ON_SCREEN, 'and holds his seat while he blinks');
  run(world, tune, 60);
  assert.ok(!world.fighters.includes(a), 'then blinks away');
  assert.ok(staff().some((f) => f.kind === 'supervisor'));
});

test('the Associate walks up, winds up quickly, then jabs', () => {
  const { world, tune, p, foe } = floor(['associate']);
  const a = foe('associate');
  a.nextMove = 'jab';
  run(world, tune, 600, () => idle, () => a.state === 'windup');
  assert.equal(a.state, 'windup');
  const hp = p.hp;
  run(world, tune, 60, () => idle, () => a.state === 'punch');
  assert.equal(a.state, 'punch');
  assert.ok(KINDS.associate.windup < KINDS.supervisor.moves.overhead.windup, 'quicker than the heavies');
  assert.equal(p.hp, hp - 1);
});

test('the Associate reels from one hit and falls on the second', () => {
  const { world, tune, foe } = floor(['associate']);
  const a = foe('associate');
  landHit(world, a, { damage: 1, heavy: false, dir: 1 }, tune);
  assert.equal(a.state, 'hurt');
  landHit(world, a, { damage: 1, heavy: false, dir: 1 }, tune);
  assert.equal(a.state, 'knockdown');
});

test('the Manager is a slow heavy: tougher and slower than an Associate, and his haymaker knocks down', () => {
  assert.ok(KINDS.manager.speed < KINDS.associate.speed);
  assert.ok(KINDS.manager.hp >= KINDS.associate.hp * 3);
  assert.ok(KINDS.manager.moves.haymaker.heavy);
});

test('Counsel keeps his distance and throws red tape; the bound auditor mashes free', () => {
  const { world, tune, p, foe } = floor(['counsel']);
  const c = foe('counsel');
  c.nextMove = 'tape';
  const events = run(world, tune, 600, () => idle, () => p.state === 'bound');
  assert.ok(events.includes('redTape'));
  assert.equal(p.state, 'bound');
  assert.ok(Math.abs(c.x - p.x) >= 32, 'thrown from a distance');
  run(world, tune, 10);
  assert.equal(p.state, 'bound', 'holding still does not free you soon');
  const freed = run(world, tune, TAPE.mash * 2, (i) => (i % 2 ? idle : pad(['b'])), () => p.state !== 'bound');
  assert.ok(freed.includes('breakFree'));
  assert.equal(p.state, 'idle');
  assert.ok(p.invuln > 0);
});

test('a tape on another row flies past', () => {
  const { world, tune, p, foe } = floor(['counsel']);
  const c = foe('counsel');
  pose(world, 'bind', tune);
  run(world, tune, 1);
  world.tapes.length = 0;
  world.tapes.push({ x: p.x + 20, y: p.y + tune.depthReach + 2, vx: -2, t: 0, from: c.id });
  c.cooldown = 999;
  c.y = p.y + 20;
  run(world, tune, 20);
  assert.notEqual(p.state, 'bound');
});

test('the Supervisor guards against punches until a thrown foe breaks his guard', () => {
  const { world, tune, p, foe } = floor(['supervisor']);
  const s = foe('supervisor');
  Object.assign(s, { x: p.x + 16, y: p.y, cooldown: 999 });
  run(world, tune, 1);
  assert.equal(s.state, 'guard');
  assert.equal(landHit(world, s, { damage: 1, heavy: false, dir: 1 }, tune), false);
  assert.equal(landHit(world, s, { damage: 3, heavy: true, dir: 1 }, tune), false, 'even a finisher');
  assert.equal(s.hp, KINDS.supervisor.hp);
  assert.ok(world.events.includes('blocked'));
  assert.ok(KINDS.supervisor.hp >= KINDS.associate.hp * 4);

  const g = floor(['associate', 'supervisor']);
  pose(g.world, 'guardbreak', g.tune);
  const events = run(g.world, g.tune, 30, () => idle, () => g.foe('supervisor').state === 'knockdown');
  const sup = g.foe('supervisor');
  assert.ok(events.includes('guardBreak'));
  assert.equal(sup.state, 'knockdown');
  assert.ok(sup.guardDown > 0);
  run(g.world, g.tune, 80, () => idle, () => sup.state === 'idle' || sup.state === 'walk');
  assert.notEqual(sup.state, 'guard', 'he stays open for a while after getting up');
});

test('hits on the foes fill the injunction meter', () => {
  const { world, tune, p, foe } = floor(['associate']);
  const a = foe('associate');
  a.hp = 99;
  a.hitsToFall = 0;
  Object.assign(a, { x: p.x + 16, y: p.y, cooldown: 999 });
  p.facing = 1;
  run(world, tune, 200, (i) => (i % 40 === 0 ? pad(['b']) : idle), () => {
    Object.assign(a, { x: p.x + 16, y: p.y, cooldown: 999 });
    return false;
  });
  assert.ok(world.meterHits >= 4, `${world.meterHits}`);
  assert.ok(world.meter >= 1);
});

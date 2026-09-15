import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOES } from '../src/stage1/tuning.mjs';
import { createWorld, spawnFoe, stepFoes, hitFoe, visible, attackers } from '../src/stage1/foes.mjs';
import { spawnBoss, LOOPS, PATTERNS, windupFor } from '../src/stage1/boss.mjs';
import { createStage, stepWorld, STAGE1_SCREENS } from '../src/stage1/waves.mjs';
import { tuningTables } from '../src/tune.mjs';

const neverGuard = (world) => Object.assign(world, { rand: () => 0.99 });

test('foes: never more than the token limit close in or swing at once', () => {
  const world = createWorld({ seed: 7, player: { x: 128, y: 184 } });
  [[40, 160], [60, 210], [200, 170], [220, 200], [128, 150], [128, 216]].forEach(([x, y]) => spawnFoe(world, 'clerk', x, y));
  let swings = 0;
  for (let i = 0; i < 900; i++) {
    stepFoes(world);
    assert.ok(attackers(world) <= FOES.attackTokens, `frame ${i}: ${attackers(world)} tokens`);
    const busy = world.foes.filter((f) => ['windup', 'attack', 'recover'].includes(f.state)).length;
    assert.ok(busy <= FOES.attackTokens, `frame ${i}: ${busy} attacking`);
    swings += world.events.filter((e) => e.type === 'playerHit').length;
  }
  assert.ok(swings > 3, `${swings} swings landed`);
});

function telegraph() {
  const world = createWorld({ player: { x: 100, y: 184 } });
  spawnFoe(world, 'clerk', 118, 184);
  let windup = 0;
  for (let i = 0; i < 200; i++) {
    stepFoes(world);
    if (world.foes[0].state === 'windup') windup++;
    if (world.events.some((e) => e.type === 'playerHit')) return { windup, hitAfterWindup: world.foes[0].state === 'attack' };
    if (windup > 0) assert.ok(['windup', 'attack'].includes(world.foes[0].state), 'no hit before the wind-up ends');
  }
  return { windup, hitAfterWindup: false };
}

test('foes: every swing is telegraphed for exactly windupFrames first, live from the table', () => {
  assert.deepEqual(telegraph(), { windup: FOES.windupFrames, hitAfterWindup: true });
  const was = FOES.windupFrames;
  FOES.windupFrames = 30;
  try {
    assert.equal(telegraph().windup, 30);
  } finally {
    FOES.windupFrames = was;
  }
});

test('foes: a launched foe can be juggled only juggleLimit times, then lands and flashes out', () => {
  const world = neverGuard(createWorld({ player: { x: 100, y: 184 } }));
  const foe = spawnFoe(world, 'supervisor', 120, 184);
  assert.equal(hitFoe(world, foe, { damage: 1, heavy: true, dir: 1 }), 'launched');
  const results = [];
  for (let i = 0; i < FOES.juggleLimit + 2; i++) results.push(hitFoe(world, foe, { damage: 1, dir: 1 }));
  assert.equal(results.filter((r) => r === 'juggled').length, FOES.juggleLimit);
  assert.equal(results.at(-1), 'ignored');
  while (foe.state === 'air') stepFoes(world);
  assert.equal(foe.state, 'down');

  const doomed = spawnFoe(world, 'temp', 60, 184);
  assert.equal(hitFoe(world, doomed, { damage: 99, dir: -1 }), 'killed');
  while (doomed.state === 'air') stepFoes(world);
  assert.equal(doomed.state, 'dying');
  const flashes = [];
  for (let i = 0; i < FOES.deathFlashFrames && world.foes.includes(doomed); i++) {
    flashes.push(visible(doomed));
    stepFoes(world);
  }
  assert.ok(flashes.includes(true) && flashes.includes(false), 'flashes');
  assert.ok(!world.foes.includes(doomed), 'gone after the flash');
});

test('foes: a foe knocked flying bowls over a blocker it crashes into', () => {
  const world = createWorld({ player: { x: 60, y: 184 } });
  const flyer = spawnFoe(world, 'clerk', 80, 184);
  const blocker = spawnFoe(world, 'supervisor', 96, 184);
  world.rand = () => 0.99;
  hitFoe(world, flyer, { damage: 1, heavy: true, knockback: 2, dir: 1 });
  let bowled = false;
  for (let i = 0; i < 30 && !bowled; i++) {
    stepFoes(world);
    bowled = world.events.some((e) => e.foe === blocker.id && e.result === 'bowled');
  }
  assert.ok(bowled);
});

test('boss: three patterns, and a new faster loop exactly at half health', () => {
  const world = createWorld({ player: { x: 100, y: 186 } });
  const boss = spawnBoss(world, 150, 186);
  assert.deepEqual([...new Set(LOOPS[1])].sort(), [...PATTERNS].sort());
  assert.deepEqual([...new Set(LOOPS[2])].sort(), [...PATTERNS].sort());
  assert.notDeepEqual(LOOPS[1], LOOPS[2]);

  const seen = new Set();
  for (let i = 0; i < 1200; i++) {
    stepFoes(world);
    if (boss.state === 'windup') seen.add(boss.pattern);
  }
  assert.deepEqual([...seen].sort(), [...PATTERNS].sort());
  assert.equal(windupFor(boss), 32);

  boss.invuln = 0;
  while (boss.hp - 1 > boss.maxHp / 2) {
    hitFoe(world, boss, { damage: 1 });
    assert.equal(boss.phase, 1);
  }
  world.events = [];
  assert.equal(hitFoe(world, boss, { damage: 1 }), 'enraged');
  assert.equal(boss.phase, 2);
  assert.ok(world.events.some((e) => e.type === 'phaseChange' && e.phase === 2));
  assert.ok(windupFor(boss) < 32);
  assert.equal(hitFoe(world, boss, { damage: 1 }), 'ignored', 'invulnerable while enraging');
});

test('waves: the camera locks on each screen until its last wave is down, then GO', () => {
  const world = createWorld({ player: { x: 60, y: 184 } });
  const stage = createStage(world);
  stepWorld(world);
  assert.ok(stage.locked);
  assert.equal(world.foes.length, STAGE1_SCREENS[0].waves[0].length);
  world.player.x = 900;
  stepWorld(world);
  assert.ok(world.player.x <= 256, 'cannot walk off a locked screen');

  const clear = () => {
    world.foes = [];
    stepWorld(world);
  };
  for (let w = 1; w < STAGE1_SCREENS[0].waves.length; w++) {
    clear();
    assert.equal(stage.wave, w);
  }
  clear();
  assert.ok(!stage.locked && stage.go > 0 && stage.screen === 1);
  for (let i = 0; i < 400 && !stage.locked; i++) {
    world.player.x += 2;
    stepWorld(world);
  }
  assert.ok(stage.locked);
  assert.equal(stage.cameraX, STAGE1_SCREENS[1].lockAt);
});

test('tune: every enemy number is on a registered table', () => {
  const names = tuningTables().map((t) => t.name);
  for (const name of ['foes', 'foeTypes', 'accountManager', 'stage1Camera']) assert.ok(names.includes(name), name);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { landHit, player, set } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { LOOPS, VELLUM, enterOffice, guardFor, poseOffice, vellum, windupFor } from '../src/stage1/vellum.mjs';

const pad = (pressed = []) => ({ held: new Set(), pressed: new Set(pressed), dash: null });
const idle = pad();

function office(who = 'ward') {
  const tune = tuneFor(who);
  const world = enterOffice(newFloor(who, tune), tune);
  return { world, tune, p: player(world), v: vellum(world) };
}

function run(world, tune, frames, input = () => idle, until = () => false) {
  const events = [];
  for (let i = 0; i < frames && !until(); i++) {
    stepFloor(world, input(i), tune);
    events.push(...world.events);
  }
  return events;
}

// Out of reach and untouchable, so Vellum runs his pattern undisturbed.
const bystander = (world) => () => { Object.assign(player(world), { invuln: 999 }); return idle; };

function attacks(world, tune, v, count) {
  const seen = [];
  run(world, tune, 5000, bystander(world), () => {
    if (v.state === 'windup' && v.t === 1) seen.push(v.attack);
    return seen.length >= count;
  });
  return seen;
}

test('the office is one locked screen with only the auditor and Vellum', () => {
  const { world, tune, p, v } = office();
  assert.equal(world.fighters.length, 2);
  assert.equal(v.hp, 16);
  p.x = world.floor.right;
  run(world, tune, 30);
  assert.equal(world.cameraX, 0);
});

test('he loops rush, sweep, red tape; with his fangs out the loop is longer and every timing quicker', () => {
  const { world, tune, v } = office();
  assert.deepEqual(attacks(world, tune, v, 4), [...LOOPS[1], LOOPS[1][0]]);
  assert.ok(windupFor({ fangs: false }) >= 24, 'a telegraph held about half a second');
  v.hp = VELLUM.fangsAt;
  set(v, 'recover');
  const events = run(world, tune, 5, bystander(world));
  assert.ok(events.includes('fangs'));
  assert.ok(v.fangs);
  assert.deepEqual(attacks(world, tune, v, 4), LOOPS[2]);
  for (const k of ['windup', 'guard', 'recover', 'rushSpeed']) {
    assert.ok(VELLUM[k][1] !== VELLUM[k][0], k);
  }
  assert.ok(windupFor(v) < windupFor({}) && guardFor(v) < guardFor({}));
});

test('the rush flashes a telegraph, then crosses the row and costs two pips', () => {
  const { world, tune, p, v } = office();
  poseOffice(world, 'rush');
  const hp = p.hp;
  const events = run(world, tune, 120, () => idle, () => v.state === 'recover');
  assert.equal(v.state, 'recover');
  assert.equal(p.hp, hp - VELLUM.damage);
  assert.ok(events.includes('heavy'));
});

test('he guards punches and his wind-up; the recovery after an attack is the opening', () => {
  const { world, tune, v } = office();
  assert.equal(v.state, 'guard');
  assert.equal(landHit(world, v, { damage: 3, heavy: true, dir: -1 }, tune), false);
  assert.ok(world.events.includes('blocked'));
  poseOffice(world, 'rush');
  assert.equal(landHit(world, v, { damage: 1, heavy: false, dir: -1 }, tune), false, 'armoured wind-up');
  set(v, 'recover');
  v.armoured = false;
  assert.equal(landHit(world, v, { damage: 1, heavy: false, dir: -1 }, tune), true);
  assert.equal(v.hp, VELLUM.hp - 1);
});

test('a thrown Associate breaks his guard and leaves him open', () => {
  const { world, tune, v } = office();
  world.bench.push('associate');
  run(world, tune, 1);
  const a = world.fighters.find((f) => f.kind === 'associate');
  Object.assign(a, { x: v.x - 18, y: v.y });
  landHit(world, a, { damage: tune.throwDamage, heavy: true, dir: 1 }, tune);
  const events = run(world, tune, 30, () => idle, () => v.state === 'knockdown');
  assert.ok(events.includes('guardBreak'));
  assert.equal(v.state, 'knockdown');
  assert.ok(v.hp < VELLUM.hp);
  assert.ok(v.guardDown > 0);
});

test('he summons one Associate after his first attack and one more with his fangs out', () => {
  const { world, tune, v } = office();
  const events = run(world, tune, 3000, bystander(world), () => v.summoned === 1);
  assert.ok(events.includes('summon'));
  assert.ok(v.attacks >= 1);
  run(world, tune, 300, bystander(world));
  assert.ok(world.fighters.some((f) => f.kind === 'associate'));
  world.fighters = world.fighters.filter((f) => f.kind !== 'associate');
  run(world, tune, 600, bystander(world));
  assert.equal(v.summoned, 1, 'no second call before the fangs');
  v.hp = VELLUM.fangsAt;
  run(world, tune, 3000, bystander(world), () => v.summoned === 2);
  assert.equal(v.summoned, 2);
  world.fighters = world.fighters.filter((f) => f.kind !== 'associate');
  run(world, tune, 1500, bystander(world));
  assert.equal(v.summoned, 2, 'twice only');
});

test('his 16-pip boss bar sits on screen, under the HUD strip', async () => {
  const { WIDTH } = await import('../src/nes/screen.mjs');
  const { bossBarLayout } = await import('../src/hud.mjs');
  const bar = bossBarLayout({ name: 'vellum', hp: 12, maxHp: VELLUM.hp });
  assert.equal(bar.pips.length, 16);
  assert.equal(bar.pips.filter((p) => p.full).length, 12);
  assert.ok(bar.pips[0].x >= 0 && bar.pips.at(-1).x + bar.pips.at(-1).w <= WIDTH);
});

for (const who of ['ward', 'mercer']) {
  test(`${who} can beat him by punching his openings; he slumps, then the stage clears`, () => {
    const { world, tune, p, v } = office(who);
    let beaten = false;
    const events = run(world, tune, 30000, (i) => {
      p.invuln = 999;
      if (['recover', 'hurt', 'idle'].includes(v.state) && ['idle', 'walk'].includes(p.state)) {
        p.facing = v.x >= p.x ? 1 : -1;
        Object.assign(p, { x: v.x - p.facing * 14, y: v.y });
      }
      return i % 6 === 0 ? pad(['b']) : idle;
    }, () => v.state === 'slumped');
    assert.ok(events.includes('bossDown'), `hp left ${v.hp}`);
    assert.equal(v.state, 'slumped');
    run(world, tune, VELLUM.slumpFrames + 5, () => idle, () => { beaten = world.events.includes('bossBeaten'); return beaten; });
    assert.ok(beaten || events.includes('bossBeaten'));
    assert.ok(world.fighters.includes(v), 'he stays slumped in the office');
  });
}

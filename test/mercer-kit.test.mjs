import test from 'node:test';
import assert from 'node:assert/strict';
import { fighter } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { routeLights } from '../src/stage1/combo.mjs';
import { freeInjunction } from '../src/injunction.mjs';
import { PADS, createPad, updatePad } from '../src/input.mjs';
import { controllerSvg, legendFor } from '../src/controls.mjs';

const pad = ({ held = [], pressed = [], heavy = false, special = false, clear, parry = false } = {}) => ({
  held: new Set(held), pressed: new Set(pressed), heavy, special, clear, parry, step: 0,
});

// The auditor alone with foes who never swing, `gaps` px in front of him.
function squaredUp(who = 'mercer', gaps = [14]) {
  const tune = tuneFor(who);
  const world = newFloor(who, tune);
  const p = world.fighters.find((f) => f.team === 'player');
  const foes = gaps.map((g, i) => Object.assign(fighter(`foe${i}`, 'foe', p.x + g, p.y, tune), { dummy: true, facing: -1, hp: 30 }));
  world.fighters = [p, ...foes];
  world.props = [];
  return { tune, world, p, foe: foes[0], foes };
}

// Presses on the frames given, each as soon as the fight is not frozen; answers every event seen.
function play(ctx, script, frames = 90) {
  const seen = [];
  const queue = [...script];
  for (let i = 0; i < frames; i++) {
    let input = pad();
    if (queue.length && i >= queue[0][0] && ctx.world.hitStop === 0) input = pad(queue.shift()[1]);
    seen.push(...stepFloor(ctx.world, input, ctx.tune).events);
  }
  return seen;
}

test('Mercer kicks on A and Ward still lunges', () => {
  const m = squaredUp();
  const seen = play(m, [[0, { special: true }]], 30);
  assert.ok(seen.includes('snap'), seen.join());
  assert.equal(m.foe.hp, 30 - m.tune.thirdDamage);
  const w = squaredUp('ward', [40]);
  play(w, [[0, { special: true }]], 2);
  assert.equal(w.p.state, 'special');
});

test('Y, A, X: a light, the hook kick that dazes, and the crush', () => {
  const ctx = squaredUp();
  const seen = play(ctx, [[0, { pressed: ['b'] }], [6, { special: true }], [16, { heavy: true }]]);
  assert.ok(seen.includes('hook'), seen.join());
  assert.ok(seen.includes('crush'), seen.join());
  assert.equal(ctx.foe.hp, 30 - ctx.tune.punchDamage - ctx.tune.thirdDamage - ctx.tune.dazedDamage);
});

test('Y, Y, A sweeps the legs; X then A spins the foe away', () => {
  const low = squaredUp();
  const lowSeen = play(low, [[0, { pressed: ['b'] }], [6, { pressed: ['b'] }], [14, { special: true }]]);
  assert.ok(lowSeen.includes('low') && lowSeen.includes('down'), lowSeen.join());
  const spin = squaredUp();
  const spinSeen = play(spin, [[0, { heavy: true }], [12, { special: true }]]);
  assert.ok(spinSeen.includes('spin') && spinSeen.includes('down'), spinSeen.join());
});

test('Mercer has more routes on the map than Ward, and the map lights the three-button chain', () => {
  const ward = routeLights({ state: 'idle' }, tuneFor('ward'));
  const mercer = routeLights({ state: 'idle' }, tuneFor('mercer'));
  assert.ok(mercer.length > ward.length, `${mercer.length} vs ${ward.length}`);
  const lit = routeLights({ state: 'heavy', route: 'heavy', via: 'hook' }, tuneFor('mercer')).find((r) => r.name === 'HOOK CRUSH');
  assert.equal(lit.lit, 3);
});

test('down + an attack in a jump is the dive kick: an angled drop that knocks the foe down', () => {
  const ctx = squaredUp('mercer', [36]);
  const seen = [];
  let x0 = 0;
  for (let i = 0; i < 90; i++) {
    let input = pad();
    if (i === 0) input = pad({ pressed: ['a'] });
    else if (ctx.p.state === 'jump' && ctx.p.vz <= 0 && !ctx.p.kicked) { input = pad({ held: ['down'], pressed: ['b'] }); x0 = ctx.p.x; }
    const events = stepFloor(ctx.world, input, ctx.tune).events;
    if (events.includes('diveKick')) assert.ok(ctx.p.vx > 0 && ctx.p.vz < 0, 'drives forward and down');
    seen.push(...events);
  }
  assert.ok(seen.includes('diveKick') && seen.includes('diveHit'), seen.join());
  assert.ok(ctx.p.x > x0);
  assert.equal(ctx.foe.hp, 30 - ctx.tune.diveDamage);
});

test('Ward has no dive kick', () => {
  const ctx = squaredUp('ward', [56]);
  const seen = [];
  for (let i = 0; i < 60; i++) {
    const input = i === 0 ? pad({ pressed: ['a'] }) : ctx.p.state === 'jump' && ctx.p.vz <= 0 ? pad({ held: ['down'], pressed: ['b'] }) : pad();
    seen.push(...stepFloor(ctx.world, input, ctx.tune).events);
  }
  assert.ok(!seen.includes('diveKick'));
});

test("the controller legend names each auditor's own buttons, keys still on them", () => {
  const ward = legendFor('stage1:ward');
  const mercer = legendFor('stage1:mercer');
  assert.deepEqual([ward.l.does, ward.a.does, ward.yx.does], ['block (hold)', 'lunge', 'Injunction (clear room)']);
  assert.deepEqual([mercer.l.does, mercer.a.does, mercer.b.does, mercer.yx.does], ['parry', 'kick', 'jump, dive', 'Takedown (one foe)']);
  assert.equal(mercer.a.key, 'C');
  assert.match(controllerSvg('stage1:mercer'), /dive kick/);
});

test("Mercer's Y+X takedown hits only the nearest foe hard and clears nothing", () => {
  const ctx = squaredUp('mercer', [14, -20]);
  ctx.world.cooldown = freeInjunction();
  const seen = [];
  [['y'], ['y', 'x'], [], [], [], [], [], [], [], [], [], [], [], [], [], []].reduce((prev, down, f) => {
    const next = updatePad(prev, new Set(down), f);
    seen.push(...stepFloor(ctx.world, next, ctx.tune).events);
    return next;
  }, createPad(PADS.snes));
  assert.ok(seen.includes('takedown') && !seen.includes('injunction'), seen.join());
  const [near, far] = ctx.foes;
  assert.equal(near.hp, 30 - ctx.tune.takedownDamage);
  assert.equal(far.hp, 30, 'the foe behind him is untouched');
  assert.ok(ctx.world.cooldown.left > 0, 'on the same cooldown as the room clear');
});

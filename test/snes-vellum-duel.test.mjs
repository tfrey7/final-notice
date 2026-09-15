import test from 'node:test';
import assert from 'node:assert/strict';
import { TUNING, landHit, player, set } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { KINDS } from '../src/stage1/staff.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { VELLUM, enterOffice, vellum } from '../src/stage1/vellum.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';
import { VELLUM as SNES_VELLUM, snesTune as snesBase, useSnesTables } from '../src/snes/fight.mjs';
import { buildDials } from '../src/lab/dials.mjs';

// The tune exactly as the SNES office builds it.
function snesTune(who = 'mercer') {
  useSnesTables();
  return scaledTune(snesBase(who), STAGE1.scale);
}

// Mercer duels him with the parry; Ward blocks instead.
function office(who = 'mercer', tune = snesTune(who)) {
  const world = enterOffice(newFloor(who, tune), tune);
  return { world, tune, p: player(world), v: vellum(world) };
}

const pad = ({ b = false, parry = false, held = [] } = {}) => ({ held: new Set(held), pressed: new Set(b ? ['b'] : []), parry, step: 0, dash: null });
const OPEN = ['recover', 'hurt', 'idle', 'knockdown'];

// Walks at the nearest foe, lining up on his row. Answers the held directions.
function approach(p, f, gap) {
  const held = [];
  const dx = f.x - p.x;
  if (Math.abs(dx) > gap) held.push(dx > 0 ? 'right' : 'left');
  else if (Math.sign(dx) && Math.sign(dx) !== p.facing) held.push(dx > 0 ? 'right' : 'left');
  if (Math.abs(f.y - p.y) > 2) held.push(f.y > p.y ? 'down' : 'up');
  return held;
}

// Both bots go for Vellum, and throw anything they end up holding toward him.
const target = (world) => vellum(world);
const throwToward = (p, v) => ({ held: [v.x >= p.x ? 'right' : 'left'], b: true });

// A duel to the finish (or `cap` frames): frames taken, pips lost, blocked punches and frames spent
// in punch reach of his guard.
function duel(brain, cap = 12000) {
  // The duel as it was balanced: a parrying auditor at Ward's reach.
  const { world, tune, p, v } = office('mercer', snesTune('ward'));
  const stats = { frames: 0, pipsLost: 0, blocked: 0, facingGuard: 0, parries: 0, beaten: false };
  let hp = p.hp;
  for (let i = 0; i < cap; i++) {
    const f = target(world);
    stepFloor(world, pad(p.state === 'grab' ? throwToward(p, v) : brain(i, world, tune, p, f, v)), tune);
    stats.frames = i + 1;
    if (p.hp < hp) stats.pipsLost += hp - p.hp;
    if (world.events.includes('lifeLost')) stats.pipsLost += hp;
    hp = p.hp;
    stats.blocked += world.events.filter((e) => e === 'blocked').length;
    stats.parries += world.events.filter((e) => e === 'parry').length;
    if (v.state === 'guard' && Math.abs(v.x - p.x) <= tune.punchReach + 8 && Math.abs(v.y - p.y) <= tune.depthReach) stats.facingGuard++;
    if (world.events.includes('bossDown')) { stats.beaten = true; break; }
  }
  return stats;
}

// Walks at him and punches every 8 frames.
const puncher = (i, world, tune, p, f) => ({ held: approach(p, f, tune.punchReach - 6), b: i % 8 === 0 });

// Reads his tells: parries the sweep and the rush as they land and red tape as it arrives, the
// Associates' blows too, and punches only when a foe is open.
function parrier(i, world, tune, p, f, v) {
  const t = v.vellum ?? tune.vellum;
  const windup = v.fangs ? t.windup[1] : t.windup[0];
  const rushGap = Math.abs(v.x - p.x) - t.rushReach;
  const speed = Math.abs(v.vx) || 1;
  const tape = world.tapes.some((o) => Math.abs(o.y - p.y) <= tune.depthReach && (p.x - o.x) * Math.sign(o.vx) > 0 && Math.abs(p.x - o.x) < 8 + Math.abs(o.vx) * 5);
  const staffBlow = world.fighters.some((o) => o.kind && o.kind !== 'vellum' && o.state === 'windup' && o.t >= tune.kinds[o.kind].windup - 5);
  const parry = !p.parry && ((v.state === 'windup' && v.attack === 'sweep' && v.t === windup - 3)
    || (v.state === 'rush' && rushGap > 0 && rushGap <= speed * 5)
    || tape || staffBlow);
  const open = OPEN.includes(f.state) && !f.armoured;
  const threat = v.state === 'windup' || v.state === 'rush' || v.state === 'sweep';
  const held = open || !threat ? approach(p, f, tune.punchReach - 6) : [];
  return { held, b: open && i % 4 === 0, parry };
}

test('the SNES Vellum is grown like the player and plays his SNES table; the NES table keeps its numbers', () => {
  const tune = snesTune();
  const s = tune.vellum;
  assert.deepEqual(VELLUM.guard, [80, 44]);
  assert.deepEqual(VELLUM.windup, [30, 18]);
  assert.equal(VELLUM.rushReach, 14);
  assert.equal(s.rushReach, 14 * STAGE1.scale);
  assert.equal(s.sweepReach, 38 * STAGE1.scale);
  assert.equal(s.stand, 28 * STAGE1.scale);
  assert.deepEqual(s.speed, SNES_VELLUM.speed.map((x) => x * STAGE1.scale));
  assert.deepEqual(s.rushSpeed, SNES_VELLUM.rushSpeed.map((x) => x * STAGE1.scale));
  assert.ok(SNES_VELLUM.speed[0] < VELLUM.speed[0] && SNES_VELLUM.recover[0] > VELLUM.recover[0]);
  assert.ok(s.guard[0] <= 32 && s.guard[1] < s.guard[0], 'a guard of about half a second');
  assert.equal(s.windup[0], tune.vellumTell);
  assert.equal(s.stagger, tune.vellumStagger);
});

test('his tell and stagger are brawl-lab dials that turn the SNES table', () => {
  const base = snesBase('ward');
  const dials = buildDials(base);
  for (const key of ['vellumTell', 'vellumStagger']) assert.equal(dials.find((d) => d.key === key)?.group, 'moves', key);
  assert.ok(TUNING.vellumTell && TUNING.vellumStagger);
  const tune = scaledTune({ ...base, vellumTell: 44, vellumStagger: 90 }, STAGE1.scale);
  assert.equal(tune.vellum.windup[0], 44);
  assert.equal(tune.vellum.stagger, 90);
});

test('a parried sweep costs nothing and leaves him reeling for his stagger, open to a combo', () => {
  const { world, tune, p, v } = office();
  Object.assign(v, { x: p.x + 30, y: p.y, state: 'windup', attack: 'sweep', t: tune.vellum.windup[0] - 2, facing: -1 });
  const hp = p.hp;
  const events = [];
  for (let i = 0; i < 12; i++) {
    stepFloor(world, pad({ parry: i === 0 }), tune);
    events.push(...world.events);
  }
  assert.ok(events.includes('parry'));
  assert.equal(p.hp, hp);
  assert.equal(v.state, 'hurt');
  assert.equal(v.stagger, tune.vellumStagger);
  assert.equal(landHit(world, v, { damage: 1, heavy: false, dir: 1 }, tune), true, 'open to a punch');
});

test('a parried rush stops him dead; red tape parried snaps and staggers him', () => {
  const { world, tune, p, v } = office();
  Object.assign(v, { x: p.x + 20, y: p.y, state: 'rush', t: 5, vx: -4, landed: [], facing: -1 });
  p.parry = tune.parryFrames;
  const hp = p.hp;
  stepFloor(world, pad(), tune);
  assert.ok(world.events.includes('parry'));
  assert.equal(v.state, 'hurt');
  assert.equal(p.hp, hp);

  const again = office();
  set(again.v, 'recover');
  again.world.tapes.push({ x: again.p.x + 6, y: again.p.y, vx: -2, t: 0, from: 'vellum' });
  again.p.parry = tune.parryFrames;
  stepFloor(again.world, pad(), again.tune);
  assert.ok(again.world.events.includes('parry'));
  assert.notEqual(again.p.state, 'bound');
  assert.equal(again.v.state, 'hurt');
  assert.equal(again.world.tapes.length, 0);
});

test('his guard still stops a punch; the parry, not punching, is the way through', () => {
  const punch = duel(puncher);
  const parry = duel(parrier);
  const line = (s) => `${s.beaten ? 'won' : 'not won'} in ${s.frames} frames, ${s.pipsLost} pips lost, ${s.blocked} punches blocked, ${s.facingGuard} frames facing his guard, ${s.parries} parries`;
  console.log(`punch bot: ${line(punch)}\nparry bot: ${line(parry)}`);
  assert.ok(parry.beaten, 'the parry bot beats him');
  assert.ok(parry.parries > 0);
  // His summoned Associates are the weak rushers now, so punching through them costs the punch bot less time.
  assert.ok(parry.frames < punch.frames * 0.8, `parry ${parry.frames} vs punch ${punch.frames}`);
  assert.ok(punch.pipsLost > 0, 'the punch bot loses pips');
  // Whether the punch bot happens to swing into his guard swings on a frame of timing, so stage it.
  const { world, tune, p, v } = office();
  Object.assign(p, { x: v.x - tune.punchReach + 4, y: v.y, facing: 1 });
  const hp = v.hp;
  const events = [];
  for (let i = 0; i < 20; i++) {
    stepFloor(world, pad({ b: i === 0 }), tune);
    events.push(...world.events);
  }
  assert.ok(events.includes('blocked'), 'a punch into his guard is blocked');
  assert.equal(v.hp, hp);
});

test('KINDS stay the NES numbers after building the SNES tune', () => {
  const nes = structuredClone(KINDS);
  snesTune();
  assert.deepEqual(KINDS, nes);
});

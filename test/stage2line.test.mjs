import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad } from '../src/input.mjs';
import { AREAS, LAYOUT, arenaLocked, createStage, stepStage } from '../src/stage2/areas.mjs';
import { TILE, parseArea, solidAt } from '../src/stage2/physics.mjs';
import { createPlayer } from '../src/stage2/player.mjs';
import { stepCasts, spawnCast } from '../src/stage2/casting.mjs';
import { BELT, beltUnder, carry, createBelts, createSeal } from '../src/stage2/conveyor.mjs';
import { CUSTODIAN, LEDGER, createCustodian, createLedger, stepCustodian, stepLedger } from '../src/stage2/custodian.mjs';

const play = (w, frames) => {
  let pad = createPad();
  const seen = [];
  for (const down of frames) {
    pad = updatePad(pad, new Set(down));
    stepStage(w, pad);
    seen.push(...w.events);
  }
  return seen;
};
const idle = (n) => Array.from({ length: n }, () => []);
const col = (name, c) => (AREAS.find((a) => a.name === name).col + c) * TILE;

test('Original Copy locks its screen around the Custodian until the ledger is in the auditor\'s hands', () => {
  const w = createStage('ward', LAYOUT, 'stage2-area3');
  const { arena } = w.stage;
  let events = play(w, idle(2));
  assert.ok(events.some((e) => e.type === 'bossStart') && events.some((e) => e.type === 'call'));
  assert.equal(w.bosses[0].hp, CUSTODIAN.hp);
  assert.equal(w.foes.filter((f) => f.called).length, 2);
  assert.ok(arenaLocked(w));
  w.player.x = arena.x1 + 40;
  play(w, idle(1));
  assert.ok(w.player.x <= arena.x1 - w.player.w / 2, 'no walking out');
  assert.equal(w.camX, arena.x0);
  w.bosses[0].hp = 0;
  events = play(w, idle(400));
  assert.ok(events.some((e) => e.type === 'bossDown'));
  assert.equal(events.filter((e) => e.type === 'pickup' && e.name === 'ledger').length, 1);
  assert.equal(arenaLocked(w), false);
  w.player.x = col('disposalLine', 2);
  assert.deepEqual(play(w, idle(1)).filter((e) => e.type === 'checkpoint').map((e) => e.id), ['stage2-area4'], 'a checkpoint at the Disposal Line');
});

test('a life lost to the Custodian puts him back on his mark with his Associates gone', () => {
  const w = createStage('mercer', LAYOUT, 'stage2-area3');
  play(w, idle(2));
  w.bosses[0].hp = 3;
  w.player.health = 1;
  w.player.y = 1000;
  play(w, idle(1));
  assert.equal(w.bosses.length, 0);
  assert.equal(w.foes.filter((f) => f.called).length, 0);
  play(w, idle(2));
  assert.equal(w.bosses[0].hp, CUSTODIAN.hp);
});

test('on the Disposal Line a belt carries the auditor, a seal bars the way until cast down, and a push halts at its pocket', () => {
  const w = createStage('ward', LAYOUT, 'stage2-area4');
  w.player.x = col('disposalLine', 6);
  const from = w.player.x;
  const events = play(w, idle(20));
  assert.ok(events.some((e) => e.type === 'belt' && e.dir === 1));
  assert.ok(w.player.x > from + 5, 'carried with no input');

  const seal = w.locks.find((l) => l.seal);
  assert.ok(solidAt(w.area, seal.col, 12));
  w.player.x = w.player.safe.x = seal.x - 3 * TILE;
  w.player.y = 13 * TILE;
  for (let n = 0; n < 3; n++) play(w, [['b'], ...idle(30)]);
  assert.equal(seal.hp, 0);
  assert.equal(solidAt(w.area, seal.col, 12), false, 'the way is open');

  const [push] = w.stage.pushes;
  w.player.x = push.wakeAt + 4;
  assert.ok(play(w, idle(1)).some((e) => e.type === 'alarm'));
  w.player.x = push.halt + 3 * TILE;
  w.player.y = 13 * TILE;
  push.front.x = push.halt - 2;
  const caught = play(w, idle(200)).some((e) => e.type === 'caught');
  assert.equal(push.front.x, push.halt, 'the wax stops at the pocket\'s edge');
  assert.equal(caught, false, 'safe in the pocket');
});

const ROOM =['..........', '..........', '#>>>##<<##'];

test('a belt carries a body standing on it its way, and nothing in the air or off the belt', () => {
  const area = parseArea(ROOM.map((r) => r.replace(/[<>]/g, '#')));
  const belts = createBelts(ROOM);
  const p = { ...createPlayer('ward', { x: 2 * TILE + 8, y: 2 * TILE }), grounded: true };
  assert.equal(carry(belts, p, area), 1);
  assert.equal(p.x, 2 * TILE + 8 + BELT.speed);
  const back = { ...p, x: 7 * TILE };
  assert.equal(carry(belts, back, area), -1);
  assert.equal(back.x, 7 * TILE - BELT.speed);
  assert.equal(carry(belts, { ...p, grounded: false }, area), 0, 'a jump rides nothing');
  assert.equal(beltUnder(belts, { ...p, x: 4 * TILE + 8 }), 0, 'plain floor');
  assert.equal(beltUnder(belts, { ...p, x: 4 * TILE + 2 }), 1, 'an edge still on the belt is carried');
});

test('a belt pushes a body up against a wall and no further', () => {
  const map = ['...#', '>>>#'];
  const area = parseArea(map.map((r) => r.replace(/>/g, '#')));
  const p = { x: 3 * TILE - 6.2, y: TILE, w: 12, h: 12, grounded: true };
  for (let i = 0; i < 5; i++) carry(createBelts(map), p, area);
  assert.equal(p.x, 3 * TILE - 6, 'flush with the wall');
});

test('a disposal seal is no wax lock: every cast chips it and three break it', () => {
  const area = parseArea(['..........', '..........']);
  const seal = createSeal(6, 1, 0);
  const casts = [];
  let broke = false;
  for (let n = 0; n < 3; n++) {
    spawnCast(casts, 'mercer', 2 * TILE, 24, 'right');
    for (let i = 0; i < 40; i++) broke ||= stepCasts(casts, area, [seal]).some((e) => e.type === 'break');
    assert.equal(seal.hp, 2 - n);
  }
  assert.ok(broke);
});

const arena = { x0: 0, x1: 16 * TILE };
const spots = [{ x: 3 * TILE, y: 9 * TILE }, { x: 12 * TILE, y: 9 * TILE }];
const run = (c, p, foes, n) => Array.from({ length: n }, () => stepCustodian(c, p, foes)).flat();

test('the Custodian calls two Associates, and calls again only once both are down', () => {
  const c = createCustodian({ x: 13 * TILE, y: 208 }, spots, arena);
  const p = createPlayer('ward', { x: 60, y: 208 });
  const foes = [];
  run(c, p, foes, 1);
  assert.equal(foes.filter((f) => f.called).length, 2);
  Object.assign(c, { phase: 'direct', timer: CUSTODIAN.direct });
  foes[0].hp = 0;
  run(c, p, foes, 1);
  assert.equal(foes.length, 2, 'one still up: no call');
  Object.assign(c, { phase: 'direct', timer: CUSTODIAN.direct });
  foes[1].hp = 0;
  assert.ok(run(c, p, foes, 1).some((e) => e.type === 'call'));
  assert.equal(foes.filter((f) => f.hp > 0).length, 2);
});

test('the Custodian telegraphs before every lunge, and a lunge that lands costs 2 pips', () => {
  const c = createCustodian({ x: 13 * TILE, y: 208 }, spots, arena);
  const p = createPlayer('ward', { x: 60, y: 208 });
  const events = run(c, p, [], CUSTODIAN.direct + CUSTODIAN.tell - 1);
  assert.ok(events.some((e) => e.type === 'tell'));
  assert.ok(!events.some((e) => e.type === 'lunge'), 'no lunge before the tell has run');
  assert.equal(c.x, 13 * TILE, 'he holds still while flashing');
  const hit = run(c, p, [], 80);
  assert.ok(hit.some((e) => e.type === 'lunge'));
  assert.equal(p.health, 6);
  assert.equal(c.phase, 'recover');
  assert.equal(c.x, arena.x0 + CUSTODIAN.w / 2, 'the lunge stops at the arena wall');
});

test('eight hits beat the Custodian; his Associates go, then the ledger lifts into the auditor\'s hands', () => {
  const c = createCustodian({ x: 13 * TILE, y: 208 }, spots, arena);
  const p = createPlayer('ward', { x: 60, y: 208 });
  const foes = [];
  run(c, p, foes, 1);
  const ledger = createLedger({ x: 14 * TILE, y: 12 * TILE });
  assert.deepEqual(stepLedger(ledger, c, p), [], 'the ledger stays put while he stands');
  c.hp = CUSTODIAN.hp - 8;
  assert.ok(run(c, p, foes, 1).some((e) => e.type === 'bossDown'));
  assert.ok(foes.every((f) => f.hp <= 0));
  assert.deepEqual(run(c, p, foes, 1), [], 'beaten once');
  const events = Array.from({ length: 400 }, () => stepLedger(ledger, c, p)).flat();
  assert.deepEqual(events, [{ type: 'pickup', name: 'ledger' }]);
  assert.ok(ledger.taken);
  assert.ok(LEDGER.lift > 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad, PADS } from '../src/input.mjs';
import { createRun } from '../src/stage2/core.mjs';
import { stepCasts } from '../src/stage2/casting.mjs';
import { HEALTH } from '../src/stage2/player.mjs';
import { CUSTODIAN, LOOPS, createCustodian, custodianDials, custodianTable, stepCustodian, stepParry } from '../src/stage2/summit.mjs';

const ARENA = { x0: 96, x1: 240, y: 200 };
const pad = (...down) => updatePad(createPad(PADS.snes), new Set(down));

function fight({ attack, gap = 24, phase = 1 } = {}) {
  const run = createRun('ward');
  const p = Object.assign(run.player, { x: 150, y: ARENA.y, invuln: 0, health: HEALTH });
  const b = createCustodian(ARENA);
  Object.assign(b, { x: p.x + gap, phase });
  if (attack) Object.assign(b, { state: 'tell', attack, timer: 1, facing: -1 });
  return { run, p, b };
}

const step = (f, n = 1) => {
  const seen = [];
  for (let i = 0; i < n; i++) {
    f.run.events = [];
    seen.push(...stepCustodian(f.b, f.run).map((e) => e.type));
  }
  return seen;
};

test('he walks in, then telegraphs his loop in order: sweep, charge, paper', () => {
  const f = fight({ gap: 100 });
  const tells = [];
  for (let i = 0; i < 2000 && tells.length < 3; i++) {
    f.run.events = [];
    f.p.invuln = 99;
    for (const e of stepCustodian(f.b, f.run)) if (e.type === 'telegraph') tells.push(e.attack);
  }
  assert.deepEqual(tells, LOOPS[1]);
});

test('the mop sweep hits an auditor standing in front of him, and he is guarded while it swings', () => {
  const f = fight({ attack: 'sweep' });
  step(f);
  assert.equal(f.b.state, 'sweep');
  assert.equal(f.b.guard, true);
  const seen = step(f);
  assert.ok(seen.includes('hurt'));
  assert.equal(f.p.health, HEALTH - CUSTODIAN.damage);
});

test('an Objection parry inside the window sends him reeling, unharmed, and seals then land double', () => {
  const f = fight({ attack: 'sweep' });
  assert.equal(stepParry(f.p, pad('l')), true);
  const seen = step(f, 2);
  assert.ok(seen.includes('parry') && !seen.includes('hurt'));
  assert.equal(f.p.health, HEALTH);
  assert.equal(f.b.state, 'reel');
  assert.equal(f.b.guard, false);
  const hp = f.b.hp;
  f.run.events = stepCasts([{ kind: 'seal', rule: { pierce: true }, x: f.b.x, y: f.b.y - 10, vx: 0, vy: 0, age: 0, hit: new Set() }], f.run.area, [f.b]);
  stepCustodian(f.b, f.run);
  assert.equal(f.b.hp, hp - 2);
});

test('a parry pressed too early has closed by the time the mop lands', () => {
  const f = fight({ attack: 'sweep' });
  stepParry(f.p, pad('l'));
  for (let i = 0; i < CUSTODIAN.parryWindow; i++) stepParry(f.p, pad());
  assert.ok(step(f, 2).includes('hurt'));
});

test('seals clink off him while he is guarded', () => {
  const f = fight({ attack: 'charge' });
  step(f);
  const events = stepCasts([{ kind: 'seal', rule: { pierce: true }, x: f.b.x, y: f.b.y - 10, vx: 0, vy: 0, age: 0, hit: new Set() }], f.run.area, [f.b]);
  assert.equal(events[0].type, 'clink');
  assert.equal(f.b.hp, CUSTODIAN.hp);
});

test('the cart charge runs to the wall, hurting a standing auditor but not one jumping over it', () => {
  const low = fight({ attack: 'charge', gap: 60 });
  assert.ok(step(low, 60).includes('hurt'));
  assert.equal(low.b.x, ARENA.x0 + CUSTODIAN.w / 2);
  assert.equal(low.b.state, 'recover');

  const high = fight({ attack: 'charge', gap: 60 });
  high.p.y = ARENA.y - CUSTODIAN.cartH - 2;
  assert.ok(!step(high, 60).includes('hurt'));
});

test('the paper storm drops sheets, one over the auditor, that hurt on touch and fall away', () => {
  const f = fight({ attack: 'paper' });
  assert.ok(step(f).includes('paper'));
  assert.equal(f.b.papers.length, CUSTODIAN.paperCount[0]);
  assert.equal(f.b.papers[0].x, f.p.x);
  assert.ok(step(f, 200).includes('hurt'));
  assert.equal(f.b.papers.length, 0);
});

test('at half health he roars into a faster second phase with a bigger storm', () => {
  const f = fight({ gap: 100 });
  f.b.hp = CUSTODIAN.phaseAt;
  const seen = step(f);
  assert.ok(seen.includes('phase'));
  assert.equal(f.b.phase, 2);
  assert.equal(f.b.state, 'roar');
  assert.equal(f.b.guard, true);
  step(f, CUSTODIAN.roar - 1);
  assert.equal(f.b.state, 'rest');
  assert.equal(f.b.timer, CUSTODIAN.rest[1]);

  const storm = fight({ attack: 'paper', phase: 2 });
  step(storm);
  assert.equal(storm.b.papers.length, CUSTODIAN.paperCount[1]);
});

test('out of health he goes down for good', () => {
  const f = fight();
  f.b.hp = 0;
  assert.deepEqual(step(f), ['bossDown']);
  assert.equal(f.b.beaten, true);
  assert.deepEqual(step(f, 30), []);
});

test('his lab dials cover every number, split per half, and turn back into his table', () => {
  const dials = custodianDials();
  assert.ok(dials.some((d) => d.key === 'sweepTell2') && dials.some((d) => d.key === 'parryWindow'));
  assert.deepEqual(custodianTable(dials), CUSTODIAN);
  dials.find((d) => d.key === 'paperCount1').value = 7;
  const f = fight({ attack: 'paper' });
  f.run.events = [];
  stepCustodian(f.b, f.run, custodianTable(dials));
  assert.equal(f.b.papers.length, 7);
});

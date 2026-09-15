import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad, PADS } from '../src/input.mjs';
import { createRun } from '../src/stage2/core.mjs';
import { stepCasts } from '../src/stage2/casting.mjs';
import { HEALTH } from '../src/stage2/player.mjs';
import { TILE } from '../src/stage2/physics.mjs';
import { stepParry } from '../src/stage2/summit.mjs';
import {
  ARENA, ARENA_MAP, CAPSTONE, CHECKPOINT_LEDGE, CHOICE_DELAY, COLS, HAND, LIVES, SHADOW, TOP_LEDGE, VIEW_H,
  createCapstone, handReach, startAtCrown, stepCapstone,
} from '../src/stage6/capstone.mjs';
import { BELLWETHER, LOOPS, createBellwether, stepBellwether } from '../src/stage6/bellwether.mjs';
import { botButtons, createBot } from '../src/stage6/finalebot.mjs';

const solid = (col, row) => CAPSTONE.map[row]?.[col] === '#';
const frame = (pad, down) => updatePad(pad, new Set(down));
const tap = (...down) => updatePad(createPad(PADS.snes), new Set(down));

test('the capstone is walled and floored, every cable is clear, and the crown fills one screen', () => {
  for (const row of CAPSTONE.map) assert.equal(row.length, COLS, row);
  assert.equal(CAPSTONE.map.at(-1), '#'.repeat(COLS));
  assert.ok(CAPSTONE.cables.length >= 10);
  for (const c of CAPSTONE.cables) {
    for (let row = c.top / TILE - 2; row < c.bottom / TILE; row++) assert.ok(!solid(c.col, row), `cable ${c.k} row ${row}`);
  }
  assert.ok(TOP_LEDGE.top && CHECKPOINT_LEDGE.side);
  assert.equal(ARENA_MAP.length * TILE, VIEW_H);
  for (const row of ARENA_MAP) assert.equal(row.length, COLS, row);
});

test('the shadow waits out its grace, then breathes: it surges on the inhale and barely moves on the ebb', () => {
  const s = createCapstone();
  const start = s.shadow.y;
  let pad = createPad(PADS.snes);
  for (let i = 0; i < SHADOW.grace; i++) stepCapstone(s, pad = frame(pad, []));
  assert.equal(s.shadow.y, start);
  s.run.player.invuln = 9999;
  const moved = (n) => {
    const y = s.shadow.y;
    for (let i = 0; i < n; i++) stepCapstone(s, pad = frame(pad, []));
    return y - s.shadow.y;
  };
  const inhale = moved(SHADOW.breath / 3);
  const ebb = moved(SHADOW.breath / 3);
  assert.ok(inhale > 3 * ebb, `inhale ${inhale} ebb ${ebb}`);
});

test('the shadow reaches a hand up under an auditor it has caught up with, after a warning', () => {
  const s = createCapstone();
  const p = s.run.player;
  Object.assign(s, { frame: SHADOW.grace + 1 });
  s.shadow.clock = HAND.every - 1;
  s.shadow.y = p.y + HAND.height - 10;
  let pad = createPad(PADS.snes);
  const seen = [];
  for (let i = 0; i < HAND.warn + HAND.rise && !seen.includes('death'); i++) {
    s.shadow.y = p.y + HAND.height - 10;
    seen.push(...stepCapstone(s, pad = frame(pad, [])).events.map((e) => (e.type === 'death' ? e.kind && 'death' : e.type)));
    if (i === HAND.warn - 2) assert.equal(handReach(s.shadow.hand), 0, 'still a warning');
  }
  assert.ok(seen.includes('reach') && seen.includes('death'), seen.join());
  assert.equal(s.lives, LIVES - 1);
});

function duel({ attack, gap = 24, phase = 1 } = {}) {
  const run = createRun('ward');
  const p = Object.assign(run.player, { x: 150, y: ARENA.y, invuln: 0, health: HEALTH });
  const b = createBellwether(ARENA);
  Object.assign(b, { x: p.x + gap, phase });
  if (attack) Object.assign(b, { state: 'tell', attack, timer: 1, facing: -1, slamX: p.x });
  return { run, p, b };
}

const step = (f, n = 1) => {
  const seen = [];
  for (let i = 0; i < n; i++) {
    f.run.events = [];
    seen.push(...stepBellwether(f.b, f.run).map((e) => e.type));
  }
  return seen;
};

test('Bellwether telegraphs his first loop in order, and each phase adds to it', () => {
  const f = duel({ gap: 100 });
  const tells = [];
  for (let i = 0; i < 2000 && tells.length < LOOPS[1].length; i++) {
    f.run.events = [];
    f.p.invuln = 99;
    for (const e of stepBellwether(f.b, f.run)) if (e.type === 'telegraph') tells.push(e.attack);
  }
  assert.deepEqual(tells, LOOPS[1]);
  assert.ok(LOOPS[2].includes('rain') && LOOPS[3].includes('slam') && !LOOPS[1].includes('slam'));
});

test('he roars into a second phase at the first mark and a third at the second', () => {
  const f = duel({ gap: 100 });
  f.b.hp = BELLWETHER.phases[0];
  assert.ok(step(f).includes('phase'));
  assert.equal(f.b.phase, 2);
  assert.equal(f.b.state, 'roar');
  assert.equal(f.b.guard, true);
  step(f, BELLWETHER.roar);
  f.b.hp = BELLWETHER.phases[1];
  f.b.state = 'rest';
  assert.ok(step(f).includes('phase'));
  assert.equal(f.b.phase, 3);
  f.b.hp = 1;
  f.b.state = 'rest';
  assert.ok(!step(f).includes('phase'), 'there is no fourth');
});

test('an Objection parry inside the window meets his stamp, sends him reeling, and seals then land double', () => {
  const hit = duel({ attack: 'stamp' });
  assert.ok(step(hit, 2).includes('hurt'));

  const f = duel({ attack: 'stamp' });
  assert.equal(stepParry(f.p, tap('l'), BELLWETHER), true);
  const seen = step(f, 2);
  assert.ok(seen.includes('parry') && !seen.includes('hurt'));
  assert.equal(f.b.state, 'reel');
  assert.equal(f.b.guard, false);
  const hp = f.b.hp;
  f.run.events = stepCasts([{ kind: 'seal', rule: { pierce: true }, x: f.b.x, y: f.b.y - 10, vx: 0, vy: 0, age: 0, hit: new Set() }], f.run.area, [f.b]);
  stepBellwether(f.b, f.run);
  assert.equal(f.b.hp, hp - 2);
});

test('the shockwave hurts a standing auditor but not one jumping it', () => {
  const low = duel({ attack: 'wave', gap: 60 });
  assert.ok(step(low, 60).includes('hurt'));
  const high = duel({ attack: 'wave', gap: 60 });
  high.p.y = ARENA.y - BELLWETHER.waveH - 2;
  assert.ok(!step(high, 60).includes('hurt'));
});

test('the Seal slams where the auditor stood, missing one who stepped away', () => {
  const stay = duel({ attack: 'slam', phase: 3 });
  assert.ok(step(stay, 2).includes('hurt'));
  const moved = duel({ attack: 'slam', phase: 3 });
  moved.p.x += BELLWETHER.slamW;
  assert.ok(!step(moved, 2).includes('hurt'));
});

test('beaten, the Seal is taken and the choice waits to settle before down then jump picks the bad ending', () => {
  const s = startAtCrown(createCapstone());
  s.fight.hp = 0;
  let pad = createPad(PADS.snes);
  const events = stepCapstone(s, pad = frame(pad, [])).events.map((e) => e.type);
  assert.ok(events.includes('bossDown') && events.includes('sealTaken'));
  assert.equal(s.part, 'choice');
  stepCapstone(s, pad = frame(pad, ['b']));
  assert.equal(s.over, null, 'too soon to pick');
  stepCapstone(s, pad = frame(pad, ['down']));
  for (let i = 0; i < CHOICE_DELAY; i++) stepCapstone(s, pad = frame(pad, []));
  stepCapstone(s, pad = frame(pad, ['b']));
  assert.deepEqual(s.over, { kind: 'ending', ending: 'bad', t: 0 });
});

test('a bot on the SNES pad climbs the capstone, beats Bellwether through all three phases, and reaches the choice', () => {
  const s = createCapstone();
  const bot = createBot('good');
  let pad = createPad(PADS.snes);
  const seen = new Set();
  const phases = new Set();
  let frames = 0;
  let crown = 0;
  for (; frames < 60 * 400 && !s.over; frames++) {
    pad = updatePad(pad, botButtons(bot, s));
    for (const e of stepCapstone(s, pad).events) {
      seen.add(e.type);
      if (e.type === 'phase') phases.add(e.phase);
      if (e.type === 'bellwether') crown = frames;
    }
  }
  assert.ok(seen.has('bellwether'), `stopped ${Math.round((s.run.area.start.y - s.best) / TILE)} rows up with ${s.lives} lives`);
  assert.ok(seen.has('sealTaken'), `fight: ${s.fight?.hp}/${s.fight?.maxHp} hp, phase ${s.fight?.phase}, ${s.lives} lives, ${[...seen].join()}`);
  assert.deepEqual([...phases].sort(), [2, 3]);
  assert.ok(['checkpoint', 'grab', 'parry', 'breath', 'choice'].every((t) => seen.has(t)), [...seen].join());
  assert.deepEqual(s.over, { kind: 'ending', ending: 'good', t: 0 });
  console.log(`bot climbed in ${(crown / 60).toFixed(1)} s, won the fight and chose in ${((frames - crown) / 60).toFixed(1)} s, ${s.lives} lives left`);
});

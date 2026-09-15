import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad } from '../src/input.mjs';
import { FREEZE, MAX_CASTS, SPELLS, spawnSpell, stepCasts } from '../src/stage2/casting.mjs';
import { ASSOCIATE, createAssociate, stepFoes, stepGlyphs } from '../src/stage2/foes.mjs';
import { TILE, parseArea } from '../src/stage2/physics.mjs';
import { carry, createPickups, inHand, stepPickups, swapHand } from '../src/stage2/pickups.mjs';
import { HEALTH } from '../src/stage2/player.mjs';
import { createRun, stepRun } from '../src/stage2/core.mjs';

const floor = parseArea(['', '', '', '', '', '################################']);
const FY = 5 * TILE;
const box = (x, o = {}) => ({ x, y: FY, w: 16, h: 16, hp: 2, flash: 0, frozen: 0, ...o });
const run = (casts, targets, n, area = floor) => {
  const events = [];
  for (let i = 0; i < n; i++) events.push(...stepCasts(casts, area, targets));
  return events;
};

test('you carry Seal of Notice plus one; Select swaps only when there is a second', () => {
  const w = createRun('ward');
  assert.equal(swapHand(w), false, 'nothing to swap to yet');
  carry(w, 'redTape');
  assert.deepEqual(w.carried, ['notice', 'redTape']);
  assert.equal(inHand(w), 'notice', 'a pickup does not change what is in hand');
  assert.equal(swapHand(w), true);
  assert.equal(inHand(w), 'redTape');
  swapHand(w);
  assert.equal(inHand(w), 'notice');
});

test('a new pickup replaces the one not in hand, and Seal is never dropped', () => {
  const w = createRun('ward');
  carry(w, 'carbonCopy');
  carry(w, 'margin');
  assert.deepEqual(w.carried, ['notice', 'margin']);
  swapHand(w);
  carry(w, 'redTape');
  assert.deepEqual(w.carried, ['notice', 'redTape']);
  assert.equal(inHand(w), 'redTape');
});

test('walking into a floating ledger takes it; Select in play swaps and the cast uses the spell in hand', () => {
  const map = ['', '', '', '', '..P.T', '######'];
  const w = createRun('ward', map);
  assert.equal(w.pickups.length, 1);
  let pad = createPad();
  const seen = [];
  for (let i = 0; i < 40 && w.pickups.length; i++) {
    pad = updatePad(pad, new Set(['right']));
    stepRun(w, pad);
    seen.push(...w.events.map((e) => e.type));
  }
  assert.ok(seen.includes('pickup'));
  assert.deepEqual(w.carried, ['notice', 'redTape']);
  for (const down of [[], ['select'], [], ['b']]) {
    pad = updatePad(pad, new Set(down));
    stepRun(w, pad);
  }
  assert.equal(w.hand, 1);
  assert.equal(w.casts[0].spell, 'redTape');
});

test('pickups bob in place until taken', () => {
  const [k] = createPickups(['', '..C']);
  const w = { frame: 0, player: { x: 999, y: 0, w: 12, h: 32 }, pickups: [k], carried: ['notice', null], hand: 0 };
  const ys = new Set();
  for (let f = 0; f < 70; f++) {
    w.frame = f;
    stepPickups(w);
    ys.add(k.y);
  }
  assert.ok(ys.size > 3 && Math.max(...ys) - Math.min(...ys) <= 6);
});

test('a lost life drops the pickup enchantment and puts Seal back in hand', () => {
  const w = createRun('ward');
  carry(w, 'margin');
  swapHand(w);
  w.player.health = 1;
  w.player.y = 999;
  stepRun(w, updatePad(createPad(), new Set()));
  assert.deepEqual(w.carried, ['notice', null]);
  assert.equal(w.hand, 0);
});

test('Carbon Copy fans three papers, counts as one cast, and each paper stops at its first hit', () => {
  const casts = [];
  const papers = spawnSpell(casts, 'carbonCopy', 'ward', 20, FY - 8, 'right');
  assert.equal(papers.length, 3);
  const angles = papers.map((p) => Math.atan2(p.vy, p.vx));
  assert.ok(angles[0] < angles[1] && angles[1] < angles[2], 'a spread');
  spawnSpell(casts, 'carbonCopy', 'ward', 20, FY - 8, 'right');
  spawnSpell(casts, 'carbonCopy', 'ward', 20, FY - 8, 'right');
  assert.equal(casts.length, 9, 'three volleys out');
  assert.equal(spawnSpell(casts, 'carbonCopy', 'ward', 20, FY - 8, 'right'), null, `still at most ${MAX_CASTS}`);

  const c = [];
  spawnSpell(c, 'carbonCopy', 'ward', 20, FY - 8, 'right');
  const near = box(60, { hp: 5 });
  run(c, [near], 30);
  assert.equal(near.hp, 2, 'point blank, all three papers land, once each');
  assert.equal(c.length, 0);

  const f = [];
  spawnSpell(f, 'carbonCopy', 'ward', 20, FY - 8, 'right');
  const far = box(180, { hp: 5 });
  run(f, [far], 60);
  assert.equal(far.hp, 4, 'far off, the fan has opened and only the middle paper is in line');
});

test('Red Tape is a short ribbon that freezes a foe for 2 s without hurting it', () => {
  const casts = [];
  spawnSpell(casts, 'redTape', 'ward', 20, FY - 8, 'right');
  const near = box(50);
  const events = run(casts, [near], 10);
  assert.deepEqual(events.map((e) => e.type), ['freeze']);
  assert.equal(near.frozen, FREEZE);
  assert.equal(FREEZE, 120, '2 s at 60 fps');
  assert.equal(near.hp, 2);

  const far = [];
  spawnSpell(far, 'redTape', 'ward', 20, FY - 8, 'right');
  const distant = box(20 + SPELLS.redTape.speed * SPELLS.redTape.life + 30);
  run(far, [distant], 60);
  assert.equal(distant.frozen, 0, 'the ribbon is short');
  assert.equal(far.length, 0);
});

test('Margin of Error lobs a page that bursts into a sigil hitting a group and breaking a wax lock', () => {
  const casts = [];
  const [page] = spawnSpell(casts, 'margin', 'ward', 20, FY - 20, 'right');
  assert.ok(page.vy < 0, 'thrown upward');
  const group = [box(100), box(114), box(128)];
  const lock = { x: 120, y: FY, w: 16, h: 32, hp: 1, flash: 0, lock: true };
  const far = box(220);
  let peak = page.y;
  const events = [];
  for (let i = 0; i < 60; i++) {
    events.push(...stepCasts(casts, floor, [...group, lock, far]));
    if (casts[0]?.kind === 'page') peak = Math.min(peak, casts[0].y);
  }
  assert.ok(peak < FY - 20, 'it arced');
  assert.ok(events.some((e) => e.type === 'sigil'));
  assert.equal(group.filter((t) => t.hp < 2).length, 3, 'the sigil caught the whole group');
  assert.equal(lock.hp, 0, 'the wax lock broke');
  assert.equal(far.hp, 2);
});

test('a wax lock shrugs off Seal of Notice and Carbon Copy', () => {
  const lock = { x: 60, y: FY, w: 16, h: 32, hp: 1, flash: 0, lock: true };
  for (const spell of ['notice', 'carbonCopy']) {
    const casts = [];
    spawnSpell(casts, spell, 'ward', 20, FY - 8, 'right');
    const events = run(casts, [lock], 30);
    assert.ok(events.some((e) => e.type === 'clink'), spell);
  }
  assert.equal(lock.hp, 1);
});

const area = parseArea(['', '', '', '', '', '..........................', '##########################']);
const GY = 6 * TILE;
const player = (x) => ({ x, y: GY, w: 12, h: 32, health: HEALTH, invuln: 0 });

test('an Associate walks its ledge and turns at the edge', () => {
  const ledge = parseArea(['', '', '', '', '', '', '.....######.....']);
  const f = createAssociate({ x: 6 * TILE + 8, y: GY });
  const xs = [];
  for (let i = 0; i < 400; i++) {
    stepFoes([f], [], player(9999), ledge);
    xs.push(f.x);
  }
  assert.ok(Math.min(...xs) >= 5 * TILE + 6 && Math.max(...xs) <= 11 * TILE - 6, 'never walked off');
  assert.ok(Math.max(...xs) - Math.min(...xs) > 40, 'it walked');
});

test('an Associate in sight stops, winds up and casts a slow glyph at the auditor, then rests', () => {
  const f = createAssociate({ x: 200, y: GY });
  f.rest = 0;
  const glyphs = [];
  const p = player(100);
  const events = [];
  for (let i = 0; i < ASSOCIATE.windUp + 1; i++) events.push(...stepFoes([f], glyphs, p, area));
  assert.deepEqual(events.map((e) => e.type), ['glyph']);
  assert.equal(f.facing, -1, 'turned to face the auditor');
  const [g] = glyphs;
  assert.ok(g.vx < 0 && Math.hypot(g.vx, g.vy) <= 1.2, 'slow, and toward the auditor');
  for (let i = 0; i < 60; i++) stepFoes([f], glyphs, p, area);
  assert.equal(glyphs.length, 1, 'resting between casts');
});

test('a glyph costs a pip on touch, and a cast shoots it down first', () => {
  const p = player(100);
  const glyphs = [{ glyph: true, x: 140, y: GY - 12, w: 8, h: 8, hp: 1, flash: 0, age: 0, vx: -1, vy: 0 }];
  let events = [];
  for (let i = 0; i < 60; i++) events.push(...stepGlyphs(glyphs, p, area));
  assert.deepEqual(events.map((e) => e.type), ['hurt']);
  assert.equal(p.health, HEALTH - 1);

  const q = player(100);
  const shot = [{ glyph: true, x: 180, y: GY - 16, w: 8, h: 8, hp: 1, flash: 0, age: 0, vx: -1, vy: 0 }];
  const casts = [];
  spawnSpell(casts, 'notice', 'mercer', 100, GY - 20, 'right');
  events = [];
  for (let i = 0; i < 60; i++) {
    stepCasts(casts, area, shot);
    events.push(...stepGlyphs(shot, q, area));
  }
  assert.equal(shot.length, 0);
  assert.equal(q.health, HEALTH, 'shot down before it arrived');
});

test('a frozen Associate neither walks nor casts; three hits knock it down and it blinks away', () => {
  const f = createAssociate({ x: 200, y: GY });
  Object.assign(f, { rest: 0, frozen: FREEZE });
  const glyphs = [];
  const x = f.x;
  for (let i = 0; i < FREEZE; i++) stepFoes([f], glyphs, player(150), area);
  assert.equal(f.x, x);
  assert.equal(glyphs.length, 0);

  const foes = [createAssociate({ x: 60, y: GY })];
  for (let n = 0; n < ASSOCIATE.hp; n++) {
    const casts = [];
    spawnSpell(casts, 'notice', 'ward', 20, GY - 20, 'right');
    run(casts, foes, 20, area);
  }
  assert.equal(foes[0].hp, 0);
  for (let i = 0; i < ASSOCIATE.down; i++) stepFoes(foes, [], player(999), area);
  assert.equal(foes.length, 0);
});

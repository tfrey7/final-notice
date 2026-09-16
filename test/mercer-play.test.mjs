// Mercer played, not just tuned: the SNES pad driving the SNES Stage 1 world through his whole kit,
// and the body the screen draws for every state that kit reaches. Item 2348: every move worked and
// none of it was drawn, because only Ward had a body.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fighter, player } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor } from '../src/stage1/player.mjs';
import { areaFor, newStage } from '../src/stage1/areas.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { freeInjunction } from '../src/injunction.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';
import { SNES_STAGE1 } from '../src/snes/stage1/waves.mjs';
import { snesTune, useSnesTables } from '../src/snes/fight.mjs';
import { PADS, createPad, updatePad } from '../src/input.mjs';
import { armWorld, defaultWeapons, scaledWeapons, stageSmash } from '../src/stage1/weapons.mjs';
import { STAGE1_BEATS, armBeats } from '../src/stage1/beats.mjs';
import { liveRoutes } from '../src/stage1/combo.mjs';
import { playerAnim } from '../src/snes/stage1/sprites.mjs';

useSnesTables();
const tuneFor = (who) => scaledTune(snesTune(who), STAGE1.scale);

// Stage 1's first screen exactly as the SNES scene builds it, its foes replaced by dummies who never
// swing, `gaps` px from the auditor.
function floor(who, gaps = [20]) {
  const tune = tuneFor(who);
  const world = newStage(newFloor(who, tune), tune, areaFor(null), SNES_STAGE1);
  armWorld(world, stageSmash(world.stage.starts), scaledWeapons(defaultWeapons(), STAGE1.scale));
  armBeats(world, STAGE1_BEATS);
  world.cooldown = freeInjunction();
  const p = player(world);
  const foes = gaps.map((g, i) => Object.assign(fighter(`foe${i}`, 'foe', p.x + g, p.y, tune), { dummy: true, facing: -1, hp: 99 }));
  world.fighters = [p, ...foes];
  world.run = null;
  world.bench = [];
  return { tune, world, p, foes };
}

// `script` is [frame, [SNES buttons], hold]: real button names through the real pad, so the chords and
// the renaming the pad does are part of what is tested.
function play(ctx, script, frames = 120, extra = () => null) {
  let pad = createPad(PADS.snes);
  const seen = [];
  const states = new Set();
  for (let i = 0; i < frames; i++) {
    extra(i, ctx);
    const down = new Set(script.filter(([at, , hold = 1]) => i >= at && i < at + hold).flatMap(([, b]) => b));
    pad = updatePad(pad, down, i);
    seen.push(...stepFloor(ctx.world, pad, ctx.tune).events);
    ctx.world.events = [];
    states.add(ctx.p.state);
  }
  return { seen, states: [...states] };
}

// The defect Tim felt: "his hitbox is super fucked up". Working close in cannot mean standing inside
// the other man's swing, which is what a light of 27 px against an associate's 30 came to.
test('Mercer reaches past the foes he fights, and still works closer in than Ward', () => {
  const mercer = tuneFor('mercer');
  const ward = tuneFor('ward');
  const reaches = Object.fromEntries(Object.entries(mercer.kinds).map(([k, v]) => [k, v.reach]));
  assert.ok(mercer.punchReach > reaches.associate, `light reaches ${mercer.punchReach}, an associate hits from ${reaches.associate}`);
  assert.ok(mercer.punchReach < ward.punchReach, 'he still works closer in than Ward');
  assert.ok(mercer.thirdReach > mercer.punchReach, 'the kick is his long option');
});

// Standing just outside an associate's swing, his light still lands: that is the exchange he lost.
test('Mercer opens the exchange from outside an associate\'s swing', () => {
  const gap = tuneFor('mercer').kinds.associate.reach + 2;
  const ctx = floor('mercer', [gap]);
  const seen = play(ctx, [[0, ['y']]], 30).seen;
  assert.ok(seen.includes('hit'), `no hit from ${gap} px: ${seen.join()}`);
});

test('Mercer: three attack buttons, and every string they make, land on the SNES pad', () => {
  const cases = [
    ['Y light chain', [[0, ['y']], [12, ['y']], [24, ['y']]], ['punch', 'hit']],
    ['X heavy', [[0, ['x']]], ['hit']],
    ['A snap kick', [[0, ['a']]], ['kick', 'snap', 'hit']],
    ['Y then A hooks', [[0, ['y']], [8, ['a']]], ['hook', 'hit']],
    ['Y Y A sweeps the legs', [[0, ['y']], [8, ['y']], [18, ['a']]], ['low', 'down']],
    ['X then A spins', [[0, ['x']], [14, ['a']]], ['spin', 'down']],
  ];
  for (const [name, script, want] of cases) {
    const seen = play(floor('mercer'), script).seen;
    for (const e of want) assert.ok(seen.includes(e), `${name}: no ${e} in ${seen.join()}`);
  }
});

test('Mercer: Y+X is the takedown, one foe only, and never the room clear', () => {
  const ctx = floor('mercer', [20, -30]);
  const seen = play(ctx, [[0, ['y', 'x']]]).seen;
  assert.ok(seen.includes('takedown'), seen.join());
  assert.ok(!seen.includes('injunction'), 'Y+X clears the room for Ward, not for Mercer');
  assert.equal(ctx.foes[0].hp, 99 - ctx.tune.takedownDamage);
  assert.equal(ctx.foes[1].hp, 99, 'the foe behind him is untouched');
  assert.ok(ctx.world.cooldown.left > 0, 'it spends the same cooldown as the room clear');
});

test('Mercer: jump, then down and an attack, is the dive kick', () => {
  const ctx = floor('mercer', [44]);
  let pad = createPad(PADS.snes);
  const seen = [];
  for (let i = 0; i < 90; i++) {
    const down = i === 0 ? new Set(['b'])
      : ctx.p.state === 'jump' && ctx.p.vz <= 0 && !ctx.p.kicked ? new Set(['down', 'y']) : new Set();
    pad = updatePad(pad, down, i);
    seen.push(...stepFloor(ctx.world, pad, ctx.tune).events);
    ctx.world.events = [];
  }
  assert.ok(seen.includes('diveKick') && seen.includes('diveHit'), seen.join());
  assert.ok(ctx.foes[0].hp < 99, 'the dive lands');
});

test('Mercer: L parries a blow, since he has no block to hide behind', () => {
  const ctx = floor('mercer', [20]);
  const foe = ctx.foes[0];
  // The foe winds up at frame 10 and swings; L is tapped once, inside the window his tell opens.
  const swing = (i) => { if (i === 10) Object.assign(foe, { state: 'windup', t: 0, kind: 'associate', attack: { windup: 12, punch: 10, reach: 60, damage: 2 } }); };
  const { seen } = play(ctx, [[20, ['l']]], 60, swing);
  assert.ok(seen.includes('parry'), `no parry in ${seen.join()}`);
  assert.equal(ctx.p.hp, 8, 'a parried blow costs him nothing');
});

test('Mercer: walking, taking a hit, going down and getting up all still work', () => {
  const walk = floor('mercer', [400]);
  const x0 = walk.p.x;
  play(walk, [[0, ['right'], 60]], 60);
  assert.ok(walk.p.x > x0 + 10, `walked ${walk.p.x - x0} px`);

  const hit = floor('mercer', [16]);
  const foe = hit.foes[0];
  const swing = (i) => { if (i === 5) Object.assign(foe, { state: 'windup', t: 0, kind: 'manager', attack: { windup: 4, punch: 10, reach: 60, damage: 2, heavy: true } }); };
  const { states } = play(hit, [], 240, swing);
  assert.ok(hit.p.hp < 8, 'a blow that is not parried costs him health');
  for (const s of ['knockdown', 'down', 'getup', 'idle']) assert.ok(states.includes(s), `never reached ${s}: ${states.join()}`);
});

test('Mercer: the combo guide lights his own routes, not Ward\'s', () => {
  const ctx = floor('mercer');
  const names = new Set();
  play(ctx, [[0, ['y']], [10, ['y']]], 40, () => {
    for (const r of liveRoutes(ctx.p, ctx.tune)) names.add(r.name);
  });
  for (const n of ['LEG SWEEP', 'HOOK CRUSH', 'POP-UP']) assert.ok(names.has(n), `${n} missing from ${[...names].join()}`);
  assert.ok(!names.has('LAUNCHER'), "POP-UP is Mercer's name for Ward's launcher");
});

test('every state Mercer reaches has a body to draw, and his kit is not drawn as idle', () => {
  const p = { state: 'idle', combo: 0, dive: false };
  const reached = ['idle', 'walk', 'run', 'step', 'jump', 'land', 'punch', 'heavy', 'kick', 'special',
    'hurt', 'knockdown', 'down', 'getup', 'ko', 'grab', 'carry', 'throw', 'held'];
  for (const state of reached) assert.ok(playerAnim('mercer', { ...p, state }), `no animation for ${state}`);
  // The three attack buttons must not all draw the same pose: a kick that reads as standing still is
  // what made him feel broken to play.
  assert.notEqual(playerAnim('mercer', { ...p, state: 'kick' }), playerAnim('mercer', { ...p, state: 'idle' }));
  assert.notEqual(playerAnim('mercer', { ...p, state: 'punch', combo: 1 }), playerAnim('mercer', { ...p, state: 'idle' }));
  assert.notEqual(playerAnim('mercer', { ...p, state: 'getup' }), playerAnim('mercer', { ...p, state: 'idle' }));
  assert.equal(playerAnim('mercer', { ...p, state: 'jump', dive: true }), 'uppercut');
  // Ward's own poses are untouched by this.
  assert.equal(playerAnim('ward', { ...p, state: 'punch', combo: 3 }), 'uppercut');
  assert.equal(playerAnim('ward', { ...p, state: 'jump' }), 'wind');
});

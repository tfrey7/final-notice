import test from 'node:test';
import assert from 'node:assert/strict';
import { player } from '../src/stage1/moves.mjs';
import { PIPS, SCREEN_W, newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { HEAL, areaFor, layout, newStage, stepAreas } from '../src/stage1/areas.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { freeInjunction } from '../src/injunction.mjs';
import { CHECKPOINTS, jumpTo, next } from '../src/flow.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';
import { BACKROOMS, SNES_STAGE3 } from '../src/snes/stage3/waves.mjs';
import { clearLines } from '../src/snes/stage1/boss.mjs';
import { BRAWL_WEIGHT, weighShared, weighed } from '../src/snes/weight.mjs';

const OPEN = ['recover', 'hurt', 'idle', 'walk', 'knockdown', 'guard'];

function build(flow, tune) {
  const world = newStage(newFloor(flow.auditor, tune), tune, areaFor(flow.checkpoint, CHECKPOINTS.stage3, BACKROOMS.length), SNES_STAGE3);
  world.cooldown = freeInjunction();
  return world;
}

function approach(p, f, gap) {
  const held = [];
  const dx = f.x - p.x;
  if (Math.abs(dx) > gap) held.push(dx > 0 ? 'right' : 'left');
  else if (Math.sign(dx) && Math.sign(dx) !== p.facing) held.push(dx > 0 ? 'right' : 'left');
  if (Math.abs(f.y - p.y) > 2) held.push(f.y > p.y ? 'down' : 'up');
  return held;
}

// Stage 1's bot without Vellum: parries staff blows and red tape, throws what he grabs, punches the open.
function bot(i, world, tune) {
  const p = player(world);
  const foes = world.fighters.filter((f) => f.kind && f.state !== 'ko');
  const f = foes.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  const box = p.hp <= PIPS - HEAL && world.firstAid?.find((o) => !o.taken && o.x >= world.floor.left && o.x <= world.floor.right);
  if (box && (!f || Math.abs(f.x - p.x) > 60)) return { held: approach(p, box, 4) };
  if (!f) return { held: ['right'] };
  if (p.state === 'grab') return { held: [f.x >= p.x ? 'right' : 'left'], b: true };
  const tape = world.tapes.some((o) => Math.abs(o.y - p.y) <= tune.depthReach && (p.x - o.x) * Math.sign(o.vx) > 0 && Math.abs(p.x - o.x) < 8 + Math.abs(o.vx) * 5);
  const staffBlow = foes.some((o) => o.state === 'windup' && o.t >= tune.kinds[o.kind].windup - 5 && Math.abs(o.x - p.x) < 80);
  const open = OPEN.includes(f.state) && !f.armoured;
  const inReach = Math.abs(f.x - p.x) <= tune.punchReach - 2 && Math.abs(f.y - p.y) <= tune.depthReach;
  return { held: approach(p, f, tune.punchReach - 6), b: open && inReach && i % 4 === 0, parry: !p.parry && (tape || staffBlow) };
}

const pad = ({ held = [], b = false, parry = false }) => ({ held: new Set(held), pressed: new Set(b ? ['b'] : []), parry, step: 0, dash: null });

// Plays Stage 3 the way the scene does: checkpoints, lives, a continue back at the last checkpoint,
// the corridor's folds, and the far door into stage clear.
function playthrough(who, brain = bot, cap = 60 * 60 * 12) {
  weighShared();
  const tune = scaledTune(weighed(tuneFor(who), BRAWL_WEIGHT), STAGE1.scale);
  let flow = { ...jumpTo('stage3'), auditor: who };
  let world = build(flow, tune);
  const log = { frames: 0, lives: 0, continues: 0, locks: 0, waves: 0, heals: 0, folds: [], foes: new Set(), checkpoints: [], cleared: false };
  for (let i = 0; i < cap && !log.cleared; i++) {
    stepFloor(world, pad(brain(i, world, tune, log)), tune);
    stepAreas(world, tune);
    log.frames = i + 1;
    for (const f of world.fighters) if (f.kind) log.foes.add(f.kind);
    const events = world.events;
    world.events = [];
    for (const e of events) {
      if (e === 'lock') log.locks++;
      if (e === 'wave') log.waves++;
      if (e === 'heal') log.heals++;
      if (e === 'fold') log.folds.push(Math.round(player(world).x));
      if (e.startsWith('checkpoint:')) { flow = next(flow, { type: 'checkpoint', id: e.slice(11) }); log.checkpoints.push(e.slice(11)); }
      if (e === 'lifeLost') {
        log.lives++;
        flow = next(flow, { type: 'lifeLost' });
        if (flow.screen === 'gameover') {
          log.continues++;
          flow = next(flow, { type: 'continue' });
          world = build(flow, tune);
          break;
        }
      }
      if (e === 'stageExit') { flow = next(flow, { type: 'stageClear' }); log.cleared = flow.screen === 'stage5'; }
    }
  }
  const p = player(world);
  log.end = { x: Math.round(p.x), hp: p.hp, state: p.state, run: world.run, foes: world.fighters.filter((f) => f.kind).map((f) => `${f.kind}:${f.state}@${Math.round(f.x)}`) };
  return log;
}

test('the Backrooms: 5-7 encounters of all four staff kinds, a checkpoint per area and a first-aid box', () => {
  const stage = layout(BACKROOMS);
  assert.ok(stage.locks.length >= 5 && stage.locks.length <= 7, `${stage.locks.length} locks`);
  const kinds = new Set(BACKROOMS.flatMap((a) => a.locks.flatMap((l) => l.waves.flatMap((w) => w.foes))));
  assert.deepEqual([...kinds].sort(), ['associate', 'counsel', 'manager', 'supervisor']);
  assert.equal(CHECKPOINTS.stage3.length, BACKROOMS.length);
  assert.equal(BACKROOMS.filter((a) => a.firstAid).length, 1);
  const folds = stage.locks.filter((l) => l.fold);
  assert.ok(folds.length >= 1 && folds.every((l) => stage.locks.some((o) => !o.fold && o.x === l.x)), 'every fold lock is a room already fought in');
  assert.equal(next(jumpTo('stage2'), { type: 'stageClear' }).screen, 'stage3');
  assert.deepEqual(clearLines(60 * 200, 1, 3), ['STAGE 3 CLEAR', 'TIME 3:20', 'LIVES 1']);
});

for (const who of ['ward', 'mercer']) {
  test(`${who}: a bot plays Stage 3 from the stairwell to stage clear, through the folding corridor`, () => {
    const log = playthrough(who);
    console.log(`${who}: ${log.cleared ? 'cleared' : 'not cleared'} in ${(log.frames / 3600).toFixed(1)} min (${log.frames} frames), ${log.locks} locks, ${log.waves} waves, ${log.folds.length} folds, ${log.heals} heals, ${log.lives} lives lost, ${log.continues} continues`);
    assert.ok(log.cleared, `stuck after ${log.frames} frames: ${JSON.stringify(log.end)}`);
    assert.ok(log.frames >= 60 * 60 * 2 && log.frames <= 60 * 60 * 5, 'a clean run takes minutes; a human takes longer');
    assert.ok(log.folds.length >= 2, 'the corridor folds back on itself twice');
    const room = layout(BACKROOMS).locks.find((l) => l.fold).x;
    assert.ok(log.folds.every((x) => x >= room && x < room + SCREEN_W / 2), 'each fold comes back in at the break room\'s near door');
    assert.ok(log.locks >= 7, `${log.locks} locks`);
    assert.deepEqual([...log.foes].sort(), ['associate', 'counsel', 'manager', 'supervisor']);
    assert.ok(log.checkpoints.includes('stage3-area3'), 'passes the mid-stage checkpoint');
  });
}

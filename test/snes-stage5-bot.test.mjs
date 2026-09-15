import test from 'node:test';
import assert from 'node:assert/strict';
import { player } from '../src/stage1/moves.mjs';
import { AUDITORS, PIPS, SCREEN_W, newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { HEAL, areaFor, layout, newStage, stepAreas } from '../src/stage1/areas.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { freeInjunction } from '../src/injunction.mjs';
import { CHECKPOINTS, jumpTo, next } from '../src/flow.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';
import { CHAPEL, RITUAL, SNES_STAGE5, altarsInView, armChapel, chapelAltars, stepRitual } from '../src/snes/stage5/chapel.mjs';
import { clearLines } from '../src/snes/stage1/boss.mjs';
import { snesTune, useSnesTables } from '../src/snes/fight.mjs';

const OPEN = ['recover', 'hurt', 'idle', 'walk', 'knockdown', 'guard'];

function build(flow, tune) {
  const world = newStage(newFloor(flow.auditor, tune), tune, areaFor(flow.checkpoint, CHECKPOINTS.stage5, CHAPEL.length), SNES_STAGE5);
  armChapel(world);
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

// Stage 3's bot, who breaks a lit ritual's altars first: he stands beside the nearest, faces it and
// punches, parrying anything thrown at him on the way.
function bot(i, world, tune) {
  const p = player(world);
  const foes = world.fighters.filter((f) => f.kind && f.state !== 'ko');
  const f = foes.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  const tape = world.tapes.some((o) => Math.abs(o.y - p.y) <= tune.depthReach && (p.x - o.x) * Math.sign(o.vx) > 0 && Math.abs(p.x - o.x) < 8 + Math.abs(o.vx) * 5);
  const staffBlow = foes.some((o) => o.state === 'windup' && o.t >= (o.attack?.windup ?? tune.kinds[o.kind].windup) - 5 && Math.abs(o.x - p.x) < 80);
  const parry = !p.parry && (tape || staffBlow);
  const altar = world.ritual && altarsInView(world).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  if (altar && !p.weapon && !parry) {
    const side = p.x <= altar.x ? -1 : 1;
    const x = Math.min(world.floor.right, Math.max(world.floor.left, altar.x + side * 18));
    const held = approach(p, { x: altar.x, y: altar.y }, Math.abs(altar.x - x));
    return { held, b: Math.abs(p.x - x) <= 4 && p.facing === -side && Math.abs(altar.y - p.y) <= 2 && i % 4 === 0 };
  }
  const box = p.hp <= PIPS - HEAL && world.firstAid?.find((o) => !o.taken && o.x >= world.floor.left && o.x <= world.floor.right);
  if (box && (!f || Math.abs(f.x - p.x) > 60)) return { held: approach(p, box, 4) };
  if (!f) return { held: ['right'] };
  if (p.state === 'grab') return { held: [f.x >= p.x ? 'right' : 'left'], b: true };
  const open = (OPEN.includes(f.state) || (AUDITORS[world.who].guard === 'block' && f.state === 'punch')) && !f.armoured;
  const inReach = Math.abs(f.x - p.x) <= tune.punchReach - 2 && Math.abs(f.y - p.y) <= tune.depthReach;
  return { held: approach(p, f, tune.punchReach - 6), b: open && inReach && i % 4 === 0, parry };
}

const pad = ({ held = [], b = false, parry = false }) => ({ held: new Set(held), pressed: new Set(b ? ['b'] : []), parry, block: parry, step: 0, dash: null });

// Plays Stage 5 the way the scene does: checkpoints, lives, a continue back at the last checkpoint,
// the two rituals, and the sanctum's far side into stage clear.
function playthrough(who, brain = bot, cap = 60 * 60 * 12) {
  useSnesTables();
  const tune = scaledTune(snesTune(who), STAGE1.scale);
  let flow = { ...jumpTo('stage5'), auditor: who };
  let world = build(flow, tune);
  const log = { frames: 0, lives: 0, continues: 0, locks: 0, waves: 0, heals: 0, rituals: 0, broken: 0, smashed: 0, mended: 0, lost: [], foes: new Set(), checkpoints: [], cleared: false };
  for (let i = 0; i < cap && !log.cleared; i++) {
    stepFloor(world, pad(brain(i, world, tune)), tune);
    stepAreas(world, tune);
    const hp = world.fighters.filter((f) => f.anointed).reduce((n, f) => n + f.hp, 0);
    stepRitual(world, tune);
    log.mended += Math.max(0, world.fighters.filter((f) => f.anointed).reduce((n, f) => n + f.hp, 0) - hp);
    log.frames = i + 1;
    for (const f of world.fighters) if (f.kind) log.foes.add(f.kind);
    const events = world.events;
    world.events = [];
    for (const e of events) {
      if (e === 'lock') log.locks++;
      if (e === 'wave') log.waves++;
      if (e === 'heal') log.heals++;
      if (e === 'ritual') log.rituals++;
      if (e === 'ritualBroken') log.broken++;
      if (e === 'altarSmash') log.smashed++;
      if (e.startsWith('checkpoint:')) { flow = next(flow, { type: 'checkpoint', id: e.slice(11) }); log.checkpoints.push(e.slice(11)); }
      if (e === 'lifeLost') {
        log.lives++;
        log.lost.push(world.run.lock);
        flow = next(flow, { type: 'lifeLost' });
        if (flow.screen === 'gameover') {
          log.continues++;
          flow = next(flow, { type: 'continue' });
          world = build(flow, tune);
          break;
        }
      }
      if (e === 'stageExit') { flow = next(flow, { type: 'stageClear' }); log.cleared = flow.screen === 'scene3'; }
    }
  }
  const p = player(world);
  log.end = { x: Math.round(p.x), hp: p.hp, state: p.state, run: world.run, foes: world.fighters.filter((f) => f.kind).map((f) => `${f.kind}:${f.state}@${Math.round(f.x)}`) };
  return log;
}

test('the chapel: 5-7 encounters of all four staff kinds, a checkpoint per area, a first-aid box and two ritual rooms', () => {
  const stage = layout(CHAPEL);
  assert.ok(stage.locks.length >= 5 && stage.locks.length <= 7, `${stage.locks.length} locks`);
  const kinds = new Set(CHAPEL.flatMap((a) => a.locks.flatMap((l) => l.waves.flatMap((w) => w.foes))));
  assert.deepEqual([...kinds].sort(), ['associate', 'counsel', 'manager', 'supervisor']);
  assert.equal(CHECKPOINTS.stage5.length, CHAPEL.length);
  assert.equal(CHAPEL.filter((a) => a.firstAid).length, 1);
  const altars = chapelAltars(stage.starts);
  assert.equal(CHAPEL.flatMap((a) => a.locks).filter((l) => l.altars).length, 2);
  for (const o of altars) assert.ok(stage.locks.some((l) => o.x >= l.x && o.x < l.x + SCREEN_W && l.waves), `${o.id} stands in a locked room`);
  assert.equal(next(jumpTo('shaft'), { type: 'stageClear' }).screen, 'stage5');
  assert.equal(next(jumpTo('stage5'), { type: 'stageClear' }).screen, 'scene3');
  assert.deepEqual(clearLines(60 * 200, 2, 5), ['STAGE 5 CLEAR', 'TIME 3:20', 'LIVES 2']);
});

test('the ritual: a standing altar in the locked room toughens, mends and hastens the staff until it breaks', () => {
  const foe = { id: 'associate1', kind: 'associate', team: 'foe', hp: 3, maxHp: 3, state: 'idle', cooldown: 40 };
  const altar = { kind: 'altar', state: 'standing', x: 100, y: 176 };
  const world = { run: { locked: true }, cameraX: 0, smash: [altar], fighters: [foe], events: [] };
  stepRitual(world);
  assert.equal(foe.maxHp, Math.ceil(3 * RITUAL.tough), 'chapel staff are tougher');
  assert.ok(world.ritual && foe.anointed);
  assert.deepEqual(world.events, ['ritual']);
  assert.equal(foe.cooldown, 40 - RITUAL.haste);
  foe.hp = 1;
  for (let i = 1; i < RITUAL.mendFrames; i++) stepRitual(world);
  assert.equal(foe.hp, 2, 'mends a point every mendFrames');
  altar.state = 'broken';
  stepRitual(world);
  assert.ok(!world.ritual && !foe.anointed);
  assert.equal(world.events.at(-1), 'ritualBroken');
  for (let i = 0; i < RITUAL.mendFrames * 2; i++) stepRitual(world);
  assert.equal(foe.hp, 2, 'no mending once the altars are down');
  assert.equal(foe.maxHp, Math.ceil(3 * RITUAL.tough), 'toughened once only');
});

for (const who of ['ward', 'mercer']) {
  test(`${who}: a bot plays Stage 5 from the narthex to stage clear, breaking both rituals`, () => {
    const log = playthrough(who);
    console.log(`${who}: ${log.cleared ? 'cleared' : 'not cleared'} in ${(log.frames / 3600).toFixed(1)} min (${log.frames} frames), ${log.locks} locks, ${log.waves} waves, ${log.rituals} rituals, ${log.broken} broken, ${log.mended} hp mended, ${log.heals} heals, ${log.lives} lives lost (at locks ${log.lost.join(',')}), ${log.continues} continues`);
    assert.ok(log.cleared, `stuck after ${log.frames} frames: ${JSON.stringify(log.end)}`);
    assert.ok(log.frames >= 60 * 60 * 2 && log.frames <= 60 * 60 * 8, 'a run with its continues takes minutes');
    assert.ok(log.locks >= 6, `${log.locks} locks`);
    assert.ok(log.rituals >= 2 && log.smashed >= chapelAltars(layout(CHAPEL).starts).length, 'both rituals are lit and every altar is smashed');
    assert.deepEqual([...log.foes].sort(), ['associate', 'counsel', 'manager', 'supervisor']);
    assert.ok(log.checkpoints.includes('stage5-area3'), 'passes the mid-stage checkpoint');
  });
}

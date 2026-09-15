import test from 'node:test';
import assert from 'node:assert/strict';
import { player } from '../src/stage1/moves.mjs';
import { PIPS, newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { HEAL, areaFor, newStage, stepAreas } from '../src/stage1/areas.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { enterOffice, vellum } from '../src/stage1/vellum.mjs';
import { freeInjunction } from '../src/injunction.mjs';
import { jumpTo, next } from '../src/flow.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';
import { SNES_STAGE1 } from '../src/snes/stage1/waves.mjs';
import { CLEAR, OFFICE, clearDone, clearLines } from '../src/snes/stage1/boss.mjs';
import { BRAWL_WEIGHT, weighShared, weighed } from '../src/snes/weight.mjs';
import { armWorld, defaultWeapons, scaledWeapons, stageSmash } from '../src/stage1/weapons.mjs';

const OPEN = ['recover', 'hurt', 'idle', 'walk', 'knockdown', 'guard'];

// The floor exactly as the SNES scene builds it for the flow's checkpoint.
function build(flow, tune) {
  const world = flow.checkpoint === OFFICE
    ? enterOffice(newFloor(flow.auditor, tune), tune)
    : newStage(newFloor(flow.auditor, tune), tune, areaFor(flow.checkpoint), SNES_STAGE1);
  if (flow.checkpoint !== OFFICE) armWorld(world, stageSmash(world.stage.starts), scaledWeapons(defaultWeapons(), STAGE1.scale));
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

// A player who reads tells: parries staff blows and rushes, red tape, his sweep and his rush as they land, throws
// whatever he grabs at the nearest foe, and punches only a foe who is open.
function bot(i, world, tune) {
  const p = player(world);
  const foes = world.fighters.filter((f) => f.kind && !['ko', 'slumped'].includes(f.state));
  const f = foes.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  const box = p.hp <= PIPS - HEAL && world.firstAid?.find((o) => !o.taken && o.x >= world.floor.left && o.x <= world.floor.right);
  if (box && (!f || Math.abs(f.x - p.x) > 60)) return { held: approach(p, box, 4), b: false, parry: false };
  if (!f) return { held: ['right'], b: false, parry: false };
  if (p.state === 'grab') return { held: [f.x >= p.x ? 'right' : 'left'], b: true, parry: false };
  const v = vellum(world);
  const tape = world.tapes.some((o) => Math.abs(o.y - p.y) <= tune.depthReach && (p.x - o.x) * Math.sign(o.vx) > 0 && Math.abs(p.x - o.x) < 8 + Math.abs(o.vx) * 5);
  const staffBlow = foes.some((o) => o.kind !== 'vellum' && ((o.state === 'windup' && !o.attack?.rush && !o.attack?.shot && o.t >= (o.attack?.windup ?? tune.kinds[o.kind].windup) - 5 && Math.abs(o.x - p.x) < 80)
    || (o.state === 'charge' && Math.abs(o.y - p.y) <= tune.depthReach && Math.abs(o.x - p.x) - 12 <= o.attack.rush * 5)));
  let bossTell = false;
  if (v) {
    const t = v.vellum ?? tune.vellum;
    const windup = v.fangs ? t.windup[1] : t.windup[0];
    const rushGap = Math.abs(v.x - p.x) - t.rushReach;
    bossTell = (v.state === 'windup' && v.attack === 'sweep' && v.t === windup - 3)
      || (v.state === 'rush' && rushGap > 0 && rushGap <= (Math.abs(v.vx) || 1) * 5);
  }
  const parry = !p.parry && (tape || staffBlow || bossTell);
  const open = OPEN.includes(f.state) && !f.armoured && !(f.kind === 'vellum' && f.state === 'guard');
  const threat = v && ['windup', 'rush', 'sweep'].includes(v.state);
  const held = !threat || open ? approach(p, f, tune.punchReach - 6) : [];
  // Swinging from outside the real reach roots him in the punch, and a foe backed on the wall is never closed on.
  const inReach = Math.abs(f.x - p.x) <= tune.punchReach - 2 && Math.abs(f.y - p.y) <= tune.depthReach;
  return { held, b: open && inReach && i % 4 === 0, parry };
}

const pad = ({ held = [], b = false, parry = false }) => ({ held: new Set(held), pressed: new Set(b ? ['b'] : []), parry, step: 0, dash: null });

// Plays Stage 1 from the first screen the way the scene does: checkpoints, lives, a continue on game
// over back at the last checkpoint, the door to Vellum's office, and his slump into stage clear.
function playthrough(who, brain = bot, cap = 60 * 60 * 12) {
  weighShared();
  const tune = scaledTune(weighed(tuneFor(who), BRAWL_WEIGHT), STAGE1.scale);
  let flow = jumpTo('stage1');
  flow = { ...flow, auditor: who };
  let world = build(flow, tune);
  const log = { frames: 0, lives: 0, continues: 0, locks: 0, waves: 0, heals: 0, checkpoints: [], office: 0, cleared: false };
  for (let i = 0; i < cap && !log.cleared; i++) {
    stepFloor(world, pad(brain(i, world, tune, log)), tune);
    const hurt = player(world).hp < PIPS;
    if (flow.checkpoint !== OFFICE) stepAreas(world, tune);
    log.frames = i + 1;
    const events = world.events;
    world.events = [];
    for (const e of events) {
      if (e === 'lock') log.locks++;
      if (e === 'wave') log.waves++;
      // A box walked over at full health heals nothing, so only a hurt pickup counts.
      if (e === 'heal' && hurt) log.heals++;
      if (e.startsWith('checkpoint:')) { flow = next(flow, { type: 'checkpoint', id: e.slice(11) }); log.checkpoints.push(e.slice(11)); }
      if (e === 'toOffice') { flow = next(flow, { type: 'checkpoint', id: OFFICE }); world = build(flow, tune); log.office = i; break; }
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
      if (e === 'bossBeaten') { flow = next(flow, { type: 'stageClear' }); log.cleared = flow.screen === 'scene2'; }
    }
  }
  const p = player(world);
  log.end = { x: Math.round(p.x), y: Math.round(p.y), hp: p.hp, state: p.state, run: world.run && { lock: world.run.lock, wave: world.run.wave, locked: world.run.locked }, bench: world.bench?.length, foes: world.fighters.filter((f) => f.kind).map((f) => `${f.kind}:${f.state}:${f.hp}@${Math.round(f.x)},${Math.round(f.y)}${f.entering ? ':entering' : ''}`), floor: world.floor };
  return log;
}

for (const who of ['ward', 'mercer']) {
  test(`${who}: a bot plays Stage 1 from the first screen to stage clear`, () => {
    const log = playthrough(who);
    const minutes = (log.frames / 3600).toFixed(1);
    console.log(`${who}: ${log.cleared ? 'cleared' : 'not cleared'} in ${minutes} min (${log.frames} frames), office at ${(log.office / 3600).toFixed(1)} min, ${log.locks} locks, ${log.waves} waves, ${log.heals} heals, ${log.lives} lives lost, ${log.continues} continues`);
    assert.ok(log.cleared, `stuck after ${log.frames} frames: ${JSON.stringify(log.end)}`);
    assert.ok(log.frames >= 60 * 60 * 2 && log.frames <= 60 * 60 * 5, 'a clean run takes minutes, not seconds; a human takes longer');
    assert.ok(log.heals <= 1, `the bot needs at most one of the two first-aid boxes, took ${log.heals}`);
    assert.equal(log.lives, 0, 'a bot that reads tells loses no life');
    assert.ok(log.locks >= 5 && log.locks <= 7 + log.continues * 7, `${log.locks} locks`);
    assert.ok(log.checkpoints.includes('stage1-area3'), 'passes the mid-stage checkpoint');
  });
}

test('the stage-clear card shows the run time and lives, holds, and START skips it only after a beat', () => {
  assert.deepEqual(clearLines(60 * 197, 2), ['STAGE 1 CLEAR', 'TIME 3:17', 'LIVES 2']);
  const none = { pressed: new Set() };
  const start = { pressed: new Set(['start']) };
  assert.equal(clearDone(CLEAR.skip - 1, start), false);
  assert.equal(clearDone(CLEAR.skip, start), true);
  assert.equal(clearDone(CLEAR.hold - 1, none), false);
  assert.equal(clearDone(CLEAR.hold, none), true);
});

test('a player who stops fighting at Internal Review loses every life, continues there, and still clears', () => {
  const idle = { held: [], b: false, parry: false };
  const continued = [];
  const sulk = (i, world, tune, log) => {
    if (log.continues > continued.length) continued.push(Math.round(player(world).x));
    if (world.run?.area >= 2 && world.run.locked) log.sulking = true;
    return log.continues === 0 && log.sulking ? idle : bot(i, world, tune);
  };
  const log = playthrough('ward', sulk);
  console.log(`sulker: ${log.cleared ? 'cleared' : 'not cleared'} in ${(log.frames / 3600).toFixed(1)} min, ${log.lives} lives lost, ${log.continues} continues, back at x ${continued[0]}`);
  assert.equal(log.continues, 1);
  assert.equal(log.lives, 3);
  const tune = tuneFor('ward');
  const restart = newStage(newFloor('ward', tune), tune, 2, SNES_STAGE1);
  assert.equal(continued[0], player(restart).x, 'the continue starts at the Internal Review checkpoint');
  assert.ok(log.cleared, JSON.stringify(log.end));
});

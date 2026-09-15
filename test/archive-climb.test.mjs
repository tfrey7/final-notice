import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad, PADS } from '../src/input.mjs';
import { ARCHIVE, ARENA, COLS, FLOOD, LEDGES, LIVES, RESPAWN_FRAMES, createArchive, startAtSummit, stepArchive } from '../src/stage2/climb.mjs';
import { botButtons, createBot } from '../src/stage2/climbbot.mjs';
import { TILE } from '../src/stage2/physics.mjs';

const idle = () => updatePad(createPad(PADS.snes), new Set());

test('the Archive is walled, floored, and no ledge overlaps its neighbour', () => {
  for (const row of ARCHIVE.map) assert.equal(row.length, COLS, row);
  assert.equal(ARCHIVE.map.at(-1), '#'.repeat(COLS));
  const { ledges } = ARCHIVE;
  assert.equal(ledges.length, LEDGES + 3);
  for (let k = 1; k < ledges.length; k++) {
    const [a, b] = [ledges[k - 1], ledges[k]];
    assert.equal(a.row - b.row, 2);
    const above = ledges[k + 1];
    if (above) assert.ok(above.c1 < b.c0 || above.c0 > b.c1, `ledges ${k} and ${k + 1} overlap`);
  }
  assert.ok(createArchive().run.foes.length >= 6);
});

test('the flood waits out its grace, then rises and takes a life from a player who stands still', () => {
  const s = createArchive();
  const start = s.flood.y;
  for (let i = 0; i < FLOOD.grace; i++) stepArchive(s, idle());
  assert.equal(s.flood.y, start);
  let deaths = [];
  for (let i = 0; i < 2000 && !deaths.length; i++) deaths = stepArchive(s, idle()).events.filter((e) => e.type === 'death');
  assert.equal(deaths[0]?.kind, 'caught');
  assert.equal(s.lives, LIVES - 1);
  for (let i = 0; i < RESPAWN_FRAMES; i++) stepArchive(s, idle());
  assert.equal(s.run.player.y, s.run.area.start.y);
  assert.equal(s.flood.y, s.run.player.y + FLOOD.gap);
});

test('losing every life ends the run', () => {
  const s = createArchive();
  for (let i = 0; i < 20000 && !s.over; i++) stepArchive(s, idle());
  assert.equal(s.over?.kind, 'game over');
});

test('a bot on the SNES pad climbs from the floor through the checkpoint into the Custodian\'s arena', () => {
  const s = createArchive();
  const bot = createBot();
  let pad = createPad(PADS.snes);
  const seen = new Set();
  let frames = 0;
  for (; frames < 60 * 300 && !s.over && !seen.has('custodian'); frames++) {
    pad = updatePad(pad, botButtons(bot, s));
    for (const e of stepArchive(s, pad).events) seen.add(e.type);
  }
  assert.ok(seen.has('custodian'), `stopped ${Math.round((s.run.area.start.y - s.best) / TILE)} rows up with ${s.lives} lives`);
  assert.ok(seen.has('checkpoint'));
  assert.equal(s.fight?.hp, s.fight?.maxHp);
  assert.equal(s.checkpoint.y, ARENA.y);
  const seconds = frames / 60;
  console.log(`bot reached the Custodian in ${seconds.toFixed(1)} s with ${s.lives} lives`);
  assert.ok(seconds >= 60 && seconds <= 180, `${seconds} s`);
});

test('the arena stops the flood, and beating the Custodian clears the stage', () => {
  const s = startAtSummit(createArchive());
  const seen = new Set();
  for (let i = 0; i < 5; i++) for (const e of stepArchive(s, idle()).events) seen.add(e.type);
  assert.ok(seen.has('custodian'));
  const flood = s.flood.y;
  for (let i = 0; i < FLOOD.grace + 60; i++) {
    s.run.player.invuln = 99;
    stepArchive(s, idle());
  }
  assert.ok(s.flood.y >= flood, 'the flood held');
  assert.equal(s.over, null);
  s.fight.hp = 0;
  const events = stepArchive(s, idle()).events.map((e) => e.type);
  assert.ok(events.includes('bossDown') && events.includes('stageClear'));
  assert.equal(s.over?.kind, 'clear');
});

test('a life lost in the fight comes back at the arena against a Custodian at full health', () => {
  const s = startAtSummit(createArchive());
  stepArchive(s, idle());
  s.fight.hp = 5;
  s.run.player.health = 0;
  stepArchive(s, idle());
  assert.equal(s.lives, LIVES - 1);
  for (let i = 0; i < RESPAWN_FRAMES; i++) stepArchive(s, idle());
  assert.equal(s.run.player.y, ARENA.y);
  assert.equal(s.fight.hp, s.fight.maxHp);
});

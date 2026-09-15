import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad, PADS } from '../src/input.mjs';
import { CAR, CHECKPOINT_LEDGE, COLS, LIVES, RESPAWN_FRAMES, RUNAWAY, SHAFT, TOP_LEDGE, createShaft, stepShaft } from '../src/stage4/shaft.mjs';
import { botButtons, createBot } from '../src/stage4/shaftbot.mjs';
import { TILE } from '../src/stage2/physics.mjs';

const solid = (col, row) => SHAFT.map[row]?.[col] === '#';
const frame = (pad, down) => updatePad(pad, new Set(down));

test('the shaft is walled and floored, and every cable and car lane is clear of girders', () => {
  for (const row of SHAFT.map) assert.equal(row.length, COLS, row);
  assert.equal(SHAFT.map.at(-1), '#'.repeat(COLS));
  assert.ok(SHAFT.cables.length >= 6 && SHAFT.cars.length >= 6);
  for (const c of SHAFT.cables) {
    for (let row = c.top / TILE - 2; row < c.bottom / TILE; row++) assert.ok(!solid(c.col, row), `cable ${c.k} row ${row}`);
  }
  for (const car of SHAFT.cars) {
    for (let row = car.top / TILE - 2; row < car.bottom / TILE; row++) {
      for (let col = car.c0; col <= car.c1; col++) assert.ok(!solid(col, row), `car ${car.k} at ${col},${row}`);
    }
  }
  assert.ok(TOP_LEDGE.top && CHECKPOINT_LEDGE.side);
});

test('holding up beside a cable grabs it and climbs, and jump lets go', () => {
  const s = createShaft();
  const c = SHAFT.cables[0];
  const p = s.run.player;
  Object.assign(p, { x: c.x - 6, y: c.bottom, grounded: true });
  let pad = createPad(PADS.snes);
  stepShaft(s, pad = frame(pad, ['up']));
  assert.equal(s.hang, SHAFT.cables[0]);
  for (let i = 0; i < 30; i++) stepShaft(s, pad = frame(pad, ['up']));
  assert.ok(p.y < c.bottom - 30, `${p.y}`);
  assert.equal(p.x, c.x);
  stepShaft(s, pad = frame(pad, ['b']));
  assert.equal(s.hang, null);
  assert.ok(p.vy < 0);
});

test('an elevator car carries a rider from its bottom stop to its top stop', () => {
  const s = createShaft();
  const car = s.cars[0];
  const p = s.run.player;
  let pad = createPad(PADS.snes);
  for (let i = 0; i < 90; i++) stepShaft(s, pad = frame(pad, []));
  assert.equal(car.y, car.bottom, 'a car with nobody aboard stays parked');
  Object.assign(p, { x: car.x, y: car.bottom - 4, vy: 0, grounded: false });
  for (let i = 0; i < CAR.board + (car.bottom - car.top) / CAR.speed + 8; i++) stepShaft(s, pad = frame(pad, []));
  assert.equal(s.ride?.k, car.k);
  assert.equal(p.y, car.top);
});

test('the runaway car waits out its grace, then catches a player who stands still', () => {
  const s = createShaft();
  const start = s.runaway.y;
  let pad = createPad(PADS.snes);
  for (let i = 0; i < RUNAWAY.grace; i++) stepShaft(s, pad = frame(pad, []));
  assert.equal(s.runaway.y, start);
  const seen = [];
  for (let i = 0; i < 3000 && !seen.some((e) => e.type === 'death'); i++) seen.push(...stepShaft(s, pad = frame(pad, [])).events);
  assert.ok(seen.some((e) => e.type === 'alarm') || seen.some((e) => e.type === 'death'));
  assert.equal(seen.find((e) => e.type === 'death')?.kind, 'caught');
  assert.equal(s.lives, LIVES - 1);
  for (let i = 0; i < RESPAWN_FRAMES; i++) stepShaft(s, pad = frame(pad, []));
  assert.equal(s.run.player.y, s.run.area.start.y);
  assert.equal(s.runaway.y, s.run.player.y + RUNAWAY.gap);
});

test('losing every life ends the run', () => {
  const s = createShaft();
  const pad = createPad(PADS.snes);
  for (let i = 0; i < 20000 && !s.over; i++) stepShaft(s, pad);
  assert.equal(s.over?.kind, 'game over');
});

test('a bot on the SNES pad climbs from the floor through the checkpoint to Bellwether\'s signature', () => {
  const s = createShaft();
  const bot = createBot();
  let pad = createPad(PADS.snes);
  const seen = new Set();
  let frames = 0;
  for (; frames < 60 * 300 && !s.over; frames++) {
    pad = updatePad(pad, botButtons(bot, s));
    for (const e of stepShaft(s, pad).events) seen.add(e.type);
  }
  assert.equal(s.over?.kind, 'clear', `stopped ${Math.round((s.run.area.start.y - s.best) / TILE)} rows up with ${s.lives} lives`);
  assert.ok(['checkpoint', 'grab', 'signature', 'stageClear'].every((t) => seen.has(t)), [...seen].join());
  assert.equal(s.checkpoint.y, CHECKPOINT_LEDGE.row * TILE);
  const seconds = frames / 60;
  console.log(`bot cleared the shaft in ${seconds.toFixed(1)} s with ${s.lives} lives`);
  assert.ok(seconds >= 120 && seconds <= 180, `${seconds} s`);
});

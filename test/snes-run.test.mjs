import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES } from '../src/platform.mjs';
import { createSlowdown, pairs, slowdownTick } from '../src/nes/slowdown.mjs';

const brawl = (fighters, props, sprites) => ({ objects: fighters + props, collisions: pairs(fighters) + fighters * props, sprites });
const updatesIn = (frames, work, budget) => {
  const sd = createSlowdown();
  return Array.from({ length: frames }, () => slowdownTick(sd, work, budget)).filter(Boolean).length;
};

test('the SNES advances a crowded floor at the same rate as an empty one', () => {
  const budget = PROFILES.snes.slowdownBudget;
  const empty = updatesIn(120, brawl(1, 0, 8), budget);
  assert.equal(empty, 120);
  assert.equal(updatesIn(120, brawl(4, 4, 60), budget), empty);
  assert.equal(updatesIn(120, brawl(12, 12, 128), budget), empty);
});

test('the NES keeps its slowdown on a crowded screen', () => {
  assert.ok(updatesIn(120, brawl(12, 0, 64), PROFILES.nes.slowdownBudget) < 120);
});

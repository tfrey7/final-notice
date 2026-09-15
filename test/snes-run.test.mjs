import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES } from '../src/platform.mjs';
import { createSlowdown, pairs, slowdownTick } from '../src/nes/slowdown.mjs';

test('the SNES slows on a crowded floor and not on a light one; the NES budget is unchanged', () => {
  const brawl = (fighters, props, sprites) => ({ objects: fighters + props, collisions: pairs(fighters) + fighters * props, sprites });
  const lagsOn = (work, budget) => {
    const sd = createSlowdown();
    slowdownTick(sd, work, budget);
    return !slowdownTick(sd, work, budget);
  };
  assert.ok(lagsOn(brawl(4, 4, 60), PROFILES.snes.slowdownBudget));
  assert.ok(!lagsOn(brawl(4, 0, 40), PROFILES.snes.slowdownBudget));
  assert.ok(!lagsOn(brawl(2, 0, 20), PROFILES.snes.slowdownBudget));
  assert.ok(!lagsOn(brawl(4, 4, 60), PROFILES.nes.slowdownBudget));
});

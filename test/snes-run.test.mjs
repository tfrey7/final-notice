import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT } from '../src/snes/screen.mjs';
import { rgb15 } from '../src/snes/color.mjs';
import { screen } from '../src/snes/fx.mjs';
import { CREDITS_AT, creditsEnd } from '../src/story/ending.mjs';
import { FLOOR, LIT, darkTo, douse } from '../src/snes/scenes/lights.mjs';
import { PROFILES } from '../src/platform.mjs';
import { createSlowdown, pairs, slowdownTick } from '../src/nes/slowdown.mjs';

test('the office lights go out whole floors at a time, none before the credits and all by THE END', () => {
  assert.equal(darkTo(0), 0);
  assert.equal(darkTo(CREDITS_AT), 0);
  assert.equal(darkTo(creditsEnd()), HEIGHT);
  let last = 0;
  for (let f = CREDITS_AT; f <= creditsEnd(); f += 7) {
    const y = darkTo(f);
    assert.equal(y % FLOOR, 0);
    assert.ok(y >= last);
    last = y;
  }
});

test('dousing darkens only lit windows above the line and leaves the beacons red', () => {
  const [warm] = LIT.keys();
  const beacon = rgb15(29, 4, 4);
  const buf = screen(warm);
  buf[0] = beacon;
  douse(buf, 16);
  assert.equal(buf[0], beacon);
  assert.equal(buf[WIDTH + 1], LIT.get(warm));
  assert.equal(buf[16 * WIDTH], warm);
});

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

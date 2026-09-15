import test from 'node:test';
import assert from 'node:assert/strict';
import { hex } from '../src/snes/color.mjs';
import { bakeScene, composeFrame, sceneProblems } from '../src/snes/layers.mjs';
import { CLERK_FRAMES, SKIES, clerkDesk, pastDue, skyFor } from '../src/snes/clock.mjs';
import { DARK_WINDOW, KEPT_FLOOR, KEPT_WINDOWS, afterHours, floorEntry, litWindow, logoReading, mode7Problems, setFloors } from '../src/snes/bg/ui.mjs';

test('skyFor: dusk before 21:00, night until 04:00, pre-dawn from 04:00', () => {
  assert.equal(skyFor(18).name, 'dusk');
  assert.equal(skyFor(20).name, 'dusk');
  assert.equal(skyFor(21).name, 'night');
  assert.equal(skyFor(0).name, 'night');
  assert.equal(skyFor(3).name, 'night');
  assert.equal(skyFor(4).name, 'predawn');
  assert.equal(skyFor(11).name, 'predawn');
  assert.equal(skyFor(12).name, 'dusk');
  const pairs = Object.values(SKIES).map((s) => `${s.top}:${s.bottom}`);
  assert.equal(new Set(pairs).size, 3);
});

test('pastDue turns true only once the local clock passes midnight', () => {
  const opened = new Date(2026, 8, 15, 23, 59, 50);
  assert.equal(pastDue(opened, new Date(2026, 8, 15, 23, 59, 59)), false);
  assert.equal(pastDue(opened, new Date(2026, 8, 16, 0, 0, 1)), true);
  assert.equal(pastDue(new Date(2026, 8, 16, 0, 0, 5), new Date(2026, 8, 16, 3, 0, 0)), false);
});

test('the clerk changes desk every ten seconds and stays inside the lit floor', () => {
  const n = KEPT_WINDOWS.count;
  assert.equal(clerkDesk(0, n), clerkDesk(CLERK_FRAMES - 1, n));
  for (let p = 0; p < 30; p++) {
    const d = clerkDesk(p * CLERK_FRAMES, n);
    assert.ok(d >= 0 && d < n);
    assert.notEqual(d, clerkDesk((p + 1) * CLERK_FRAMES, n));
  }
});

test('each sky is a legal scene whose backdrop is its top colour', () => {
  for (const sky of Object.values(SKIES)) {
    const s = afterHours(sky);
    assert.deepEqual(sceneProblems(s), []);
    assert.equal(s.backdrop, sky.top);
    const out = composeFrame(s, bakeScene(s), 0, 0);
    assert.equal((out[0] << 16) | (out[1] << 8) | out[2], hex(sky.top));
  }
});

test('PAST DUE: the kept floor goes out and the logo reads PAST DUE as a legal Mode 7 image', () => {
  const s = afterHours();
  const [slot, entry] = floorEntry(KEPT_FLOOR);
  setFloors(s.palettes, 15);
  assert.equal(s.palettes[slot][entry - 1], litWindow(KEPT_FLOOR));
  setFloors(s.palettes, 15, true);
  assert.equal(s.palettes[slot][entry - 1], DARK_WINDOW);
  const late = logoReading('PAST DUE');
  assert.deepEqual(mode7Problems(late), []);
  assert.notDeepEqual(late.pixels, logoReading('NOTICE').pixels);
});

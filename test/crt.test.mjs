import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, MODES, nextMode, pickMode, screenBox } from '../src/crt/mode.mjs';

test('the TV is on by default, ?crt=off turns it off and the query beats the remembered choice', () => {
  assert.equal(pickMode(null, null), 'crt');
  assert.equal(pickMode('off', 'composite'), 'sharp');
  assert.equal(pickMode('composite', 'sharp'), 'composite');
  assert.equal(pickMode(null, 'sharp'), 'sharp');
  assert.equal(pickMode('banana', 'nonsense'), 'crt');
});

test('the toggle cycles every mode and comes back round', () => {
  let mode = MODES[0];
  const seen = [];
  for (let i = 0; i < MODES.length; i++) { seen.push(mode); mode = nextMode(mode); }
  assert.deepEqual(seen.sort(), [...MODES].sort());
  assert.equal(mode, MODES[0]);
});

test('every TV mode has a look, and sharp pixels has none', () => {
  assert.ok(LOOKS.crt && LOOKS.composite);
  assert.equal(LOOKS.sharp, undefined);
  assert.ok(LOOKS.composite.bleed > LOOKS.crt.bleed);
});

test('the screen is a centred 4:3 face inside the bezel', () => {
  const wide = screenBox(1920, 1080);
  assert.ok(Math.abs(wide.w * 3 / 4 - wide.h) <= 1);
  assert.ok(Math.abs(wide.x - (1920 - wide.w) / 2) <= 1);
  assert.ok(wide.h < 1080 && wide.y > 0);
  const tall = screenBox(600, 1000);
  assert.ok(tall.w <= 600 && tall.x > 0);
});

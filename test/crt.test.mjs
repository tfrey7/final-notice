import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, MODES, SNES_LOOKS, machineFor, nextMode, pickMode, pictureWidth, screenBox } from '../src/crt/mode.mjs';
import { PROFILES } from '../src/platform.mjs';

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

test('the NES looks are exactly what they were before the SNES arrived', () => {
  assert.deepEqual(LOOKS, {
    crt: { curve: 0.03, scan: 0.5, glow: 0.3, bleed: 0.35, crawl: 0.04, vignette: 0.22, mask: 0.1, sharp: 3.0 },
    composite: { curve: 0.04, scan: 0.42, glow: 0.4, bleed: 1.0, crawl: 0.16, vignette: 0.28, mask: 0.16, sharp: 1.4 },
  });
  const nes = machineFor(PROFILES.nes.crtLook);
  assert.equal(nes.looks, LOOKS);
  assert.equal(nes.frames, 3);
  assert.equal(nes.linePhase, 2.0944);
  assert.equal(pictureWidth(nes, 256, 240), 1);
  assert.equal(machineFor(undefined), nes);
});

test('the SNES TV is S-video sharp with softer scanlines, and composite keeps blur and crawl', () => {
  const snes = machineFor(PROFILES.snes.crtLook);
  assert.equal(snes.looks, SNES_LOOKS);
  assert.equal(SNES_LOOKS.sharp, undefined);
  assert.equal(snes.looks.crt.crawl, 0);
  assert.ok(snes.looks.crt.scan < LOOKS.crt.scan);
  assert.ok(snes.looks.crt.bleed < LOOKS.crt.bleed && snes.looks.crt.sharp > LOOKS.crt.sharp);
  assert.ok(snes.looks.composite.bleed > snes.looks.crt.bleed && snes.looks.composite.crawl > 0);
});

test('the SNES default is a good 1995 TV: faint scanlines, barely curved, a light glow, no bleed', () => {
  const tv = SNES_LOOKS.crt;
  assert.equal(tv.bleed, 0);
  assert.ok(tv.scan <= 0.15 && tv.glow <= 0.12 && tv.curve <= 0.01 && tv.vignette <= 0.05 && tv.mask <= 0.03);
  assert.deepEqual(SNES_LOOKS.composite,
    { curve: 0.04, scan: 0.36, glow: 0.34, bleed: 0.9, crawl: 0.11, vignette: 0.26, mask: 0.14, sharp: 1.6 });
});

test('the SNES frame shows at the 8:7 pixel aspect inside the 4:3 face', () => {
  const snes = machineFor('snes');
  assert.equal(snes.pixelAspect, 8 / 7);
  const fill = pictureWidth(snes, 256, 224);
  // 256 pixels at 8:7 are 292.57 square pixels wide over 224 rows: 1.306:1 against the face's 4:3.
  assert.ok(Math.abs(fill - (256 * 8 / 7 / 224) / (4 / 3)) < 1e-12);
  assert.ok(Math.abs(fill - 0.9796) < 1e-4);
  const box = screenBox(1920, 1080);
  assert.ok(Math.abs(box.w * fill / box.h - 256 * 8 / 7 / 224) < 0.01);
});

test('the screen is a centred 4:3 face inside the bezel', () => {
  const wide = screenBox(1920, 1080);
  assert.ok(Math.abs(wide.w * 3 / 4 - wide.h) <= 1);
  assert.ok(Math.abs(wide.x - (1920 - wide.w) / 2) <= 1);
  assert.ok(wide.h < 1080 && wide.y > 0);
  const tall = screenBox(600, 1000);
  assert.ok(tall.w <= 600 && tall.x > 0);
});

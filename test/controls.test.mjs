import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PADS } from '../src/input.mjs';
import { SHORTCUTS, controllerSvg, controlsFor, deviceAfter, keysFor, legendFor, routeKey } from '../src/controls.mjs';

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.mjs') ? [join(dir, e.name)] : []));

test('no key a pad maps is also a page shortcut', () => {
  for (const pad of Object.values(PADS)) {
    for (const code of Object.keys(pad.keys)) assert.equal(SHORTCUTS[code], undefined, `${pad.name} ${code} is also ${SHORTCUTS[code]}`);
  }
});

test('no source file listens for a pad-mapped key by its code', () => {
  const codes = new Set(Object.values(PADS).flatMap((p) => Object.keys(p.keys)));
  for (const file of walk(fileURLToPath(new URL('../src', import.meta.url)))) {
    if (file.endsWith('input.mjs')) continue;
    for (const m of readFileSync(file, 'utf8').matchAll(/code\s*===?\s*['"](\w+)['"]/g)) {
      assert.ok(!codes.has(m[1]), `${file} binds ${m[1]}, which a pad owns`);
    }
  }
});

test('V and I are the SNES X button, and the list says what X does on each stage', () => {
  assert.equal(PADS.snes.keys.KeyV, 'x');
  assert.equal(keysFor('x'), 'V / I');
  const x = (stage) => controlsFor(stage).find((r) => r.pad === 'X');
  assert.equal(x('stage1').does, 'heavy');
  assert.equal(x('stage2').does, 'swap enchantment');
  const row = (pad) => controlsFor('stage1').find((r) => r.pad === pad);
  assert.deepEqual([row('Y+X').does, row('L').does, row('A').does], ['Injunction', 'block (Ward) / parry (Mercer)', 'special']);
  assert.equal(row('Y+X').keys, 'Z / J + V / I');
  const stage1 = controlsFor('stage1').map((r) => r.does).join();
  for (const word of ['light, grab', 'jump', 'Injunction', 'run', 'sidestep']) assert.ok(stage1.includes(word), word);
});

const pad = (pressed = [], axes = [0, 0]) => ({ buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })), axes });

test('the legend speaks for the last device touched', () => {
  assert.equal(deviceAfter('keyboard', { gamepads: [pad([0])] }), 'gamepad');
  assert.equal(deviceAfter('keyboard', { gamepads: [null, pad([], [0.9, 0])] }), 'gamepad');
  assert.equal(deviceAfter('gamepad', { gamepads: [pad(), null] }), 'gamepad');
  assert.equal(deviceAfter('gamepad', { key: 'KeyZ', gamepads: [pad()] }), 'keyboard');
  assert.equal(deviceAfter('keyboard', { gamepads: [pad([], [0.2, -0.3])] }), 'keyboard');
});

test('combo route buttons read as keys on a keyboard and SNES letters on a pad', () => {
  assert.deepEqual(['Y', 'X', 'A', 'JUMP', 'DOWN+Y', 'DAZED'].map((k) => routeKey(k)), ['Z', 'V', 'C', 'X', 'DOWN+Z', 'DAZED']);
  assert.deepEqual(['Y', 'X', 'DOWN+Y'].map((k) => routeKey(k, 'gamepad')), ['Y', 'X', 'DOWN+Y']);
});

test('controller legend labels keys on keyboard and pad buttons on a gamepad', () => {
  const keys = legendFor('stage1', 'keyboard');
  const gp = legendFor('stage1', 'gamepad');
  assert.deepEqual([keys.y.label, keys.x.label, keys.b.label, keys.a.label, keys.l.label, keys.yx.label], ['Z/J', 'V/I', 'X/K', 'C/L', 'Q', 'Z+V']);
  assert.deepEqual([gp.y.label, gp.x.label, gp.b.label, gp.a.label, gp.l.label, gp.yx.label], ['X', 'Y', 'A', 'B', 'LB', 'X+Y']);
  assert.deepEqual([keys.y.does, keys.x.does, keys.b.does, keys.a.does, keys.l.does, keys.yx.does], ['light, grab', 'heavy', 'jump', 'special', 'block (Ward) / parry (Mercer)', 'Injunction']);
  assert.equal(legendFor('stage2').yx, undefined);
});

test('on keyboard each button carries its key letter, on a gamepad its button name', () => {
  const keys = controllerSvg('stage1', 'keyboard');
  const gp = controllerSvg('stage1', 'gamepad');
  for (const [b, k] of [['y', 'Z'], ['x', 'V'], ['b', 'X'], ['a', 'C'], ['l', 'Q'], ['r', 'E']]) assert.ok(keys.includes(`data-face="${b}">${k}<`), `${b} shows ${k}`);
  for (const [b, k] of [['y', 'X'], ['x', 'Y'], ['b', 'A'], ['a', 'B'], ['l', 'LB'], ['r', 'RB']]) assert.ok(gp.includes(`data-face="${b}">${k}<`), `${b} shows ${k}`);
  assert.ok(keys.includes('data-face="dpad">W<') && !gp.includes('data-face="dpad"'));
  assert.ok(keys.includes('or J') && !gp.includes('or J'));
});

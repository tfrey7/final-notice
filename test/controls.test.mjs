import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PADS } from '../src/input.mjs';
import { SHORTCUTS, controlsFor, keysFor } from '../src/controls.mjs';

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
  assert.equal(x('stage1').does, 'Objection parry');
  assert.equal(x('stage2').does, 'swap enchantment');
  const stage1 = controlsFor('stage1').map((r) => r.does).join();
  for (const word of ['punch, grab', 'jump', 'Injunction', 'run', 'sidestep']) assert.ok(stage1.includes(word), word);
});

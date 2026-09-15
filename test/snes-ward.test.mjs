import test from 'node:test';
import assert from 'node:assert/strict';
import ward from '../src/snes/art/ward.mjs';

const STAGE1 = ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'punch1', 'punch2', 'punch3', 'hit'];

// Greedy cover of a frame's opaque pixels by 32x32 and 16x16 entries, as the SNES would need.
function oamEntries({ w, h, pixels }) {
  const left = pixels.map((row) => [...row].map((c) => c !== '0'));
  let n = 0;
  for (;;) {
    const y = left.findIndex((row) => row.includes(true));
    if (y < 0) return n;
    const x0 = left[y].indexOf(true);
    let best = null;
    for (const size of [32, 16]) {
      for (let x = x0 - size + 1; x <= x0; x++) {
        let gain = 0;
        for (let yy = y; yy < Math.min(h, y + size); yy++) {
          for (let xx = Math.max(0, x); xx < Math.min(w, x + size); xx++) gain += left[yy][xx];
        }
        const value = gain / (size === 32 ? 4 : 1);
        if (!best || value > best.value) best = { value, x, size };
      }
    }
    for (let yy = y; yy < Math.min(h, y + best.size); yy++) {
      for (let xx = Math.max(0, best.x); xx < Math.min(w, best.x + best.size); xx++) left[yy][xx] = false;
    }
    n++;
  }
}

test('Ward SNES palette is 15 rgb15 colours with a dark, non-black outline', () => {
  assert.equal(ward.palette.length, 15);
  for (const c of ward.palette) assert.ok(Number.isInteger(c) && c >= 0 && c <= 0x7fff);
  assert.notEqual(ward.palette[0], 0);
  const lum = (c) => (c & 31) + ((c >> 5) & 31) + ((c >> 10) & 31);
  assert.ok(lum(ward.palette[0]) < 16);
});

test('Ward SNES Stage 1 frames are 56-64 px tall, within the palette and 10 OAM entries', () => {
  for (const name of STAGE1) {
    const f = ward.frames[name];
    assert.ok(f, name);
    assert.ok(f.h >= 56 && f.h <= 64, `${name} is ${f.h} tall`);
    assert.equal(f.pixels.length, f.h);
    for (const row of f.pixels) assert.match(row, new RegExp(`^[0-9A-F]{${f.w}}$`));
    assert.ok(oamEntries(f) <= 10, `${name} needs ${oamEntries(f)} entries`);
    assert.equal(f.origin.length, 2);
  }
});

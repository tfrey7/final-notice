import test from 'node:test';
import assert from 'node:assert/strict';
import cast from '../src/art/cast.mjs';

const WHO = ['ward', 'mercer', 'associate'];

test('each of the cast has idle, a 4-frame walk, punch and hurt', () => {
  for (const who of WHO) {
    for (const anim of ['idle', 'walk', 'punch', 'hurt']) assert.ok(cast.animations[`${who}.${anim}`], `${who}.${anim}`);
    assert.equal(new Set(cast.animations[`${who}.walk`].frames).size, 4, who);
  }
});

test('every cast frame stays inside 24x40, three sprites across, feet on the same row', () => {
  for (const who of WHO) {
    for (const anim of ['idle', 'walk', 'punch', 'hurt']) {
      for (const f of cast.animations[`${who}.${anim}`].frames) {
        assert.ok(f.parts.every((p) => p.x + 8 <= 24 && p.y + 8 <= 40), `${who}.${anim}`);
        const rows = new Set(f.parts.map((p) => p.y));
        assert.ok(rows.size <= 5);
        for (const y of rows) assert.ok(f.parts.filter((p) => p.y === y).length <= 3, `${who}.${anim} row ${y}`);
        const bottom = f.parts.filter((p) => p.y === 32).map((p) => cast.tiles[p.tile][7]);
        assert.ok(bottom.some((r) => r.includes('1')), `${who}.${anim} stands on row 39`);
      }
    }
  }
});

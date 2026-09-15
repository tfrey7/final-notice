import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameEntries, oamOrder } from '../src/snes/limits.mjs';
import { thingPriority, withPriority } from '../src/snes/stage1/priority.mjs';

// One busy row as Stage 1 sorts it by depth: two desks and two dropped weapons above five fighters
// (4 tiles a line each). 40 tiles and 9 palettes on line 148, past both the 34-tile and 8-palette limits.
const fighters = [
  { team: 'player', state: 'idle' },
  { kind: 'associate', state: 'windup' },
  { kind: 'manager', state: 'walk' },
  { kind: 'counsel', state: 'hurt' },
  { kind: 'supervisor', state: 'walk' },
];
function busyRow() {
  const body = (x, palette) => [{ x, y: 100, size: 32, palette }, { x, y: 132, size: 32, palette }];
  return [
    ...['desk', 'cabinet'].map((k, i) => ({ s: k, entries: [{ x: i * 60, y: 132, size: 32, palette: k }, { x: i * 60 + 32, y: 132, size: 32, palette: k }] })),
    ...['stapler', 'binder'].map((k, i) => ({ wp: k, entries: [{ x: 140 + i * 20, y: 148, size: 16, palette: k }] })),
    ...fighters.map((f, i) => ({ f, entries: body(i * 34, f.kind ?? 'player') })),
  ];
}
const fighterIndices = (things) => {
  let at = 0;
  return things.flatMap((t) => { const idx = t.entries.map((_, k) => at + k); at += t.entries.length; return t.f ? idx : []; });
};

test('in depth order, the props and pickups above crowd a fighter off the row', () => {
  const things = busyRow();
  const { shown } = frameEntries(things.flatMap((t) => t.entries));
  assert.ok(fighterIndices(things).some((i) => !shown.has(i)));
});

test('four foes, the player and two pickups on one row: with priority every fighter still draws', () => {
  const things = busyRow();
  const entries = things.flatMap((t) => withPriority(t.entries, thingPriority(t)));
  const { shown, stats } = frameEntries(entries);
  for (const i of fighterIndices(things)) assert.ok(shown.has(i), `fighter entry ${i} dropped`);
  assert.ok(stats.dropped > 0, 'something low-priority still gives way');
});

test('the player and a foe mid-swing outrank other fighters, which outrank pickups', () => {
  assert.ok(thingPriority({ f: fighters[0] }) > thingPriority({ f: fighters[2] }));
  assert.equal(thingPriority({ f: fighters[1] }), thingPriority({ f: fighters[0] }));
  assert.ok(thingPriority({ f: fighters[2] }) > thingPriority({ wp: {} }));
  assert.deepEqual(oamOrder([{ prio: 0 }, { prio: 2 }, { prio: 0 }, { prio: 2 }]), [1, 3, 0, 2]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTune, player } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { AREAS, STAGE, newStage, stepAreas } from '../src/stage1/areas.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { VIEW_W } from '../src/stage1/staff.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';
import { SNES_AREAS, SNES_STAGE1, foeCount } from '../src/snes/stage1/waves.mjs';

const walkRight = { held: new Set(['right']), pressed: new Set(), dash: null };

test('the SNES stage runs about thirty foes over the same four areas; the NES keeps its own', () => {
  const count = foeCount(SNES_AREAS);
  assert.ok(count >= 28 && count <= 34, `${count} foes`);
  assert.equal(foeCount(AREAS), 14);
  assert.deepEqual(SNES_AREAS.map((a) => [a.id, a.screens]), AREAS.map((a) => [a.id, a.screens]));
  for (const area of SNES_AREAS) {
    assert.ok(foeCount([area]) >= 4, `${area.id} has a real fight`);
    for (const l of area.locks) {
      assert.ok(l.seats >= 1 && l.seats <= 4);
      for (const w of l.waves) assert.ok(w.foes.length >= 1 && w.foes.length <= 4);
    }
  }
  const [teach] = SNES_AREAS[0].locks[0].waves;
  assert.deepEqual([teach.prompt, teach.foes], ['PUNCH', ['associate']], 'Reception still opens on one Associate');
  assert.ok(foeCount([SNES_AREAS[0]]) <= 8, 'and its teaching stays short');
});

for (const who of ['ward', 'mercer']) {
  test(`${who}: every SNES foe walks on from beyond the locked view's edges, up to four at once`, () => {
    const tune = scaledTune(tuneFor(who, defaultTune()), STAGE1.scale);
    const world = newStage(newFloor(who, tune), tune, 0, SNES_STAGE1);
    const p = player(world);
    const spawns = [];
    let most = 0;
    const seen = new Set();
    const note = () => {
      for (const f of world.fighters) {
        if (!f.kind || seen.has(f)) continue;
        seen.add(f);
        spawns.push({ x: f.x, cam: world.run.camera, locked: world.run.locked });
      }
      most = Math.max(most, world.fighters.filter((f) => f.kind).length);
    };
    for (let i = 0; i < 20000 && !world.run.done; i++) {
      p.invuln = 999;
      stepFloor(world, walkRight, tune);
      note();
      stepAreas(world, tune);
      note();
      world.fighters = world.fighters.filter((f) => !f.kind || f.entering);
    }
    assert.ok(world.run.done, `stuck at x ${p.x}, camera ${world.cameraX}`);
    assert.equal(spawns.length, foeCount(SNES_AREAS));
    for (const s of spawns) {
      assert.ok(s.locked, 'foes come only on a locked screen');
      assert.ok(s.x < s.cam || s.x > s.cam + VIEW_W, `spawned at ${s.x} inside the view ${s.cam}-${s.cam + VIEW_W}`);
    }
    assert.ok(spawns.some((s) => s.x < s.cam) && spawns.some((s) => s.x > s.cam + VIEW_W), 'from both sides');
    assert.equal(most, 4);
    assert.equal(world.stage.width, STAGE.width);
  });
}

test('a foe off screen is not held to the floor until he has walked onto it', () => {
  const tune = scaledTune(tuneFor('ward', defaultTune()), STAGE1.scale);
  const world = newStage(newFloor('ward', tune), tune, 0, SNES_STAGE1);
  for (let i = 0; i < 400 && !world.fighters.some((f) => f.kind); i++) {
    player(world).invuln = 999;
    stepFloor(world, walkRight, tune);
    stepAreas(world, tune);
  }
  const foe = world.fighters.find((f) => f.kind);
  assert.ok(foe.entering && (foe.x < world.floor.left || foe.x > world.floor.right), `${foe.x}`);
  const idle = { held: new Set(), pressed: new Set(), dash: null };
  for (let i = 0; i < 600 && foe.entering; i++) {
    player(world).invuln = 999;
    stepFloor(world, idle, tune);
    stepAreas(world, tune);
  }
  assert.equal(foe.entering, false);
  assert.ok(foe.x >= world.floor.left && foe.x <= world.floor.right);
});

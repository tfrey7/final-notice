import test from 'node:test';
import assert from 'node:assert/strict';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { WEAPONS, WEAPON_SCALED, armWorld, defaultWeapons, scaledWeapons, stageSmash, SMASH } from '../src/stage1/weapons.mjs';
import { STAGE } from '../src/stage1/areas.mjs';
import { fighter } from '../src/stage1/moves.mjs';

const tune = tuneFor('ward');
const pad = (b) => ({ held: new Set(b ? ['b'] : []), pressed: new Set(b === 'press' ? ['b'] : []), step: 0, dash: null });

// The auditor facing right at x 110 with the practice dummy 18 px ahead, and furniture as given.
function room(smash = [], weapons = defaultWeapons()) {
  const w = armWorld(newFloor('ward', tune), smash, weapons);
  w.fighters = w.fighters.filter((f) => f.id !== 'spar');
  w.props = [];
  Object.assign(w.fighters[0], { x: 110, y: 188 });
  return w;
}
const dummy = (w) => w.fighters.find((f) => f.dummy);
const me = (w) => w.fighters[0];
function run(w, frames, b = null) {
  for (let i = 0; i < frames; i++) stepFloor(w, pad(i === 0 ? b : b === 'hold' ? 'hold' : null), tune);
}

test('punches break a desk and it drops its weapon, which the auditor picks up', () => {
  const w = room([{ kind: 'desk', x: 126, y: 188, drop: 'binder' }]);
  w.fighters = [me(w)];
  for (let i = 0; i < WEAPONS.smashHits[0]; i++) run(w, 40, 'press');
  assert.equal(w.smash[0].state, 'broken');
  assert.equal(w.weapons.length, 1);
  me(w).x = w.weapons[0].x;
  me(w).y = w.weapons[0].y;
  run(w, 2, 'press');
  assert.deepEqual(me(w).weapon, { kind: 'binder', uses: WEAPONS.binderUses[0] });
});

test('a binder swing hurts the foe ahead and spends one use; the last use breaks it', () => {
  const w = room();
  me(w).weapon = { kind: 'binder', uses: 2 };
  run(w, 40, 'press');
  assert.equal(dummy(w).hp, tune.foeHp - WEAPONS.binderDamage[0]);
  assert.equal(me(w).weapon.uses, 1);
  run(w, 40, 'press');
  assert.equal(me(w).weapon, null);
});

test('a thrown stapler hits and lands as a pickup with one use fewer', () => {
  const w = room();
  me(w).weapon = { kind: 'stapler', uses: 3 };
  run(w, 20, 'press');
  assert.equal(me(w).weapon, null);
  assert.equal(dummy(w).hp, tune.foeHp - WEAPONS.staplerDamage[0]);
  assert.equal(w.weapons[0].state, 'floor');
  assert.equal(w.weapons[0].uses, 2);
});

test('the extinguisher pushes a foe back without hurting it, while B is held', () => {
  const w = room();
  me(w).weapon = { kind: 'extinguisher', uses: 90 };
  const x = dummy(w).x;
  stepFloor(w, pad('press'), tune);
  run(w, 30, 'hold');
  assert.ok(dummy(w).x > x + 8, `pushed from ${x} to ${dummy(w).x}`);
  assert.equal(dummy(w).hp, tune.foeHp);
  assert.ok(me(w).weapon.uses < 90);
});

test('the APPROVED stamp marks a foe, and a marked foe takes the bonus from a plain punch', () => {
  const w = room();
  me(w).weapon = { kind: 'stamp', uses: 1 };
  run(w, 40, 'press');
  const d = dummy(w);
  assert.ok(d.marked > 0);
  assert.equal(me(w).weapon, null);
  const hp = d.hp;
  d.invuln = 0;
  run(w, 30, 'press');
  assert.equal(d.hp, hp - tune.punchDamage - WEAPONS.stampBonus[0]);
});

test('a weapon left on the floor is gone after its life', () => {
  const w = room([], { ...defaultWeapons(), weaponLife: 10 });
  w.weapons.push({ kind: 'stamp', x: 300, y: 200, z: 0, vx: 0, uses: 4, state: 'floor', t: 0 });
  run(w, 11);
  assert.equal(w.weapons.length, 0);
});

test('a floor with no furniture has no weapons, and the SNES scale grows only pixel dials', () => {
  const w = newFloor('ward', tune);
  stepFloor(w, pad('press'), tune);
  assert.equal(w.weapons, undefined);
  const s = scaledWeapons(defaultWeapons(), 1.5);
  for (const k of Object.keys(WEAPONS)) assert.equal(s[k], WEAPONS[k][0] * (WEAPON_SCALED.includes(k) ? 1.5 : 1), k);
  assert.equal(stageSmash(STAGE.starts).length, SMASH.flat().length);
  assert.ok(new Set(SMASH.flat().map((s2) => s2.drop)).size === 4, 'every weapon is on the stage');
});

// Co-op later: the weapon step serves a second auditor too. Only the first takes the pad today and
// moves.mjs advances only the first, so the second's clock is ticked by hand.
test('a second auditor swinging a binder lands it and spends their own use', () => {
  const w = room();
  const p2 = { ...fighter('p2', 'player', 300, 188, tune), state: 'swing', t: 0, swingHit: false, weapon: { kind: 'binder', uses: 2 } };
  const foe2 = { ...fighter('foe2', 'foe', 318, 188, tune), dummy: true, facing: -1 };
  w.fighters.push(p2, foe2);
  for (let i = 0; i < 20; i++) {
    p2.t++;
    stepFloor(w, pad(null), tune);
  }
  assert.equal(foe2.hp, tune.foeHp - WEAPONS.binderDamage[0]);
  assert.equal(p2.weapon.uses, 1);
  assert.equal(p2.state, 'idle');
  assert.equal(me(w).weapon, undefined);
});

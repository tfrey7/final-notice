import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTune } from '../src/stage1/moves.mjs';
import { newFloor, tuneFor } from '../src/stage1/player.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { MAX_ATTACKERS, spawnStaff, thinkStaff } from '../src/stage1/staff.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';

// Two Associates and a Supervisor around an auditor who cannot be hurt; the auditor steps to a new
// place every few seconds so the crowd has to regroup.
function crowd(frames) {
  const tune = scaledTune(tuneFor('ward', defaultTune()), STAGE1.scale);
  const world = newFloor('ward', tune);
  world.fighters = [world.fighters.find((f) => f.team === 'player')];
  Object.assign(world, { bench: [], tapes: [] });
  const p = world.fighters[0];
  p.invuln = Infinity;
  spawnStaff(world, ['associate', 'associate', 'supervisor'], tune);
  const foes = world.fighters.filter((f) => f.kind);
  const stops = [p.x, p.x + 40, p.x - 30, p.x + 10];
  let stacked = 0;
  let mostAttacking = 0;
  for (let t = 0; t < frames; t++) {
    if (t % 400 === 0) p.x = stops[(t / 400) % stops.length];
    for (const f of foes) thinkStaff(world, f, tune);
    // A lunge runs past the others; only foes on their feet and not rushing count.
    const standing = foes.filter((f) => f.state !== 'charge');
    const close = standing.some((a, i) => standing.slice(i + 1).some((b) => Math.abs(a.x - b.x) < 12 && Math.abs(a.y - b.y) < 6));
    if (close) stacked++;
    mostAttacking = Math.max(mostAttacking, foes.filter((f) => ['windup', 'punch'].includes(f.state)).length);
  }
  return { stacked, mostAttacking, attacks: world.events };
}

test('a squaring-up crowd spreads round the auditor and never stacks on one spot', () => {
  const { stacked } = crowd(1600);
  assert.ok(stacked <= 8, `foes stacked for ${stacked} frames`);
});

test('no more than two foes wind up or punch at once', () => {
  const { mostAttacking } = crowd(1600);
  assert.equal(MAX_ATTACKERS, 2);
  assert.ok(mostAttacking <= MAX_ATTACKERS, `${mostAttacking} attacking at once`);
  assert.ok(mostAttacking >= 1, 'they still attack');
});

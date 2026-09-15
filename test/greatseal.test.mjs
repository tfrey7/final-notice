import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_MAP, EXIT_MAP, FLOOR_Y, LOOPS, SEAL, createArena, enterExit, landingY, phaseOf, poseArena, sealOpen, stepArena } from '../src/stage2/greatseal.mjs';
import { TILE, solidAt } from '../src/stage2/physics.mjs';
import { spawnCast } from '../src/stage2/casting.mjs';

const pad = (held = [], pressed = []) => ({ held: new Set(held), pressed: new Set(pressed) });
const idle = pad();

function run(w, frames, input = () => idle, until = () => false) {
  const events = [];
  for (let i = 0; i < frames && !until(); i++) {
    stepArena(w, input(i));
    events.push(...w.events);
  }
  return events;
}

// The auditor out of harm's way, so the Director runs his loop undisturbed.
const bystander = (w) => () => { w.player.invuln = 999; return idle; };

function attacks(w, count) {
  const seen = [];
  run(w, 20000, bystander(w), () => {
    if (w.boss.attack && w.boss.t <= 1 && seen.at(-1)?.at !== w.frame - 1 && seen.at(-1)?.frame !== w.boss.loop) seen.push({ name: w.boss.attack, frame: w.boss.loop });
    return seen.length >= count;
  });
  return seen.map((s) => s.name);
}

test('the arena is one locked screen with a whole floor and two low ledges', () => {
  assert.equal(ARENA_MAP.length, 15);
  assert.ok(ARENA_MAP.every((r) => r.length === 16));
  const w = createArena('ward');
  assert.ok(w.events.some((e) => e.type === 'checkpoint' && e.id === 'stage2-area5'));
  for (let col = 0; col < 16; col++) assert.ok(solidAt(w.area, col, 13), `floor at ${col}`);
  assert.equal(ARENA_MAP[11].match(/###/g).length, 2);
  run(w, 200, () => pad(['right']));
  assert.equal(w.camX, 0);
  assert.ok(w.player.x < 16 * TILE);
});

test('he loops stamp, tape, shots; each broken binding starts a longer loop', () => {
  const w = createArena();
  assert.deepEqual(attacks(w, 3), LOOPS[0]);
  w.boss.bindings[0].hp = 0;
  const events = run(w, 2, bystander(w));
  assert.ok(events.some((e) => e.type === 'bindingBreak' && e.phase === 1));
  assert.equal(w.boss.phase, 1);
  assert.deepEqual(attacks(w, 4), LOOPS[1]);
  assert.ok(SEAL.rest[1] < SEAL.rest[0] && SEAL.shadow[2] < SEAL.shadow[0]);
});

test('a stamp shows its shadow at least 30 frames before it lands, then costs two pips where it was marked', () => {
  assert.ok(Math.min(...SEAL.shadow) >= 30);
  const w = createArena();
  poseArena(w, 'stamp');
  const hp = w.player.health;
  let shadowAt = null;
  let stampAt = null;
  run(w, 200, (i) => {
    if (w.events.some((e) => e.type === 'shadow')) shadowAt = i;
    if (w.events.some((e) => e.type === 'stamp')) stampAt = i;
    return idle;
  }, () => stampAt !== null && w.boss.state === 'rest');
  assert.ok(stampAt - shadowAt >= 30, `${shadowAt} -> ${stampAt}`);
  assert.equal(w.player.health, hp - SEAL.damage);
});

test('stepping out of the shadow dodges the stamp; on a ledge the press stops on the ledge', () => {
  const w = createArena();
  poseArena(w, 'stamp');
  const hp = w.player.health;
  run(w, 200, (i) => (i > 2 && i < 40 ? pad(['right']) : idle), () => w.boss.state === 'rest' && w.frame > 5);
  assert.equal(w.player.health, hp);
  assert.equal(landingY(w.area, 4 * TILE + 8), 11 * TILE);
  assert.equal(landingY(w.area, 8 * TILE), FLOOR_Y);
});

test('the red-tape sweep runs along the floor: standing costs two pips, jumping clears it', () => {
  for (const jump of [false, true]) {
    const w = createArena();
    Object.assign(w.boss, { state: 'rest', t: SEAL.rest[0] - 1, loop: 1 });
    const hp = w.player.health;
    run(w, 400, () => {
      const s = w.boss.tape;
      if (jump && s && s.t > SEAL.tapeWarn && Math.abs(s.x - w.player.x) < 28 && w.player.grounded) return pad(['a'], ['a']);
      return jump ? pad(['a']) : idle;
    }, () => w.boss.attack === null && w.frame > 5);
    assert.equal(w.player.health, jump ? hp : hp - SEAL.damage, jump ? 'jumped' : 'stood');
  }
});

test('he fires three slow seal shots, and a cast shoots one down', () => {
  const w = createArena();
  Object.assign(w.boss, { state: 'rest', t: SEAL.rest[0] - 1, loop: 2 });
  const events = run(w, 80, bystander(w));
  assert.equal(events.filter((e) => e.type === 'sealShot').length, 3);
  assert.ok(Math.max(...SEAL.shotSpeed) < 2);
  const s = w.boss.shots[0];
  spawnCast(w.casts, 'ward', s.x - 12, s.y + 2, 'right');
  run(w, 12, bystander(w));
  assert.ok(!w.boss.shots.includes(s));
});

test('his contract seal takes no damage until both bindings break, then 12 pips', () => {
  const w = createArena();
  assert.ok(!w.targets.includes(w.boss.seal));
  for (const b of w.boss.bindings) b.hp = 1;
  w.boss.bindings[0].hp = 0;
  run(w, 2, bystander(w));
  assert.ok(!sealOpen(w.boss) && !w.targets.includes(w.boss.seal));
  w.boss.bindings[1].hp = 0;
  const events = run(w, 2, bystander(w));
  assert.ok(events.some((e) => e.type === 'sealOpen'));
  assert.equal(phaseOf(w.boss), 2);
  assert.ok(w.targets.includes(w.boss.seal));
  assert.equal(w.boss.maxHp, 12);
});

test('a lost life restarts at the boss checkpoint with the press whole again', () => {
  const w = createArena();
  w.boss.bindings[0].hp = 0;
  run(w, 2, bystander(w));
  w.player.health = 1;
  w.player.invuln = 0;
  poseArena(w, 'stamp');
  const events = run(w, 200, () => idle, () => w.events.some((e) => e.type === 'lifeLost'));
  assert.ok(w.events.some((e) => e.type === 'lifeLost') || events.some((e) => e.type === 'lifeLost'));
  assert.equal(w.boss.phase, 0);
  assert.equal(w.player.health, 8);
});

for (const who of ['ward', 'mercer']) {
  test(`${who} breaks both bindings, beats the seal, then runs the exit to a stage clear`, () => {
    const w = createArena(who);
    const events = run(w, 20000, (i) => {
      w.player.invuln = 999;
      const b = w.boss;
      const target = b.bindings.find((x) => x.hp > 0) ?? b.seal;
      Object.assign(w.player, { x: target.x, y: landingY(w.area, target.x), vx: 0, vy: 0, grounded: true });
      return i % 14 === 0 ? pad(['b', 'up'], ['b']) : pad(['up']);
    }, () => w.exit);
    assert.ok(events.some((e) => e.type === 'bossDown'), `seal hp ${w.boss.seal.hp}`);
    assert.ok(w.exit && events.some((e) => e.type === 'exitRun'));
    assert.equal(w.foes.length, 0);
    const clear = run(w, 3000, (i) => (i % 20 === 0 ? pad(['right', 'a'], ['a']) : pad(['right', 'a'])), () => w.cleared);
    assert.ok(w.cleared || clear.some((e) => e.type === 'stageClear'), `stopped at ${w.player.x}`);
  });
}

test('the exit run has no foes and ends past its last tile', () => {
  const w = createArena();
  enterExit(w);
  assert.equal(w.area.cols, EXIT_MAP[0].length);
  assert.ok(w.exit.end > 30 * TILE);
  assert.equal(w.targets.length, 0);
});

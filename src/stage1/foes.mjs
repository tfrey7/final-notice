// Stage 1's office foes as pure logic: approach and circle, take an attack token, wind up, swing,
// block or dodge, and react to hits. Scenes draw a world; they never decide what a foe does.
import { FOES, FOE_TYPES } from './tuning.mjs';

export const FLOOR_TOP = 150;
export const FLOOR_BOTTOM = 216;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld({ seed = 1, player = {} } = {}) {
  return {
    frame: 0,
    rand: rng(seed),
    player: { x: 64, y: 184, hits: 0, ...player },
    foes: [],
    shots: [],
    events: [],
    nextId: 1,
    bounds: { left: 0, right: 256 },
  };
}

const clampY = (y) => Math.min(FLOOR_BOTTOM, Math.max(FLOOR_TOP, y));

export function spawnFoe(world, type, x, y) {
  const foe = {
    id: world.nextId++, type, x, y: clampY(y), z: 0, vx: 0, vy: 0, vz: 0,
    hp: FOE_TYPES[`${type}Hp`], state: 'approach', timer: 0, token: false, cooldown: 0,
    angle: x > world.player.x ? 0 : Math.PI, juggles: 0, invuln: 0, facing: x > world.player.x ? -1 : 1,
  };
  foe.maxHp = foe.hp;
  world.foes.push(foe);
  return foe;
}

export function enter(foe, state) {
  foe.state = state;
  foe.timer = 0;
}

export const telegraphing = (foe) => foe.state === 'windup';
export const attackers = (world) => world.foes.filter((f) => f.token).length;
export const alive = (foe) => !['dying', 'gone'].includes(foe.state);
// The death flash: shown on even pairs of frames.
export const visible = (foe) => foe.state !== 'dying' || Math.floor(foe.timer / 2) % 2 === 0;

export function releaseToken(foe) {
  if (!foe.token || foe.boss) return;
  foe.token = false;
  foe.cooldown = FOES.tokenCooldown;
}

// At most FOES.attackTokens foes (a boss always holds one) may be closing in to attack; nearest first.
function assignTokens(world) {
  let held = attackers(world);
  const waiting = world.foes
    .filter((f) => !f.token && f.state === 'approach' && f.cooldown <= 0)
    .sort((a, b) => Math.abs(a.x - world.player.x) - Math.abs(b.x - world.player.x));
  for (const foe of waiting) {
    if (held >= FOES.attackTokens) break;
    foe.token = true;
    held++;
  }
}

function moveToward(foe, x, y, sx, sy) {
  const dx = x - foe.x;
  const dy = y - foe.y;
  foe.x += Math.sign(dx) * Math.min(Math.abs(dx), sx);
  foe.y = clampY(foe.y + Math.sign(dy) * Math.min(Math.abs(dy), sy));
}

export function hitPlayer(world, from, damage) {
  world.player.hits++;
  world.events.push({ type: 'playerHit', foe: from.id, damage, dir: from.facing });
}

function stepFoe(world, f) {
  const p = world.player;
  if (f.invuln > 0) f.invuln--;
  if (f.cooldown > 0) f.cooldown--;
  f.timer++;
  switch (f.state) {
    case 'approach': {
      f.facing = p.x < f.x ? -1 : 1;
      if (f.token) {
        moveToward(f, p.x - f.facing * (FOES.attackReach - 6), p.y, FOES.walkX, FOES.walkY);
        if (Math.abs(p.x - f.x) <= FOES.attackReach && Math.abs(p.y - f.y) <= FOES.laneTolerance) enter(f, 'windup');
      } else {
        // Waiting foes circle the player at a distance, each on its own side and direction.
        f.angle += FOES.circleSpeed * (f.id % 2 ? 1 : -1);
        const x = p.x + Math.cos(f.angle) * FOES.circleRadius;
        const y = p.y + Math.sin(f.angle) * FOES.circleRadius * 0.4;
        moveToward(f, x, y, FOES.walkX, FOES.walkY);
      }
      break;
    }
    case 'windup':
      if (f.timer >= FOES.windupFrames) enter(f, 'attack');
      break;
    case 'attack':
      if (f.timer === 1 && Math.abs(p.x - f.x) <= FOES.attackReach && Math.abs(p.y - f.y) <= FOES.laneTolerance) {
        hitPlayer(world, f, FOES.attackDamage);
      }
      if (f.timer >= FOES.activeFrames) enter(f, 'recover');
      break;
    case 'recover':
      if (f.timer >= FOES.recoverFrames) {
        releaseToken(f);
        enter(f, 'approach');
      }
      break;
    case 'block':
      if (f.timer >= FOES.blockFrames) enter(f, 'approach');
      break;
    case 'dodge':
      f.y = clampY(f.y + f.vy);
      if (f.timer >= FOES.dodgeFrames) enter(f, 'approach');
      break;
    case 'stagger':
      f.x += f.vx;
      f.vx *= 0.8;
      if (f.timer >= FOES.staggerFrames) enter(f, 'approach');
      break;
    case 'air':
      bowl(world, f);
      f.x += f.vx;
      f.z += f.vz;
      f.vz -= FOES.gravity;
      if (f.z <= 0) {
        f.z = 0;
        enter(f, f.hp <= 0 ? 'dying' : 'down');
      }
      break;
    case 'down':
      if (f.timer >= FOES.knockdownFrames) {
        f.juggles = 0;
        f.invuln = FOES.getupInvuln;
        enter(f, 'approach');
      }
      break;
    case 'dying':
      if (f.timer >= FOES.deathFlashFrames) enter(f, 'gone');
      break;
  }
}

// A hit from the player: { damage, knockback, heavy, launch, dir } with dir the way the blow travels.
// Answers what happened: ignored, blocked, dodged, staggered, launched, juggled or killed.
export function hitFoe(world, f, hit) {
  if (f.hit) return f.hit(world, f, hit);
  const dir = hit.dir ?? 1;
  if (!alive(f) || f.state === 'down' || f.invuln > 0) return 'ignored';
  if (f.state === 'air' && f.juggles >= FOES.juggleLimit) return 'ignored';
  if (f.state === 'block') return report(world, f, 'blocked');
  if (f.state === 'approach') {
    const facingBlow = f.facing === -dir;
    if (facingBlow && world.rand() < FOES.blockChance * FOE_TYPES[`${f.type}Block`]) {
      enter(f, 'block');
      f.x += dir;
      return report(world, f, 'blocked');
    }
    if (world.rand() < FOES.dodgeChance * FOE_TYPES[`${f.type}Dodge`]) {
      enter(f, 'dodge');
      f.vy = (f.y < (FLOOR_TOP + FLOOR_BOTTOM) / 2 ? 1 : -1) * FOES.dodgeSpeed;
      return report(world, f, 'dodged');
    }
  }
  releaseToken(f);
  f.hp = Math.max(0, f.hp - (hit.damage ?? 1));
  const push = (hit.knockback ?? 1) * FOES.knockback;
  if (f.state === 'air') {
    f.juggles++;
    f.vz = FOES.launchSpeed * 0.6;
    f.vx = dir * push * 0.5;
    return report(world, f, f.hp <= 0 ? 'killed' : 'juggled');
  }
  if (f.hp <= 0 || hit.heavy || hit.launch) {
    f.juggles = 0;
    f.vz = FOES.launchSpeed;
    f.vx = dir * push;
    enter(f, 'air');
    return report(world, f, f.hp <= 0 ? 'killed' : 'launched');
  }
  f.vx = dir * push;
  enter(f, 'stagger');
  return report(world, f, 'staggered');
}

// Foes are each other's props: one knocked flying bowls over the staff it crashes into, guard or not.
export const CRASH_SPEED = 1;
const touching = (a, b) => Math.abs(a.x - b.x) < 12 && Math.abs(a.y - b.y) <= FOES.laneTolerance + 4;

function bowl(world, flyer) {
  if (Math.abs(flyer.vx) < CRASH_SPEED) return;
  for (const other of world.foes) {
    if (other === flyer || other.boss || other.state === 'air' || other.state === 'down' || !alive(other) || !touching(flyer, other)) continue;
    knockOver(world, other, Math.sign(flyer.vx), 'bowled');
  }
}

// Knocked down by the world rather than the player: no block, no dodge.
export function knockOver(world, foe, dir, result) {
  releaseToken(foe);
  foe.hp = Math.max(0, foe.hp - 1);
  foe.juggles = FOES.juggleLimit;
  foe.vz = FOES.launchSpeed * 0.7;
  foe.vx = dir * FOES.knockback * 0.5;
  enter(foe, 'air');
  return report(world, foe, result);
}

export function report(world, foe, result) {
  world.events.push({ type: 'foeHit', foe: foe.id, result });
  return result;
}

function stepShots(world) {
  const p = world.player;
  for (const s of world.shots) {
    s.x += s.vx;
    const victim = world.foes.find((f) => !f.boss && alive(f) && f.state !== 'air' && f.state !== 'down' && Math.abs(s.x - f.x) < 6 && Math.abs(s.y - f.y) <= FOES.laneTolerance + 2);
    if (!s.spent && victim) {
      s.spent = true;
      knockOver(world, victim, Math.sign(s.vx), 'memoed');
    }
    if (!s.spent && Math.abs(s.x - p.x) < 6 && Math.abs(s.y - p.y) <= FOES.laneTolerance + 2) {
      s.spent = true;
      hitPlayer(world, s, s.damage);
    }
  }
  world.shots = world.shots.filter((s) => !s.spent && s.x > world.bounds.left - 16 && s.x < world.bounds.right + 16);
}

export function stepFoes(world) {
  world.frame++;
  world.events = [];
  assignTokens(world);
  for (const foe of world.foes) (foe.think ?? stepFoe)(world, foe);
  stepShots(world);
  world.foes = world.foes.filter((f) => f.state !== 'gone');
}

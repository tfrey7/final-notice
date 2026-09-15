// The Account Manager, Stage 1's boss: three telegraphed patterns on a loop, a new loop at half health.
import { BOSS, FOES } from './tuning.mjs';
import { FLOOR_BOTTOM, FLOOR_TOP, alive, enter, hitPlayer, knockOver, report } from './foes.mjs';

export const PATTERNS = ['swing', 'memo', 'charge'];
export const LOOPS = {
  1: ['swing', 'memo', 'swing', 'charge'],
  2: ['charge', 'memo', 'swing', 'memo', 'charge'],
};

export const phaseFor = (boss) => (boss.hp <= boss.maxHp * BOSS.enrageAt ? 2 : 1);
export const windupFor = (boss) => (boss.phase === 2 ? BOSS.enragedWindup : BOSS.windupFrames);
const restFor = (boss) => (boss.phase === 2 ? BOSS.enragedRest : BOSS.restFrames);

export function spawnBoss(world, x, y) {
  const boss = {
    id: world.nextId++, type: 'accountManager', boss: true, token: true,
    x, y, z: 0, vx: 0, vy: 0, vz: 0, hp: BOSS.hp, maxHp: BOSS.hp, phase: 1, loop: 0, pattern: null,
    state: 'rest', timer: 0, facing: -1, invuln: 0, juggles: 0, cooldown: 0, hitThisCharge: false,
    think: stepBoss, hit: hitBoss,
  };
  world.foes.push(boss);
  return boss;
}

function stepBoss(world, b) {
  const p = world.player;
  if (b.invuln > 0) b.invuln--;
  b.timer++;
  switch (b.state) {
    case 'rest': {
      b.facing = p.x < b.x ? -1 : 1;
      const dy = p.y - b.y;
      b.y = Math.min(FLOOR_BOTTOM, Math.max(FLOOR_TOP, b.y + Math.sign(dy) * Math.min(Math.abs(dy), BOSS.walk)));
      if (Math.abs(p.x - b.x) > BOSS.swingReach) b.x += b.facing * BOSS.walk;
      if (b.timer >= restFor(b)) {
        const loop = LOOPS[b.phase];
        b.pattern = loop[b.loop++ % loop.length];
        enter(b, 'windup');
      }
      break;
    }
    case 'windup':
      if (b.timer >= windupFor(b)) {
        b.hitThisCharge = false;
        enter(b, 'attack');
      }
      break;
    case 'attack':
      attack(world, b);
      break;
    case 'enrage':
      if (b.timer >= BOSS.enrageFrames) enter(b, 'rest');
      break;
    case 'stagger':
      if (b.timer >= BOSS.heavyStagger) enter(b, 'rest');
      break;
    case 'dying':
      if (b.timer >= FOES.deathFlashFrames * 2) enter(b, 'gone');
      break;
  }
}

const inLane = (a, b, reach, lane) => Math.abs(a.x - b.x) <= reach && Math.abs(a.y - b.y) <= lane;

function attack(world, b) {
  const p = world.player;
  if (b.pattern === 'swing') {
    if (b.timer === 1 && inLane(p, b, BOSS.swingReach, FOES.laneTolerance + 4)) hitPlayer(world, b, BOSS.swingDamage);
    if (b.timer >= 10) enter(b, 'rest');
  } else if (b.pattern === 'memo') {
    if (b.timer === 1) {
      const lanes = b.phase === 2 ? [-10, 0, 10] : [0];
      for (const dy of lanes) {
        world.shots.push({ id: b.id, x: b.x + b.facing * 12, y: b.y + dy, vx: b.facing * BOSS.memoSpeed, damage: BOSS.memoDamage, facing: b.facing });
      }
    }
    if (b.timer >= 12) enter(b, 'rest');
  } else {
    b.x += b.facing * BOSS.chargeSpeed;
    for (const f of world.foes) {
      if (!f.boss && alive(f) && f.state !== 'air' && f.state !== 'down' && inLane(f, b, 10, FOES.laneTolerance + 4)) knockOver(world, f, b.facing, 'trampled');
    }
    if (!b.hitThisCharge && inLane(p, b, 10, FOES.laneTolerance + 4)) {
      b.hitThisCharge = true;
      hitPlayer(world, b, BOSS.chargeDamage);
    }
    const atEdge = b.x < world.bounds.left + 16 || b.x > world.bounds.right - 16;
    if (atEdge || b.timer >= BOSS.chargeFrames) {
      b.x = Math.min(world.bounds.right - 16, Math.max(world.bounds.left + 16, b.x));
      enter(b, 'rest');
    }
  }
}

// Light blows only chip the boss; heavy ones stagger it out of a wind-up. Half health starts phase 2.
function hitBoss(world, b, hit) {
  if (!alive(b) || b.invuln > 0) return 'ignored';
  b.hp = Math.max(0, b.hp - (hit.damage ?? 1));
  if (b.hp <= 0) {
    b.token = false;
    enter(b, 'dying');
    return report(world, b, 'killed');
  }
  const phase = phaseFor(b);
  if (phase !== b.phase) {
    b.phase = phase;
    b.loop = 0;
    b.invuln = BOSS.enrageFrames;
    enter(b, 'enrage');
    world.events.push({ type: 'phaseChange', foe: b.id, phase });
    return report(world, b, 'enraged');
  }
  if (hit.heavy && b.state === 'windup') {
    enter(b, 'stagger');
    return report(world, b, 'staggered');
  }
  return report(world, b, 'chipped');
}

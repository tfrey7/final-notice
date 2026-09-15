// Stage 1's four NES foes on the moves.mjs floor (docs/NES-PLAN.md section 6): the Security
// Associate, the Account Manager, Contract Counsel and the Facilities Supervisor. Pure rules;
// src/stage1/foe-actors.mjs draws them. (src/stage1/foes.mjs is the older foes page's model.)
import { DOWNED, fighter, inReach, landHit, player, set, updateCommon } from './moves.mjs';

export const MAX_ON_SCREEN = 3;
// Attack tokens, as Final Fight and Streets of Rage 2 space their crowds: the rest wait their turn.
export const MAX_ATTACKERS = 2;
const STANDING = ['idle', 'walk', 'guard', 'windup', 'punch'];

// Colour means behaviour (NES-CLASSICS L3), so each kind keeps its own palette in foe-actors.mjs.
// `stand` is where a squaring-up foe rests, `near` the closest Counsel will throw from. A tune may
// carry its own `kinds` (the SNES scene's, grown and weighed); without one these are used.
export const KINDS = {
  associate: { hp: 6, speed: 0.5, windup: 28, punch: 14, cooldown: 60, reach: 20, stand: 16, hitsToFall: 3 },
  manager: { hp: 3, speed: 1.25, windup: 10, punch: 10, cooldown: 50, reach: 18, hitsToFall: 2, flank: 16 },
  counsel: { hp: 5, speed: 0.75, windup: 30, punch: 16, cooldown: 110, reach: 100, hitsToFall: 3, keep: 64, near: 32 },
  supervisor: { hp: 12, speed: 0.375, windup: 34, punch: 18, cooldown: 80, reach: 24, stand: 20, hitsToFall: 4, damage: 2, guard: 300 },
};

export const kindsOf = (tune) => tune?.kinds ?? KINDS;

// The red-tape bind: flies along its row; caught, the auditor mashes A or B to break free.
export const TAPE = { speed: 2, life: 120, mash: 8, maxFrames: 150, afterInvuln: 30 };

export const rowHit = inReach;

export function spawnStaff(world, kinds, tune) {
  world.think ??= thinkStaff;
  world.tapes ??= [];
  world.bench = [...(world.bench ?? []), ...kinds.filter((k) => KINDS[k])];
  fillSeats(world, tune);
  return world;
}

// Benched foes walk on only while fewer than three are on screen; a dazed foe holds his seat
// until he has blinked away.
function fillSeats(world, tune) {
  const p = player(world);
  let seated = world.fighters.filter((f) => f.kind).length;
  while (world.bench.length && seated < MAX_ON_SCREEN) {
    const kind = world.bench.shift();
    const k = KINDS[kind];
    const n = world.spawned = (world.spawned ?? 0) + 1;
    const { top, bottom } = world.floor;
    const y = top + 8 + ((n * 17) % (bottom - top - 8));
    world.fighters.push({
      ...fighter(`${kind}${n}`, 'foe', Math.min(world.floor.right, p.x + 96 + seated * 28), y, tune),
      kind, hp: k.hp, maxHp: k.hp, hitsToFall: k.hitsToFall, taken: 0, cooldown: 30 + seated * 30,
      guardDown: 0, guardBreakFrames: k.guard ?? 0,
    });
    seated++;
  }
}

// Where each kind wants to stand: the Associate and Supervisor square up, the Manager goes round to
// the auditor's back, Counsel holds his distance. The Manager picks his back side once and keeps it
// until he swings or is hit, so turning round catches him. Given the world, squaring-up foes share
// out the places around the auditor, both sides first and then a depth lane above and below, so no
// two rest on one spot or on a flanker's.
export function spot(f, p, tune, world) {
  const k = kindsOf(tune)[f.kind];
  const side = Math.sign(f.x - p.x) || 1;
  if (k.flank) {
    const back = f.flankSide ??= -p.facing;
    if (side === back) return { x: p.x + back * k.flank, y: p.y };
    return { x: p.x + back * k.flank, y: p.y + (f.y < p.y ? -k.flank : k.flank) };
  }
  if (k.keep) return { x: p.x + side * k.keep, y: p.y };
  if (!world) return { x: p.x + side * k.stand, y: p.y };
  return squareUp(world, f, p, tune);
}

function squareUp(world, f, p, tune) {
  const kinds = kindsOf(tune);
  const lane = (tune.depthReach ?? 6) * 2;
  const floor = world.floor;
  const onFloor = (s) => !floor || (s.x >= floor.left && s.x <= floor.right && s.y >= floor.top && s.y <= floor.bottom);
  const live = world.fighters.filter((o) => o.team === 'foe' && kinds[o.kind] && STANDING.includes(o.state));
  const others = live.filter((o) => !kinds[o.kind].stand).map((o) => spot(o, p, tune));
  const claimed = [];
  for (const o of live.filter((o) => kinds[o.kind].stand)) {
    const { stand } = kinds[o.kind];
    const places = [[1, 0], [-1, 0], [1, -1], [-1, 1], [1, 1], [-1, -1]]
      .map(([sx, ly]) => ({ x: p.x + sx * stand, y: p.y + ly * lane }))
      .filter((s) => onFloor(s) && ![...others, ...claimed].some((c) => Math.abs(c.x - s.x) < 12 && Math.abs(c.y - s.y) < lane));
    const pool = places.length ? places : [{ x: p.x + (Math.sign(o.x - p.x) || 1) * stand, y: p.y }];
    const best = pool.reduce((a, b) => (Math.hypot(b.x - o.x, b.y - o.y) < Math.hypot(a.x - o.x, a.y - o.y) ? b : a));
    if (o === f) return best;
    claimed.push(best);
  }
  return { x: p.x + (Math.sign(f.x - p.x) || 1) * kinds[f.kind].stand, y: p.y };
}

const attackers = (world, f) => world.fighters.filter((o) => o !== f && o.team === 'foe' && o.kind && ['windup', 'punch'].includes(o.state)).length;

function moveTo(f, x, y, speed) {
  const dx = x - f.x;
  const dy = y - f.y;
  f.x += Math.sign(dx) * Math.min(Math.abs(dx), speed);
  f.y += Math.sign(dy) * Math.min(Math.abs(dy), speed * 0.75);
  return Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
}

function readyToStrike(world, f, p, k, tune) {
  if (f.cooldown > 0 || DOWNED.includes(p.state) || p.state === 'bound') return false;
  if (attackers(world, f) >= MAX_ATTACKERS) return false;
  if (k.keep) {
    const gap = Math.abs(p.x - f.x);
    return gap >= k.near && gap <= k.reach && Math.abs(p.y - f.y) <= tune.depthReach && !world.tapes.length;
  }
  return inReach(f, p, k.reach, tune);
}

export function thinkStaff(world, f, tune) {
  const k = kindsOf(tune)[f.kind];
  const p = player(world);
  if (f.invuln > 0) f.invuln--;
  if (f.cooldown > 0) f.cooldown--;
  if (f.guardDown > 0) f.guardDown--;
  f.t++;
  switch (f.state) {
    case 'idle': case 'walk': case 'guard': {
      const guarding = k.guard && f.guardDown === 0;
      const { x, y } = spot(f, p, tune, world);
      const moving = moveTo(f, x, y, k.speed);
      f.facing = Math.sign(p.x - f.x) || f.facing;
      const stance = guarding ? 'guard' : moving ? 'walk' : 'idle';
      if (stance !== f.state) set(f, stance);
      if (readyToStrike(world, f, p, k, tune)) {
        set(f, 'windup');
        f.flankSide = null;
      }
      break;
    }
    case 'windup':
      if (f.t >= k.windup) {
        set(f, 'punch');
        if (k.keep) {
          world.tapes.push({ x: f.x + f.facing * 12, y: f.y, vx: f.facing * TAPE.speed, t: 0, from: f.id });
          world.events.push('redTape');
        } else if (inReach(f, p, k.reach, tune) && p.z < 16 && p.state !== 'grab') {
          landHit(world, p, { damage: k.damage ?? 1, heavy: !!k.guard, dir: f.facing }, tune);
        }
      }
      break;
    case 'punch':
      if (f.t >= k.punch) {
        f.cooldown = k.cooldown;
        set(f, 'idle');
      }
      break;
    case 'held':
      break;
    default:
      f.flankSide = null;
      updateCommon(world, f, tune);
  }
}

// A bound auditor can do nothing but mash; enough presses, or long enough, and the tape snaps.
// Answers the pad moves.mjs should see this frame.
export function struggle(world, pad, events) {
  const p = player(world);
  if (p.state !== 'bound') return null;
  if (pad.pressed.has('a') || pad.pressed.has('b')) p.mash--;
  if (p.mash <= 0 || p.t >= TAPE.maxFrames) {
    set(p, 'idle');
    p.invuln = Math.max(p.invuln, TAPE.afterInvuln);
    events.push('breakFree');
  }
  return { held: new Set(), pressed: new Set(), dash: null };
}

// After moves.mjs's frame: red tape flies and binds, and benched foes take any free seat.
export function stepStaff(world, tune, events) {
  if (!world.think) return;
  const p = player(world);
  for (const tape of world.tapes) {
    tape.x += tape.vx;
    tape.t++;
    const caught = Math.abs(p.x - tape.x) < 8 && Math.abs(p.y - tape.y) <= tune.depthReach && p.z < 16
      && p.invuln <= 0 && !DOWNED.includes(p.state) && !['bound', 'step'].includes(p.state);
    if (caught) {
      set(p, 'bound');
      p.mash = TAPE.mash;
      tape.t = TAPE.life;
      events.push('bound');
    }
  }
  world.tapes = world.tapes.filter((t) => t.t < TAPE.life && t.x > world.floor.left && t.x < world.floor.right);
  fillSeats(world, tune);
}

// Test-floor stagings for screenshots: a bind about to land, and an Associate thrown into a guard.
export function pose(world, name, tune) {
  const p = player(world);
  const foe = (kind) => world.fighters.find((f) => f.kind === kind);
  if (name === 'bind' && foe('counsel')) {
    Object.assign(foe('counsel'), { x: p.x + 72, y: p.y, cooldown: 0, facing: -1 });
  }
  if (name === 'guardbreak' && foe('associate') && foe('supervisor')) {
    const a = foe('associate');
    Object.assign(foe('supervisor'), { x: p.x + 44, y: p.y, cooldown: 90, facing: -1 });
    Object.assign(a, { x: p.x + 20, y: p.y });
    landHit(world, a, { damage: tune.throwDamage, heavy: true, dir: 1 }, tune);
    world.events.push('throw');
  }
  return world;
}

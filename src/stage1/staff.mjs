// Stage 1's four NES foes on the moves.mjs floor (docs/NES-PLAN.md section 6): the Security
// Associate, the Account Manager, Contract Counsel and the Facilities Supervisor. Pure rules;
// src/stage1/foe-actors.mjs draws them. (src/stage1/foes.mjs is the older foes page's model.)
import { DOWNED, deflect, fighter, inReach, landHit, player, set, updateCommon } from './moves.mjs';

export const MAX_ON_SCREEN = 3;
// Attack tokens, as Final Fight and Streets of Rage 2 space their crowds: the rest wait their turn.
export const MAX_ATTACKERS = 2;
const WAITING = ['idle', 'walk', 'guard', 'feint', 'taunt', 'shove'];
const STANDING = [...WAITING, 'windup', 'punch'];
const HURTING = ['hurt', 'knockdown', 'down', 'getup', 'bound', 'held'];

// Colour means behaviour (NES-CLASSICS L3), so each kind keeps its own palette in foe-actors.mjs.
// `stand` is where a squaring-up foe rests, `near` the closest Counsel will throw from. A tune may
// carry its own `kinds` (the SNES scene's, grown and weighed); without one these are used.
// `crowd` is how a kind waits its turn: its circle's size, how often it feints and taunts, how
// restless it is (`jitter` shortens every act), its taunt gesture, and whether it drifts to your back.
export const KINDS = {
  associate: { hp: 6, speed: 0.5, windup: 28, punch: 14, cooldown: 60, reach: 20, stand: 16, hitsToFall: 3,
    crowd: { circle: 0.9, feint: 1.6, taunt: 0.6, jitter: 1.8, gesture: 'beckon' } },
  manager: { hp: 3, speed: 1.25, windup: 10, punch: 10, cooldown: 50, reach: 18, hitsToFall: 2, flank: 16,
    crowd: { circle: 1.5, feint: 0.4, taunt: 0.7, jitter: 1, gesture: 'tie', back: true } },
  counsel: { hp: 5, speed: 0.75, windup: 30, punch: 16, cooldown: 110, reach: 100, hitsToFall: 3, keep: 64, near: 32,
    crowd: { circle: 2.2, feint: 0.2, taunt: 0.6, jitter: 0.8, gesture: 'tie' } },
  supervisor: { hp: 12, speed: 0.375, windup: 34, punch: 18, cooldown: 80, reach: 24, stand: 20, hitsToFall: 4, damage: 2, guard: 300,
    crowd: { circle: 0.8, feint: 0.2, taunt: 2.2, jitter: 0.6, gesture: 'slap' } },
};

export const kindsOf = (tune) => tune?.kinds ?? KINDS;

// The crowd's dials (the brawl lab turns them): `aggression` speeds the turn holder's approach and
// shortens every wait, `circleRadius` (px) is how far waiting foes circle, `tauntChance` the share of
// their acts that are taunts, `closeIn` the frames between one attack turn ending and the next, and
// `pressure` the most frames a player goes unhurt before a turn is forced on him.
export const CROWD = { aggression: 1, circleRadius: 40, tauntChance: 0.12, closeIn: 60, pressure: 150, turnMax: 300, feintStep: 18, shove: 3 };
export const CROWD_SCALED = ['circleRadius', 'feintStep', 'shove'];
export const crowdOf = (tune) => tune?.crowd ?? CROWD;

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

// With `world.entry` 'edges' a foe walks on from beyond the view's left or right side, alternating,
// each one ENTRY_GAP px further out than the last on that side.
export const VIEW_W = 256;
export const ENTRY_GAP = 24;

export function entryX(world, n, fresh) {
  const out = ENTRY_GAP * (1 + (fresh >> 1));
  const cam = world.cameraX ?? 0;
  return n % 2 ? cam + VIEW_W + out : cam - out;
}

// Benched foes walk on only while a seat is free (world.seats, else MAX_ON_SCREEN); a dazed foe
// holds his seat until he has blinked away.
function fillSeats(world, tune) {
  const p = player(world);
  const edges = world.entry === 'edges';
  let seated = world.fighters.filter((f) => f.kind).length;
  for (let fresh = 0; world.bench.length && seated < (world.seats ?? MAX_ON_SCREEN); fresh++) {
    const kind = world.bench.shift();
    const k = KINDS[kind];
    const n = world.spawned = (world.spawned ?? 0) + 1;
    const { top, bottom } = world.floor;
    const y = top + 8 + ((n * 17) % (bottom - top - 8));
    const x = edges ? entryX(world, n, fresh) : Math.min(world.floor.right, p.x + 96 + seated * 28);
    world.fighters.push({
      ...fighter(`${kind}${n}`, 'foe', x, y, tune),
      kind, hp: k.hp, maxHp: k.hp, hitsToFall: k.hitsToFall, taken: 0, cooldown: 30 + seated * 30,
      guardDown: 0, guardBreakFrames: k.guard ?? 0, entering: edges,
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
  const live = world.fighters.filter((o) => o.team === 'foe' && kinds[o.kind] && STANDING.includes(o.state)
    && (['windup', 'punch'].includes(o.state) || holding(world, o) || !world.crowd));
  const others = live.filter((o) => !kinds[o.kind].stand).map((o) => spot(o, p, tune));
  const claimed = [];
  for (const o of live.filter((o) => kinds[o.kind].stand)) {
    const { stand } = kinds[o.kind];
    const places = [[1, 0], [-1, 0], [1, -1], [-1, 1], [1, 1], [-1, -1]]
      .map(([sx, ly]) => ({ x: p.x + sx * stand, y: p.y + ly * lane }))
      .filter((s) => onFloor(s) && ![...others, ...claimed].some((c) => Math.abs(c.x - s.x) < 12 && Math.abs(c.y - s.y) < lane));
    // A turn holder has to stand on the auditor's own line to reach him.
    const inLine = world.crowd ? places.filter((s) => s.y === p.y) : places;
    const pool = inLine.length ? inLine : places.length ? places : [{ x: p.x + (Math.sign(o.x - p.x) || 1) * stand, y: p.y }];
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

// Deterministic dice kept on the world, so a headless run repeats exactly.
function roll(world) {
  const c = world.crowd;
  c.seed = (Math.imul(c.seed, 1664525) + 1013904223) >>> 0;
  return c.seed / 2 ** 32;
}

const players = (world) => world.fighters.filter((f) => f.team === 'player');
const holding = (world, f) => Object.values(world.crowd?.turns ?? {}).some((t) => t.holder === f.id);

// Each foe presses one player: the nearest standing one, weighed by how many foes already press him,
// so two auditors split the crowd. A waiting foe chooses again whenever an act ends.
function choosePrey(world, f) {
  const ps = players(world);
  const up = ps.filter((p) => !DOWNED.includes(p.state));
  const load = (p) => world.fighters.filter((o) => o !== f && o.kind && o.prey === p.id).length;
  const cost = (p) => Math.abs(p.x - f.x) + 64 * load(p);
  const best = (up.length ? up : ps).reduce((a, b) => (cost(b) < cost(a) ? b : a));
  f.prey = best.id;
  return best;
}

const preyOf = (world, f) => world.fighters.find((p) => p.team === 'player' && p.id === f.prey) ?? choosePrey(world, f);

// Once a frame, before the first staff foe thinks: each player's attack turn. It goes to the waiting
// foe pressing him who has waited longest, `closeIn` frames after the last turn ended, or as soon as
// he has gone `pressure` frames unhurt; it ends when its holder has swung, been hit, or dawdled.
function stepTurns(world, tune) {
  const c = crowdOf(tune);
  const kinds = kindsOf(tune);
  const staff = world.fighters.filter((f) => f.team === 'foe' && kinds[f.kind]);
  for (const f of staff) if (WAITING.includes(f.state)) f.waited = (f.waited ?? 0) + 1;
  for (const p of players(world)) {
    const turn = world.crowd.turns[p.id] ??= { holder: null, gap: 0, calm: 0, since: 0, swung: false };
    turn.calm = HURTING.includes(p.state) ? 0 : turn.calm + 1;
    const holder = staff.find((f) => f.id === turn.holder);
    if (holder) {
      turn.since++;
      const swinging = ['windup', 'punch'].includes(holder.state);
      if (swinging) turn.swung = true;
      if (turn.swung ? swinging : WAITING.includes(holder.state) && turn.since <= c.turnMax) continue;
    }
    if (turn.holder) Object.assign(turn, { holder: null, gap: 0 });
    if (DOWNED.includes(p.state) || p.state === 'bound') continue;
    turn.gap++;
    if (turn.gap < c.closeIn / c.aggression && turn.calm < c.pressure / c.aggression) continue;
    const ready = staff.filter((f) => f.prey === p.id && !f.entering && WAITING.includes(f.state));
    if (!ready.length) continue;
    const next = ready.reduce((a, b) => ((b.waited ?? 0) > (a.waited ?? 0) ? b : a));
    Object.assign(turn, { holder: next.id, since: 0, swung: false });
    Object.assign(next, { waited: 0, cooldown: 0, act: null });
  }
}

// What a waiting foe does next, weighed by his kind: circle on, step to another depth lane, drift
// round to the player's back, feint in and out, taunt, or shove a neighbour crowding him.
function nextAct(world, f, p, k, tune) {
  const c = crowdOf(tune);
  const style = k.crowd;
  const lane = (tune.depthReach ?? 6) * 2;
  const len = (n) => Math.max(12, Math.round(n / style.jitter));
  const near = world.fighters.find((o) => o !== f && o.kind && WAITING.includes(o.state) && Math.abs(o.x - f.x) < 24 && Math.abs(o.y - f.y) <= lane);
  const close = Math.abs(p.x - f.x) < radiusOf(k, tune) * 1.6;
  const options = [
    ['circle', 3], ['lane', 1], ['back', style.back ? 3 : 0.6],
    ['feint', close ? style.feint * c.aggression : 0],
    ['taunt', close ? 8 * c.tauntChance * style.taunt : 0],
    ['shove', near ? 0.8 : 0],
  ];
  let r = roll(world) * options.reduce((s, [, w]) => s + w, 0);
  const [kind] = options.find(([, w]) => (r -= w) < 0) ?? options[0];
  const dir = roll(world) < 0.5 ? -1 : 1;
  const { top, bottom } = world.floor;
  switch (kind) {
    case 'lane': return { kind, t: 0, len: len(40), y: Math.min(bottom, Math.max(top, p.y + (f.y > p.y ? -1 : 1) * lane * (1 + roll(world)))) };
    case 'feint': return { kind, t: 0, len: len(40), x: f.x, y: f.y, dir: Math.sign(p.x - f.x) || 1 };
    case 'taunt': return { kind, t: 0, len: 48 };
    case 'shove': return { kind, t: 0, len: 16, on: near.id, face: Math.sign(near.x - f.x) || 1 };
    default: return { kind, t: 0, len: len(50 + 40 * roll(world)), dir };
  }
}

const radiusOf = (k, tune) => Math.max(crowdOf(tune).circleRadius * k.crowd.circle, k.keep ?? 0, (k.stand ?? 0) * 2);
const angleGap = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// A foe waiting his turn is never still: he works the ellipse round his player at his kind's radius,
// spreading from the other waiters on it, and plays out his current act.
function waitTurn(world, f, p, k, tune) {
  const c = crowdOf(tune);
  if (!f.act || f.act.t >= f.act.len) {
    f.act = nextAct(world, f, p, k, tune);
    choosePrey(world, f);
  }
  const act = f.act;
  act.t++;
  const radius = radiusOf(k, tune);
  const lane = (tune.depthReach ?? 6) * 2;
  f.orbit ??= f.x >= p.x ? 0 : Math.PI;
  for (const o of world.fighters) {
    if (o === f || o.orbit === undefined || o.prey !== f.prey || !WAITING.includes(o.state)) continue;
    const gap = angleGap(f.orbit, o.orbit);
    if (Math.abs(gap) < 1) f.orbit += (Math.sign(gap) || 1) * 0.02;
  }
  const spin = (k.speed * 0.8) / radius;
  let speed = k.speed;
  let goal = null;
  switch (act.kind) {
    case 'feint':
      goal = act.t < act.len / 2 ? { x: act.x + act.dir * c.feintStep, y: act.y } : { x: act.x, y: act.y };
      speed = k.speed * 2.5;
      break;
    case 'lane':
      goal = { x: f.x, y: act.y };
      break;
    case 'taunt': case 'shove':
      break;
    case 'back': {
      const gap = angleGap((p.facing ?? 1) > 0 ? Math.PI : 0, f.orbit);
      f.orbit += Math.sign(gap) * Math.min(Math.abs(gap), spin);
      break;
    }
    default:
      f.orbit += act.dir * spin;
  }
  if (!goal && !['taunt', 'shove'].includes(act.kind)) {
    goal = { x: p.x + Math.cos(f.orbit) * radius, y: p.y + Math.sin(f.orbit) * Math.min(radius * 0.35, lane * 2) };
  }
  // Never walk onto another foe's spot: step past him on the near side, and out of his lane if
  // already standing in him.
  for (const o of world.fighters) {
    if (o === f || o.team !== 'foe' || !o.kind || DOWNED.includes(o.state)) continue;
    if (Math.abs(f.x - o.x) < 14 && Math.abs(f.y - o.y) < lane / 2) {
      goal = { x: goal?.x ?? f.x, y: o.y + (Math.sign(f.y - o.y) || (f.y > p.y ? 1 : -1)) * lane };
    } else if (goal && Math.abs(goal.x - o.x) < 16 && Math.abs(goal.y - o.y) < lane) {
      goal.x = o.x + (Math.sign(f.x - o.x) || 1) * 16;
    }
  }
  if (act.kind === 'shove' && act.t === 6) {
    const o = world.fighters.find((v) => v.id === act.on);
    if (o && WAITING.includes(o.state)) Object.assign(o, { bump: act.face * c.shove, act: null });
  }
  const { left, right, top, bottom } = world.floor;
  const moving = goal ? moveTo(f, Math.min(right, Math.max(left, goal.x)), Math.min(bottom, Math.max(top, goal.y)), speed) : false;
  f.facing = act.kind === 'shove' ? act.face : Math.sign(p.x - f.x) || f.facing;
  const guarding = k.guard && f.guardDown === 0;
  const stance = ['feint', 'taunt', 'shove'].includes(act.kind) ? act.kind : guarding ? 'guard' : moving ? 'walk' : 'idle';
  if (stance !== f.state) set(f, stance);
  f.gesture = stance === 'taunt' ? k.crowd.gesture : null;
}

export function thinkStaff(world, f, tune) {
  const k = kindsOf(tune)[f.kind];
  world.crowd ??= { seed: 2161, turns: {} };
  if (world.fighters.find((o) => o.team === 'foe' && kindsOf(tune)[o.kind]) === f) stepTurns(world, tune);
  const p = preyOf(world, f);
  if (f.invuln > 0) f.invuln--;
  if (f.cooldown > 0) f.cooldown--;
  if (f.guardDown > 0) f.guardDown--;
  if (f.bump) {
    f.x += f.bump;
    f.bump = Math.abs(f.bump) < 0.2 ? 0 : f.bump * 0.7;
  }
  f.t++;
  switch (f.state) {
    case 'idle': case 'walk': case 'guard': case 'feint': case 'taunt': case 'shove': {
      const mine = world.crowd.turns[p.id]?.holder === f.id;
      if (!f.entering && !mine && k.crowd) {
        waitTurn(world, f, p, k, tune);
        break;
      }
      f.act = null;
      const guarding = k.guard && f.guardDown === 0;
      const { x, y } = spot(f, p, tune, world);
      const { left, right } = world.floor;
      const moving = moveTo(f, f.entering ? Math.min(right, Math.max(left, x)) : x, y, k.speed * (mine ? 1 + 0.5 * crowdOf(tune).aggression : 1));
      f.facing = Math.sign(p.x - f.x) || f.facing;
      const stance = guarding ? 'guard' : moving ? 'walk' : 'idle';
      if (stance !== f.state) set(f, stance);
      if (!f.entering && readyToStrike(world, f, p, k, tune)) {
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
          landHit(world, p, { damage: k.damage ?? 1, heavy: !!k.guard, dir: f.facing, from: f }, tune);
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

// After moves.mjs's frame: red tape flies and binds, and benched foes take any free seat. Tape met
// inside a parry window snaps instead, and staggers whoever threw it.
export function stepStaff(world, tune, events) {
  if (!world.think) return;
  for (const tape of world.tapes) {
    tape.x += tape.vx;
    tape.t++;
    for (const p of world.fighters.filter((f) => f.team === 'player')) {
      const caught = tape.t < TAPE.life && Math.abs(p.x - tape.x) < 8 && Math.abs(p.y - tape.y) <= tune.depthReach && p.z < 16
        && p.invuln <= 0 && !DOWNED.includes(p.state) && !['bound', 'step'].includes(p.state);
      if (!caught) continue;
      tape.t = TAPE.life;
      if (p.parry > 0) {
        deflect(world, p, world.fighters.find((f) => f.id === tape.from && !DOWNED.includes(f.state)), Math.sign(tape.vx), tune);
        continue;
      }
      set(p, 'bound');
      p.mash = TAPE.mash;
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

// Stage 1's four NES foes on the moves.mjs floor (docs/NES-PLAN.md section 6): the Security
// Associate, the Account Manager, Contract Counsel and the Facilities Supervisor. Pure rules;
// src/stage1/foe-actors.mjs draws them. (src/stage1/foes.mjs is the older foes page's model.)
import { DOWNED, deflect, fighter, inReach, landHit, player, set, updateCommon } from './moves.mjs';

export const MAX_ON_SCREEN = 3;
// Attack tokens, as Final Fight and Streets of Rage 2 space their crowds: the rest wait their turn.
export const MAX_ATTACKERS = 2;
const WAITING = ['idle', 'walk', 'guard', 'feint', 'taunt', 'shove'];
export const ATTACKING = ['windup', 'punch', 'charge', 'hold'];
const STANDING = [...WAITING, ...ATTACKING];
const HURTING = ['hurt', 'knockdown', 'down', 'getup', 'bound', 'held'];

// Colour means behaviour (NES-CLASSICS L3), so each kind keeps its own palette in foe-actors.mjs.
// `stand` is where a squaring-up foe rests, `near` the closest Counsel will throw from. A tune may
// carry its own `kinds` (the SNES scene's, grown and weighed); without one these are used.
// `crowd` is how a kind waits its turn: its circle's size, how often it feints and taunts, how
// restless it is (`jitter` shortens every act), its taunt gesture, and whether it drifts to your back.
// `moves` is the kind's attacks: each overrides the kind's own windup, punch (recovery), reach and
// damage, and `weight` is how often it is picked among those in range. A `rush` move dashes that many
// px a frame from `from` to `to` px away; a `shot` is thrown at `speed`; a `hold` grabs and squeezes
// every `squeeze` frames, then throws; a weight-0 `counter` fires only after `counterAfter` blocks.
export const KINDS = {
  associate: { hp: 3, speed: 1, windup: 16, punch: 10, cooldown: 40, reach: 20, stand: 16, hitsToFall: 2,
    moves: { jab: { weight: 3 }, lunge: { windup: 20, punch: 16, rush: 3, from: 28, to: 88, weight: 2 } },
    crowd: { circle: 0.9, feint: 1.6, taunt: 0.6, jitter: 1.8, gesture: 'beckon', back: true } },
  manager: { hp: 10, speed: 0.5, windup: 30, punch: 18, cooldown: 70, reach: 24, stand: 22, hitsToFall: 4, damage: 2,
    moves: {
      haymaker: { heavy: true, weight: 2 },
      grab: { windup: 20, punch: 12, reach: 18, damage: 1, hold: 60, squeeze: 20, mash: 6, weight: 2 },
      charge: { windup: 32, punch: 24, rush: 3.5, from: 48, to: 140, heavy: true, weight: 1 },
    },
    crowd: { circle: 1.3, feint: 0.4, taunt: 0.7, jitter: 0.7, gesture: 'tie' } },
  counsel: { hp: 5, speed: 0.75, windup: 18, punch: 16, cooldown: 90, reach: 100, hitsToFall: 3, keep: 64, near: 32,
    moves: {
      paper: { shot: 'paper', speed: 3, weight: 3 },
      object: { windup: 34, shot: 'object', speed: 2.25, damage: 2, heavy: true, weight: 2 },
      tape: { windup: 30, shot: 'tape', speed: 2, damage: 0, weight: 1 },
    },
    crowd: { circle: 2.2, feint: 0.2, taunt: 0.6, jitter: 0.8, gesture: 'tie' } },
  supervisor: { hp: 12, speed: 0.375, windup: 24, punch: 14, cooldown: 80, reach: 24, stand: 20, hitsToFall: 4, guard: 300, counterAfter: 2,
    moves: {
      slap: { weight: 2 },
      overhead: { windup: 40, punch: 20, reach: 26, damage: 2, heavy: true, weight: 1 },
      counter: { windup: 10, punch: 16, reach: 32, damage: 2, heavy: true, weight: 0 },
    },
    crowd: { circle: 0.8, feint: 0.2, taunt: 2.2, jitter: 0.6, gesture: 'slap' } },
};

export const kindsOf = (tune) => tune?.kinds ?? KINDS;

// One attack of a kind, filled out from the kind's own numbers.
export const moveOf = (k, name) => ({ name, windup: k.windup, punch: k.punch, reach: k.reach, damage: k.damage ?? 1, heavy: false, ...k.moves?.[name] });

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
    && (ATTACKING.includes(o.state) || holding(world, o) || !world.crowd));
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

const attackers = (world, f) => world.fighters.filter((o) => o !== f && o.team === 'foe' && o.kind && ATTACKING.includes(o.state)).length;

function moveTo(f, x, y, speed) {
  const dx = x - f.x;
  const dy = y - f.y;
  f.x += Math.sign(dx) * Math.min(Math.abs(dx), speed);
  f.y += Math.sign(dy) * Math.min(Math.abs(dy), speed * 0.75);
  return Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
}

// Whether one move can start from here: a throw from its thrower's distance with nothing of his in
// the air, a rush from its run-up distance on the auditor's row, anything else within reach.
function inRange(world, f, p, k, m, tune) {
  const gap = (p.x - f.x) * f.facing;
  const row = Math.abs(p.y - f.y) <= tune.depthReach;
  // A thrower backed against the floor's edge can't keep his distance, so he throws from closer in.
  const cornered = world.floor && (f.x <= world.floor.left + 1 || f.x >= world.floor.right - 1);
  if (m.shot) return row && gap >= (cornered ? 12 : k.near ?? 0) && gap <= k.reach && !world.tapes.some((s) => s.from === f.id);
  if (m.rush) return row && gap >= m.from && gap <= m.to;
  return inReach(f, p, m.reach, tune);
}

// The attack a foe starts now, or null: one of his moves in range, picked by weight. `f.nextMove`
// forces the next pick (poses and tests).
function chooseMove(world, f, p, k, tune) {
  if (f.cooldown > 0 || DOWNED.includes(p.state) || p.state === 'bound') return null;
  if (attackers(world, f) >= MAX_ATTACKERS) return null;
  const names = f.nextMove ? [f.nextMove] : Object.keys(k.moves ?? { strike: {} });
  const open = names.map((n) => moveOf(k, n)).filter((m) => (f.nextMove || (m.weight ?? 1) > 0) && inRange(world, f, p, k, m, tune));
  if (!open.length) return null;
  f.nextMove = null;
  let r = roll(world) * open.reduce((s, m) => s + (m.weight ?? 1), 0);
  return open.find((m) => (r -= m.weight ?? 1) < 0) ?? open[0];
}

function startAttack(f, m) {
  f.attack = m;
  f.flankSide = null;
  set(f, 'windup');
}

// Deterministic dice kept on the world, so a headless run repeats exactly.
function roll(world) {
  const c = world.crowd ??= { seed: 2161, turns: {} };
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
      const swinging = ATTACKING.includes(holder.state);
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
  // The Supervisor's answer to a string hammered into his guard: a quick counter out of turn.
  if (f.blocked && k.moves?.counter) {
    if ((world.frame ?? 0) - f.blockedAt > 60) f.blocked = 0;
    else if (f.blocked >= k.counterAfter && WAITING.includes(f.state) && !f.entering) {
      f.blocked = 0;
      f.facing = Math.sign(p.x - f.x) || f.facing;
      startAttack(f, moveOf(k, 'counter'));
    }
  }
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
      const m = !f.entering && chooseMove(world, f, p, k, tune);
      if (m) startAttack(f, m);
      break;
    }
    case 'windup': {
      const m = f.attack ??= moveOf(k, Object.keys(k.moves ?? {})[0]);
      if (f.t >= m.windup) strike(world, f, p, m, tune);
      break;
    }
    case 'punch':
      if (f.t >= (f.attack?.punch ?? k.punch)) {
        f.cooldown = k.cooldown;
        f.attack = null;
        set(f, 'idle');
      }
      break;
    case 'charge':
      charge(world, f, p, f.attack, tune);
      break;
    case 'hold':
      squeeze(world, f, f.attack, tune);
      break;
    case 'held':
      break;
    default:
      f.flankSide = null;
      updateCommon(world, f, tune);
  }
}

// The wind-up's last frame: a blow lands, a throw leaves the hand, a rush sets off or a grab closes.
function strike(world, f, p, m, tune) {
  set(f, 'punch');
  if (m.shot) {
    world.tapes.push({ x: f.x + f.facing * 12, y: f.y, vx: f.facing * m.speed, t: 0, from: f.id, shot: m.shot, damage: m.damage, heavy: m.heavy });
    world.events.push(m.shot === 'tape' ? 'redTape' : 'toss');
    return;
  }
  if (m.rush) {
    set(f, 'charge');
    world.events.push('charge');
    return;
  }
  if (!inReach(f, p, m.reach, tune) || p.z >= 16 || p.state === 'grab') return;
  if (!m.hold) {
    landHit(world, p, { damage: m.damage, heavy: m.heavy, dir: f.facing, from: f }, tune);
    return;
  }
  if (p.invuln > 0 || ['bound', ...DOWNED].includes(p.state)) return;
  if (p.parry > 0) {
    deflect(world, p, f, f.facing, tune);
    return;
  }
  Object.assign(p, { heldBy: f.id, mash: m.mash, x: f.x + f.facing * 14, y: f.y, facing: -f.facing });
  set(p, 'bound');
  set(f, 'hold');
  world.events.push('grabbed');
}

// A rush along the row: it stops on reaching the auditor, who takes the blow unless he can't be hurt,
// or at a wall or the run's end.
function charge(world, f, p, m, tune) {
  const was = f.x;
  f.x = Math.min(world.floor.right, Math.max(world.floor.left, f.x + f.facing * m.rush));
  const met = p.z < 16 && !DOWNED.includes(p.state) && Math.abs(p.y - f.y) <= tune.depthReach && Math.abs(p.x - f.x) <= 12;
  if (met) landHit(world, p, { damage: m.damage, heavy: m.heavy, dir: f.facing, from: f }, tune);
  if (f.state === 'charge' && (met || f.x === was || f.t * m.rush >= m.to + 24)) set(f, 'punch');
}

// The Manager's grip: the auditor squirms (mashing, as in a bind) while he squeezes, then is thrown.
function squeeze(world, f, m, tune) {
  const held = world.fighters.find((o) => o.heldBy === f.id);
  if (!held || held.state !== 'bound') {
    if (held) held.heldBy = null;
    set(f, 'punch');
    return;
  }
  Object.assign(held, { x: f.x + f.facing * 14, y: f.y });
  if (f.t % m.squeeze === 0) {
    held.hp = Math.max(1, held.hp - m.damage);
    world.events.push('squeeze');
  }
  if (f.t >= m.hold) {
    held.heldBy = null;
    set(held, 'idle');
    set(f, 'punch');
    landHit(world, held, { damage: m.damage + 1, heavy: true, dir: f.facing }, tune);
    world.events.push('throw');
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
  for (const p of world.fighters.filter((o) => o.heldBy)) {
    if (world.fighters.some((o) => o.id === p.heldBy && o.state === 'hold')) continue;
    p.heldBy = null;
    if (p.state === 'bound') set(p, 'idle');
  }
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
      if (tape.shot && tape.shot !== 'tape') {
        landHit(world, p, { damage: tape.damage, heavy: tape.heavy, dir: Math.sign(tape.vx) }, tune);
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

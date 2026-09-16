// Boss gimmicks (item 2344): a boss the auditor cannot simply punch down, and the scenery he is put
// down with. Pure, beside beats.mjs; stepGimmicks runs each frame after stepAreas.
//
// A gimmick boss carries a `gimmick` state: while it is not `dazed`, moves.mjs gates every blow to
// chip and never lets chip take him past his `floor`, so fists alone can chip him but never finish
// him. What opens him is his own gimmick â€” for Pruitt, the Floor Manager, a wheeled photocopier
// rammed into him, which dazes him long enough for a full combo.
//
// The rammable scenery is general: `world.rams` is a list of wheeled props, and any kit that can set
// one rolling can work the gimmick. Ward's heavy attack shoves the one in front of him and his
// room-clear special shoves every copier on the floor at once; Mercer's dive kick shoves one; and a
// parried charge stumbles the boss backward into whatever is behind him. The Custodian's adds,
// Carbon and Copy, and Hargreave's censers are follow-up cards that reuse the same three parts.
import { DOWNED, landHit, player, set } from './moves.mjs';

// The wheeled prop: how fast it rolls, what it does to a body it meets, and how long before
// another one is trundled back out so a room can never deadlock.
export const RAM = {
  speed: 4.5, damage: 5, width: 13, daze: 150, respawn: 240, stumble: 2.5, stumbleFrames: 22,
};

// Each boss's gimmick. `chip` is the most a bare hand takes off a blow, `floor` the share of his
// hide chip can never take him past, and `daze` how long the gimmick leaves him open.
export const GIMMICKS = {
  pruitt: { chip: 1, floor: 0.5, daze: RAM.daze, opens: 'a photocopier rammed into him' },
};

// Stamps the gimmick onto a boss the waves have just put on the floor.
export function armGimmick(f, id = 'pruitt') {
  const g = GIMMICKS[id];
  if (!g || f.gimmick) return f;
  const max = f.maxHp ?? f.hp;
  f.gimmick = { id, chip: g.chip, floor: Math.ceil(max * g.floor), daze: g.daze, dazed: 0, rammed: 0 };
  f.boss = true;
  f.hitsToFall = 0;
  return f;
}

export const gimmickBoss = (world) => world.fighters.find((f) => f.gimmick && !['ko', 'slumped'].includes(f.state));
export const rams = (world) => world.rams ?? [];
export const parkedRams = (world) => rams(world).filter((r) => r.state === 'parked');

// The copiers of a room, from the beat that placed them: x from the lock's own screen.
export function placeRams(world, list, x0 = 0) {
  world.rams = list.map((r, n) => {
    const home = { x: x0 + r.dx, y: r.y };
    return { id: r.id ?? `ram${n}`, kind: r.kind ?? 'copier', ...home, home, vx: 0, state: 'parked', t: 0 };
  });
  return world;
}

export function shove(world, ram, dir, events = world.events) {
  if (ram.state !== 'parked') return false;
  Object.assign(ram, { state: 'rolling', vx: dir * RAM.speed, t: 0 });
  events.push('ram:rolling');
  return true;
}

// Ward's room clear: every copier on the floor rolls away from him at once.
export function shoveAll(world, x, events = world.events) {
  let n = 0;
  for (const ram of parkedRams(world)) n += shove(world, ram, Math.sign(ram.x - x) || 1, events) ? 1 : 0;
  return n;
}

export function daze(world, f, events = world.events) {
  if (!f.gimmick) return false;
  f.gimmick.dazed = f.gimmick.daze;
  f.gimmick.rammed++;
  f.armoured = false;
  f.vx = 0;
  if (f.target) f.target = null;
  set(f, 'hurt');
  f.stagger = f.gimmick.daze;
  world.hitStop = Math.max(world.hitStop ?? 0, 8);
  world.shake = Math.max(world.shake ?? 0, 12);
  events.push('gimmick:dazed', 'heavy');
  return true;
}

// The copier the auditor is about to drive into: parked, in front of him, within his reach.
function ramInFront(world, p, reach, tune) {
  return parkedRams(world).find((r) => (r.x - p.x) * p.facing >= -6 && (r.x - p.x) * p.facing <= reach
    && Math.abs(r.y - p.y) <= tune.depthReach * 2);
}

// What each kit does with a copier: Ward's heavy shoves the one in front (Mercer's does too), and
// Mercer's dive kick shoves the one he comes down on. One shove a move, so a whiff is not a free
// second copier.
function kitShove(world, tune, events) {
  const p = player(world);
  const heavy = p.state === 'heavy' && p.t > tune.heavyStartup;
  const dive = p.state === 'jump' && p.dive;
  if (!heavy && !dive) {
    p.ramShove = false;
    return;
  }
  if (p.ramShove) return;
  const ram = ramInFront(world, p, (heavy ? tune.heavyReach : tune.punchReach) + 10, tune);
  if (!ram) return;
  p.ramShove = true;
  shove(world, ram, p.facing, events);
  events.push(dive ? 'ram:dive' : 'ram:heavy');
}

// A parried boss reels backward on his heels: whatever is behind him is what he lands in.
function stumble(world, tune, events) {
  for (const f of world.fighters) {
    if (!f.gimmick || DOWNED.includes(f.state)) continue;
    if (f.state === 'hurt' && f.t <= 1 && f.stagger >= tune.parryStagger && !(f.gimmick.dazed > 0)) {
      f.stumbleDir = -f.facing || -1;
      f.stumble = RAM.stumbleFrames;
      events.push('gimmick:stumble');
    }
    if (!(f.stumble > 0)) continue;
    f.stumble--;
    if (f.state !== 'hurt') { f.stumble = 0; continue; }
    f.x += f.stumbleDir * RAM.stumble;
    const into = parkedRams(world).find((r) => Math.abs(r.x - f.x) <= RAM.width && Math.abs(r.y - f.y) <= tune.depthReach * 2);
    if (into) {
      into.state = 'spent';
      into.t = 0;
      f.stumble = 0;
      daze(world, f, events);
      events.push('ram:stumbled');
    }
  }
}

// A rolling copier crosses the room: it dazes the gimmick boss and stops there, bowls any other
// member of staff over and rolls on, and is spent at the wall.
function rollRams(world, tune, events) {
  for (const ram of rams(world)) {
    if (ram.state === 'rolling') {
      ram.x += ram.vx;
      for (const f of world.fighters) {
        if (f.team === 'player' || DOWNED.includes(f.state) || f.state === 'ko') continue;
        if (Math.abs(f.x - ram.x) > RAM.width || Math.abs(f.y - ram.y) > tune.depthReach * 2) continue;
        if (f.gimmick) {
          // The copier itself takes hide off him â€” it is the only thing that does more than chip â€”
          // and leaves him dazed unless it was the blow that finished him.
          const done = landHit(world, f, { damage: RAM.damage, heavy: true, dir: Math.sign(ram.vx), body: true }, tune) && f.hp === 0;
          if (!done) daze(world, f, events);
          ram.state = 'spent';
          ram.t = 0;
          events.push('ram:hit');
          break;
        }
        if (landHit(world, f, { damage: RAM.damage, heavy: true, dir: Math.sign(ram.vx), body: true }, tune)) events.push('ram:hit');
      }
      if (ram.state === 'rolling' && (ram.x <= world.floor.left || ram.x >= world.floor.right)) {
        ram.state = 'spent';
        ram.t = 0;
      }
    } else if (ram.state === 'spent' && ++ram.t >= RAM.respawn) {
      // Another copier is wheeled out, so a room with a gimmick boss in it can never deadlock.
      Object.assign(ram, { state: 'parked', vx: 0, t: 0, ...ram.home });
      events.push('ram:back');
    }
  }
}

// The daze runs down; while it lasts he stays open, so a combo that knocks him about never cuts it
// short. It ends with him back on his feet and guarding.
function tickDaze(world, events) {
  for (const f of world.fighters) {
    const g = f.gimmick;
    if (!g || !(g.dazed > 0)) continue;
    g.dazed--;
    if (f.state === 'hurt') f.stagger = Math.max(f.stagger ?? 0, g.dazed);
    if (g.dazed === 0) events.push('gimmick:awake');
  }
}

// One frame of every gimmick on the floor, after stepAreas. `events` lands on world.events.
export function stepGimmicks(world, tune, events = world.events) {
  if (!world.rams && !gimmickBoss(world)) return world;
  if (world.hitStop > 0) return world;
  kitShove(world, tune, events);
  stumble(world, tune, events);
  rollRams(world, tune, events);
  tickDaze(world, events);
  return world;
}

// What the HUD and a reader need: how far through his hide he is, and whether he is open.
export const gimmickState = (f) => (f?.gimmick
  ? { id: f.gimmick.id, hp: f.hp, floor: f.gimmick.floor, open: f.gimmick.dazed > 0, rammed: f.gimmick.rammed }
  : null);


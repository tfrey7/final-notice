// Stage 1's office weapons: desks and cabinets that break under punches and drop a short-lived
// weapon, and what each weapon does in the auditor's hands. Pure, beside player.mjs; a world with no
// `smash` list has no weapons, so a floor only has them once armWorld has placed its furniture.
import { DOWNED, inReach, landHit, player, set } from './moves.mjs';

// Every weapon feel number, as [value, min, max, step]: the brawl lab's "weapons" dials.
export const WEAPONS = {
  smashHits: [3, 1, 8, 1],
  weaponLife: [480, 60, 1800, 30],
  staplerDamage: [2, 0, 6, 1],
  staplerUses: [3, 1, 10, 1],
  staplerSpeed: [4, 1, 8, 0.5],
  binderDamage: [2, 0, 6, 1],
  binderUses: [6, 1, 20, 1],
  binderReach: [30, 10, 50, 1],
  extinguisherUses: [90, 20, 300, 10],
  extinguisherReach: [40, 16, 80, 2],
  extinguisherPush: [2, 0.5, 6, 0.5],
  stampDamage: [1, 0, 4, 1],
  stampUses: [4, 1, 12, 1],
  stampBonus: [2, 0, 5, 1],
  stampMarkFrames: [300, 60, 900, 30],
};
export const WEAPON_SCALED = ['staplerSpeed', 'binderReach', 'extinguisherReach', 'extinguisherPush'];
export const KINDS = ['stapler', 'binder', 'extinguisher', 'stamp'];
export const SWING = { startup: 4, active: 3, recovery: 10 };
const SPRAY_EVERY = 6;
const FREE = ['idle', 'walk', 'run'];

export const defaultWeapons = () => Object.fromEntries(Object.entries(WEAPONS).map(([k, [v]]) => [k, v]));
export const scaledWeapons = (w, scale) => ({ ...w, ...Object.fromEntries(WEAPON_SCALED.map((k) => [k, w[k] * scale])) });

// Stage 1's furniture per area, x from the area's left edge: what stands where and what it drops.
export const SMASH = [
  [{ kind: 'desk', x: 200, y: 176, drop: 'stapler' }],
  [{ kind: 'cabinet', x: 120, y: 168, drop: 'binder' }, { kind: 'desk', x: 470, y: 184, drop: 'stamp' }],
  [{ kind: 'cabinet', x: 180, y: 170, drop: 'extinguisher' }],
  [{ kind: 'desk', x: 100, y: 180, drop: 'stamp' }, { kind: 'cabinet', x: 30, y: 168, drop: 'extinguisher' }],
];

export const stageSmash = (starts) => SMASH.flatMap((list, i) => list.map((s, n) => ({ ...s, id: `${s.kind}${i}-${n}`, x: starts[i] + s.x })));

export function armWorld(world, list, weapons = defaultWeapons()) {
  world.smash = list.map((s, n) => ({ id: s.id ?? `${s.kind}${n}`, kind: s.kind, x: s.x, y: s.y, drop: s.drop, hits: 0, state: 'standing' }));
  world.weapons = [];
  world.weaponTune = weapons;
  return world;
}

const usesOf = (kind, wt) => wt[`${kind}Uses`];
const pickup = (kind, x, y, uses) => ({ kind, x, y, z: 0, vx: 0, uses, state: 'floor', t: 0 });

// Before an auditor's own input (the first unless `p` names another): B picks a weapon up, or
// uses the one in hand. Answers the pad with B taken out when a weapon used it.
export function weaponPad(world, pad, tune, events, p = player(world)) {
  if (!world.smash) return pad;
  const pressed = new Set(pad.pressed);
  if (p.state === 'swing' || p.state === 'spray') pressed.delete('b');
  if (p.state === 'spray' && !pad.held.has('b')) set(p, 'idle');
  if (!FREE.includes(p.state) || !pressed.has('b')) return { ...pad, pressed };
  if (p.weapon) {
    pressed.delete('b');
    use(world, p, events);
  } else {
    const w = world.weapons.find((o) => o.state === 'floor' && Math.abs(o.x - p.x) <= 16 && Math.abs(o.y - p.y) <= tune.depthReach * 2);
    if (w) {
      pressed.delete('b');
      p.weapon = { kind: w.kind, uses: w.uses };
      w.state = 'gone';
      events.push('grab');
    }
  }
  return { ...pad, pressed };
}

function use(world, p, events) {
  const wt = world.weaponTune;
  const { kind, uses } = p.weapon;
  if (kind === 'stapler') {
    world.weapons.push({ ...pickup(kind, p.x + p.facing * 12, p.y, uses - 1), z: 16, vx: p.facing * wt.staplerSpeed, state: 'flying' });
    p.weapon = null;
    set(p, 'throw');
    events.push('throw');
  } else if (kind === 'extinguisher') {
    set(p, 'spray');
  } else {
    set(p, 'swing');
    p.swingHit = false;
    events.push('punch');
  }
}

function spend(p, n, events) {
  p.weapon.uses -= n;
  if (p.weapon.uses > 0) return;
  p.weapon = null;
  events.push('weaponBroke');
}

const standingFoes = (world) => world.fighters.filter((o) => o.team !== 'player' && o.state !== 'held' && !DOWNED.includes(o.state));

// One auditor after moves.mjs's frame: their punches break furniture, their swing or spray lands.
function stepAuditor(world, p, tune, events) {
  const wt = world.weaponTune;

  if (p.state === 'punch' && p.t === (p.combo === 3 ? tune.finisherStartup : tune.punchStartup) + 1) {
    const box = world.smash.find((s) => s.state === 'standing' && (s.x - p.x) * p.facing >= -4
      && (s.x - p.x) * p.facing <= tune.punchReach + 8 && Math.abs(s.y - p.y) <= tune.depthReach * 2);
    if (box && ++box.hits >= wt.smashHits) {
      box.state = 'broken';
      world.weapons.push(pickup(box.drop, box.x, box.y + 6, usesOf(box.drop, wt)));
      world.shake = tune.shakeFrames;
      events.push('heavy', 'smash');
    } else if (box) events.push('hit');
  }

  if (p.weapon && DOWNED.includes(p.state)) {
    world.weapons.push(pickup(p.weapon.kind, p.x, p.y, p.weapon.uses));
    p.weapon = null;
  }

  if (p.state === 'swing' && p.weapon) {
    const stamp = p.weapon.kind === 'stamp';
    if (!p.swingHit && p.t > SWING.startup && p.t <= SWING.startup + SWING.active) {
      const foe = standingFoes(world).find((o) => inReach(p, o, stamp ? tune.punchReach : wt.binderReach, tune));
      if (foe) {
        p.swingHit = landHit(world, foe, { damage: stamp ? wt.stampDamage : wt.binderDamage, heavy: false, dir: p.facing }, tune);
        if (p.swingHit && stamp) foe.marked = wt.stampMarkFrames;
      }
    }
    if (p.t >= SWING.startup + SWING.active + SWING.recovery) {
      spend(p, 1, events);
      set(p, 'idle');
    }
  }

  if (p.state === 'spray' && p.weapon) {
    if (p.t % SPRAY_EVERY === 1) {
      const wide = { ...tune, depthReach: tune.depthReach * 2 };
      for (const o of standingFoes(world).filter((f) => inReach(p, f, wt.extinguisherReach, wide))) {
        set(o, 'hurt');
        o.vx = p.facing * wt.extinguisherPush;
        o.facing = -p.facing;
      }
      events.push('spray');
    }
    spend(p, 1, events);
    if (!p.weapon) set(p, 'idle');
  }
}

// After moves.mjs's frame, for every auditor on the floor; then thrown staplers fly, dropped
// weapons fade and stamp marks wear off.
export function stepWeapons(world, tune, events) {
  if (!world.smash) return;
  for (const p of world.fighters.filter((f) => f.team === 'player')) stepAuditor(world, p, tune, events);
  const wt = world.weaponTune;
  for (const w of world.weapons) {
    if (w.state === 'flying') {
      w.x += w.vx;
      const foe = standingFoes(world).find((o) => Math.abs(o.x - w.x) < 12 && Math.abs(o.y - w.y) <= tune.depthReach);
      const hit = foe && landHit(world, foe, { damage: wt.staplerDamage, heavy: false, dir: Math.sign(w.vx) }, tune);
      if (hit) events.push('hit');
      if (hit || w.x < world.floor.left || w.x > world.floor.right) {
        w.x = Math.min(world.floor.right, Math.max(world.floor.left, w.x));
        Object.assign(w, { state: w.uses > 0 ? 'floor' : 'gone', z: 0, vx: 0, t: 0 });
      }
    } else if (w.state === 'floor' && ++w.t >= wt.weaponLife) w.state = 'gone';
  }
  world.weapons = world.weapons.filter((w) => w.state !== 'gone');

  for (const f of world.fighters) if (f.marked > 0) f.marked--;
}

// Stage 1's brawler rules: movement, the jump, the punch combo, grab and throw, and how hits land.
// Pure: step(world, input, tune) advances one frame; the scene only draws what it answers.
// Starting numbers follow docs/NES-CLASSICS.md (L1, L2, L6, L7, L17); `?tune` edits them live.

// Every feel number, as [value, min, max, step]. Speeds are px/frame, times are frames.
export const TUNING = {
  walkX: [1, 0.25, 3, 0.125],
  walkY: [0.625, 0.125, 2, 0.125],
  runX: [2, 1, 4, 0.125],
  jumpUp: [3.5, 1, 6, 0.125],
  gravity: [0.3125, 0.0625, 1, 0.0625],
  landFrames: [4, 0, 12, 1],
  punchStartup: [3, 1, 10, 1],
  punchActive: [2, 1, 6, 1],
  punchRecovery: [7, 2, 20, 1],
  finisherStartup: [5, 1, 12, 1],
  finisherActive: [3, 1, 8, 1],
  finisherRecovery: [16, 4, 30, 1],
  punchReach: [22, 10, 40, 1],
  comboStep: [4, 0, 12, 1],
  depthReach: [6, 2, 16, 1],
  bufferFrames: [8, 0, 20, 1],
  comboWindow: [14, 0, 40, 1],
  punchDamage: [1, 0, 5, 1],
  finisherDamage: [3, 0, 8, 1],
  kickDamage: [2, 0, 6, 1],
  kickActive: [12, 2, 30, 1],
  hitStop: [3, 0, 8, 1],
  hitStopHeavy: [4, 0, 10, 1],
  hitstun: [16, 4, 40, 1],
  knockback: [1, 0, 4, 0.25],
  launchX: [2, 0, 5, 0.25],
  launchUp: [2.5, 0, 6, 0.25],
  downFrames: [36, 10, 90, 1],
  getUpFrames: [14, 4, 40, 1],
  invulnFrames: [40, 0, 120, 1],
  shakeFrames: [8, 0, 20, 1],
  shakePx: [2, 0, 6, 1],
  grabReach: [16, 8, 30, 1],
  grabFrames: [90, 20, 200, 5],
  kneeDamage: [2, 0, 6, 1],
  kneesToDrop: [3, 1, 6, 1],
  throwDamage: [3, 0, 8, 1],
  throwFrames: [16, 4, 40, 1],
  bowl: [1, 0, 1, 1],
  playerHp: [16, 1, 40, 1],
  foeHp: [8, 1, 30, 1],
  foeSpeed: [0.5, 0.125, 2, 0.125],
  foeWindup: [20, 4, 60, 1],
  foeCooldown: [70, 10, 200, 5],
  // The heavy attack (SNES X) and the combo routes it ends: a route dial at 0 turns that route off.
  heavyStartup: [7, 2, 16, 1],
  heavyActive: [3, 1, 8, 1],
  heavyRecovery: [18, 4, 36, 1],
  heavyReach: [24, 10, 44, 1],
  heavyDamage: [2, 0, 6, 1],
  heavyPush: [3, 0, 8, 0.25],
  routeLLL: [1, 0, 1, 1],
  routeLLH: [1, 0, 1, 1],
  routeLH: [1, 0, 1, 1],
  routeDazedH: [1, 0, 1, 1],
  knockbackDamage: [3, 0, 8, 1],
  knockbackX: [4.5, 0, 8, 0.25],
  launcherDamage: [2, 0, 6, 1],
  launcherUp: [5, 0, 9, 0.25],
  dazedDamage: [5, 0, 12, 1],
  // The auditor's own special (SNES A): Ward's lunge, Mercer's sweep.
  specialStartup: [6, 1, 16, 1],
  specialActive: [6, 1, 16, 1],
  specialRecovery: [20, 4, 40, 1],
  specialDamage: [3, 0, 8, 1],
  specialReach: [48, 16, 80, 2],
  specialCooldown: [90, 0, 300, 10],
  parryFrames: [12, 1, 30, 1],
  parryLockout: [24, 0, 60, 1],
  parryStagger: [48, 16, 120, 2],
  parryFreeze: [8, 0, 20, 1],
  parryFlash: [6, 0, 20, 1],
  // Vellum's parry duel on the SNES: how long each attack is telegraphed and how long a parry leaves him open.
  vellumTell: [30, 8, 60, 1],
  vellumStagger: [70, 16, 150, 2],
};

export const defaultTune = () => Object.fromEntries(Object.entries(TUNING).map(([k, [v]]) => [k, v]));

export const FLOOR = { left: 16, right: 240, top: 160, bottom: 216 };
export const DOWNED = ['knockdown', 'down', 'getup', 'ko'];

export function fighter(id, team, x, y, tune) {
  return {
    id, team, x, y, z: 0, vx: 0, vz: 0, facing: team === 'player' ? 1 : -1,
    state: 'idle', t: 0, hp: team === 'player' ? tune.playerHp : tune.foeHp,
    combo: 0, lastCombo: 0, chain: 0, landed: false, buffer: 0, running: false,
    invuln: 0, kicked: false, target: null, knees: 0, cooldown: 30,
  };
}

export function newWorld(tune = defaultTune()) {
  return {
    frame: 0, hitStop: 0, shake: 0, events: [], wave: 1, waveTimer: 0,
    fighters: [fighter('player', 'player', 64, 188, tune), ...wave(tune, 1)],
  };
}

function wave(tune, n) {
  return [fighter(`foe${n}a`, 'foe', 200, 176, tune), fighter(`foe${n}b`, 'foe', 220, 204, tune)];
}

export const set = (f, state) => { f.state = state; f.t = 0; };
// A foe walking on from off screen is held to the floor only once he is on it.
const clampFloor = (f, floor = FLOOR) => {
  if (f.entering) f.entering = f.x < floor.left || f.x > floor.right;
  else f.x = Math.min(floor.right, Math.max(floor.left, f.x));
  f.y = Math.min(floor.bottom, Math.max(floor.top, f.y));
};
export const player = (world) => world.fighters.find((f) => f.team === 'player');

function punchTimes(f, tune) {
  return f.combo === 3
    ? [tune.finisherStartup, tune.finisherActive, tune.finisherRecovery]
    : [tune.punchStartup, tune.punchActive, tune.punchRecovery];
}

// In front of the attacker, on the same depth line, within reach.
export function inReach(a, b, reach, tune) {
  const ahead = (b.x - a.x) * a.facing;
  return ahead >= 0 && ahead <= reach && Math.abs(b.y - a.y) <= tune.depthReach;
}

// Lands a hit: hit-stop for everyone, knockback or a knockdown. Answers false when it cannot land.
// A guard (or a boss's armoured wind-up) stops every blow but a body thrown into it (`body`),
// which breaks the guard instead. A foe's blow (`from`) met inside the auditor's parry window is deflected.
export function landHit(world, target, { damage, heavy, dir, body, from }, tune) {
  if (target.invuln > 0 || DOWNED.includes(target.state)) return false;
  if (from && target.parry > 0 && !body) {
    deflect(world, target, from, dir, tune);
    return false;
  }
  const guarding = target.state === 'guard' || target.armoured;
  if (guarding && !body) {
    world.hitStop = tune.hitStop;
    world.events.push('blocked');
    target.x += dir * tune.knockback;
    return false;
  }
  if (guarding) {
    target.armoured = false;
    target.guardDown = target.guardBreakFrames;
    world.events.push('guardBreak');
  }
  // A red APPROVED stamp (weapons.mjs) marks a foe to take extra from every blow.
  const bonus = target.marked > 0 ? world.weaponTune?.stampBonus ?? 0 : 0;
  target.hp = Math.max(0, target.hp - damage - bonus);
  if (target.hitsToFall && ++target.taken >= target.hitsToFall) heavy = true;
  if (target.hp === 0) heavy = true;
  if (heavy) target.taken = 0;
  target.stagger = 0;
  world.hitStop = heavy ? tune.hitStopHeavy : tune.hitStop;
  world.events.push(heavy ? 'heavy' : 'hit');
  if (target.target) release(world, target);
  if (heavy) {
    world.shake = tune.shakeFrames;
    knockDown(target, dir, tune);
  } else {
    set(target, 'hurt');
    target.vx = dir * tune.knockback;
  }
  return true;
}

// The Objection: the fight freezes on a flash and the attacker reels open, long enough for a full combo.
// A foe may carry his own `parryStagger`; red tape parried from afar has no `foe` in reach and only snaps.
export function deflect(world, p, foe, dir, tune) {
  p.parry = 0;
  p.parryLock = 0;
  world.hitStop = tune.parryFreeze;
  world.flash = tune.parryFlash;
  world.events.push('parry');
  if (!foe) return;
  if (foe.target) release(world, foe);
  set(foe, 'hurt');
  foe.armoured = false;
  foe.vx = -dir * tune.knockback;
  foe.stagger = foe.parryStagger ?? tune.parryStagger;
}

function knockDown(f, dir, tune) {
  set(f, 'knockdown');
  f.vx = dir * tune.launchX;
  f.vz = tune.launchUp;
  f.z = Math.max(f.z, 1);
}

function release(world, holder) {
  const held = world.fighters.find((f) => f.id === holder.target);
  holder.target = null;
  if (held && held.state === 'held') set(held, 'hurt');
}

function startPunch(f, combo) {
  set(f, 'punch');
  f.combo = combo;
  f.landed = false;
  f.buffer = 0;
}

const lightsMax = (tune) => (tune.routeLLL ? 3 : 2);

// The heavy a light chain leads into: after one light the launcher, after two the knockback.
function heavyRoute(combo, tune) {
  if (combo === 1 && tune.routeLH) return 'launcher';
  if (combo === 2 && tune.routeLLH) return 'knockback';
  return null;
}

function startHeavy(f, route) {
  set(f, 'heavy');
  f.route = route;
  f.landed = false;
  f.buffer = 0;
  f.heavyBuffer = 0;
}

// A foe a parry left reeling, or one still stunned from the auditor's last blow.
export const dazed = (o) => o.state === 'hurt' && o.stagger > 0;

function heavyHit(world, f, foe, tune) {
  const dir = f.facing;
  const route = dazed(foe) && tune.routeDazedH ? 'crush' : f.route;
  const hit = {
    crush: { damage: tune.dazedDamage, heavy: true },
    launcher: { damage: tune.launcherDamage, heavy: true },
    knockback: { damage: tune.knockbackDamage, heavy: true },
    heavy: { damage: tune.heavyDamage, heavy: false },
  }[route];
  if (!landHit(world, foe, { ...hit, dir }, tune)) return false;
  if (route === 'launcher' && foe.state === 'knockdown') Object.assign(foe, { vx: dir * tune.knockback, vz: tune.launcherUp });
  if (route === 'knockback' && foe.state === 'knockdown') foe.vx = dir * tune.knockbackX;
  if (route === 'heavy' && foe.state === 'hurt') foe.vx = dir * tune.heavyPush;
  f.route = route;
  if (route !== 'heavy') world.events.push(route);
  return true;
}

function foesOf(world, f) {
  return world.fighters.filter((o) => o.team !== f.team && o.state !== 'ko');
}

function tryGrab(world, f, tune) {
  const foe = foesOf(world, f).find((o) => o.state === 'hurt' && !o.boss && inReach(f, o, tune.grabReach, tune));
  if (!foe) return false;
  set(f, 'grab');
  f.target = foe.id;
  f.knees = 0;
  f.buffer = 0;
  set(foe, 'held');
  foe.x = f.x + f.facing * 14;
  foe.y = f.y;
  foe.facing = -f.facing;
  world.events.push('grab');
  return true;
}

function controlFree(world, f, input, tune) {
  // A light press mid-chain continues the combo; walking into a reeling foe, or a fresh press, grabs.
  if (f.buffer > 0) {
    const chained = f.chain > 0 && f.lastCombo < lightsMax(tune);
    const walkingIn = input.held.has(f.facing > 0 ? 'right' : 'left');
    if (!((walkingIn || !chained) && tryGrab(world, f, tune))) startPunch(f, chained ? f.lastCombo + 1 : 1);
    return;
  }
  if (f.heavyBuffer > 0) {
    startHeavy(f, (f.chain > 0 && heavyRoute(f.lastCombo, tune)) || 'heavy');
    return;
  }
  if (input.pressed.has('a')) {
    const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
    set(f, 'jump');
    f.vx = dir * (f.running ? tune.runX : tune.walkX);
    f.vz = tune.jumpUp;
    f.kicked = false;
    world.events.push('jump');
    return;
  }
  const dx = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const dy = (input.held.has('down') ? 1 : 0) - (input.held.has('up') ? 1 : 0);
  if (input.dash) f.running = true;
  if (!dx) f.running = false;
  f.x += dx * (f.running ? tune.runX : tune.walkX);
  f.y += dy * tune.walkY;
  if (dx) f.facing = dx;
  const state = dx || dy ? (f.running ? 'run' : 'walk') : 'idle';
  if (state !== f.state) set(f, state);
}

function updatePlayer(world, f, input, tune) {
  if (input.pressed.has('b')) f.buffer = tune.bufferFrames + 1;
  if (input.pressed.has('heavy')) f.heavyBuffer = tune.bufferFrames + 1;
  if (f.chain > 0) f.chain--;
  if (f.invuln > 0) f.invuln--;
  f.t++;
  switch (f.state) {
    case 'idle': case 'walk': case 'run':
      controlFree(world, f, input, tune);
      break;
    case 'punch': {
      const [startup, active, recovery] = punchTimes(f, tune);
      // Each chained punch steps in, so knockback never carries the foe out of the combo.
      if (f.t === 1 && f.combo > 1) f.x += f.facing * tune.comboStep;
      if (!f.landed && f.t > startup && f.t <= startup + active) {
        const foe = foesOf(world, f).find((o) => o.state !== 'held' && inReach(f, o, tune.punchReach, tune) && o.z < 16);
        if (foe) {
          const heavy = f.combo === 3;
          f.landed = landHit(world, foe, { damage: heavy ? tune.finisherDamage : tune.punchDamage, heavy, dir: f.facing }, tune);
        }
      }
      const route = f.landed && f.heavyBuffer > 0 && heavyRoute(f.combo, tune);
      if (f.t > startup + active && route) startHeavy(f, route);
      else if (f.t > startup + active && f.landed && f.combo < lightsMax(tune) && f.buffer > 0) startPunch(f, f.combo + 1);
      else if (f.t >= startup + active + recovery) {
        f.lastCombo = f.combo;
        f.chain = f.landed ? tune.comboWindow : 0;
        set(f, 'idle');
      }
      break;
    }
    case 'heavy': {
      const [startup, active, recovery] = [tune.heavyStartup, tune.heavyActive, tune.heavyRecovery];
      if (f.t === 1 && f.route !== 'heavy') f.x += f.facing * tune.comboStep;
      if (!f.landed && f.t > startup && f.t <= startup + active) {
        const foe = foesOf(world, f).find((o) => o.state !== 'held' && inReach(f, o, tune.heavyReach, tune) && o.z < 16);
        if (foe) f.landed = heavyHit(world, f, foe, tune);
      }
      if (f.t >= startup + active + recovery) {
        f.lastCombo = 0;
        f.chain = 0;
        set(f, 'idle');
      }
      break;
    }
    case 'jump':
      f.x += f.vx;
      f.z += f.vz;
      f.vz -= tune.gravity;
      if (f.buffer > 0 && !f.kicked) {
        f.kicked = true;
        f.kickT = 0;
        f.landed = false;
        f.buffer = 0;
      }
      if (f.kicked && !f.landed && ++f.kickT <= tune.kickActive) {
        const foe = foesOf(world, f).find((o) => o.state !== 'held' && inReach(f, o, tune.punchReach, tune));
        if (foe) f.landed = landHit(world, foe, { damage: tune.kickDamage, heavy: true, dir: f.facing }, tune);
      }
      if (f.z <= 0) {
        f.z = 0;
        f.vz = 0;
        set(f, 'land');
        world.events.push('land');
      }
      break;
    case 'land':
      if (f.t >= tune.landFrames) set(f, 'idle');
      break;
    case 'grab': {
      const held = world.fighters.find((o) => o.id === f.target);
      if (!held || held.state !== 'held') { f.target = null; set(f, 'idle'); break; }
      if (f.buffer > 0) {
        f.buffer = 0;
        const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
        if (dir) {
          f.target = null;
          set(held, 'hurt');
          f.facing = dir;
          landHit(world, held, { damage: tune.throwDamage, heavy: true, dir }, tune);
          held.x = f.x + dir * 8;
          set(f, 'throw');
          world.events.push('throw');
        } else {
          f.knees++;
          set(held, 'hurt');
          f.target = null;
          landHit(world, held, { damage: tune.kneeDamage, heavy: f.knees >= tune.kneesToDrop, dir: f.facing }, tune);
          if (held.state === 'hurt') { set(held, 'held'); f.target = held.id; f.t = 0; }
          else set(f, 'idle');
        }
      } else if (f.t >= tune.grabFrames) {
        release(world, f);
        set(f, 'idle');
      }
      break;
    }
    case 'throw':
      if (f.t >= tune.throwFrames) set(f, 'idle');
      break;
    default:
      updateCommon(world, f, tune);
  }
  if (f.buffer > 0) f.buffer--;
  if (f.heavyBuffer > 0) f.heavyBuffer--;
}

// Hurt, knockdown, lying down and getting up: the same for everyone.
export function updateCommon(world, f, tune) {
  switch (f.state) {
    case 'hurt':
      f.x += f.vx;
      f.vx *= 0.75;
      if (f.t >= (f.stagger || tune.hitstun)) {
        f.taken = 0;
        f.stagger = 0;
        set(f, 'idle');
      }
      break;
    case 'knockdown': {
      f.x += f.vx;
      f.z += f.vz;
      f.vz -= tune.gravity;
      // A body flying through the fight bowls over any other foe it touches.
      const bowled = world.fighters.find((o) => o !== f && o.team === f.team && Math.abs(o.x - f.x) < 12
        && Math.abs(o.y - f.y) <= tune.depthReach && !DOWNED.includes(o.state));
      if (bowled && Math.abs(f.vx) > 1 && (tune.bowl || bowled.state === 'guard' || bowled.armoured)) {
        landHit(world, bowled, { damage: tune.throwDamage, heavy: true, dir: Math.sign(f.vx), body: true }, tune);
      }
      if (f.z <= 0) {
        f.z = 0;
        set(f, 'down');
        world.events.push('down');
      }
      break;
    }
    case 'down':
      if (f.t >= tune.downFrames) {
        if (f.hp > 0) set(f, 'getup');
        else if (f.team === 'player') {
          world.events.push('lifeLost');
          f.hp = tune.playerHp;
          set(f, 'getup');
        } else {
          set(f, 'ko');
          world.events.push('ko');
        }
      }
      break;
    case 'getup':
      if (f.t >= tune.getUpFrames) {
        set(f, 'idle');
        f.invuln = tune.invulnFrames;
      }
      break;
    default:
  }
}

function updateFoe(world, f, tune) {
  const p = player(world);
  if (f.invuln > 0) f.invuln--;
  f.t++;
  if (f.cooldown > 0) f.cooldown--;
  switch (f.state) {
    case 'idle': case 'walk': {
      if (f.dummy) break;
      // The second foe of a pair works the player's other side, so the two never stack.
      const side = f.id.endsWith('b') && world.fighters.filter((o) => o.team === 'foe').length > 1 ? -1 : Math.sign(f.x - p.x) || 1;
      const dx = p.x + side * 18 - f.x;
      const dy = p.y - f.y;
      f.facing = -side;
      const move = (d) => Math.sign(d) * Math.min(Math.abs(d), tune.foeSpeed);
      f.x += move(dx);
      f.y += move(dy);
      const moving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
      if (moving !== (f.state === 'walk')) set(f, moving ? 'walk' : 'idle');
      if (f.cooldown === 0 && !DOWNED.includes(p.state) && inReach(f, p, tune.punchReach, tune)) set(f, 'windup');
      break;
    }
    case 'windup':
      if (f.t >= tune.foeWindup) {
        set(f, 'punch');
        if (inReach(f, p, tune.punchReach, tune) && p.z < 16 && p.state !== 'grab') {
          landHit(world, p, { damage: 1, heavy: false, dir: f.facing, from: f }, tune);
        }
      }
      break;
    case 'punch':
      if (f.t >= tune.punchRecovery * 2) {
        f.cooldown = tune.foeCooldown;
        set(f, 'idle');
      }
      break;
    case 'held':
      break;
    default:
      updateCommon(world, f, tune);
  }
}

// One frame. `input` is { held, pressed, dash } from the pad.
export function step(world, input, tune = defaultTune()) {
  world.frame++;
  world.events = [];
  if (world.shake > 0) world.shake--;
  if (world.flash > 0) world.flash--;
  const p = player(world);
  if (world.hitStop > 0) {
    world.hitStop--;
    if (input.pressed.has('b')) p.buffer = tune.bufferFrames + 1;
    if (input.pressed.has('heavy')) p.heavyBuffer = tune.bufferFrames + 1;
    return world;
  }
  updatePlayer(world, p, input, tune);
  for (const f of world.fighters) if (f.team === 'foe') (f.kind && world.think ? world.think : updateFoe)(world, f, tune);
  for (const f of world.fighters) clampFloor(f, world.floor);

  world.fighters = world.fighters.filter((f) => f.state !== 'ko' || f.t < 40);
  if (!world.noWaves && !world.fighters.some((f) => f.team === 'foe')) {
    if (world.waveTimer === 0) world.events.push('waveClear');
    if (++world.waveTimer >= 60) {
      world.wave++;
      world.waveTimer = 0;
      world.fighters.push(...wave(tune, world.wave));
    }
  }
  return world;
}

// The screen offset this frame: a small alternating shake after a heavy hit.
export function shakeOffset(world, tune) {
  if (world.shake <= 0) return { x: 0, y: 0 };
  const s = world.shake % 2 ? tune.shakePx : -tune.shakePx;
  return { x: s, y: world.shake % 4 < 2 ? 1 : -1 };
}

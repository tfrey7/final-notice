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
  hitStopFinish: [4, 0, 12, 1],
  hitFlashFrames: [0, 0, 16, 1],
  sparkFrames: [8, 0, 20, 1],
  heavyShakeFrames: [0, 0, 20, 1],
  clearShakeFrames: [14, 0, 30, 1],
  comboDrop: [90, 20, 240, 5],
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
  // Ward's block (SNES L, held): a blow from in front costs a fraction of its damage as chip, and a
  // heavy blow or too long a hold breaks it and leaves him open.
  blockChip: [0.25, 0, 1, 0.05],
  blockMax: [120, 30, 300, 5],
  blockStun: [36, 8, 90, 2],
  blockLock: [30, 0, 90, 2],
  blockBreakGrace: [12, 0, 40, 1],
  // A light blow Ward blocks rebounds: its thrower's recovery runs this much longer, a short punish
  // next to a parry's reel.
  blockRecoil: [20, 0, 60, 2],
  // Ward's launcher (up + heavy) and air combo: the launched foe floats, air lights keep him up,
  // the air heavy slams him down. `upLauncher` at 0 turns the whole kit off (Mercer).
  upLauncher: [0, 0, 1, 1],
  juggleUp: [3, 1, 8, 0.25],
  juggleGravity: [0.5, 0.25, 1, 0.05],
  juggleFloat: [1.5, 0, 4, 0.25],
  airLights: [2, 0, 4, 1],
  airReachZ: [28, 8, 48, 2],
  airDamage: [1, 0, 4, 1],
  slamDamage: [3, 0, 8, 1],
  // Mercer's third attack (SNES A), a kick with its own routes: alone or after one light it dazes
  // (so X crushes), after two lights it sweeps the legs, out of a landed heavy it spins the foe away.
  // `thirdAttack` at 0 turns the kick off (Ward).
  thirdAttack: [0, 0, 1, 1],
  thirdStartup: [4, 1, 12, 1],
  thirdActive: [3, 1, 8, 1],
  thirdRecovery: [12, 4, 30, 1],
  thirdReach: [26, 10, 44, 1],
  thirdDamage: [2, 0, 6, 1],
  thirdDaze: [40, 8, 90, 2],
  routeA: [1, 0, 1, 1],
  routeLA: [1, 0, 1, 1],
  routeLLA: [1, 0, 1, 1],
  routeHA: [1, 0, 1, 1],
  // Mercer's dive kick: in a jump, down + any attack drives him down at an angle into a foe.
  diveKick: [0, 0, 1, 1],
  diveX: [3, 0, 6, 0.25],
  diveDown: [2.5, 1, 8, 0.25],
  diveDamage: [3, 0, 8, 1],
  // Mercer's special (Y+X): one foe in front takes a single hard blow, where Ward clears the room.
  takedownDamage: [6, 0, 12, 1],
  takedownReach: [30, 10, 60, 2],
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

// How a hit of each weight lands: the freeze, the screen shake and the push. A `finisher` knocks down.
export function hitFeel(weight, tune) {
  if (weight === 'finisher') return { stop: tune.hitStopFinish, shake: tune.shakeFrames, push: tune.launchX };
  if (weight === 'heavy') return { stop: tune.hitStopHeavy, shake: tune.heavyShakeFrames, push: tune.heavyPush };
  return { stop: tune.hitStop, shake: 0, push: tune.knockback };
}

const MAX_SPARKS = 6;

// The auditor's run of landed blows: each resets the drop timer, a blow taken ends it.
function countCombo(world, target, tune) {
  const c = world.combo ?? { hits: 0, t: 0, pop: 0, best: 0 };
  if (target.team === 'player') world.combo = { ...c, hits: 0, t: 0 };
  else {
    const hits = c.hits + 1;
    world.combo = { hits, t: tune.comboDrop, pop: 0, best: Math.max(c.best, hits) };
  }
}

// Lands a hit: hit-stop for everyone, knockback or a knockdown. Answers false when it cannot land.
// A guard (or a boss's armoured wind-up) stops every blow but a body thrown into it (`body`),
// which breaks the guard instead. A foe's blow (`from`) met inside the auditor's parry window is deflected.
// `heavy` knocks down; `weight: 'heavy'` is a heavy blow that only staggers.
export function landHit(world, target, hit, tune) {
  let { damage, heavy } = hit;
  const { weight, dir, body, from } = hit;
  // A slumped boss is beaten: a punch that knocked him down again would restart his slump forever.
  if (target.invuln > 0 || DOWNED.includes(target.state) || target.state === 'slumped') return false;
  if (from && target.parry > 0 && !body) {
    deflect(world, target, from, dir, tune);
    return false;
  }
  if (target.state === 'block' && !body && dir === -target.facing) return blockHit(world, target, { damage, heavy: heavy || weight === 'heavy', dir, from }, tune);
  const guarding = target.state === 'guard' || target.armoured;
  if (guarding && !body) {
    world.hitStop = tune.hitStop;
    world.events.push('blocked');
    target.blocked = (target.blocked ?? 0) + 1;
    target.blockedAt = world.frame ?? 0;
    target.x += dir * tune.knockback;
    return false;
  }
  if (guarding) {
    target.armoured = false;
    target.guardDown = target.guardBreakFrames;
    world.events.push('guardBreak');
  }
  // A gimmick boss (gimmick.mjs) is too heavy to stagger by hand: until his own gimmick dazes him
  // every blow is chip, it never staggers him, and chip never takes him past his floor.
  const gim = target.gimmick;
  if (gim && !(gim.dazed > 0) && !body) {
    const chip = Math.max(0, Math.min(damage, gim.chip, target.hp - gim.floor));
    target.hp -= chip;
    world.hitStop = tune.hitStop;
    world.events.push(chip > 0 ? 'chip' : 'clang');
    target.hitFlash = tune.hitFlashFrames;
    spark(world, target, dir, 'light');
    countCombo(world, target, tune);
    return true;
  }
  // A red APPROVED stamp (weapons.mjs) marks a foe to take extra from every blow.
  const bonus = target.marked > 0 ? world.weaponTune?.stampBonus ?? 0 : 0;
  target.hp = Math.max(0, target.hp - damage - bonus);
  if (target.hitsToFall && ++target.taken >= target.hitsToFall) heavy = true;
  if (target.hp === 0) heavy = true;
  if (heavy) target.taken = 0;
  target.stagger = 0;
  const feel = hitFeel(heavy ? 'finisher' : weight, tune);
  world.hitStop = feel.stop;
  world.shake = Math.max(world.shake ?? 0, feel.shake);
  world.events.push(heavy ? 'heavy' : 'hit');
  if (target.team === 'player') world.events.push('hurt');
  if (target.target) release(world, target);
  target.hitFlash = tune.hitFlashFrames;
  spark(world, target, dir, heavy ? 'finisher' : weight ?? 'light');
  countCombo(world, target, tune);
  if (heavy) knockDown(target, dir, tune);
  else {
    set(target, 'hurt');
    target.vx = dir * feel.push;
  }
  return true;
}

function spark(world, target, dir, weight) {
  world.sparks = [...(world.sparks ?? []), { x: target.x + dir * 6, y: target.y, z: target.z, weight, t: 0 }].slice(-MAX_SPARKS);
}

// Chip is banked in fractions of a pip and never takes the last one.
function blockHit(world, p, { damage, heavy, dir, from }, tune) {
  p.chip = (p.chip ?? 0) + damage * tune.blockChip;
  const pips = Math.floor(p.chip);
  p.chip -= pips;
  p.hp = Math.max(1, p.hp - pips);
  world.hitStop = tune.hitStop;
  p.x += dir * tune.knockback;
  if (heavy) {
    breakBlock(world, p, tune);
    return false;
  }
  world.events.push('blocked');
  if (from && !from.boss) {
    if (from.state === 'charge') set(from, 'punch');
    from.recoil = tune.blockRecoil;
  }
  return false;
}

export function breakBlock(world, p, tune, events = world.events) {
  set(p, 'hurt');
  p.vx = 0;
  p.stagger = tune.blockStun;
  p.blockLock = tune.blockLock;
  // The blow that broke it has spent itself: a rush sweeping on through gets no second hit.
  p.invuln = Math.max(p.invuln, tune.blockBreakGrace);
  events.push('guardBreak');
}

// A blow on a launched foe: a light keeps him floating, the slam drives him into the floor.
export function juggleHit(world, foe, slam, dir, tune) {
  foe.hp = Math.max(0, foe.hp - (slam ? tune.slamDamage : tune.airDamage));
  world.hitStop = slam ? tune.hitStopFinish : tune.hitStop;
  world.shake = Math.max(world.shake ?? 0, slam ? tune.shakeFrames : 0);
  foe.hitFlash = tune.hitFlashFrames;
  spark(world, foe, dir, slam ? 'finisher' : 'light');
  countCombo(world, foe, tune);
  if (slam) {
    Object.assign(foe, { juggle: false, vz: -tune.juggleUp * 2, vx: dir * tune.knockback });
    world.events.push('heavy', 'slam');
  } else {
    Object.assign(foe, { vz: Math.max(foe.vz, tune.juggleFloat), vx: dir * tune.knockback * 0.25 });
    world.events.push('hit', 'airHit');
  }
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
    heavy: { damage: tune.heavyDamage, heavy: false, weight: 'heavy' },
  }[route];
  if (!landHit(world, foe, { ...hit, dir }, tune)) return false;
  if (route === 'launcher' && foe.state === 'knockdown') {
    const juggle = !!tune.upLauncher;
    Object.assign(foe, { vx: dir * tune.knockback * (juggle ? 0.25 : 1), vz: juggle ? tune.juggleUp : tune.launcherUp, juggle });
  }
  if (route === 'knockback' && foe.state === 'knockdown') foe.vx = dir * tune.knockbackX;
  f.route = route;
  if (route !== 'heavy') world.events.push(route);
  return true;
}

// The kick a chain leads into: alone a snap, after one light a hook, after two a leg sweep.
function kickRoute(f, tune) {
  const combo = f.chain > 0 || f.state === 'punch' ? f.state === 'punch' ? f.combo : f.lastCombo : 0;
  if (combo === 1 && tune.routeLA) return 'hook';
  if (combo === 2 && tune.routeLLA) return 'low';
  return tune.routeA ? 'snap' : null;
}

function startKick(f, route) {
  set(f, 'kick');
  Object.assign(f, { route, landed: false, buffer: 0, heavyBuffer: 0, kickBuffer: 0 });
}

function kickHit(world, f, foe, tune) {
  const dir = f.facing;
  const hit = {
    snap: { damage: tune.thirdDamage, weight: 'heavy' },
    hook: { damage: tune.thirdDamage, weight: 'heavy' },
    low: { damage: tune.thirdDamage + 1, heavy: true },
    spin: { damage: tune.knockbackDamage, heavy: true },
  }[f.route];
  if (!landHit(world, foe, { ...hit, dir }, tune)) return false;
  if (['snap', 'hook'].includes(f.route) && foe.state === 'hurt') foe.stagger = tune.thirdDaze;
  if (f.route === 'spin' && foe.state === 'knockdown') foe.vx = dir * tune.knockbackX;
  world.events.push('kick', f.route);
  return true;
}

// Down + an attack in the air: Mercer drives down at a fixed angle and bounces off the foe he hits.
function startDive(world, f, tune) {
  Object.assign(f, { dive: true, kicked: true, kickT: tune.kickActive, landed: false, buffer: 0, heavyBuffer: 0, kickBuffer: 0 });
  f.vx = f.facing * tune.diveX;
  f.vz = -tune.diveDown;
  world.events.push('diveKick');
}

function diveHit(world, f, tune) {
  const foe = foesOf(world, f).find((o) => o.state !== 'held' && Math.abs(o.x - f.x) <= tune.punchReach
    && (o.x - f.x) * f.facing >= -4 && Math.abs(o.y - f.y) <= tune.depthReach && f.z - o.z <= 40);
  if (!foe || !landHit(world, foe, { damage: tune.diveDamage, heavy: true, dir: f.facing }, tune)) return;
  Object.assign(f, { dive: false, landed: true, vx: -f.facing, vz: 2 });
  world.events.push('diveHit');
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

function startJump(world, f, input, tune) {
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  set(f, 'jump');
  f.vx = dir * (f.running ? tune.runX : tune.walkX);
  f.vz = tune.jumpUp;
  Object.assign(f, { kicked: false, airHits: 0, slammed: false, dive: false });
  world.events.push('jump');
}

// Ward in the air beside a foe he launched: Y keeps the foe up, X slams him down. Answers true when
// the press was spent on the juggle.
function airCombo(world, f, tune) {
  if (!tune.upLauncher || !(f.buffer > 0 || f.heavyBuffer > 0) || f.slammed) return false;
  const foe = foesOf(world, f).find((o) => o.juggle && o.state === 'knockdown'
    && Math.abs(o.x - f.x) <= tune.punchReach && Math.abs(o.y - f.y) <= tune.depthReach && Math.abs(o.z - f.z) <= tune.airReachZ);
  if (!foe) return false;
  const slam = f.heavyBuffer > 0;
  if (!slam && f.airHits >= tune.airLights) return false;
  if (Math.sign(foe.x - f.x)) f.facing = Math.sign(foe.x - f.x);
  f.buffer = 0;
  f.heavyBuffer = 0;
  if (slam) f.slammed = true;
  else f.airHits++;
  f.kicked = true;
  f.landed = true;
  f.vz = Math.max(f.vz, slam ? 0 : 1);
  juggleHit(world, foe, slam, f.facing, tune);
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
    const up = tune.upLauncher && input.held.has('up');
    startHeavy(f, up ? 'launcher' : (f.chain > 0 && heavyRoute(f.lastCombo, tune)) || 'heavy');
    return;
  }
  if (f.kickBuffer > 0 && tune.thirdAttack) {
    const route = kickRoute(f, tune);
    if (route) startKick(f, route);
    return;
  }
  if (input.pressed.has('a')) {
    startJump(world, f, input, tune);
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
  if (input.pressed.has('kick')) f.kickBuffer = tune.bufferFrames + 1;
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
      const kick = f.landed && f.kickBuffer > 0 && tune.thirdAttack && f.combo < 3 && kickRoute(f, tune);
      if (f.t > startup + active && route) startHeavy(f, route);
      else if (f.t > startup + active && kick) startKick(f, kick);
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
      // A landed launcher cancels its recovery into the jump that chases the foe up.
      if (f.landed && f.route === 'launcher' && tune.upLauncher && f.t > startup + active && input.pressed.has('a')) startJump(world, f, input, tune);
      // Mercer's landed plain heavy cancels into the spinning kick.
      else if (f.landed && f.route === 'heavy' && tune.thirdAttack && tune.routeHA && f.kickBuffer > 0 && f.t > startup + active) startKick(f, 'spin');
      else if (f.t >= startup + active + recovery) {
        f.lastCombo = 0;
        f.chain = 0;
        f.via = null;
        set(f, 'idle');
      }
      break;
    }
    case 'kick': {
      const [startup, active, recovery] = [tune.thirdStartup, tune.thirdActive, tune.thirdRecovery];
      if (f.t === 1 && f.route !== 'snap') f.x += f.facing * tune.comboStep;
      if (!f.landed && f.t > startup && f.t <= startup + active) {
        const foe = foesOf(world, f).find((o) => o.state !== 'held' && inReach(f, o, tune.thirdReach, tune) && o.z < 16);
        if (foe) f.landed = kickHit(world, f, foe, tune);
      }
      // A landed snap or hook leaves the foe dazed: X on him is the crush.
      if (f.landed && ['snap', 'hook'].includes(f.route) && f.heavyBuffer > 0 && f.t > startup + active) {
        const via = f.route;
        startHeavy(f, 'heavy');
        f.via = via;
      } else if (f.t >= startup + active + recovery) {
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
      if (f.dive) {
        f.vz += tune.gravity;
        diveHit(world, f, tune);
      } else if (tune.diveKick && !f.kicked && f.z > 4 && input.held.has('down') && (f.buffer > 0 || f.heavyBuffer > 0 || f.kickBuffer > 0)) {
        startDive(world, f, tune);
      }
      if (airCombo(world, f, tune)) break;
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
        f.dive = false;
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
  if (f.kickBuffer > 0) f.kickBuffer--;
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
      f.vz -= tune.gravity * (f.juggle ? tune.juggleGravity : 1);
      // A body flying through the fight bowls over any other foe it touches.
      const bowled = world.fighters.find((o) => o !== f && o.team === f.team && Math.abs(o.x - f.x) < 12
        && Math.abs(o.y - f.y) <= tune.depthReach && !DOWNED.includes(o.state));
      if (bowled && Math.abs(f.vx) > 1 && (tune.bowl || bowled.state === 'guard' || bowled.armoured)) {
        landHit(world, bowled, { damage: tune.throwDamage, heavy: true, dir: Math.sign(f.vx), body: true }, tune);
      }
      if (f.z <= 0) {
        f.z = 0;
        f.juggle = false;
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
  tickFeel(world, tune);
  const p = player(world);
  if (world.hitStop > 0) {
    world.hitStop--;
    if (input.pressed.has('b')) p.buffer = tune.bufferFrames + 1;
    if (input.pressed.has('heavy')) p.heavyBuffer = tune.bufferFrames + 1;
    if (input.pressed.has('kick')) p.kickBuffer = tune.bufferFrames + 1;
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

// Sparks age through the freeze, so they burst while the fight holds; a foe's hit flash and the
// combo's drop timer only run once it moves again.
function tickFeel(world, tune) {
  if (world.sparks?.length) world.sparks = world.sparks.filter((s) => ++s.t < tune.sparkFrames);
  if (world.combo) world.combo.pop++;
  if (world.hitStop > 0) return;
  for (const f of world.fighters) if (f.hitFlash > 0) f.hitFlash--;
  if (world.combo?.t > 0 && --world.combo.t === 0) world.combo.hits = 0;
}

// The screen offset this frame: a small alternating shake after a heavy hit.
export function shakeOffset(world, tune) {
  if (world.shake <= 0) return { x: 0, y: 0 };
  const s = world.shake % 2 ? tune.shakePx : -tune.shakePx;
  return { x: s, y: world.shake % 4 < 2 ? 1 : -1 };
}

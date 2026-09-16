// The chosen auditor on Stage 1's long test floor: how Ward and Mercer differ, the evasive step,
// carried props, the practice dummy, the scrolling camera, the injunction meter and lives.
// Pure like moves.mjs: stepFloor(world, pad, tune) advances one frame around moves.mjs's step.
import { breakBlock, defaultTune, fighter, landHit, player, set, step } from './moves.mjs';
import { stepStaff, struggle } from './staff.mjs';
import { shoveAll } from './gimmick.mjs';
import { stepWeapons, weaponPad } from './weapons.mjs';
import { CLEAR_FRAMES } from '../input.mjs';
import { HITS_PER_SEGMENT, RING, SEGMENTS, addHits, cooldownSegments, fireCooldown, pushDir, restoreAtCheckpoint, ringVictims, segments, startRing, stepRing, tickCooldown, wantsFreeInjunction, wantsInjunction, withoutAB } from '../injunction.mjs';

export { HITS_PER_SEGMENT };
export const SCREEN_W = 256;
export const FLOOR_W = SCREEN_W * 4;
export const PIPS = 8;
export const METER_SEGMENTS = SEGMENTS;
export const STEP = { frames: 14, speed: 3.5 };
export const PROP = { reach: 16, speed: 4, damage: 3, respawn: 90 };
export const START = { x: 48, y: 188 };

// Ward reaches further and ends on a straight; Mercer is closer, quicker, ends on a shoulder check,
// and his thrown bodies bowl other foes over (docs/NES-PLAN.md section 5).
// Each has his own special on the SNES A button: Ward lunges along a line, Mercer sweeps both sides.
// Ward, the balanced default, blocks on L, launches into an air combo and clears the room on Y+X.
// Mercer, the technical one, parries on L, kicks on A, dive kicks from a jump and his Y+X
// takedown hits one foe hard.
export const AUDITORS = {
  ward: { finisher: 'straight', special: 'lunge', guard: 'block', tune: { punchReach: 26, comboStep: 3, finisherStartup: 5, punchRecovery: 7, launchX: 3, bowl: 0, upLauncher: 1 } },
  mercer: { finisher: 'shoulder', special: 'takedown', guard: 'parry', tune: { punchReach: 18, comboStep: 7, finisherStartup: 3, punchRecovery: 5, launchX: 2, bowl: 1, upLauncher: 0, thirdAttack: 1, diveKick: 1 } },
};

export const tuneFor = (who, base = defaultTune()) => ({ ...base, ...AUDITORS[who].tune, playerHp: PIPS });

const FREE = ['idle', 'walk', 'run'];
const DOWNED = ['knockdown', 'down', 'getup', 'ko'];
const PARRY_BLOCKED = [...DOWNED, 'bound', 'held'];

function dummy(tune, x) {
  return { ...fighter('dummy', 'foe', x, START.y, tune), dummy: true, facing: -1 };
}

export function newFloor(who = 'ward', tune = tuneFor(who)) {
  return {
    frame: 0, hitStop: 0, shake: 0, events: [], wave: 0, waveTimer: 0, noWaves: true, who,
    floor: { left: 16, right: FLOOR_W - 16, top: 160, bottom: 216 },
    fighters: [fighter('player', 'player', START.x, START.y, tune), dummy(tune, 128), fighter('spar', 'foe', 560, 196, tune)],
    props: [{ id: 'chair', kind: 'chair', home: { x: 200, y: 204 }, x: 200, y: 204, z: 0, vx: 0, state: 'floor', t: 0 }],
    checkpointX: START.x, cameraX: 0, meterHits: 0, meter: 0,
  };
}

// The camera's left edge: it holds while the player is inside a middle dead zone, then follows.
export function cameraX(current, x, viewW = SCREEN_W, worldW = FLOOR_W, deadZone = 40) {
  const centre = current + viewW / 2;
  let next = current;
  if (x > centre + deadZone / 2) next = x - deadZone / 2 - viewW / 2;
  else if (x < centre - deadZone / 2) next = x + deadZone / 2 - viewW / 2;
  return Math.min(worldW - viewW, Math.max(0, next));
}

const axis = (held, lo, hi) => (held.has(hi) ? 1 : 0) - (held.has(lo) ? 1 : 0);
const near = (a, b, reach, tune) => Math.abs(b.x - a.x) <= reach && Math.abs(b.y - a.y) <= tune.depthReach;

function canGrabFoe(world, p, tune) {
  return world.fighters.some((o) => o.team !== 'player' && o.state === 'hurt' && !o.boss
    && (o.x - p.x) * p.facing >= 0 && (o.x - p.x) * p.facing <= tune.grabReach && Math.abs(o.y - p.y) <= tune.depthReach);
}

function drop(world, p) {
  const prop = world.props.find((o) => o.state === 'held');
  if (prop) Object.assign(prop, { state: 'floor', x: p.x, y: p.y, z: 0 });
}

// Everything the auditor does before moves.mjs runs the frame. Answers the input moves.mjs sees.
function beforeStep(world, pad, tune, events) {
  const p = player(world);
  const pressed = new Set(pad.pressed);
  if (p.state !== 'carry') drop(world, p);
  // The NES double tap steps toward the tapped side; the SNES L and R step back and forward.
  const stepDir = pad.step ? pad.step * p.facing : pad.dash ? (pad.dash === 'right' ? 1 : -1) : 0;
  if (FREE.includes(p.state) && stepDir) {
    Object.assign(p, { state: 'step', t: 0, stepDir, running: false });
    p.invuln = Math.max(p.invuln, STEP.frames);
    events.push('step');
  } else if (FREE.includes(p.state) && pressed.has('b') && !canGrabFoe(world, p, tune)) {
    const prop = world.props.find((o) => o.state === 'floor' && near(p, o, PROP.reach, tune));
    if (prop) {
      Object.assign(p, { state: 'carry', t: 0 });
      prop.state = 'held';
      pressed.delete('b');
      events.push('grab');
    }
  } else if (p.state === 'carry') {
    const prop = world.props.find((o) => o.state === 'held');
    if (pressed.has('b')) {
      Object.assign(prop, { state: 'flying', x: p.x + p.facing * 12, y: p.y, z: 16, vx: p.facing * PROP.speed });
      Object.assign(p, { state: 'throw', t: 0 });
      pressed.delete('b');
      events.push('throw');
    } else {
      const dx = axis(pad.held, 'left', 'right');
      p.x += dx * tune.walkX * 0.75;
      p.y += axis(pad.held, 'up', 'down') * tune.walkY;
      if (dx) p.facing = dx;
    }
  }
  if (p.state === 'step') {
    p.x += p.stepDir * STEP.speed * (1 - p.t / STEP.frames);
    if (p.t >= STEP.frames) Object.assign(p, { state: 'idle', t: 0 });
  }
  if (pad.heavy) pressed.add('heavy');
  if (pad.special && tune.thirdAttack) pressed.add('kick');
  return { held: pad.held, pressed, dash: pad.run ?? null };
}

// Mercer's Y+X on the SNES pad: the takedown, on the same cooldown as Ward's room clear. Answers true
// when it fired.
function takedown(world, pad, tune, events) {
  const p = player(world);
  const cd = world.cooldown;
  if (!tune.thirdAttack || !pad.clear || world.hitStop > 0 || DOWNED.includes(p.state)) return false;
  if (cd ? !wantsFreeInjunction(pad, cd) : p.specialLeft > 0) return false;
  if (['punch', 'heavy', 'kick'].includes(p.state) && p.t <= CLEAR_FRAMES) set(p, 'idle');
  if (!FREE.includes(p.state)) return false;
  if (cd) fireCooldown(cd);
  set(p, 'special');
  Object.assign(p, { move: 'takedown', struck: [], specialLeft: tune.specialCooldown });
  events.push('special', 'takedown');
  return true;
}

// The auditor's own special, a grey box for now: Ward's lunge on A goes forward through everyone on
// his line; Mercer's takedown (Y+X) strikes only the nearest foe in front. Each foe is hit once.
function special(world, pad, tune, events) {
  const p = player(world);
  if (p.specialLeft > 0) p.specialLeft--;
  if (pad.special && !tune.thirdAttack && FREE.includes(p.state) && !(p.specialLeft > 0)) {
    set(p, 'special');
    Object.assign(p, { move: AUDITORS[world.who]?.special ?? 'lunge', struck: [], specialLeft: tune.specialCooldown });
    events.push('special');
  }
  if (p.state !== 'special') return;
  const { specialStartup: startup, specialActive: active, specialRecovery: recovery } = tune;
  const on = p.t > startup && p.t <= startup + active;
  if (on && p.move === 'lunge') p.x += (p.facing * tune.specialReach) / active;
  if (on && p.move === 'takedown' && !p.struck.length) {
    const foe = world.fighters
      .filter((o) => o.team !== 'player' && o.state !== 'held' && o.z < 16 && !DOWNED.includes(o.state)
        && (o.x - p.x) * p.facing >= -4 && (o.x - p.x) * p.facing <= tune.takedownReach && Math.abs(o.y - p.y) <= tune.depthReach * 2)
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (foe) {
      p.struck.push(foe.id);
      if (landHit(world, foe, { damage: tune.takedownDamage, heavy: true, dir: p.facing }, tune)) {
        if (foe.state === 'knockdown') foe.vx = p.facing * tune.knockbackX;
        events.push('hit');
      }
    }
  } else if (on && p.move !== 'takedown') {
    const reach = p.move === 'lunge' ? tune.punchReach : tune.specialReach / 2;
    for (const foe of world.fighters) {
      if (foe.team === 'player' || p.struck.includes(foe.id) || foe.state === 'held' || foe.z >= 16) continue;
      const dx = foe.x - p.x;
      const inside = p.move === 'lunge' ? dx * p.facing >= -4 && dx * p.facing <= reach : Math.abs(dx) <= reach;
      if (!inside || Math.abs(foe.y - p.y) > tune.depthReach * 2) continue;
      p.struck.push(foe.id);
      if (landHit(world, foe, { damage: tune.specialDamage, heavy: true, dir: Math.sign(dx) || p.facing }, tune)) events.push('hit');
    }
  }
  if (p.t >= startup + active + recovery) set(p, 'idle');
}

function moveProps(world, tune, events) {
  const p = player(world);
  for (const prop of world.props) {
    if (prop.state === 'held') Object.assign(prop, { x: p.x, y: p.y, z: 36 });
    if (prop.state === 'flying') {
      prop.x += prop.vx;
      const foe = world.fighters.find((o) => o.team !== 'player' && !DOWNED.includes(o.state) && o.state !== 'held'
        && Math.abs(o.x - prop.x) < 12 && Math.abs(o.y - prop.y) <= tune.depthReach);
      if (foe && landHit(world, foe, { damage: PROP.damage, heavy: true, dir: Math.sign(prop.vx) }, tune)) {
        Object.assign(prop, { state: 'gone', t: 0 });
        events.push('hit');
      } else if (prop.x < world.floor.left || prop.x > world.floor.right) {
        Object.assign(prop, { state: 'gone', t: 0 });
      }
    }
    // One hit and a prop is gone; a fresh one is back at its spot a moment later.
    if (prop.state === 'gone' && ++prop.t >= PROP.respawn) Object.assign(prop, { state: 'floor', ...prop.home, z: 0, vx: 0 });
  }
}

const foeHp = (world) => world.fighters.filter((f) => f.team !== 'player').reduce((n, f) => n + f.hp, 0);

// The Emergency Injunction: every ordinary foe on screen is thrown back unhurt, red tape snaps, and
// the fight holds still for a beat. Answers true when it fired. A world with a `cooldown` (the SNES
// Stage 1) fires it free and cools down; without one it spends the full meter.
function injunction(world, pad, tune, events) {
  const p = player(world);
  const cd = world.cooldown;
  const wants = cd ? wantsFreeInjunction(pad, cd) : wantsInjunction(pad, world.meterHits);
  // Mercer's Y+X on the SNES pad is his takedown, not the room clear.
  if (world.hitStop > 0 || DOWNED.includes(p.state) || !wants || (tune.thirdAttack && pad.clear !== undefined)) return false;
  // Y+X lands a frame or two apart, so the attack the first button began gives way to the clear.
  if (['punch', 'heavy'].includes(p.state) && p.t <= CLEAR_FRAMES) set(p, 'idle');
  if (cd) fireCooldown(cd);
  else world.meterHits = 0;
  const view = { x0: world.cameraX, x1: world.cameraX + SCREEN_W };
  const standing = (f) => f.team === 'foe' && !DOWNED.includes(f.state) && f.state !== 'held';
  for (const f of ringVictims(world.fighters, view, standing)) {
    const dir = pushDir(f, p.x);
    set(f, 'knockdown');
    Object.assign(f, { vx: dir * tune.launchX * 1.5, vz: tune.launchUp, z: Math.max(f.z, 1), taken: 0, facing: -dir });
  }
  world.tapes = [];
  // The clear reaches the room's furniture too: every wheeled copier goes rolling away from him at
  // once, which is Ward's own way into a gimmick boss (gimmick.mjs).
  if (shoveAll(world, p.x, events)) events.push('ram:clear');
  if (p.state === 'bound') set(p, 'idle');
  p.invuln = Math.max(p.invuln, RING.freeze + 20);
  world.ring = startRing(p.x, p.y - 20);
  world.hitStop = RING.freeze;
  world.shake = tune.clearShakeFrames ?? RING.freeze;
  events.push('injunction');
  return true;
}

// X opens the parry window; a whiffed one locks the next out for a moment, so mashing never parries.
function openParry(world, pad, tune, frozen, events) {
  const p = player(world);
  if (!frozen) {
    if (p.parry > 0) p.parry--;
    if (p.parryLock > 0) p.parryLock--;
  }
  if (!pad.parry || p.parryLock > 0 || PARRY_BLOCKED.includes(p.state)) return;
  p.parry = tune.parryFrames;
  p.parryLock = tune.parryFrames + tune.parryLockout;
  events.push('parryTry');
}

// Holding L raises the block; letting go drops it, and a hold past blockMax breaks it.
function holdBlock(world, pad, tune, frozen, events) {
  const p = player(world);
  if (frozen) return;
  if (p.blockLock > 0) p.blockLock--;
  if (p.state === 'block') {
    if (!pad.block) set(p, 'idle');
    else if (p.t >= tune.blockMax) breakBlock(world, p, tune, events);
  } else if (pad.block && FREE.includes(p.state) && !(p.blockLock > 0)) {
    set(p, 'block');
    events.push('blockUp');
  }
}

export function stepFloor(world, pad, tune) {
  const events = [];
  world.ring = stepRing(world.ring);
  if (world.cooldown) tickCooldown(world.cooldown);
  if (injunction(world, pad, tune, events) || takedown(world, pad, tune, events)) pad = withoutAB(pad);
  const frozen = world.hitStop > 0;
  if (AUDITORS[world.who]?.guard === 'block') holdBlock(world, pad, tune, frozen, events);
  else openParry(world, pad, tune, frozen, events);
  if (!frozen) special(world, pad, tune, events);
  const input = frozen ? { held: pad.held, pressed: new Set([...pad.pressed, ...(pad.special && tune.thirdAttack ? ['kick'] : [])]), dash: null }
    : struggle(world, pad, events) ?? beforeStep(world, weaponPad(world, pad, tune, events), tune, events);
  const before = foeHp(world);
  step(world, input, tune);
  const p = player(world);
  if (!frozen) {
    moveProps(world, tune, events);
    stepWeapons(world, tune, events);
    stepStaff(world, tune, events);
    if (p.state === 'punch' && p.t === 0) events.push('punch');
  }
  if (foeHp(world) < before) world.meterHits = addHits(world.meterHits);

  if (world.events.includes('lifeLost')) {
    world.meterHits = restoreAtCheckpoint(world.meterHits);
    drop(world, p);
    Object.assign(p, { x: world.checkpointX, y: START.y, z: 0, vx: 0, vz: 0 });
    world.cameraX = Math.max(0, world.checkpointX - SCREEN_W / 2);
  }
  if (!world.think && !world.fighters.some((f) => f.dummy)) world.fighters.push(dummy(tune, 128));
  world.meter = world.cooldown ? cooldownSegments(world.cooldown) : segments(world.meterHits);
  world.events.push(...events);
  world.cameraX = world.locked ? 0 : cameraX(world.cameraX, p.x);
  return world;
}

// Which animation the auditor's art shows for the player's state.
const WARD_ANIM = {
  idle: 'idle', walk: 'walk', run: 'walk', jump: 'jump', land: 'step', step: 'step', grab: 'grab', carry: 'grab', block: 'idle',
  throw: 'throw', hurt: 'hit', knockdown: 'knockdown', down: 'down', getup: 'step', held: 'hit',
};
const MERCER_ANIM = { idle: 'idle', walk: 'walk', run: 'walk', step: 'walk', land: 'idle', getup: 'idle', hurt: 'hurt', knockdown: 'hurt', down: 'hurt', held: 'hurt' };

export function animFor(who, f) {
  if (who === 'mercer') return `mercer.${MERCER_ANIM[f.state] ?? 'punch'}`;
  if (f.state === 'jump' && f.kicked) return 'jumpKick';
  return WARD_ANIM[f.state] ?? `punch${f.combo}`;
}

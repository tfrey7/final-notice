// Stage 2's feel, as pure logic: Ward's run and jump, casting, pursuers, the auto-scroll and checkpoints.
// Units are px and frames at 60 fps. Starting values come from docs/NES-CLASSICS.md (L1, L2).
import { registerTuning } from '../tune.mjs';

export const DEFAULTS = {
  // Mega Man 2's walk and jump (L2), with a short momentum ramp and a skid on reversal.
  walk: 1.375,
  accel: 0.125,
  skid: 0.25,
  friction: 0.1875,
  airAccel: 0.09375,
  jump: 4.87,
  gravity: 0.25,
  jumpCut: 1.5,
  fallCap: 7,
  coyote: 4,
  jumpBuffer: 5,
  // Casting: a short wind-up, Mega Man's shot pace, a small cooldown and a charge on hold.
  castDelay: 3,
  cooldown: 10,
  maxShots: 3,
  shotSpeed: 4,
  chargeFrames: 40,
  chargeSpeed: 5,
  chargeDamage: 3,
  sparkFrames: 8,
  // Pursuers: slower than Ward's walk, faster than the scroll, so standing still is what gets you caught.
  chaseSpeed: 1.125,
  catchupSpeed: 1.5,
  catchupGap: 112,
  pursuerHp: 2,
  pursuers: 2,
  spawnFrames: 90,
  scrollSpeed: 0.75,
  invulnFrames: 60,
  health: 8,
  pitDamage: 2,
};

export const TUNING = registerTuning('escape', { ...DEFAULTS }, {
  walk: [0.5, 3, 0.0625], jump: [2, 8, 0.125], gravity: [0.05, 0.6, 0.0125], scrollSpeed: [0, 2, 0.0625],
});

export const SCREEN_W = 256;
export const BODY_W = 16;
export const BODY_H = 32;

// Five cast directions, as the art plan draws them (docs/NES-PLAN.md section 10).
const D = Math.SQRT1_2;
export const CAST_DIRS = {
  forward: { dx: 1, dy: 0 },
  upForward: { dx: D, dy: -D },
  up: { dx: 0, dy: -1 },
  downForward: { dx: D, dy: D },
  down: { dx: 0, dy: 1 },
};

// Contra's rule (L2, plan section 3): running casts forward or diagonally up; down on the ground
// crouches and casts low; diagonal down and straight down only from the air.
export function castDirection(held, grounded) {
  const side = held.has('left') || held.has('right');
  if (held.has('up')) return side ? 'upForward' : 'up';
  if (held.has('down') && !grounded) return side ? 'downForward' : 'down';
  return 'forward';
}

export const LEVEL = {
  width: 1600,
  floor: 200,
  surfaces: [
    { x0: 0, x1: 400, y: 200 }, { x0: 440, x1: 760, y: 200 }, { x0: 808, x1: 1100, y: 200 }, { x0: 1140, x1: 1600, y: 200 },
    { x0: 300, x1: 360, y: 168 }, { x0: 600, x1: 680, y: 160 }, { x0: 940, x1: 1010, y: 164 },
  ],
  chase: [{ x0: 420, x1: 1120 }],
  checkpoints: [24, 420, 1140],
  exit: 1560,
};

export function createRunner(x, y) {
  return { x, y, vx: 0, vy: 0, facing: 1, grounded: true, skid: false, crouch: false, coyote: 0, buffer: 0, safeX: x };
}

const surfaceUnder = (level, x, fromY, toY) =>
  level.surfaces.find((s) => x + BODY_W / 2 > s.x0 && x - BODY_W / 2 < s.x1 && fromY <= s.y && toY >= s.y);

// One frame of a body on the level. `dir` is -1, 0 or 1; `jump` is { pressed, held }.
export function stepBody(r, dir, jump, level, t, crouch = false) {
  const moveDir = crouch ? 0 : dir;
  r.skid = false;
  if (moveDir) {
    const reversing = r.vx * moveDir < 0;
    const acc = !r.grounded ? t.airAccel : reversing ? t.skid : t.accel;
    r.vx = Math.max(-t.walk, Math.min(t.walk, r.vx + moveDir * acc));
    r.skid = r.grounded && reversing;
    r.facing = moveDir;
  } else if (r.grounded) {
    r.vx = Math.sign(r.vx) * Math.max(0, Math.abs(r.vx) - t.friction);
  }
  if (dir && crouch) r.facing = dir;
  r.crouch = crouch && r.grounded;

  r.buffer = jump.pressed ? t.jumpBuffer : Math.max(0, r.buffer - 1);
  r.coyote = r.grounded ? t.coyote : Math.max(0, r.coyote - 1);
  if (r.buffer > 0 && r.coyote > 0) {
    r.vy = -t.jump;
    r.grounded = false;
    r.buffer = 0;
    r.coyote = 0;
  }
  // Letting go of A while still rising cuts the jump short (the SMB3 split, L1).
  if (!jump.held && r.vy < -t.jumpCut) r.vy = -t.jumpCut;

  r.vy = Math.min(r.vy + t.gravity, t.fallCap);
  r.x = Math.max(BODY_W / 2, Math.min(level.width - BODY_W / 2, r.x + r.vx));
  const land = r.vy >= 0 && surfaceUnder(level, r.x, r.y, r.y + r.vy);
  if (land) {
    r.y = land.y;
    r.vy = 0;
    r.grounded = true;
    if (land.y === level.floor) r.safeX = r.x;
  } else {
    r.y += r.vy;
    r.grounded = false;
  }
  return r;
}

export function createWorld(level = LEVEL, t = TUNING) {
  const x = level.checkpoints[0];
  return {
    level, t, frame: 0, camX: 0, paused: false,
    ward: createRunner(x, level.floor),
    health: t.health, invuln: 0, checkpoint: 0,
    cast: { delay: 0, cooldown: 0, charge: 0, pending: null },
    shots: [], sparks: [], pursuers: [], spawnIn: t.spawnFrames,
    events: [],
  };
}

export const inChase = (level, x) => level.chase.some((c) => x >= c.x0 && x < c.x1);

// Ward's casting for one frame: tap B for a shot after a short wind-up, hold B to charge.
export function stepCasting(w, pad) {
  const { t, ward, cast } = w;
  cast.cooldown = Math.max(0, cast.cooldown - 1);
  if (pad.held.has('b')) cast.charge += 1;
  const tap = pad.pressed.has('b') && cast.cooldown === 0 && !cast.pending && w.shots.length < t.maxShots;
  const charged = pad.released.has('b') && cast.charge >= t.chargeFrames && !cast.pending;
  if (tap || charged) {
    cast.pending = { charged };
    cast.delay = t.castDelay;
  }
  if (!pad.held.has('b')) cast.charge = 0;
  if (cast.pending && cast.delay-- <= 0) {
    const name = castDirection(pad.held, ward.grounded);
    const d = CAST_DIRS[name];
    const speed = cast.pending.charged ? t.chargeSpeed : t.shotSpeed;
    const dx = d.dx * ward.facing;
    w.shots.push({
      x: ward.x + dx * 10, y: ward.y - (ward.crouch ? 10 : 20) + d.dy * 10,
      vx: dx * speed, vy: d.dy * speed, dir: name,
      charged: cast.pending.charged, damage: cast.pending.charged ? t.chargeDamage : 1, hit: new Set(),
    });
    cast.pending = null;
    cast.cooldown = t.cooldown;
  }
}

const overlaps = (a, b, ra = BODY_W / 2) => Math.abs(a.x - b.x) < ra + BODY_W / 2 && a.y > b.y - BODY_H && a.y < b.y + 4;

function stepShots(w) {
  const { t } = w;
  w.shots = w.shots.filter((s) => {
    s.x += s.vx;
    s.y += s.vy;
    for (const p of w.pursuers) {
      if (p.hp <= 0 || s.hit.has(p) || !overlaps(s, p, s.charged ? 6 : 3)) continue;
      s.hit.add(p);
      p.hp -= s.damage;
      p.hurt = 12;
      p.vx = Math.sign(s.vx || 1) * 2;
      w.sparks.push({ x: s.x, y: s.y, age: 0, big: s.charged });
      if (!s.charged) return false;
    }
    return s.x > w.camX - 16 && s.x < w.camX + SCREEN_W + 16 && s.y > 0 && s.y < 240;
  });
  w.sparks = w.sparks.filter((sp) => ++sp.age < t.sparkFrames);
}

// Pursuers run at Ward from behind and hop pits; far behind, they rubber-band to keep the pressure on.
function stepPursuers(w) {
  const { t, ward, level } = w;
  if (inChase(level, w.camX + SCREEN_W / 2) && --w.spawnIn <= 0) {
    w.spawnIn = t.spawnFrames;
    if (w.pursuers.length < t.pursuers) w.pursuers.push({ ...createRunner(Math.max(8, w.camX - 20), level.floor), hp: t.pursuerHp, hurt: 0 });
  }
  const chase = { ...t };
  for (const p of w.pursuers) {
    const gap = ward.x - p.x;
    chase.walk = Math.abs(gap) > t.catchupGap ? t.catchupSpeed : t.chaseSpeed;
    // A knocked-back pursuer is a projectile of its own: it bowls over the one behind and can slide into a pit.
    if (p.hurt > 0) {
      p.hurt -= 1;
      stepBody(p, 0, { pressed: false, held: false }, level, { ...t, friction: 0.125 });
      for (const q of w.pursuers) {
        if (q === p || q.hurt || Math.abs(p.vx) < 0.5 || !overlaps(p, q)) continue;
        q.hp -= 1;
        q.hurt = 12;
        q.vx = p.vx;
        w.sparks.push({ x: (p.x + q.x) / 2, y: q.y - 16, age: 0, big: false });
      }
      continue;
    }
    const dir = Math.sign(gap);
    const ahead = p.x + dir * 12;
    const edge = p.grounded && !level.surfaces.some((s) => s.y === p.y && ahead > s.x0 && ahead < s.x1);
    stepBody(p, dir, { pressed: edge, held: edge || p.vy < 0 }, level, chase);
    if (w.invuln === 0 && overlaps(ward, p)) hurtWard(w, 1, Math.sign(gap) || 1);
  }
  w.pursuers = w.pursuers.filter((p) => p.hp > 0 && p.y < 260 && p.x > w.camX - 64);
}

function hurtWard(w, pips, pushDir) {
  w.health -= pips;
  w.invuln = w.t.invulnFrames;
  w.ward.vx = pushDir * 1.5;
  w.ward.vy = Math.min(w.ward.vy, -2);
  w.ward.grounded = false;
  if (w.health <= 0) loseLife(w);
}

function loseLife(w) {
  const x = w.level.checkpoints[w.checkpoint];
  w.events.push({ type: 'lifeLost' });
  Object.assign(w, { health: w.t.health, invuln: w.t.invulnFrames, camX: Math.max(0, x - 32), shots: [], sparks: [], pursuers: [], spawnIn: w.t.spawnFrames });
  w.ward = createRunner(x, w.level.floor);
}

// The camera never scrolls back. In a chase section it creeps forward on its own and its left edge pushes Ward.
export function stepCamera(w) {
  const { ward, level, t } = w;
  const max = level.width - SCREEN_W;
  let cam = Math.max(w.camX, ward.x - 112);
  if (inChase(level, w.camX + SCREEN_W / 2)) cam = Math.max(cam, w.camX + t.scrollSpeed);
  w.camX = Math.min(max, cam);
  if (ward.x - BODY_W / 2 < w.camX) {
    ward.x = w.camX + BODY_W / 2;
    ward.vx = Math.max(0, ward.vx);
  }
}

export function stepWorld(w, pad) {
  w.events = [];
  if (pad.pressed.has('start')) w.paused = !w.paused;
  if (w.paused) return w;
  const { t, ward, level } = w;
  w.frame += 1;
  w.invuln = Math.max(0, w.invuln - 1);
  const dir = (pad.held.has('right') ? 1 : 0) - (pad.held.has('left') ? 1 : 0);
  stepBody(ward, dir, { pressed: pad.pressed.has('a'), held: pad.held.has('a') }, level, t, pad.held.has('down'));
  stepCasting(w, pad);
  stepShots(w);
  stepPursuers(w);
  stepCamera(w);

  if (ward.y > 250) {
    w.health -= t.pitDamage;
    if (w.health <= 0) loseLife(w);
    else Object.assign(w.ward, createRunner(Math.max(ward.safeX, w.camX + BODY_W), level.floor), { safeX: ward.safeX });
    w.invuln = t.invulnFrames;
  }
  const cp = level.checkpoints.findLastIndex((x) => w.ward.x >= x);
  if (cp > w.checkpoint) {
    w.checkpoint = cp;
    w.events.push({ type: 'checkpoint', index: cp });
  }
  if (w.ward.x >= level.exit) w.events.push({ type: 'stageClear' });
  return w;
}

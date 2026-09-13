// Ward's rules on the brawler floor, as plain data and one step function, so they run the same
// in the browser and under `node --test`. Time is counted in ticks of a fixed 60 Hz clock.
//
// Coordinates: x runs along the lobby, z is depth across the floor band (0 at the back wall),
// y is height above the floor (positive is up). The animation states are the sprite's names:
// idle, walk, punch1, punch2, punch3 and hit (plus jump while airborne).

export const TICK_MS = 1000 / 60;

export const MOVE = {
  walkX: 1.5, // pixels a tick along the lobby
  walkZ: 1, // pixels a tick toward or away from the camera
  jumpV: 4.2, // launch speed
  gravity: 0.3,
};

// Each punch: wind-up, contact and recovery in ticks, the freeze on contact, and its reach.
export const PUNCHES = {
  punch1: { windup: 3, contact: 3, recover: 8, freeze: 3, reach: 18 },
  punch2: { windup: 3, contact: 3, recover: 9, freeze: 3, reach: 20 },
  punch3: { windup: 6, contact: 4, recover: 16, freeze: 7, reach: 26 },
};

const NEXT_PUNCH = { punch1: 'punch2', punch2: 'punch3', punch3: null };
export const HIT_TICKS = 18;

export function createWard(x = 60, z = 30) {
  return { x, z, y: 0, vy: 0, facing: 1, state: 'idle', t: 0, queued: false, freeze: 0 };
}

// Which part of a punch a given tick falls in, or null once the punch is over.
export function punchPhase(name, t) {
  const p = PUNCHES[name];
  if (t < p.windup) return 'windup';
  if (t < p.windup + p.contact) return 'contact';
  if (t < p.windup + p.contact + p.recover) return 'recover';
  return null;
}

export function isPunch(state) {
  return state in PUNCHES;
}

function startPunch(w, name) {
  w.state = name;
  w.t = 0;
  w.queued = false;
}

// Knock Ward into his hit reaction (no enemies call it yet).
export function hurt(w) {
  w.state = 'hit';
  w.t = 0;
  w.queued = false;
  w.freeze = 0;
}

// Advance one tick. `input` holds held directions (left, right, up, down) and this tick's fresh
// presses (jump, punch). `bounds` is { minX, maxX, depth }. Returns the tick's events, such as
// { type: 'contact', punch: 'punch3' } on the first contact tick.
export function stepWard(w, input, bounds) {
  const events = [];
  if (w.freeze > 0) {
    // Hit-stop: the world holds still, but a press still queues the next punch.
    if (input.punch && isPunch(w.state)) w.queued = true;
    w.freeze -= 1;
    return events;
  }

  const airborne = w.y > 0 || w.vy > 0;

  if (w.state === 'hit') {
    w.t += 1;
    if (w.t >= HIT_TICKS) {
      w.state = 'idle';
      w.t = 0;
    }
  } else if (isPunch(w.state)) {
    if (input.punch) w.queued = true;
    w.t += 1;
    const phase = punchPhase(w.state, w.t);
    const p = PUNCHES[w.state];
    if (phase === 'contact' && w.t === p.windup) {
      w.freeze = p.freeze;
      events.push({ type: 'contact', punch: w.state, reach: p.reach });
    }
    const next = NEXT_PUNCH[w.state];
    // A queued press cancels the recovery into the next punch, the moment recovery begins.
    if (phase === 'recover' && w.queued && next) {
      startPunch(w, next);
    } else if (phase === null) {
      w.state = 'idle';
      w.t = 0;
      w.queued = false;
    }
  } else if (input.punch && !airborne) {
    startPunch(w, 'punch1');
  } else {
    // Free movement: speed is set outright, so Ward starts and stops on the same tick.
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dz = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dx !== 0) w.facing = dx;
    w.x += dx * MOVE.walkX;
    w.z += dz * MOVE.walkZ;
    if (input.jump && !airborne) w.vy = MOVE.jumpV;
    const moving = dx !== 0 || dz !== 0;
    const state = moving ? 'walk' : 'idle';
    if (state !== w.state) {
      w.state = state;
      w.t = 0;
    } else {
      w.t += 1;
    }
  }

  if (w.y > 0 || w.vy > 0) {
    w.y += w.vy;
    w.vy -= MOVE.gravity;
    if (w.y <= 0) {
      w.y = 0;
      w.vy = 0;
    }
  }

  w.x = Math.min(bounds.maxX, Math.max(bounds.minX, w.x));
  w.z = Math.min(bounds.depth, Math.max(0, w.z));
  return events;
}

// The camera's left edge: it holds while Ward is inside a middle dead zone, then scrolls to keep
// him at its edge, clamped to the lobby.
export function cameraX(current, wardX, viewW, worldW, deadZone = 40) {
  const centre = current + viewW / 2;
  let next = current;
  if (wardX > centre + deadZone / 2) next = wardX - deadZone / 2 - viewW / 2;
  else if (wardX < centre - deadZone / 2) next = wardX + deadZone / 2 - viewW / 2;
  return Math.min(worldW - viewW, Math.max(0, next));
}

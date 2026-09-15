// The chosen auditor on Stage 2's platforms: run, jump, crouch, cast, and the pit's price. Pure.
import { TUNING } from './escape.mjs';
import { COOLDOWN, aim, cooldownOf, spawnSpell } from './casting.mjs';
import { fullySupported, moveBody } from './physics.mjs';

export const BODY = { w: 12, h: 32 };
export const HEALTH = 8;
export const PIT_DAMAGE = 2;
export const INVULN = 60;

export function createPlayer(auditor, { x, y }) {
  return {
    auditor, x, y, vx: 0, vy: 0, ...BODY, facing: 1, grounded: true, crouch: false, planted: false, walking: false,
    coyote: 0, buffer: 0, cooldown: 0, castPose: 0, castDir: 'right', safe: { x, y }, health: HEALTH, invuln: 0,
  };
}

// One frame. `casts` is the shared list of seals in flight; answers the frame's events.
export function stepPlayer(p, pad, area, casts, t = TUNING) {
  const events = [];
  const side = (pad.held.has('right') ? 1 : 0) - (pad.held.has('left') ? 1 : 0);
  const b = pad.held.has('b');
  // Holding B plants the feet so the d-pad aims; the press itself, while walking, casts on the move.
  p.planted = p.grounded && b && !pad.pressed.has('b');
  p.crouch = p.grounded && pad.held.has('down') && !side;
  if (side) p.facing = side;
  const move = p.planted || p.crouch ? 0 : side;
  if (move) {
    const acc = !p.grounded ? t.airAccel : p.vx * move < 0 ? t.skid : t.accel;
    p.vx = Math.max(-t.walk, Math.min(t.walk, p.vx + move * acc));
  } else if (p.grounded) {
    p.vx = Math.sign(p.vx) * Math.max(0, Math.abs(p.vx) - t.friction);
  }
  p.walking = p.grounded && move !== 0;

  p.buffer = pad.pressed.has('a') ? t.jumpBuffer : Math.max(0, p.buffer - 1);
  p.coyote = p.grounded ? t.coyote : Math.max(0, p.coyote - 1);
  if (p.buffer > 0 && p.coyote > 0) {
    Object.assign(p, { vy: -t.jump, grounded: false, buffer: 0, coyote: 0, crouch: false });
    events.push({ type: 'jump' });
  }
  if (!pad.held.has('a') && p.vy < -t.jumpCut) p.vy = -t.jumpCut;
  p.vy = Math.min(p.vy + t.gravity, t.fallCap);

  const hit = moveBody(p, area);
  p.grounded = hit.landed;
  if (p.grounded && fullySupported(p, area)) p.safe = { x: p.x, y: p.y };

  p.cooldown = Math.max(0, p.cooldown - 1);
  p.castPose = Math.max(0, p.castPose - 1);
  p.invuln = Math.max(0, p.invuln - 1);
  if (b && (pad.pressed.has('b') || p.cooldown === 0)) {
    const dir = aim(pad.held, { facing: p.facing, grounded: p.grounded, walking: p.walking && pad.pressed.has('b') });
    const spell = p.spell ?? 'notice';
    if (spawnSpell(casts, spell, p.auditor, p.x, p.y - (p.crouch ? 10 : 20), dir, p.facing)) {
      p.cooldown = cooldownOf(spell);
      p.castPose = COOLDOWN + 2;
      p.castDir = dir;
      events.push({ type: spell === 'notice' ? 'cast' : spell, dir });
    }
  }

  if (p.y > area.height + 2 * p.h) {
    p.health -= PIT_DAMAGE;
    events.push({ type: 'pit' });
    if (p.health <= 0) {
      p.health = HEALTH;
      events.push({ type: 'lifeLost' });
    }
    Object.assign(p, { x: p.safe.x, y: p.safe.y, vx: 0, vy: 0, grounded: true, invuln: INVULN });
  }
  return events;
}

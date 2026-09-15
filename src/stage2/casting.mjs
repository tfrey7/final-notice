// Seal of Notice: the aim rules and the seals in flight. Pure.
import { solidPoint } from './physics.mjs';

export const MAX_CASTS = 3;
export const COOLDOWN = 12;
export const LIFETIME = 90;

// Tim's ruling of 2026-09-13: Ward's seal pierces, Mercer's is slower and bursts on contact.
export const AUDITORS = {
  ward: { speed: 4, pierce: true, radius: 0, burstFrames: 0 },
  mercer: { speed: 2.5, pierce: false, radius: 20, burstFrames: 12 },
};

const D = Math.SQRT1_2;
export const DIRS = {
  right: [1, 0], upRight: [D, -D], up: [0, -1], upLeft: [-D, -D],
  left: [-1, 0], downLeft: [-D, D], down: [0, 1], downRight: [D, D],
};

const nameOf = (sx, sy) => Object.keys(DIRS).find((k) => Math.sign(DIRS[k][0]) === sx && Math.sign(DIRS[k][1]) === sy);

// Contra's rule: walking casts forward, or diagonally up with up held; standing still or in the air the
// d-pad aims in all eight; down on the ground alone crouches and casts low and forward.
export function aim(held, { facing, grounded, walking }) {
  const side = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
  const vert = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
  if (walking) return nameOf(facing, held.has('up') ? -1 : 0);
  if (!side && (vert === 0 || (vert > 0 && grounded))) return nameOf(facing, 0);
  return nameOf(side, vert);
}

// Adds a seal if fewer than three are out. Answers it, or null.
export function spawnCast(casts, auditor, x, y, dir) {
  if (casts.length >= MAX_CASTS) return null;
  const { speed } = AUDITORS[auditor];
  const [dx, dy] = DIRS[dir];
  const cast = { kind: 'seal', auditor, dir, x: x + dx * 8, y: y + dy * 8, vx: dx * speed, vy: dy * speed, age: 0, hit: new Set() };
  casts.push(cast);
  return cast;
}

const PAD = 3;
const inBox = (c, t) => c.x > t.x - t.w / 2 - PAD && c.x < t.x + t.w / 2 + PAD && c.y > t.y - t.h - PAD && c.y < t.y + PAD;
const inBurst = (c, t) => Math.hypot(Math.max(Math.abs(c.x - t.x) - t.w / 2, 0), Math.max(Math.abs(c.y - (t.y - t.h / 2)) - t.h / 2, 0)) <= AUDITORS[c.auditor].radius;

function strike(target, events) {
  if (target.hp <= 0) return;
  target.hp -= 1;
  target.flash = 6;
  events.push({ type: target.hp <= 0 ? 'break' : 'hit', target });
}

function burst(c, targets, events) {
  Object.assign(c, { kind: 'burst', vx: 0, vy: 0, age: 0 });
  for (const t of targets) if (inBurst(c, t)) strike(t, events);
}

// One frame of every cast against the area and the targets, inside the view [x0, x1). Answers the events.
export function stepCasts(casts, area, targets, view = { x0: 0, x1: area.width }) {
  const events = [];
  const keep = casts.filter((c) => {
    c.age += 1;
    if (c.kind === 'burst') return c.age < AUDITORS[c.auditor].burstFrames;
    c.x += c.vx;
    c.y += c.vy;
    const rule = AUDITORS[c.auditor];
    for (const t of targets) {
      if (t.hp <= 0 || c.hit.has(t) || !inBox(c, t)) continue;
      if (!rule.pierce) {
        burst(c, targets, events);
        return true;
      }
      c.hit.add(t);
      strike(t, events);
    }
    if (solidPoint(area, c.x, c.y)) {
      if (rule.pierce) return false;
      burst(c, targets, events);
      return true;
    }
    return c.age < LIFETIME && c.x > view.x0 - 8 && c.x < view.x1 + 8 && c.y > -8 && c.y < area.height + 8;
  });
  casts.splice(0, casts.length, ...keep);
  return events;
}

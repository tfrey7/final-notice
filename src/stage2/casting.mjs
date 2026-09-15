// The enchantments: the aim rules, each spell's pattern and every cast in flight. Pure.
import { solidPoint } from './physics.mjs';

export const MAX_CASTS = 3;
export const COOLDOWN = 12;
export const LIFETIME = 90;
export const FREEZE = 120;

// Tim's ruling of 2026-09-13: Ward's seal pierces, Mercer's is slower and bursts on contact.
export const AUDITORS = {
  ward: { speed: 4, pierce: true, radius: 0, burstFrames: 0 },
  mercer: { speed: 2.5, pierce: false, radius: 20, burstFrames: 12 },
};

// The pickups' spells. A spread volley, a lob or a ribbon counts as one of the three casts out.
export const SPELLS = {
  carbonCopy: { kind: 'paper', speed: 3.5, pierce: false, radius: 0, burstFrames: 0, life: 60, spread: 0.3, cooldown: 16 },
  redTape: { kind: 'tape', speed: 5, pierce: false, radius: 0, burstFrames: 0, life: 18, freeze: FREEZE, cooldown: 20 },
  margin: { kind: 'page', speed: 2.5, pierce: false, radius: 28, burstFrames: 18, life: LIFETIME, gravity: 0.2, lift: 3.2, breaksLocks: true, cooldown: 30 },
};

export const cooldownOf = (spell) => SPELLS[spell]?.cooldown ?? COOLDOWN;

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

let volleys = 0;
const outCount = (casts) => new Set(casts.map((c) => c.volley)).size;

// Adds a seal if fewer than three casts are out. Answers it, or null.
export function spawnCast(casts, auditor, x, y, dir) {
  return spawnSpell(casts, 'notice', auditor, x, y, dir)?.[0] ?? null;
}

// Casts the spell in hand. Answers the new casts, or null when three are already out.
export function spawnSpell(casts, spell, auditor, x, y, dir, facing = 1) {
  if (outCount(casts) >= MAX_CASTS) return null;
  const rule = SPELLS[spell] ?? AUDITORS[auditor];
  const kind = SPELLS[spell] ? rule.kind : 'seal';
  const [dx, dy] = DIRS[dir];
  const volley = ++volleys;
  const make = (vx, vy) => ({ kind, spell, auditor, rule, dir, volley, x: x + dx * 8, y: y + dy * 8, vx, vy, age: 0, hit: new Set() });
  let out;
  if (kind === 'paper') {
    const a = Math.atan2(dy, dx);
    out = [-rule.spread, 0, rule.spread].map((s) => make(Math.cos(a + s) * rule.speed, Math.sin(a + s) * rule.speed));
  } else if (kind === 'page') {
    const side = Math.sign(dx) || facing;
    out = [make(side * rule.speed, dy > 0 ? 1 : -rule.lift + dy * 1.5)];
  } else {
    out = [make(dx * rule.speed, dy * rule.speed)];
  }
  casts.push(...out);
  return out;
}

const PAD = 3;
const inBox = (c, t) => c.x > t.x - t.w / 2 - PAD && c.x < t.x + t.w / 2 + PAD && c.y > t.y - t.h - PAD && c.y < t.y + PAD;
const inBurst = (c, t) => Math.hypot(Math.max(Math.abs(c.x - t.x) - t.w / 2, 0), Math.max(Math.abs(c.y - (t.y - t.h / 2)) - t.h / 2, 0)) <= c.rule.radius;

// A wax lock shrugs off everything but Margin of Error's sigil, which breaks it outright.
function strike(target, events, c) {
  if (target.hp <= 0) return;
  if (target.lock && !c.rule.breaksLocks) {
    events.push({ type: 'clink', target });
    return;
  }
  target.hp = target.lock ? 0 : target.hp - 1;
  target.flash = 6;
  events.push({ type: target.hp <= 0 ? 'break' : 'hit', target });
}

// Red Tape binds a foe or box for 2 s; a glyph it touches is simply cut down.
function bind(target, events, c) {
  if (target.glyph || target.lock) return strike(target, events, c);
  target.frozen = c.rule.freeze;
  events.push({ type: 'freeze', target });
}

function burst(c, targets, events) {
  Object.assign(c, { kind: 'burst', vx: 0, vy: 0, age: 0 });
  if (c.spell === 'margin') events.push({ type: 'sigil', x: c.x, y: c.y });
  for (const t of targets) if (inBurst(c, t)) strike(t, events, c);
}

// One frame of every cast against the area and the targets, inside the view [x0, x1). Answers the events.
export function stepCasts(casts, area, targets, view = { x0: 0, x1: area.width }) {
  const events = [];
  const keep = casts.filter((c) => {
    c.age += 1;
    const { rule } = c;
    if (c.kind === 'burst') return c.age < rule.burstFrames;
    if (rule.gravity) c.vy += rule.gravity;
    c.x += c.vx;
    c.y += c.vy;
    for (const t of targets) {
      if (t.hp <= 0 || c.hit.has(t) || !inBox(c, t)) continue;
      if (rule.radius) {
        burst(c, targets, events);
        return true;
      }
      c.hit.add(t);
      if (c.kind === 'tape') bind(t, events, c);
      else strike(t, events, c);
      if (!rule.pierce) return false;
    }
    if (solidPoint(area, c.x, c.y)) {
      if (!rule.radius) return false;
      burst(c, targets, events);
      return true;
    }
    return c.age < (rule.life ?? LIFETIME) && c.x > view.x0 - 8 && c.x < view.x1 + 8 && c.y > -8 && c.y < area.height + 8;
  });
  casts.splice(0, casts.length, ...keep);
  return events;
}

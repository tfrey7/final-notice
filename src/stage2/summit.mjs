// The Records Custodian at the top of the Archive climb, Stage 2's boss. Pure rules on Stage 2's run: he
// closes in, then telegraphs one of three attacks. The mop sweep hits low in front of him and can be met
// with the Objection parry (L), which sends him reeling and doubles every seal that lands while he reels;
// the cart charge runs the arena and is jumped; the paper storm drops sheets that are dodged or cut down.
// He is guarded (seals clink) while he winds up, attacks or roars. At half health he roars and fights
// faster from a longer loop. Beaten, the stage is clear.
import { stagger } from './casting.mjs';
import { HEALTH, INVULN } from './player.mjs';

// Pairs are [first half, second half]; times are frames.
export const CUSTODIAN = {
  hp: 24, phaseAt: 12, damage: 2, w: 20, h: 40, stand: 30, speed: [0.6, 0.9], rest: [60, 36],
  sweepTell: [34, 22], sweepActive: 6, sweepReach: 40, sweepRecover: [44, 30],
  parryWindow: 12, parryCooldown: 30, reel: 90,
  chargeTell: [40, 26], chargeSpeed: [3, 4.5], chargeRecover: [50, 34], cartW: 18, cartH: 14,
  paperTell: [30, 20], paperCount: [3, 5], paperSpeed: [1.5, 2], paperRecover: [30, 24], paperFrom: 110,
  roar: 60,
};

export const LOOPS = { 1: ['sweep', 'charge', 'paper'], 2: ['sweep', 'paper', 'charge', 'sweep'] };
export const PAPER = { w: 10, h: 10 };

const GUARDED = ['tell', 'sweep', 'charge', 'paper', 'roar'];

const at = (b, t, key) => (Array.isArray(t[key]) ? t[key][b.phase - 1] : t[key]);

// `arena` is { x0, x1, y }: the walls he keeps between and the floor he stands on.
export function createCustodian(arena, t = CUSTODIAN) {
  return {
    kind: 'custodian', boss: true, x: arena.x1 - 24, y: arena.y, w: t.w, h: t.h, hp: t.hp, maxHp: t.hp,
    facing: -1, phase: 1, state: 'rest', timer: at({ phase: 1 }, t, 'rest'), attack: null, loop: 0,
    guard: false, flash: 0, frozen: 0, vx: 0, landed: false, arena, papers: [], beaten: false,
  };
}

export const cartBox = (b, t = CUSTODIAN) => ({ x: b.x + b.facing * (b.w / 2 + t.cartW / 2), y: b.y, w: t.cartW, h: t.cartH });
export const sweepBox = (b, t = CUSTODIAN) => ({ x: b.x + b.facing * (b.w / 2 + t.sweepReach / 2), y: b.y, w: t.sweepReach, h: 16 });

const overlaps = (a, p) => Math.abs(a.x - p.x) < (a.w + p.w) / 2 && a.y - a.h < p.y && p.y - p.h < a.y;

function hurt(p, damage, events) {
  if (p.invuln > 0) return false;
  p.health -= damage;
  p.invuln = INVULN;
  events.push({ type: 'hurt' });
  if (p.health <= 0) {
    p.health = HEALTH;
    events.push({ type: 'lifeLost' });
  }
  return true;
}

const set = (b, state, timer) => Object.assign(b, { state, timer });

// The auditor's Objection parry: L opens a short window, then a cooldown before the next.
export function stepParry(p, pad, t = CUSTODIAN) {
  p.parry = Math.max(0, (p.parry ?? 0) - 1);
  p.parryCool = Math.max(0, (p.parryCool ?? 0) - 1);
  if (!pad.pressed.has('l') || p.parryCool > 0) return false;
  Object.assign(p, { parry: t.parryWindow, parryCool: t.parryCooldown });
  return true;
}

function begin(b, p, t, events) {
  const loop = LOOPS[b.phase];
  b.attack = loop[b.loop++ % loop.length];
  b.facing = Math.sign(p.x - b.x) || b.facing;
  events.push({ type: 'telegraph', attack: b.attack });
  set(b, 'tell', at(b, t, `${b.attack}Tell`));
}

function unleash(b, p, t, events) {
  if (b.attack === 'sweep') return set(b, 'sweep', t.sweepActive);
  if (b.attack === 'charge') {
    b.vx = b.facing * at(b, t, 'chargeSpeed');
    b.landed = false;
    events.push({ type: 'charge' });
    return set(b, 'charge', 0);
  }
  const n = at(b, t, 'paperCount');
  const { x0, x1, y } = b.arena;
  for (let i = 0; i < n; i++) {
    const x = i === 0 ? p.x : x0 + 8 + ((i - 1 + 0.5) / Math.max(1, n - 1)) * (x1 - x0 - 16);
    b.papers.push({ glyph: true, paper: true, x, y: y - t.paperFrom - i * 18, ...PAPER, hp: 1, flash: 0 });
  }
  events.push({ type: 'paper', count: n });
  return set(b, 'paper', 12);
}

function stepPapers(b, p, t, events) {
  const speed = at(b, t, 'paperSpeed');
  for (const s of b.papers) {
    s.y += speed;
    if (s.hp > 0 && overlaps(s, p) && hurt(p, 1, events)) s.hp = 0;
  }
  b.papers = b.papers.filter((s) => s.hp > 0 && s.y < b.arena.y);
}

// One frame of the fight, after the run has stepped (so this frame's seal hits are in `run.events`).
// Answers the events.
export function stepCustodian(b, run, t = CUSTODIAN) {
  const events = [];
  const p = run.player;
  b.flash = Math.max(0, b.flash - 1);
  b.frozen = 0;
  if (b.beaten) return events;
  if (b.state === 'reel') {
    const extra = run.events.filter((e) => e.type === 'hit' && e.target === b).length;
    b.hp -= extra;
  }
  if (b.hp <= 0) {
    Object.assign(b, { beaten: true, guard: false, vx: 0, papers: [], state: 'beaten' });
    events.push({ type: 'bossDown' });
    return events;
  }
  stepPapers(b, p, t, events);
  const { x0, x1 } = b.arena;
  const hw = b.w / 2;
  stagger(b, (x) => x >= x0 + hw && x <= x1 - hw);

  if (b.phase === 1 && b.hp <= t.phaseAt && !['tell', 'sweep', 'charge'].includes(b.state)) {
    Object.assign(b, { phase: 2, loop: 0, vx: 0, papers: [] });
    events.push({ type: 'phase' });
    set(b, 'roar', t.roar);
  }

  switch (b.state) {
    case 'rest': {
      const side = Math.sign(b.x - p.x) || 1;
      const goal = Math.max(x0 + hw, Math.min(x1 - hw, p.x + side * t.stand));
      b.x += Math.sign(goal - b.x) * Math.min(Math.abs(goal - b.x), at(b, t, 'speed'));
      b.facing = Math.sign(p.x - b.x) || b.facing;
      if (--b.timer <= 0) begin(b, p, t, events);
      break;
    }
    case 'tell':
      if (--b.timer <= 0) unleash(b, p, t, events);
      break;
    case 'sweep':
      if (b.timer === t.sweepActive && overlaps(sweepBox(b, t), p)) {
        if (p.parry > 0) {
          p.parry = 0;
          b.flash = 8;
          events.push({ type: 'parry' });
          run.hitStop = Math.max(run.hitStop ?? 0, 8);
          set(b, 'reel', t.reel);
          break;
        }
        hurt(p, t.damage, events);
      }
      if (--b.timer <= 0) set(b, 'recover', at(b, t, 'sweepRecover'));
      break;
    case 'charge': {
      const x = Math.max(x0 + hw, Math.min(x1 - hw, b.x + b.vx));
      const wall = x !== b.x + b.vx;
      b.x = x;
      if (!b.landed && overlaps(cartBox(b, t), p)) b.landed = hurt(p, t.damage, events);
      if (wall) {
        b.vx = 0;
        set(b, 'recover', at(b, t, 'chargeRecover'));
      }
      break;
    }
    case 'paper':
      if (--b.timer <= 0) set(b, 'recover', at(b, t, 'paperRecover'));
      break;
    case 'reel': case 'recover': case 'roar':
      if (--b.timer <= 0) set(b, 'rest', at(b, t, 'rest'));
      break;
    default:
  }
  b.guard = GUARDED.includes(b.state);
  return events;
}

export const bossBar = (b) => Array.from({ length: b.maxHp }, (_, i) => i < b.hp);

// The lab panel's dials for him: one per number, a pair split into `key1` and `key2` for each half.
export function custodianDials(t = CUSTODIAN) {
  const dial = (key, value) => {
    const step = Number.isInteger(value) ? 1 : 0.125;
    return { group: 'custodian', key, value, start: value, min: step, max: Math.max(value * 3, step * 10), step };
  };
  return Object.entries(t).flatMap(([key, v]) => (Array.isArray(v) ? v.map((x, i) => dial(`${key}${i + 1}`, x)) : [dial(key, v)]));
}

export function custodianTable(dials, base = CUSTODIAN) {
  const value = Object.fromEntries(dials.map((d) => [d.key, d.value]));
  return Object.fromEntries(Object.entries(base).map(([key, v]) => [key, Array.isArray(v) ? v.map((_, i) => value[`${key}${i + 1}`]) : value[key]]));
}

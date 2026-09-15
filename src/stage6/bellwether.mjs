// Bellwether bound to the Great Seal at the crown of the tower, the final boss. Pure rules on Stage 2's run,
// shaped like the Custodian: he closes in, then telegraphs one attack from his phase's loop. His approval
// stamp hits low in front of him and is met with the Objection parry (L), which sends him reeling and doubles
// every seal that lands while he reels; the Seal's shockwave runs the floor and is jumped; from his second
// phase wax rains from the Seal; in his third the Seal itself slams down where the auditor stood. The Seal
// shields him except in the opening after each attack and while he reels, and he roars into each new phase.
import { HEALTH, INVULN } from '../stage2/player.mjs';

// Triples are [phase 1, phase 2, phase 3]; times are frames. `phases` is the health each new phase starts at.
export const BELLWETHER = {
  hp: 30, phases: [20, 10], damage: 2, w: 20, h: 44, stand: 34, speed: [0.5, 0.7, 0.9], rest: [64, 48, 36],
  stampTell: [36, 28, 22], stampActive: 6, stampReach: 40, stampRecover: [46, 36, 28],
  parryWindow: 12, parryCooldown: 30, reel: 90,
  waveTell: [40, 32, 26], waveSpeed: [2, 2.5, 3], waveW: 12, waveH: 10, waveRecover: [40, 32, 24],
  rainTell: [30, 30, 24], rainCount: [3, 3, 5], rainSpeed: [1.5, 1.5, 2], rainFrom: 120, rainRecover: [30, 30, 24],
  slamTell: [44, 44, 44], slamActive: 8, slamW: 44, slamRecover: [40, 40, 40],
  roar: 70,
};

export const LOOPS = { 1: ['stamp', 'wave'], 2: ['stamp', 'rain', 'wave'], 3: ['slam', 'stamp', 'rain', 'wave'] };
export const PHASES = ['THE SIGNATURE', 'THE OATH', 'THE SEAL'];
export const WAX = { w: 10, h: 10 };

const GUARDED = ['rest', 'tell', 'stamp', 'slam', 'roar'];
const MID_ATTACK = ['tell', 'stamp', 'slam'];

const at = (b, t, key) => (Array.isArray(t[key]) ? t[key][b.phase - 1] : t[key]);
const set = (b, state, timer) => Object.assign(b, { state, timer });
const overlaps = (a, p) => Math.abs(a.x - p.x) < (a.w + p.w) / 2 && a.y - a.h < p.y && p.y - p.h < a.y;

// `arena` is { x0, x1, y }: the walls he keeps between and the floor he stands on.
export function createBellwether(arena, t = BELLWETHER) {
  return {
    kind: 'bellwether', boss: true, x: arena.x1 - 32, y: arena.y, w: t.w, h: t.h, hp: t.hp, maxHp: t.hp,
    facing: -1, phase: 1, state: 'rest', timer: at({ phase: 1 }, t, 'rest'), attack: null, loop: 0,
    guard: false, flash: 0, frozen: 0, arena, waves: [], drops: [], slamX: 0, beaten: false,
  };
}

export const stampBox = (b, t = BELLWETHER) => ({ x: b.x + b.facing * (b.w / 2 + t.stampReach / 2), y: b.y, w: t.stampReach, h: 16 });
export const slamBox = (b, t = BELLWETHER) => ({ x: b.slamX, y: b.arena.y, w: t.slamW, h: 48 });

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

function begin(b, p, t, events) {
  const loop = LOOPS[b.phase];
  b.attack = loop[b.loop++ % loop.length];
  b.facing = Math.sign(p.x - b.x) || b.facing;
  const { x0, x1 } = b.arena;
  if (b.attack === 'slam') b.slamX = Math.max(x0 + t.slamW / 2, Math.min(x1 - t.slamW / 2, p.x));
  events.push({ type: 'telegraph', attack: b.attack });
  set(b, 'tell', at(b, t, `${b.attack}Tell`));
}

function unleash(b, p, t, events) {
  if (b.attack === 'stamp') return set(b, 'stamp', t.stampActive);
  if (b.attack === 'slam') {
    events.push({ type: 'slam' });
    return set(b, 'slam', t.slamActive);
  }
  if (b.attack === 'wave') {
    b.waves.push({ x: b.x + b.facing * (b.w / 2), y: b.arena.y, vx: b.facing * at(b, t, 'waveSpeed'), w: t.waveW, h: t.waveH, landed: false });
    events.push({ type: 'wave' });
    return set(b, 'recover', at(b, t, 'waveRecover'));
  }
  const n = at(b, t, 'rainCount');
  const { x0, x1, y } = b.arena;
  for (let i = 0; i < n; i++) {
    const x = i === 0 ? p.x : x0 + 8 + ((i - 1 + 0.5) / Math.max(1, n - 1)) * (x1 - x0 - 16);
    b.drops.push({ glyph: true, x, y: y - t.rainFrom - i * 18, ...WAX, hp: 1, flash: 0 });
  }
  events.push({ type: 'rain', count: n });
  return set(b, 'recover', at(b, t, 'rainRecover'));
}

function stepShots(b, p, t, events) {
  const { x0, x1, y } = b.arena;
  for (const w of b.waves) {
    w.x += w.vx;
    if (!w.landed && overlaps(w, p)) w.landed = hurt(p, t.damage, events);
  }
  b.waves = b.waves.filter((w) => w.x > x0 && w.x < x1);
  const speed = at(b, t, 'rainSpeed');
  for (const d of b.drops) {
    d.y += speed;
    if (d.hp > 0 && overlaps(d, p) && hurt(p, 1, events)) d.hp = 0;
  }
  b.drops = b.drops.filter((d) => d.hp > 0 && d.y < y);
}

// One frame of the fight, after the run has stepped (so this frame's seal hits are in `run.events`).
// Answers the events.
export function stepBellwether(b, run, t = BELLWETHER) {
  const events = [];
  const p = run.player;
  b.flash = Math.max(0, b.flash - 1);
  b.frozen = 0;
  if (b.beaten) return events;
  if (b.state === 'reel') b.hp -= run.events.filter((e) => e.type === 'hit' && e.target === b).length;
  if (b.hp <= 0) {
    Object.assign(b, { beaten: true, guard: false, waves: [], drops: [], state: 'beaten' });
    events.push({ type: 'bossDown' });
    return events;
  }
  stepShots(b, p, t, events);
  const { x0, x1 } = b.arena;
  const hw = b.w / 2;

  if (b.phase < 3 && b.hp <= t.phases[b.phase - 1] && !MID_ATTACK.includes(b.state)) {
    Object.assign(b, { phase: b.phase + 1, loop: 0, waves: [], drops: [] });
    events.push({ type: 'phase', phase: b.phase });
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
    case 'stamp':
      if (b.timer === t.stampActive && overlaps(stampBox(b, t), p)) {
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
      if (--b.timer <= 0) set(b, 'recover', at(b, t, 'stampRecover'));
      break;
    case 'slam':
      if (b.timer === t.slamActive && overlaps(slamBox(b, t), p)) hurt(p, t.damage, events);
      if (--b.timer <= 0) set(b, 'recover', at(b, t, 'slamRecover'));
      break;
    case 'reel': case 'recover': case 'roar':
      if (--b.timer <= 0) set(b, 'rest', at(b, t, 'rest'));
      break;
    default:
  }
  b.guard = GUARDED.includes(b.state);
  return events;
}

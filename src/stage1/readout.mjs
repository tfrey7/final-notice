// What each fighter is doing, read off its own state fields, so a grey-box placeholder shows it in a
// single frame: a type letter, which way it faces, one look per state, and for the debug overlay its
// hit area, whether it holds an attack turn and a short tag. Pure; src/snes/readout.mjs draws it.
import { DOWNED } from './moves.mjs';
import { kindsOf } from './staff.mjs';
import { SEGMENTS, cooldownSegments, coolingReady } from '../injunction.mjs';

export const LETTER = { associate: 'A', manager: 'M', counsel: 'C', supervisor: 'S', vellum: 'V' };
export const letterOf = (f) => (f.team === 'player' ? (/2$/.test(f.id) ? 'P2' : 'P1') : LETTER[f.kind] ?? '?');

// Outline colour per look; the order of LOOKS is the order they win in when several apply.
export const LOOK_COLOUR = {
  down: 0x686870, getup: 0x60e0e0, open: 0xf0d040, hurt: 0xe04040, windup: 0xffffff,
  attack: 0xe0a040, guard: 0x5080e0, parry: 0x60b0ff, walk: 0x303038, idle: 0x18181c,
};
const ATTACKS = ['punch', 'swing', 'spray', 'throw'];
const MOVING = ['walk', 'run', 'step'];

export function readLook(f) {
  if ((DOWNED.includes(f.state) && f.state !== 'getup') || f.state === 'slumped') return 'down';
  if (f.state === 'getup' || f.invuln > 0) return 'getup';
  if (f.stagger > 0 && f.state === 'hurt') return 'open';
  if (['hurt', 'held', 'bound'].includes(f.state)) return 'hurt';
  if (f.state === 'windup') return 'windup';
  if (ATTACKS.includes(f.state) || (f.state === 'jump' && f.kicked)) return 'attack';
  if (f.state === 'guard' || f.armoured) return 'guard';
  if (f.parry > 0) return 'parry';
  return MOVING.includes(f.state) ? 'walk' : 'idle';
}

// Frames a foe's wind-up lasts: its kind's own, else the plain floor's.
const windupOf = (f, tune) => kindsOf(tune)[f.kind]?.windup ?? tune.foeWindup ?? 20;

// The whole readout for one fighter this frame.
export function readout(f, tune) {
  const look = readLook(f);
  return {
    look,
    letter: letterOf(f),
    colour: LOOK_COLOUR[look],
    tag: look === 'idle' || look === 'walk' ? f.state.toUpperCase() : look.toUpperCase(),
    windup: look === 'windup' ? Math.min(1, f.t / windupOf(f, tune)) : 0,
    openLeft: look === 'open' ? Math.max(0, f.stagger - f.t) : 0,
    blink: look === 'getup' && f.t % 8 < 4,
    shield: look === 'guard',
    weapon: f.weapon?.kind ?? null,
    hit: hitArea(f, tune),
  };
}

// The strike's reach while it can land, as a rect on the floor row: { x, y, w, h } with y the row's top.
export function hitArea(f, tune) {
  const row = (reach) => ({ x: f.facing > 0 ? f.x : f.x - reach, y: f.y - tune.depthReach, w: reach, h: tune.depthReach * 2 });
  if (f.team === 'player') {
    if (f.state === 'punch') {
      const [startup, active] = f.combo === 3 ? [tune.finisherStartup, tune.finisherActive] : [tune.punchStartup, tune.punchActive];
      return f.t > startup && f.t <= startup + active ? row(tune.punchReach) : null;
    }
    if (f.state === 'jump' && f.kicked && f.kickT <= tune.kickActive) return row(tune.punchReach);
    if (f.state === 'swing') return row(tune.punchReach);
    return null;
  }
  const k = kindsOf(tune)[f.kind];
  // A foe's blow lands on its wind-up's last frame; the area stays up a few frames so the eye catches it.
  if (f.state === 'punch' && f.t <= 6 && !k?.keep) return row(k?.reach ?? tune.punchReach);
  return null;
}

// The foes holding an attack turn: those winding up or swinging.
export const turnOwners = (world) => world.fighters.filter((f) => f.team === 'foe' && ['windup', 'punch'].includes(f.state));

// The free Injunction on the player: ready, or how many of its boxes have refilled.
export const injunctionLook = (cd) => (cd ? { ready: coolingReady(cd), lit: cooldownSegments(cd), of: SEGMENTS } : null);

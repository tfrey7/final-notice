// What each fighter is doing, read off its own state fields, so a grey-box placeholder shows it in a
// single frame: a type letter, which way it faces, one look per state, and for the debug overlay its
// hit area, whether it holds an attack turn and a short tag. Pure; src/snes/readout.mjs draws it.
import { DOWNED } from './moves.mjs';
import { ATTACKING, kindsOf } from './staff.mjs';
import { SEGMENTS, cooldownSegments, coolingReady } from '../injunction.mjs';

export const LETTER = { associate: 'A', manager: 'M', counsel: 'C', supervisor: 'S', vellum: 'V' };
// Each staff kind's standing grey box, [width, height] in SNES px, so the kind reads from its outline:
// the rusher small, the heavy wide, Counsel thin and the Supervisor a tall wall.
export const SHAPE = { associate: [18, 46], manager: [36, 56], counsel: [16, 58], supervisor: [30, 64] };
export const letterOf = (f) => (f.team === 'player' ? (/2$/.test(f.id) ? 'P2' : 'P1') : LETTER[f.kind] ?? '?');

// Outline colour per look; the order of LOOKS is the order they win in when several apply.
export const LOOK_COLOUR = {
  down: 0x686870, getup: 0x60e0e0, open: 0xf0d040, hurt: 0xe04040, windup: 0xffffff,
  attack: 0xe0a040, taunt: 0xe060e0, feint: 0x70e070, guard: 0x5080e0, parry: 0x60b0ff, walk: 0x303038, idle: 0x18181c,
};
// The word a taunting foe shows over his head, by gesture.
export const GESTURE_WORD = { beckon: 'COME ON', tie: 'TIE', slap: 'SLAP' };
const ATTACKS = ['punch', 'swing', 'spray', 'throw', 'charge', 'hold'];
const MOVING = ['walk', 'run', 'step'];

export function readLook(f) {
  if ((DOWNED.includes(f.state) && f.state !== 'getup') || f.state === 'slumped') return 'down';
  if (f.state === 'getup' || f.invuln > 0) return 'getup';
  if (f.stagger > 0 && f.state === 'hurt') return 'open';
  if (['hurt', 'held', 'bound'].includes(f.state)) return 'hurt';
  if (f.state === 'windup') return 'windup';
  if (ATTACKS.includes(f.state) || f.state === 'shove' || (f.state === 'jump' && f.kicked)) return 'attack';
  if (f.state === 'taunt' || f.state === 'feint') return f.state;
  if (f.state === 'guard' || f.armoured) return 'guard';
  if (f.parry > 0) return 'parry';
  return MOVING.includes(f.state) ? 'walk' : 'idle';
}

// Frames a foe's wind-up lasts: its move's own, else its kind's, else the plain floor's.
const windupOf = (f, tune) => f.attack?.windup ?? kindsOf(tune)[f.kind]?.windup ?? tune.foeWindup ?? 20;

// The whole readout for one fighter this frame.
export function readout(f, tune) {
  const look = readLook(f);
  return {
    look,
    letter: letterOf(f),
    colour: LOOK_COLOUR[look],
    tag: look === 'idle' || look === 'walk' || f.state === 'shove' ? f.state.toUpperCase() : look.toUpperCase(),
    gesture: look === 'taunt' ? GESTURE_WORD[f.gesture] ?? 'TAUNT' : null,
    // The attack being wound up, named over the foe's head so each one reads before it lands.
    move: look === 'windup' ? f.attack?.name?.toUpperCase() ?? null : null,
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
  const reach = f.attack?.reach ?? k?.reach ?? tune.punchReach;
  if (f.state === 'charge') return row(reach);
  if (f.state === 'punch' && f.t <= 6 && !k?.keep && !f.attack?.shot && !f.attack?.rush) return row(reach);
  return null;
}

// The foes holding an attack turn: those winding up, swinging, rushing or holding.
export const turnOwners = (world) => world.fighters.filter((f) => f.team === 'foe' && ATTACKING.includes(f.state));

// The free Injunction on the player: ready, or how many of its boxes have refilled.
export const injunctionLook = (cd) => (cd ? { ready: coolingReady(cd), lit: cooldownSegments(cd), of: SEGMENTS } : null);

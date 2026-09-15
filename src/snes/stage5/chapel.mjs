// Stage 5, the executive chapel: pews of polished walnut, a vaulted boardroom and the high altar
// where the board swears its oaths. Four areas and six locks of all four staff kinds at their
// toughest, a first-aid box in the vestry, and its twist: two rooms hold a ritual. While any altar-desk
// in the locked room stands, every foe in it is anointed, mending his wounds and swinging again twice
// as soon, until the auditor punches the altars to splinters.
import { CHECKPOINTS } from '../../flow.mjs';
import { DOWNED } from '../../stage1/moves.mjs';
import { SCREEN_W } from '../../stage1/player.mjs';
import { STAGE1 } from '../../stage1/tuning.mjs';
import { armWorld, defaultWeapons, scaledWeapons } from '../../stage1/weapons.mjs';
import { registerTuning } from '../../tune.mjs';

const a = 'associate';
const m = 'manager';
const c = 'counsel';
const s = 'supervisor';

// `tough` grows every chapel foe's health once, as he walks on; an anointed foe mends one point
// every `mendFrames` and his attack cooldown runs down `haste` frames faster.
export const RITUAL = registerTuning('chapel', { tough: 1.25, mendFrames: 144, haste: 0.325 });

// A lock's `altars` stand on its screen, x from that screen's left edge.
export const CHAPEL = [
  {
    id: 'narthex', screens: 2,
    locks: [
      { screen: 0, seats: 3, waves: [{ foes: [a, a] }, { foes: [a, m] }] },
      { screen: 1, seats: 4, waves: [{ foes: [c, a, a] }, { foes: [s, a] }] },
    ],
    props: [{ kind: 'chair', x: 300, y: 190 }],
  },
  {
    id: 'nave', screens: 2,
    locks: [
      { screen: 0, seats: 4, waves: [{ foes: [m, a, c] }] },
      { screen: 1, seats: 4, altars: [{ x: 70, y: 176 }, { x: 190, y: 184 }], waves: [{ foes: [a, s, a] }, { foes: [c, m] }] },
    ],
    props: [{ kind: 'briefcase', x: 180, y: 200 }],
  },
  {
    id: 'vestry', screens: 1,
    locks: [{ screen: 0, seats: 4, waves: [{ foes: [s, c, a, a] }] }],
    props: [{ kind: 'post', x: 200, y: 180 }],
    firstAid: { x: 150, y: 194 },
  },
  {
    id: 'sanctum', screens: 1,
    locks: [{ screen: 0, seats: 4, altars: [{ x: 50, y: 172 }, { x: 128, y: 168 }, { x: 206, y: 172 }], waves: [{ foes: [s, m, c, a] }, { foes: [m, s, a] }] }],
    props: [],
  },
];

export const SNES_STAGE5 = { areas: CHAPEL, entry: 'edges', checkpoints: CHECKPOINTS.stage5, end: 'stageExit' };

// Every altar-desk on the floor, placed from the stage's area starts; a broken one drops an APPROVED stamp.
export const chapelAltars = (starts) => CHAPEL.flatMap((area, i) => area.locks.flatMap((lock, n) => (lock.altars ?? [])
  .map((o, k) => ({ id: `altar${i}-${n}-${k}`, kind: 'altar', x: starts[i] + lock.screen * SCREEN_W + o.x, y: o.y, drop: 'stamp' }))));

export const armChapel = (world) => armWorld(world, chapelAltars(world.stage.starts), scaledWeapons(defaultWeapons(), STAGE1.scale));

export const altarsInView = (world) => (world.smash ?? []).filter((o) => o.kind === 'altar' && o.state === 'standing'
  && o.x >= world.cameraX && o.x < world.cameraX + SCREEN_W);

// After stepAreas each frame: the ritual is lit while the room is locked and an altar in it stands.
export function stepRitual(world, tune, ritual = RITUAL) {
  const lit = Boolean(world.run?.locked) && altarsInView(world).length > 0;
  if (lit !== Boolean(world.ritual)) world.events.push(lit ? 'ritual' : 'ritualBroken');
  world.ritual = lit;
  world.ritualT = lit ? (world.ritualT ?? 0) + 1 : 0;
  for (const f of world.fighters) {
    if (!f.kind || f.team === 'player') continue;
    if (!f.ordained) Object.assign(f, { ordained: true, hp: Math.ceil(f.hp * ritual.tough), maxHp: Math.ceil(f.maxHp * ritual.tough) });
    f.anointed = lit && f.hp > 0 && !DOWNED.includes(f.state);
    if (!f.anointed) continue;
    if (f.cooldown > 0) f.cooldown = Math.max(0, f.cooldown - ritual.haste);
    if (world.ritualT % ritual.mendFrames === 0 && f.hp < f.maxHp) f.hp++;
  }
  return world;
}

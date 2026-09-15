// Stage 3, the Backrooms (the middle floors, docs/SNES-DESCENT.md): damp carpet and the same room
// over and over. Four areas and seven locks mixing all four staff kinds, a first-aid box before the
// last fights, and its twist: the corridor folds, so walking out of the cleared break room brings the
// auditor back in at its near door, twice, to fresh staff. A `fold` lock is that same room again.
import { CHECKPOINTS } from '../../flow.mjs';

const a = 'associate';
const m = 'manager';
const c = 'counsel';
const s = 'supervisor';

export const BACKROOMS = [
  {
    id: 'stairwell', screens: 2,
    locks: [
      { screen: 0, seats: 3, waves: [{ foes: [a, a] }, { foes: [a, m] }] },
      { screen: 1, seats: 4, waves: [{ foes: [c, a, a] }] },
    ],
    props: [{ kind: 'chair', x: 300, y: 190 }],
  },
  {
    id: 'breakRoom', screens: 1,
    locks: [
      { screen: 0, seats: 4, waves: [{ foes: [a, s, a] }] },
      { screen: 0, seats: 4, fold: true, waves: [{ foes: [m, a, c] }] },
      { screen: 0, seats: 4, fold: true, waves: [{ foes: [s, a, c, m] }] },
    ],
    props: [{ kind: 'briefcase', x: 180, y: 200 }],
  },
  {
    id: 'copyRoom', screens: 2,
    locks: [{ screen: 1, seats: 4, waves: [{ foes: [m, a, a] }, { foes: [s, c] }] }],
    props: [{ kind: 'post', x: 360, y: 180 }],
    firstAid: { x: 150, y: 194 },
  },
  {
    id: 'exitDoor', screens: 1,
    locks: [{ screen: 0, seats: 4, waves: [{ foes: [s, m, c, a] }] }],
    props: [],
  },
];

export const SNES_STAGE3 = { areas: BACKROOMS, entry: 'edges', checkpoints: CHECKPOINTS.stage3, end: 'stageExit' };

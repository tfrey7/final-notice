// Stage 1's waves on the SNES, fuller than the NES's (Final Fight's first stage runs about thirty
// foes): the same four areas, screens, props and first aid as src/stage1/areas.mjs, with its own
// wave script, four seats wherever the fight is past Reception's teaching, and every foe walking on
// from beyond the screen's edges.
import { AREAS } from '../../stage1/areas.mjs';

const a = 'associate';
const m = 'manager';
const c = 'counsel';
const s = 'supervisor';

const LOCKS = {
  reception: [
    { screen: 0, seats: 2, waves: [{ prompt: 'PUNCH', foes: [a] }, { prompt: 'STEP', foes: [a, a] }] },
    { screen: 1, seats: 4, waves: [{ prompt: 'THROW', foes: [a, a] }, { foes: [a, a] }] },
  ],
  serviceFloor: [
    { screen: 1, seats: 4, waves: [{ foes: [a, a, a] }, { foes: [a, a, m, a] }] },
    { screen: 2, seats: 4, waves: [{ foes: [m, a, a] }, { foes: [m, a, m] }] },
  ],
  internalReview: [
    { screen: 0, seats: 4, waves: [{ foes: [c, a, a] }] },
    { screen: 1, seats: 4, waves: [{ foes: [a, s, a] }, { foes: [c, a] }] },
  ],
  waiting: [
    { screen: 0, seats: 4, waves: [{ foes: [a, m, a, s] }] },
  ],
};

export const SNES_AREAS = AREAS.map((area) => ({ ...area, locks: LOCKS[area.id] }));

export const SNES_STAGE1 = { areas: SNES_AREAS, entry: 'edges' };

export const foeCount = (areas) => areas.flatMap((area) => area.locks.flatMap((l) => l.waves.flatMap((w) => w.foes))).length;

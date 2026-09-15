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
    // The lift ambush (src/stage1/beats.mjs) is this room's second pack now, so the table's own is out.
    { screen: 1, seats: 4, waves: [{ foes: [a, a, a] }] },
    // and the copy room's miniboss is this one's second pack.
    { screen: 2, seats: 4, waves: [{ foes: [m, a, a] }] },
  ],
  internalReview: [
    { screen: 0, seats: 4, waves: [{ foes: [c, a, a] }] },
    { screen: 1, seats: 4, waves: [{ foes: [a, s, a] }, { foes: [c, a] }] },
  ],
  waiting: [
    { screen: 0, seats: 4, waves: [{ foes: [a, m, a, s] }] },
  ],
};

// A second first-aid box halfway, between the Service Floor's managers and Internal Review's counsel.
const FIRST_AID = { internalReview: { x: 120, y: 196 } };

export const SNES_AREAS = AREAS.map((area) => ({ ...area, locks: LOCKS[area.id], firstAid: FIRST_AID[area.id] ?? area.firstAid }));

export const SNES_STAGE1 = { areas: SNES_AREAS, entry: 'edges' };

export const foeCount = (areas) => areas.flatMap((area) => area.locks.flatMap((l) => l.waves.flatMap((w) => w.foes))).length;

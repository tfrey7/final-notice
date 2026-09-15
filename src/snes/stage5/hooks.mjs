// Stage 5, the executive chapel: what the shared brawl scene needs to play this floor. Its
// altar-desks are furniture (`arm`) and its ritual runs after the areas (`step`); its boss and any
// floor of its own go here, not in Stage 1's scene. The grey box borrows Stage 1's rooms for now.
import { CHECKPOINTS } from '../../flow.mjs';
import CLAIMS from '../bg/claims.mjs';
import CLAIMS2 from '../bg/claims2.mjs';
import { SNES_STAGE5, armChapel, stepRitual } from './chapel.mjs';
import { STAGE5_BEATS, armBeats, stepBeats } from '../../stage1/beats.mjs';

// The chapel keeps the same rhythm over its ritual: altar-desks to break, the rose window blowing
// in, the celebrant alone at the altar, and the vestry doors opening down both sides of the aisle.
export const STAGE5_DEF = {
  number: 5,
  table: SNES_STAGE5,
  checkpoints: CHECKPOINTS.stage5,
  backgrounds: [CLAIMS2.areas[0], CLAIMS2.areas[1], CLAIMS.areas[1], CLAIMS2.areas[2]],
  arm: (world) => armBeats(armChapel(world), STAGE5_BEATS),
  step: (world, tune) => stepBeats(stepRitual(world, tune) ?? world, tune),
};

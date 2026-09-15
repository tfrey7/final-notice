// Stage 3, the Backrooms: what the shared brawl scene needs to play this floor — its waves, its
// checkpoints and its rooms. Its boss and any floor of its own go here, not in Stage 1's scene.
// The grey box borrows Stage 1's rooms until the Backrooms art lands; its break room is one screen.
import { CHECKPOINTS } from '../../flow.mjs';
import CLAIMS2 from '../bg/claims2.mjs';
import RECEPTION from '../bg/reception.mjs';
import { SNES_STAGE3 } from './waves.mjs';
import { STAGE3_BEATS, armBeats, stepBeats } from '../../stage1/beats.mjs';

// The Backrooms keep Stage 1's rhythm: a beat every two or three packs, never the same kind twice
// running. Its pace beats are its own — the lights failing in a room already cleared, a trolley and
// crates by the break-room door, and the exit door opening the wrong way.
export const STAGE3_DEF = {
  number: 3,
  table: SNES_STAGE3,
  checkpoints: CHECKPOINTS.stage3,
  backgrounds: [RECEPTION, CLAIMS2.areas[1], CLAIMS2.areas[0], CLAIMS2.areas[1]],
  arm: (world) => armBeats(world, STAGE3_BEATS),
  step: stepBeats,
};

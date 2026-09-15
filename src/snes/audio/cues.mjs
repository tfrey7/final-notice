// Which SNES cue plays where along the descent (docs/SNES-DESCENT.md §4). Disposal Line and the Great
// Seal are the gothic cosmic band; Scene 3 carries the Seal's drone.

import { AREAS, areaAt } from '../../stage2/areas.mjs';

export const SEAL_SONG = 'seal';
export const SCENE3_SONG = 'scene3';
export const DISPOSAL_AREA = AREAS.findIndex((a) => a.name === 'disposalLine');

export const stage2Song = (x) => (areaAt(x) >= DISPOSAL_AREA ? 'disposal' : 'stage2');

// Which SNES cue plays where along the descent (docs/SNES-DESCENT.md §4). Disposal Line and the Great
// Seal are the gothic cosmic band; Scene 3 carries the Seal's drone.

import { AREAS, areaAt } from '../../stage2/areas.mjs';

export const SEAL_SONG = 'seal';
export const SCENE3_SONG = 'scene3';
export const DISPOSAL_AREA = AREAS.findIndex((a) => a.name === 'disposalLine');

// Vellum's duel theme, and its faster pinch once he is down to a third of his health.
export const VELLUM_SONG = 'vellum';
export const VELLUM_PINCH = 'vellum-pinch';
export const vellumPinch = (hp, maxHp) => hp > 0 && hp * 3 <= maxHp;

// Bellwether's final boss theme: one song per phase, each harder than the last.
export const BELLWETHER_SONGS = ['bellwether', 'bellwether-2', 'bellwether-3'];
export const bellwetherSong = (phase) => BELLWETHER_SONGS[Math.min(Math.max(phase, 1), 3) - 1];

// The escape climb up the Archive ahead of the paper flood.
export const ARCHIVE_CLIMB_SONG = 'archive-climb';

// Stage 4's climb up the express elevator shaft ahead of the runaway car.
export const SHAFT_SONG = 'shaft';

export const stage2Song =(x) => (areaAt(x) >= DISPOSAL_AREA ? 'disposal' : 'stage2');

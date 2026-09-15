// Scene 3, the break room at descent 100 (docs/SNES-DESCENT.md §1, §4): the story-scene cue, sincere
// corporate wave, with the Great Seal's drone held under it at the edge of hearing. The drone is the
// Seal's organ-register strings on a low C, the Seal's key, retaken every four bars; it takes the hats'
// voice. The ending cue carries no drone, so it stops on the walk out.

import scene, { BAR_ROWS, FORM } from './scene.mjs';
import { bars } from './chase-kit.mjs';
import { vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export { BAR_ROWS, FORM, LOOP_BAR } from './scene.mjs';
export const DRONE = 'C2';

const HOLD = Array(BAR_ROWS - 1).fill('-').join(' ');
const v8 = FORM.map((_, i) => (i % 4 === 0 ? `${DRONE}:drone ${HOLD}` : `- ${HOLD}`));

const { chat, ohat, ...instruments } = scene.instruments;

export default {
  ...scene,
  instruments: {
    ...instruments,
    drone: { ...INSTRUMENTS.strings, adsr: [9, 7, 7, 0], vol: 20, pan: 0, pitch: vibrato(0.08, 70) },
  },
  v8: { rows: bars(v8, BAR_ROWS) },
};

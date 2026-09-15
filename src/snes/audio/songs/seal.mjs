// The Great Seal: the boss material in the gothic cosmic band (docs/SNES-DESCENT.md §4). The brass lead,
// string counter, driving bass and kit stay; the choir and pad give way to strings held in the organ
// register and a tubular bell tolling every downbeat. The intro's second bar quotes the title hook,
// moved to C minor, on the bell: the one corporate thing left.
//
// v1 brass lead | v2 strings counter-melody | v3 organ-register strings | v4 tubular bell | v5 synth
// bass | v6 kick | v7 snare and fills | v8 hats

import boss, { BAR_ROWS, FORM } from './boss.mjs';
import { bars, rest, voice } from './chase-kit.mjs';
import { vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export { BAR_ROWS, FORM, LOOP_BAR } from './boss.mjs';

export const QUOTE_BAR = 1;
export const QUOTE = 'G4:bell - C5:bell - Eb5:bell - - D5:bell - - C5:bell - B4:bell - G4:bell -';

const HELD = (letter) => [letter, ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const R = rest(BAR_ROWS);

const v3 = FORM.map((b) => voice('R - - - - - - - U - - - - - - -', b.c, 'organ', 12));
const v4 = FORM.map((b, i) => {
  if (i === QUOTE_BAR) return QUOTE;
  if (b.part === 'intro' && b.bar === 0) return R;
  return voice(HELD('O'), b.c, 'toll', 12);
});

export default {
  ...boss,
  echo: { mvol: 34, evol: 32, efb: 84, edl: 6, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    lead: { ...boss.instruments.lead, pitch: vibrato(0.3, 14, 12) },
    counter: boss.instruments.counter,
    organ: { ...INSTRUMENTS.strings, adsr: [13, 7, 7, 1], vol: 58, pan: -30, pitch: vibrato(0.05, 40) },
    toll: { ...INSTRUMENTS.bell, vol: 64, pan: 20 },
    bell: { ...INSTRUMENTS.bell, vol: 88, pan: 10 },
    bass: boss.instruments.bass,
    kick: boss.instruments.kick,
    snare: boss.instruments.snare,
    roll: boss.instruments.roll,
    chat: boss.instruments.chat,
    ohat: boss.instruments.ohat,
  },
  v3: { rows: bars(v3, BAR_ROWS) },
  v4: { rows: bars(v4, BAR_ROWS) },
};

// Disposal Line: the Stage 2 chase material in the gothic cosmic band (docs/SNES-DESCENT.md §4), slowed
// to the boss's drive. The Rhodes and square arpeggios and the pads are gone: strings in the organ
// register hold the chords, a tubular bell tolls every downbeat, and the intro's third bar quotes the
// title hook in C minor on the bell.
//
// v1 brass lead | v2 strings a third below | v3 organ-register strings | v4 tubular bell | v5 synth bass
// | v6 kick | v7 snare and tom fill | v8 hats

import { FORM, LOOP_BAR, SCALE } from '../../../audio/songs/stage2.mjs';
import { voice } from './chase-kit.mjs';
import { REST, chord, tag, thirdBelow, pitchClasses, transpose, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';
import { QUOTE } from './seal.mjs';

export { FORM, LOOP_BAR };
export const BAR_ROWS = 16;
export const QUOTE_BAR = 2;

const LEADS = FORM.map((b) => transpose(b.lead, b.shift));
const mapNotes = (rows, fn) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? fn(t) : t)).join(' ');
const HELD = (letter) => [letter, ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const quiet = (b, i) => b.part === 'intro' && i < 2;

const v1 = LEADS.map((bar) => tag(bar, 'brass'));
const v2 = FORM.map((b, i) => (b.part === 'intro' || b.part === 'breakdown'
  ? REST
  : mapNotes(LEADS[i], (t) => `${thirdBelow(t, pitchClasses(SCALE, b.shift))}:strings`)));
const v3 = FORM.map((b) => voice('R - - - - - - - F - - - - - - -', chord(b.symbol, b.shift), 'organ', 12));
const v4 = FORM.map((b, i) => {
  if (i === QUOTE_BAR) return QUOTE;
  return quiet(b, i) ? REST : voice(HELD('O'), chord(b.symbol, b.shift), 'toll', 12);
});

const BASS = {
  drive: 'R R O R R R O R R R O R R O F O',
  turn: 'R O R O F O F O S O S O O - R -',
  half: 'R - - - R - - - R - - - F - S -',
};
const v5 = FORM.map((b) => voice(b.last ? BASS.turn : b.part === 'breakdown' ? BASS.half : BASS.drive, chord(b.symbol, b.shift), 'bass'));

const DRUMS = {
  groove: 'K . . . S . . . K . K . S . . K',
  fill: 'K . . . S . . . C4:snare Bb3:snare A3:snare G3:snare F3:snare . F3:snare .',
  half: 'K . . . . . . . S . . . . . . .',
};
const drumBar = (b, i) => (quiet(b, i) ? null : b.last || (b.part === 'intro' && i === 3) ? DRUMS.fill : b.part === 'breakdown' ? DRUMS.half : DRUMS.groove);
const lane = (b, i, keep) => {
  const bar = drumBar(b, i);
  if (!bar) return REST;
  return bar.split(' ').map((t) => {
    if (t === 'K') return keep === 'kick' ? 'C4:kick' : '.';
    if (t === 'S') return keep === 'snare' ? 'C4:snare' : '.';
    if (t.endsWith(':snare')) return keep === 'snare' ? t : '.';
    return t;
  }).join(' ');
};
const v6 = FORM.map((b, i) => lane(b, i, 'kick'));
const v7 = FORM.map((b, i) => lane(b, i, 'snare'));
const v8 = FORM.map((b, i) => (quiet(b, i) || b.part === 'breakdown'
  ? REST
  : 'C4:chat . C4:chat . C4:chat . C4:chat . C4:chat . C4:chat . C4:chat . C4:ohat -'));

const join = (list) => list.join(' | ');

export default {
  tempo: 7,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 34, evol: 30, efb: 80, edl: 6, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    brass: { ...INSTRUMENTS.brass, adsr: [13, 3, 6, 6], vol: 112, pan: -8, pitch: vibrato(0.3, 14, 12) },
    strings: { ...INSTRUMENTS.strings, vol: 56, pan: 34, pitch: vibrato(0.15, 16, 20) },
    organ: { ...INSTRUMENTS.strings, adsr: [13, 7, 7, 1], vol: 56, pan: -30, pitch: vibrato(0.05, 40) },
    toll: { ...INSTRUMENTS.bell, vol: 60, pan: 20 },
    bell: { ...INSTRUMENTS.bell, vol: 88, pan: 10 },
    bass: { ...INSTRUMENTS.synbass, adsr: [15, 6, 3, 22], vol: 96 },
    kick: { ...INSTRUMENTS.gkick, vol: 100 },
    snare: { ...INSTRUMENTS.gsnare, vol: 96 },
    chat: { ...INSTRUMENTS.chat, vol: 44 },
    ohat: { ...INSTRUMENTS.ohat, vol: 38 },
  },
  v1: { rows: join(v1) },
  v2: { rows: join(v2) },
  v3: { rows: join(v3) },
  v4: { rows: join(v4) },
  v5: { rows: join(v5) },
  v6: { rows: join(v6) },
  v7: { rows: join(v7) },
  v8: { rows: join(v8) },
};

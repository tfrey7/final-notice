// Stage 2 chase, sketch B: written from scratch, not the NES tune. E minor in an unhurried 12/8 at
// about 133 bpm, Castlevania III's gothic side as a song: a soaring string lead, brass answering in a
// counter-line, a held bass, pad and choir sustaining the chords, a deep echo.
//
// v1 string lead | v2 pad, right | v3 choir, left | v4 synth bass | v5 kick |
// v6 snare and tom fill | v7 hats | v8 brass counter-line

import { bars, hats, rest, triad, voice } from './chase-kit.mjs';
import { tag, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 12;
const R = rest(BAR_ROWS);

// Bar 0 is the intro; 1-8 the verse, 9-10 the turnaround back to bar 1.
export const CHORDS = ['Em', 'Em', 'C', 'Am', 'B7', 'Em', 'C', 'D', 'B7', 'C', 'B7'];
const part = (i) => (i === 0 ? 'intro' : i <= 8 ? 'verse' : 'turn');

export const LEAD = [
  R,
  'E5 - - - - - B4 - - E5 - F#5',
  'G5 - - - - - F#5 - - E5 - G5',
  'A5 - - - - - C6 - - B5 - A5',
  'B5 - - - - - - - - D#5 - F#5',
  'E5 - - - - - B4 - - E5 - F#5',
  'G5 - - - - - A5 - - B5 - C6',
  'D6 - - - - - C6 - - B5 - A5',
  'B5 - - - - - D#6 - - F#6 - -',
  'E5 - G5 - B5 - C6 - E6 - G6 -',
  'F#6 - - - - - D#6 - - B5 - -',
];

const chords = CHORDS.map(triad);

const v1 = LEAD.map((bar) => tag(bar, 'lead'));
const v2 = chords.map((c, i) => (i === 0 ? R : voice('F - - - - - - - - - - -', c, 'pad', 12)));
const v3 = chords.map((c) => voice('T - - - - - - - - - - -', c, 'choir', 12));

const BASS = {
  intro: 'R - - - - - R - - - - -',
  verse: 'R - - - - O R - - - - F',
  turn: 'R - - - - - F - - - - -',
};
const v4 = chords.map((c, i) => voice(BASS[part(i)], c, 'bass'));

const last = CHORDS.length - 1;
const v5 = CHORDS.map((_, i) => tag(i === 0 || i === last ? 'C4 . . . . . . . . . . .' : 'C4 . . . . . . . . C4 . .', 'kick'));
const v6 = CHORDS.map((_, i) => tag(i === 0 ? '. . . . . . . . . C4 . C4'
  : i === last ? '. . . . . . C4 . Bb3 A3 G3 F3'
    : '. . . . . . C4 . . . . .', 'snare'));
const v7 = CHORDS.map((_, i) => hats(i === 0 ? '. . . . . . c . . c . .' : 'c . c c . c c . c c . o'));

const v8 = chords.map((c, i) => {
  if (i === 0) return voice('R - - - - - F - - - - -', c, 'horn', 12);
  if (part(i) === 'turn') return voice('U - - - - - O - - - - -', c, 'horn', 12);
  return voice('F - - T - - R - - T - -', c, 'horn', 12);
});

export default {
  tempo: 9,
  loop: BAR_ROWS,
  echo: { mvol: 74, evol: 54, efb: 80, edl: 6, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    lead: { ...INSTRUMENTS.strings, vol: 118, pan: -6, pitch: vibrato(0.22, 15, 14) },
    horn: { ...INSTRUMENTS.brass, adsr: [12, 3, 6, 6], vol: 66, pan: 30 },
    pad: { ...INSTRUMENTS.pad, vol: 52, pan: 44 },
    choir: { ...INSTRUMENTS.choir, vol: 58, pan: -40 },
    bass: { ...INSTRUMENTS.synbass, adsr: [11, 3, 6, 8], vol: 90 },
    kick: { ...INSTRUMENTS.gkick, vol: 96 },
    snare: { ...INSTRUMENTS.gsnare, vol: 90 },
    chat: { ...INSTRUMENTS.chat, vol: 40 },
    ohat: { ...INSTRUMENTS.ohat, vol: 36 },
  },
  v1: { rows: bars(v1, BAR_ROWS) },
  v2: { rows: bars(v2, BAR_ROWS) },
  v3: { rows: bars(v3, BAR_ROWS) },
  v4: { rows: bars(v4, BAR_ROWS) },
  v5: { rows: bars(v5, BAR_ROWS) },
  v6: { rows: bars(v6, BAR_ROWS) },
  v7: { rows: bars(v7, BAR_ROWS) },
  v8: { rows: bars(v8, BAR_ROWS) },
};

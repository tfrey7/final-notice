// Stage 2 chase, sketch A: written from scratch, not the NES tune. D minor at about 128 bpm, a song
// before it is a cue: a legato brass lead that climbs to D6, strings answering in half notes, a held
// synth bass, choir and pad sustaining the chords, a backbeat that leaves room, a deep echo.
//
// v1 brass lead | v2 choir, left | v3 pad, right | v4 synth bass | v5 kick |
// v6 snare and tom fill | v7 hats | v8 strings counter-line

import { bars, hats, rest, triad, voice } from './chase-kit.mjs';
import { tag, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);

// Bar 0 is the intro; 1-8 the verse, 9-10 the turnaround back to bar 1.
export const CHORDS = ['Dm', 'Dm', 'Bb', 'C', 'A', 'Dm', 'Gm', 'Bb', 'A', 'Bb', 'A'];
const part = (i) => (i === 0 ? 'intro' : i <= 8 ? 'verse' : 'turn');

export const LEAD = [
  R,
  'D5 - - - A4 - D5 - F5 - - - E5 - D5 -',
  'D5 - - - - - C5 - D5 - F5 - Bb5 - - -',
  'A5 - - - G5 - F5 - E5 - - - G5 - - -',
  'E5 - - - - - - - Db5 - E5 - G5 - - -',
  'F5 - - - E5 - D5 - A5 - - - - - D6 -',
  'D6 - - - C6 - Bb5 - A5 - G5 - Bb5 - - -',
  'A5 - - - G5 - F5 - G5 - F5 - D5 - - -',
  'E5 - - - - - - - Db5 - D5 - E5 - - -',
  'D6 - Bb5 - F5 - D5 - F5 - Bb5 - D6 - F6 -',
  'E6 - - - - - - - . . . . . . . .',
];

const chords = CHORDS.map(triad);

const v1 = LEAD.map((bar) => tag(bar, 'lead'));
const v2 = chords.map((c, i) => (i === 0 ? R : voice('F - - - - - - - - - - - - - - -', c, 'choir', 12)));
const v3 = chords.map((c) => voice('T - - - - - - - - - - - - - - -', c, 'pad', 24));

const BASS = {
  intro: 'R - - - - - - - R - - - - - - -',
  verse: 'R - - - - - O - R - - - F - - -',
  turn: 'R - - - O - - - F - - - O - - -',
};
const v4 = chords.map((c, i) => voice(BASS[part(i)], c, 'bass'));

const last = CHORDS.length - 1;
const v5 = CHORDS.map((_, i) => tag(i === 0 || i === last ? 'C4 . . . . . . . . . . . . . . .' : 'C4 . . . . . . . C4 . C4 . . . . .', 'kick'));
const v6 = CHORDS.map((_, i) => tag(i === 0 ? '. . . . . . . . . . . . C4 . C4 C4'
  : i === last ? '. . . . C4 . . . C4 . Bb3 . A3 . G3 F3'
    : '. . . . C4 . . . . . . . C4 . . .', 'snare'));
const v7 = CHORDS.map((_, i) => hats(i === 0 ? '. . . . . . . . c . c . c . c .' : 'c . c . c . c . c . c . c . o -'));

const v8 = chords.map((c, i) => {
  if (i === 0) return tag('D5 - - - - - - - A4 - - - - - - -', 'counter');
  if (part(i) === 'turn') return voice('U - - - F - - - T - - - R - - -', c, 'counter', 24);
  return voice('T - - - - - - - F - - - - - - -', c, 'counter', 24);
});

export default {
  tempo: 7,
  loop: BAR_ROWS,
  echo: { mvol: 76, evol: 52, efb: 80, edl: 5, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    lead: { ...INSTRUMENTS.brass, adsr: [13, 3, 6, 6], vol: 118, pan: -8, pitch: vibrato(0.2, 16, 18) },
    counter: { ...INSTRUMENTS.strings, vol: 64, pan: 36, pitch: vibrato(0.15, 16, 20) },
    choir: { ...INSTRUMENTS.choir, vol: 54, pan: -40 },
    pad: { ...INSTRUMENTS.pad, vol: 50, pan: 44 },
    bass: { ...INSTRUMENTS.synbass, adsr: [11, 3, 6, 8], vol: 88 },
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

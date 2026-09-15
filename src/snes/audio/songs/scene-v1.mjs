// The story-scene cue, written from scratch as corporate wave: F major at about 100 bpm, a soft sax
// over held pads, choir and strings, a synth bass that holds, brushed-light drums and a long echo. No
// plucked keys, bells or hits. About 2:15 before the loop: intro, A, B, a bridge lifted to G major, A
// in G, and a turnaround back to F that loops to the top of A.
//
// v1 alto sax lead | v2 strings counter-line | v3 pad on the third, left | v4 pad on the seventh,
// right | v5 choir on the fifth | v6 synth bass | v7 soft kick and snare | v8 hats

import { bars, hats, rest, section, voice } from './chase-kit.mjs';
import { tag, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);

const A_CHORDS = ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Bbmaj7', 'Am7', 'Gm7', 'C7'];
const A_LEAD = [
  'A4 - - - - - - - C5 - - - E5 - - -',
  'D5 - - - - - - - - - - - B4 - - -',
  'C5 - - - - - - - A4 - - - F4 - - -',
  'G4 - - - - - - - - - - - . . . .',
  'D5 - - - - - - - F5 - - - A5 - - -',
  'G5 - - - - - - - E5 - - - C5 - - -',
  'F5 - - - - - - - D5 - - - Bb4 - - -',
  'C5 - - - - - - - - - - - . . . .',
];
const A_LEAD_2 = [...A_LEAD.slice(0, 7), 'E5 - - - - - - - G5 - - - Bb5 - - -'];

const B_CHORDS = ['Dm7', 'Am7', 'Bbmaj7', 'Fmaj7', 'Gm7', 'Am7', 'Bbmaj7', 'C7'];
const B_LEAD = [
  'F5 - - - - - E5 - D5 - - - - - - -',
  'C5 - - - - - - - E5 - - - G5 - - -',
  'A5 - - - - - - - - - - - F5 - - -',
  'E5 - - - - - - - C5 - - - - - - -',
  'D5 - - - - - F5 - - - - - Bb5 - - -',
  'A5 - - - - - G5 - E5 - - - - - - -',
  'F5 - - - - - - - D5 - - - A5 - - -',
  'G5 - - - - - - - - - - - . . . .',
];

// The bridge, in G major.
const C_CHORDS = ['Cmaj7', 'Bm7', 'Am7', 'D7', 'Cmaj7', 'Bm7', 'Em7', 'D7'];
const C_LEAD = [
  'E5 - - - - - - - G5 - - - B5 - - -',
  'A5 - - - - - - - Gb5 - - - D5 - - -',
  'C5 - - - - - - - E5 - - - G5 - - -',
  'Gb5 - - - - - - - - - - - . . . .',
  'G5 - - - - - - - B5 - - - E6 - - -',
  'D6 - - - - - - - B5 - - - Gb5 - - -',
  'G5 - - - - - - - - - - - B5 - - -',
  'A5 - - - - - - - - - - - . . . .',
];

const INTRO_CHORDS = ['Fmaj7', 'Em7', 'Dm7', 'C7'];
const INTRO_LEAD = [R, R, R, '. . . . . . . . C5 - - - E5 - G5 -'];
const TURN_CHORDS = ['Gm7', 'Am7', 'Bbmaj7', 'C7'];
const TURN_LEAD = [
  'Bb4 - - - - - - - D5 - - - F5 - - -',
  'E5 - - - - - - - C5 - - - - - - -',
  'D5 - - - - - - - F5 - - - A5 - - -',
  'G5 - - - - - - - - - - - . . . .',
];

export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...section('intro', INTRO_CHORDS, INTRO_LEAD),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('A', A_CHORDS, A_LEAD_2),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('bridge', C_CHORDS, C_LEAD),
  ...section('A', A_CHORDS, A_LEAD, 2),
  ...section('turn', TURN_CHORDS, TURN_LEAD),
];

const HELD = (letter) => [letter, ...Array(BAR_ROWS - 1).fill('-')].join(' ');

const v1 = FORM.map((b) => tag(b.lead, 'sax'));

const COUNTER = {
  intro: 'T - - - - - - - F - - - - - - -',
  A: 'F - - - - - - - - - - - - - - -',
  B: 'T - - - - - - - S - - - - - - -',
  bridge: 'U - - - - - - - H - - - - - - -',
  turn: 'F - - - - - - - T - - - - - - -',
};
const v2 = FORM.map((b) => voice(COUNTER[b.part], b.c, 'strings', b.part === 'bridge' ? 12 : 24));
const v3 = FORM.map((b) => voice(HELD('T'), b.c, 'padL', 24));
const v4 = FORM.map((b) => voice(HELD('S'), b.c, 'padR', 24));
const v5 = FORM.map((b) => (b.part === 'intro' || (b.part === 'A' && b.shift === 0) ? R : voice(HELD('F'), b.c, 'choir', 24)));

const v6 = FORM.map((b) => voice(b.part === 'turn' && b.bar === 3 ? 'R - - - F - - - O - - - S - - -' : 'R - - - - - - - - - - - F - - -', b.c, 'bass', 12));

const GROOVE = 'K . . . S . . . . . K . S . . .';
const HALF = 'K . . . . . . . S . . . . . . .';
const kit = (p) => p.split(' ').map((t) => ({ K: 'C4:kick', S: 'C4:snare' })[t] ?? t).join(' ');
const v7 = FORM.map((b) => (b.part === 'intro' ? R : kit(b.part === 'bridge' ? HALF : GROOVE)));
const v8 = FORM.map((b) => (b.part === 'intro' || b.part === 'bridge' ? R : hats('c . c . c . c . c . c . c . o -')));

export default {
  tempo: 9,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 84, evol: 50, efb: 78, edl: 6, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    sax: { ...INSTRUMENTS.sax, adsr: [11, 4, 6, 5], vol: 84, pan: -6, pitch: vibrato(0.12, 20, 24) },
    strings: { ...INSTRUMENTS.strings, adsr: [9, 3, 6, 2], vol: 46, pan: 30 },
    padL: { ...INSTRUMENTS.pad, adsr: [8, 2, 6, 0], vol: 44, pan: -44 },
    padR: { ...INSTRUMENTS.pad, adsr: [8, 2, 6, 0], vol: 44, pan: 44 },
    choir: { ...INSTRUMENTS.choir, adsr: [8, 3, 6, 2], vol: 36, pan: -20 },
    bass: { ...INSTRUMENTS.synbass, adsr: [12, 2, 6, 10], vol: 80 },
    kick: { ...INSTRUMENTS.gkick, vol: 72 },
    snare: { ...INSTRUMENTS.gsnare, vol: 50, pan: 8 },
    chat: { ...INSTRUMENTS.chat, vol: 30 },
    ohat: { ...INSTRUMENTS.ohat, vol: 26 },
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

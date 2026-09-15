// Stage 2's escape climb up the Archive ahead of the paper flood (item 2195). Its own song: D minor at
// 150 bpm, driving from bar one, the harmony rising all the way (a B section that climbs a step a bar,
// the second A a tone higher, a turnaround climbing by semitones back to the top). Stale and dusty
// rather than grand: a small dry room, strings sawing arpeggios, the brass low, a bell tolling every
// four bars like a clock nobody has wound.
//
// v1 brass lead | v2 string arpeggios | v3 brass stabs | v4 synth bass | v5 kick | v6 snare |
// v7 hats | v8 bell

import { bars, hats, rest, section, voice } from './chase-kit.mjs';
import { lead } from './vellum.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);
const UP = 2;

const INTRO_CHORDS = ['Dm', 'A7'];
const INTRO_LEAD = [R, 'A3 . A3 . C#4 . C#4 . E4 . E4 . G4 - A4 -'];

const A_CHORDS = ['Dm', 'Bb', 'C', 'A7', 'Dm', 'Bb', 'Gm', 'A7'];
const A_LEAD = [
  'D4 - F4 - A4 - - - G4 - A4 - C5 - A4 -',
  'Bb4/v - - - - - - - A4 - F4 - D4 - F4 -',
  'G4 - E4 - G4 - C5/p3 - - - Bb4 - G4 - E4 -',
  'A4/v - - - - - - - C#4 . E4 . G4 . A4 .',
  'D4 . D4 . F4 - A4 - D4 . D4 . G4 - Bb4 -',
  'D4 . D4 . A4 - C5/p3 - Bb4/v - - - - - A4 -',
  'G4 - Bb4 - C5 - - - Bb4 - A4 - G4 - F4 -',
  'E4/v - - - - - - - E4 - G4 - Bb4 - C#5 -',
];

// A step higher every bar, the lead's repeated notes climbing with it, stalling on A7.
const B_CHORDS = ['Gm', 'Am', 'Bb', 'C', 'Dm', 'Eb', 'F', 'A7'];
const B_LEAD = [
  'G4 . G4 . Bb4 . G4 . D4 . G4 . Bb4 - A4 -',
  'A4 . A4 . C5 . A4 . E4 . A4 . C5 - Bb4 -',
  'Bb4 . Bb4 . D5 . Bb4 . F4 . Bb4 . D5 - C5 -',
  'C5/v - - - - - - - G4 - E4 - C4 - E4 -',
  'F4 - A4 - D5/p3 - - - A4 - F4 - D4 - F4 -',
  'G4 - Bb4 - Eb5/p3 - - - Bb4 - G4 - Eb4 - G4 -',
  'A4 - C5 - A4 - C5 - Eb5 - D5 - C5 - A4 -',
  'C#5/v - - - - - - - A4 - G4 - E4 - C#4 -',
];

// Climbing back by semitones from Bb to the dominant, for the top of A.
const TURN_CHORDS = ['Bb', 'B', 'C', 'A7'];
const TURN_LEAD = [
  'F4 - Bb4 - D4 - F4 - Bb4 - D5 - Bb4 - F4 -',
  'F#4 - B4 - D#4 - F#4 - B4 - D#5 - B4 - F#4 -',
  'G4 - C5 - E4 - G4 - C5/v - - - Bb4 - G4 -',
  'A4/v - - - - - - - E4 - G4 - A4 - C#5 -',
];

export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...section('intro', INTRO_CHORDS, INTRO_LEAD),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('A', A_CHORDS, A_LEAD, UP),
  ...section('turn', TURN_CHORDS, TURN_LEAD),
];

const ARPEGGIO = {
  A: 'R F O F T F O F R F O F T F O U',
  B: 'R T F O R T F O H O F T H O F T',
};
const STABS = {
  A: 'R . . T . . F . . . R . T . . .',
  B: 'F . . F . . F . . . F . F . F .',
};
const BASS = {
  A: 'R . R O R . R O R . R O R R O R',
  B: 'R R O R R R O R R R O R R R O R',
};
const KICK = {
  A: 'C4 . . . . . . C4 C4 . C4 . . . . .',
  B: 'C4 . . . C4 . . . C4 . . . C4 . . .',
};
const SNARE = {
  beat: '. . . . C4 . . . . . . . C4 . . .',
  fill: '. . . . C4 . . . C4 . C4 C4 C4 C4 C4 C4',
};
const HATS = 'c . c c c . c c c . c c c . c o';
const TOLL = 'R - - - - - - - . . . . . . . .';

const phrase = (b) => (b.part === 'intro' ? 2 : b.part === 'turn' ? 4 : 8);
const isFill = (b) => b.bar === phrase(b) - 1;
const groove = (b) => (b.part === 'B' || b.part === 'turn' ? 'B' : 'A');

const v1 = FORM.map((b) => lead(b.lead, 'lead'));
const v2 = FORM.map((b) => voice(ARPEGGIO[groove(b)], b.c, 'arp', 12));
const v3 = FORM.map((b) => voice(STABS[groove(b)], b.c, 'stab', 12));
const v4 = FORM.map((b) => voice(BASS[groove(b)], b.c, 'bass'));
const v5 = FORM.map((b) => KICK[groove(b)].replaceAll('C4', 'C4:kick'));
const v6 = FORM.map((b) => (isFill(b) ? SNARE.fill : SNARE.beat).replaceAll('C4', 'C4:snare'));
const v7 = FORM.map(() => hats(HATS));
const v8 = FORM.map((b) => (b.bar % 4 === 0 ? voice(TOLL, b.c, 'bell', 24) : R));

// The second A opens without its stabs and B without its hats, so each section arrives as a change.
function drops(form) {
  const out = [];
  form.forEach((b, i) => {
    const voices = [];
    if (b.part === 'A' && b.shift && b.bar < 2) voices.push('v3');
    if (b.part === 'B' && b.bar < 2) voices.push('v7');
    if (voices.length) out.push({ from: i * BAR_ROWS, to: (i + 1) * BAR_ROWS, voices });
  });
  return out;
}

export default {
  tempo: 6,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 60, room: 'room', evol: 26 },
  instruments: {
    lead: { ...INSTRUMENTS.brass, adsr: [13, 3, 6, 8], vol: 104, vibrato: { delay: 8, period: 9, depth: 0.3 }, glide: 3 },
    arp: { ...INSTRUMENTS.strings, adsr: [14, 5, 4, 12], vol: 62 },
    stab: { ...INSTRUMENTS.brass, adsr: [14, 5, 3, 16], vol: 58 },
    bass: { ...INSTRUMENTS.synbass, vol: 96 },
    kick: { ...INSTRUMENTS.gkick, vol: 108 },
    snare: { ...INSTRUMENTS.gsnare, vol: 86 },
    chat: { ...INSTRUMENTS.chat, vol: 26 },
    ohat: { ...INSTRUMENTS.ohat, vol: 20 },
    bell: { ...INSTRUMENTS.bell, vol: 44 },
  },
  drops: drops(FORM),
  v1: { rows: bars(v1, BAR_ROWS), pan: -20 },
  v2: { rows: bars(v2, BAR_ROWS), pan: 50 },
  v3: { rows: bars(v3, BAR_ROWS), pan: -50 },
  v4: { rows: bars(v4, BAR_ROWS) },
  v5: { rows: bars(v5, BAR_ROWS) },
  v6: { rows: bars(v6, BAR_ROWS), pan: 12 },
  v7: { rows: bars(v7, BAR_ROWS), pan: 36 },
  v8: { rows: bars(v8, BAR_ROWS), pan: -30 },
};

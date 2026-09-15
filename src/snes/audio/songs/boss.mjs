// The boss fight, written from scratch in Castlevania III's manner: C harmonic minor at about 128 bpm,
// a soaring brass lead over a driving melodic bass, a string counter-melody, choir and pad holding the
// chords, deep echo. About 2:15 before the loop: intro, A, B, a breakdown that lifts to D minor, A in
// D minor, and a turnaround back to C that loops to the top of A.
//
// v1 brass lead | v2 strings counter-melody | v3 choir | v4 pad | v5 synth bass | v6 kick |
// v7 snare and fills | v8 hats

import { bars, hats, rest, section, voice } from './chase-kit.mjs';
import { tag, transpose, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);

const A_CHORDS = ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Bb', 'G'];
const A_LEAD = [
  'C5 - - - G4 - C5 - Eb5 - - - D5 - C5 -',
  'Eb5 - - - - - D5 - C5 - Ab4 - C5 - Eb5 -',
  'F5 - - - - - Eb5 - D5 - C5 - Ab4 - C5 -',
  'B4 - - - - - - - D5 - F5 - G5 - - -',
  'G5 - - - - - F5 - Eb5 - D5 - Eb5 - G5 -',
  'C6 - - - - - - - Bb5 - Ab5 - G5 - Ab5 -',
  'F5 - - - D5 - Bb4 - D5 - F5 - Bb5 - Ab5 -',
  'G5 - - - - - - - B4 - C5 - D5 - - -',
];
const A_LEAD_2 = [...A_LEAD.slice(0, 7), 'G5 - F5 - Eb5 - D5 - C5 - B4 - G4 - B4 -'];

const B_CHORDS = ['Ab', 'Bb', 'Cm', 'Cm', 'Fm', 'G', 'Ab', 'G'];
const B_LEAD = [
  'Ab5 - - - - - G5 - F5 - Eb5 - - - C5 -',
  'D5 - - - F5 - - - Bb5 - - - Ab5 - G5 -',
  'G5 - - - - - - - - - - - Eb5 - F5 -',
  'G5 - Ab5 - G5 - F5 - Eb5 - D5 - Eb5 - C5 -',
  'F5 - - - Ab5 - - - C6 - - - Bb5 - Ab5 -',
  'B5 - - - - - - - G5 - - - D5 - F5 -',
  'Eb6 - - - D6 - C6 - Bb5 - Ab5 - G5 - F5 -',
  'G5 - - - - - - - - - - - D5 - B4 -',
];
const B_LEAD_2 = [...B_LEAD.slice(0, 7), 'G5 - - - - - - - . . . . . . . .'];

// The breakdown, in D minor: strings carry the tune alone for four bars, then the lead takes it back.
const C_CHORDS = ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'Gm', 'A'];
const C_LEAD = [
  'A5 - - - - - - - - - - - F5 - E5 -',
  'D5 - - - - - - - F5 - - - Bb5 - - -',
  'G5 - - - - - - - E5 - - - C5 - - -',
  'Db5 - - - - - - - E5 - - - A5 - - -',
  'D6 - - - - - C6 - A5 - - - F5 - A5 -',
  'Bb5 - - - - - A5 - G5 - F5 - D5 - F5 -',
  'G5 - - - Bb5 - - - D6 - - - C6 - Bb5 -',
  'A5 - - - - - - - E5 - G5 - Db6 - - -',
];
const C_SPARSE = [R, R, R, R, ...C_LEAD.slice(4)];

const INTRO_CHORDS = ['Cm', 'Cm', 'Ab', 'G'];
const INTRO_LEAD = [R, R, 'C6 - - - - - - - - - - - - - - -', 'B5 - - - - - - - G5 - F5 - D5 - B4 -'];
const TURN_CHORDS = ['Ab', 'Bb', 'G', 'G'];
const TURN_LEAD = [
  'Ab5 - - - G5 - F5 - Eb5 - - - D5 - C5 -',
  'Bb5 - - - Ab5 - G5 - F5 - - - D5 - Bb4 -',
  'B4 - - - D5 - - - F5 - - - G5 - - -',
  'Ab5 - - - G5 - - - F5 - D5 - B4 - G4 -',
];

export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...section('intro', INTRO_CHORDS, INTRO_LEAD),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('A', A_CHORDS, A_LEAD_2),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('B', B_CHORDS, B_LEAD_2),
  ...section('break', C_CHORDS, C_SPARSE),
  ...section('bridge', C_CHORDS, C_LEAD),
  ...section('A', A_CHORDS, A_LEAD, 2),
  ...section('A', A_CHORDS, A_LEAD_2, 2),
  ...section('turn', TURN_CHORDS, TURN_LEAD),
];

const v1 = FORM.map((b) => tag(b.lead, 'lead'));

const COUNTER = {
  intro: 'R - - - - - - - F - - - - - - -',
  A: 'T - - - - - - - F - - - - - - -',
  B: 'U - - - F - - - T - - - R - - -',
  bridge: 'F - - - - - - - T - - - - - - -',
  turn: 'R - T - F - O - U - F - T - R -',
};
const v2 = FORM.map((b) => (b.part === 'break' && b.bar < 4
  ? tag(transpose(C_LEAD[b.bar], -12), 'counter')
  : voice(COUNTER[b.part === 'break' ? 'bridge' : b.part], b.c, 'counter', 24)));

const HELD = (letter) => [letter, ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const v3 = FORM.map((b) => (b.part === 'intro' && b.bar < 2 ? R : voice(HELD('O'), b.c, 'choir', 12)));
const v4 = FORM.map((b) => voice(HELD('H'), b.c, 'pad', 12));

const BASS = {
  pulse: 'R . R . R . R . R . R . R R R R',
  A: 'R . O . R R O . R . O . F . S .',
  B: 'R R O R R R O R F F O F S S O S',
  break: 'R - - - - - - - F - - - - - - -',
  fill: 'R R R R F F F F S S S S O O O O',
};
const v5 = FORM.map((b) => {
  if (b.part === 'intro') return voice(b.bar < 2 ? BASS.pulse : BASS.A, b.c, 'bass');
  if (b.part === 'break') return voice(b.bar < 4 ? BASS.break : BASS.A, b.c, 'bass');
  if (b.bar === 7 || (b.part === 'turn' && b.bar === 3)) return voice(BASS.fill, b.c, 'bass');
  return voice(b.part === 'B' || b.part === 'turn' ? BASS.B : BASS.A, b.c, 'bass');
});

const sparse = (b) => (b.part === 'intro' && b.bar < 2) || (b.part === 'break' && b.bar < 7);
const lastBar = (b) => b.bar === 7 || (b.part === 'turn' && b.bar === 3) || (b.part === 'intro' && b.bar === 3);

const v6 = FORM.map((b) => tag(sparse(b) || lastBar(b) ? 'C4 . . . . . . . C4 . . . . . . .' : 'C4 . . . . . . . C4 . C4 . . . . .', 'kick'));
const v7 = FORM.map((b) => {
  if (b.part === 'break' && b.bar === 7) return tag('C4 . C4 . C4 . C4 . C4 C4 C4 C4 C4 C4 C4 C4', 'roll');
  if (sparse(b)) return R;
  return tag(lastBar(b) ? '. . . . C4 . . . C4 . Bb3 . A3 C4 G3 F3' : '. . . . C4 . . . . . . . C4 . . .', 'snare');
});
const v8 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar < 2) return R;
  return hats(sparse(b) ? 'c . . . c . . . c . . . c . . .' : 'c . c c c . c c c . c c c . o -');
});

export default {
  tempo: 7,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 66, evol: 42, efb: 76, edl: 5, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    lead: { ...INSTRUMENTS.brass, adsr: [13, 3, 6, 6], vol: 110, pan: -8, pitch: vibrato(0.25, 14, 16) },
    counter: { ...INSTRUMENTS.strings, vol: 68, pan: 38, pitch: vibrato(0.15, 16, 20) },
    choir: { ...INSTRUMENTS.choir, vol: 48, pan: -40 },
    pad: { ...INSTRUMENTS.pad, vol: 44, pan: 44 },
    bass: { ...INSTRUMENTS.synbass, vol: 100 },
    kick: { ...INSTRUMENTS.gkick, vol: 104 },
    snare: { ...INSTRUMENTS.gsnare, vol: 94 },
    roll: { ...INSTRUMENTS.gsnare, vol: 60, pan: 16 },
    chat: { ...INSTRUMENTS.chat, vol: 44 },
    ohat: { ...INSTRUMENTS.ohat, vol: 38 },
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

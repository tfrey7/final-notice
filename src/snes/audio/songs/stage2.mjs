// Stage 2, the escape chase: sketch B (item 2026) built out into a full song. E minor in an unhurried
// 12/8 at about 133 bpm, Castlevania III's gothic side: a soaring string lead, brass answering in a
// counter-line, a melodic bass, pad and choir holding the chords, a deep echo. About 2:24 before the
// loop: intro, A twice, B twice, a breakdown and bridge lifted to F# minor, A in F# minor, and a
// turnaround back to E minor that loops to the top of A.
//
// v1 string lead | v2 pad, right | v3 choir, left | v4 synth bass | v5 kick |
// v6 snare, fills and the roll | v7 hats | v8 brass counter-line, the tune itself in the breakdown

import { bars, hats, rest, section, voice } from './chase-kit.mjs';
import { tag, transpose, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 12;
const R = rest(BAR_ROWS);
const UP = 2;

const INTRO_CHORDS = ['Em', 'Em', 'C', 'B7'];
const INTRO_LEAD = [R, R, 'B5 - - - - - - - - - - -', 'D#6 - - - - - B5 - - F#5 - -'];

const A_CHORDS = ['Em', 'C', 'Am', 'B7', 'Em', 'C', 'D', 'B7'];
const A_LEAD = [
  'E5 - - - - - B4 - - E5 - F#5',
  'G5 - - - - - F#5 - - E5 - G5',
  'A5 - - - - - C6 - - B5 - A5',
  'B5 - - - - - - - - D#5 - F#5',
  'E5 - - - - - B4 - - E5 - F#5',
  'G5 - - - - - A5 - - B5 - C6',
  'D6 - - - - - C6 - - B5 - A5',
  'B5 - - - - - D#6 - - F#6 - -',
];
const A_LEAD_2 = [...A_LEAD.slice(0, 7), 'B5 - - A5 - - G5 - - F#5 - D#5'];

const B_CHORDS = ['C', 'D', 'G', 'Em', 'Am', 'D', 'B7', 'B7'];
const B_LEAD = [
  'E6 - - - - - D6 - - C6 - -',
  'D6 - - - - - A5 - - F#5 - A5',
  'B5 - - - - - - - - D6 - G6',
  'G6 - - F#6 - - E6 - - B5 - -',
  'C6 - - - - - E6 - - A6 - -',
  'F#6 - - - - - E6 - - D6 - C6',
  'B5 - - - - - D#6 - - F#6 - -',
  'A6 - - - - - F#6 - - D#6 - B5',
];
const B_LEAD_2 = [...B_LEAD.slice(0, 7), 'B5 - - - - - - - - . . .'];

// The breakdown and bridge, written in E minor and lifted a tone: the brass carries the tune alone for
// four bars, the strings take it back, and the bridge plays it in full.
const C_CHORDS = ['Em', 'C', 'G', 'D', 'Em', 'Am', 'C', 'B7'];
const C_LEAD = [
  'B5 - - - - - - - - G5 - F#5',
  'E5 - - - - - - - - G5 - C6',
  'B5 - - - - - - - - D6 - -',
  'A5 - - - - - F#5 - - D5 - -',
  'E6 - - - - - D6 - - B5 - G5',
  'A5 - - - - - C6 - - E6 - -',
  'G6 - - - - - E6 - - C6 - E6',
  'D#6 - - - - - B5 - - F#5 - -',
];
const C_SPARSE = [R, R, R, R, ...C_LEAD.slice(4)];

const TURN_CHORDS = ['C', 'D', 'B7', 'B7'];
const TURN_LEAD = [
  'E6 - - - - - D6 - - C6 - B5',
  'A5 - - - - - B5 - - C6 - D6',
  'D#6 - - - - - B5 - - A5 - F#5',
  'D#5 - - - - - F#5 - - B5 - -',
];

export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...section('intro', INTRO_CHORDS, INTRO_LEAD),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('A', A_CHORDS, A_LEAD_2),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('B', B_CHORDS, B_LEAD_2),
  ...section('break', C_CHORDS, C_SPARSE, UP),
  ...section('bridge', C_CHORDS, C_LEAD, UP),
  ...section('A', A_CHORDS, A_LEAD, UP),
  ...section('A', A_CHORDS, A_LEAD_2, UP),
  ...section('turn', TURN_CHORDS, TURN_LEAD),
];

const HELD = (letter) => [letter, ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const bareIntro = (b) => b.part === 'intro' && b.bar < 2;
const bareBreak = (b) => b.part === 'break' && b.bar < 4;
const lastBar = (b) => b.bar === (b.part === 'intro' || b.part === 'turn' ? 3 : 7);

const v1 = FORM.map((b) => tag(b.lead, 'lead'));
const v2 = FORM.map((b) => (bareIntro(b) ? R : voice(HELD('F'), b.c, 'pad', 12)));
const v3 = FORM.map((b) => voice(HELD('T'), b.c, 'choir', 12));

const BASS = {
  held: 'R - - - - - R - - - - -',
  A: 'R - - - - O R - - - - F',
  B: 'R - - F - - O - - F - -',
  fill: 'R - F - O - U - O - F -',
  turn: 'R - - - - - F - - - - -',
};
const v4 = FORM.map((b) => {
  if (bareIntro(b) || bareBreak(b)) return voice(BASS.held, b.c, 'bass');
  if (b.part === 'turn') return voice(b.bar === 3 ? BASS.fill : BASS.turn, b.c, 'bass');
  if (lastBar(b) && b.part !== 'intro') return voice(BASS.fill, b.c, 'bass');
  return voice(b.part === 'B' || b.part === 'bridge' ? BASS.B : BASS.A, b.c, 'bass');
});

const quiet = (b) => bareIntro(b) || bareBreak(b);
const v5 = FORM.map((b) => tag(quiet(b) || lastBar(b) ? 'C4 . . . . . . . . . . .'
  : b.part === 'B' || b.part === 'bridge' ? 'C4 . . . . . C4 . . C4 . .' : 'C4 . . . . . . . . C4 . .', 'kick'));
const v6 = FORM.map((b) => {
  if (b.part === 'break' && b.bar === 7) return tag('C4 . C4 . C4 . C4 C4 C4 C4 C4 C4', 'roll');
  if (quiet(b)) return b.part === 'intro' && b.bar === 1 ? tag('. . . . . . . . . C4 . C4', 'snare') : R;
  return tag(lastBar(b) ? '. . . . . . C4 . Bb3 A3 G3 F3' : '. . . . . . C4 . . . . .', 'snare');
});
const v7 = FORM.map((b) => hats(bareIntro(b) ? '. . . . . . c . . c . .'
  : bareBreak(b) ? 'c . . c . . c . . c . .' : 'c . c c . c c . c c . o'));

const COUNTER = {
  intro: 'R - - - - - F - - - - -',
  A: 'F - - T - - R - - T - -',
  B: 'U - - - - - H - - F - -',
  bridge: 'T - - - - - F - - O - -',
  turn: 'U - - - - - O - - - - -',
};
const v8 = FORM.map((b) => (bareBreak(b)
  ? tag(transpose(C_LEAD[b.bar], UP - 12), 'horn')
  : voice(COUNTER[b.part === 'break' ? 'bridge' : b.part], b.c, 'horn', 12)));

export default {
  tempo: 9,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 42, evol: 40, efb: 80, edl: 6, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    lead: { ...INSTRUMENTS.strings, vol: 118, pan: -24, pitch: vibrato(0.22, 15, 14) },
    horn: { ...INSTRUMENTS.brass, adsr: [12, 3, 6, 6], vol: 70, pan: 70, pitch: vibrato(0.18, 15, 18) },
    pad: { ...INSTRUMENTS.pad, vol: 52, pan: 84 },
    choir: { ...INSTRUMENTS.choir, vol: 58, pan: -84 },
    bass: { ...INSTRUMENTS.synbass, adsr: [11, 3, 6, 8], vol: 90 },
    kick: { ...INSTRUMENTS.gkick, vol: 96 },
    snare: { ...INSTRUMENTS.gsnare, vol: 90, pan: 14 },
    roll: { ...INSTRUMENTS.gsnare, vol: 56, pan: -40 },
    chat: { ...INSTRUMENTS.chat, vol: 40, pan: 50 },
    ohat: { ...INSTRUMENTS.ohat, vol: 36, pan: -36 },
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

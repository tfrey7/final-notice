// Stage 4, the express elevator shaft (item 2224): E minor at 150 bpm, a machine that only goes up.
// The synth bass pumps sixteenths like a piston and never stops; a low tom clanks on the offbeat like a
// counterweight passing. The strings' four-bar riff climbs a semitone every time it comes round (Em, Fm,
// F#m, Gm), a slow-string shadow an octave under it; B opens up on Am over F and D; the riff returns
// a fourth and then a fifth higher, and a diminished turn hauls it back to the bottom of the shaft.
// Timpani strike each new floor. No brass.
//
// v1 strings lead | v2 slow-string shadow | v3 piano arpeggios | v4 piston bass | v5 kick | v6 snare |
// v7 hats | v8 timpani on floors, tom clank between

import { bars, hats, rest, section, voice } from './chase-kit.mjs';
import { tag } from '../../../audio/songs/kit.mjs';
import { lead } from './vellum.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);

const INTRO_CHORDS = ['Em', 'Em', 'Em', 'B7'];

const A_CHORDS = ['Em', 'Em', 'C', 'B7'];
const A_LEAD = [
  'E4 - - . E4 . G4 - B4 - - . A4 - G4 -',
  'F#4 - - - - - - - E4 - F#4 - G4 - B4 -',
  'C5 - - . C5 . B4 - G4 - - . E4 - G4 -',
  'F#4/v - - - - - - - D#4 - F#4 - A4 - B4 -',
];

const B_CHORDS = ['Am', 'F', 'G', 'Em', 'Am', 'F', 'D', 'B7'];
const B_LEAD = [
  'A4/v - - - - - - - C5 - - - E5 - - -',
  'F5/v - - - - - - - E5 - D5 - C5 - A4 -',
  'D5/v - - - - - - - B4 - - - G4 - - -',
  'B4/v - - - - - - - - - - - . . . .',
  'A4/v - - - - - - - C5 - - - E5 - - -',
  'F5/v - - - - - - - G5 - - - A5 - - -',
  'F#5/v - - - - - - - E5 - D5 - C5 - A4 -',
  'B4/v - - - - - - - D#5 - - - F#5 - - -',
];

const TURN_CHORDS = ['C', 'D', 'D#dim', 'B7'];
const TURN_LEAD = [
  'G4 - C5 - E5 - G5 - E5 - C5 - G4 - E4 -',
  'A4 - D5 - F#5 - A5 - F#5 - D5 - A4 - F#4 -',
  'A4 - C5 - D#5 - F#5 - A5 - F#5 - D#5 - C5 -',
  'B4/v - - - - - - - D#5 - F#5 - A5 - B5 -',
];

export const CLIMB = [0, 1, 2, 3];
export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...section('intro', INTRO_CHORDS, [R, R, R, R]),
  ...CLIMB.flatMap((up) => section('A', A_CHORDS, A_LEAD, up)),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('A', A_CHORDS, A_LEAD, 5),
  ...section('A', A_CHORDS, A_LEAD, 7),
  ...section('turn', TURN_CHORDS, TURN_LEAD),
];

const phrase = (b) => (b.part === 'B' ? 8 : 4);
const isFill = (b) => b.bar === phrase(b) - 1;
const floorHead = (b, i) => b.bar === 0 && (b.part !== 'A' || FORM[i - 1]?.part !== 'A' || b.shift !== FORM[i - 1].shift);

const v1 = FORM.map((b) => lead(b.lead, 'lead'));
const v2 = FORM.map((b) => lead(b.lead, 'shadow', -12));

const ARP = {
  A: 'R F O F R F O F R F O F R F O F',
  B: 'R T F O R T F O R T F O R T F O',
};
const v3 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar < 2) return R;
  return voice(b.part === 'B' || b.part === 'turn' ? ARP.B : ARP.A, b.c, 'arp', 12);
});

const PISTON = {
  intro: 'R . R . R . R . R . R . R . R .',
  drive: 'R R O R R R O R R R O R R R O R',
};
const v4 = FORM.map((b) => voice(b.part === 'intro' ? PISTON.intro : PISTON.drive, b.c, 'bass'));

const KICK = {
  four: 'C4 . . . C4 . . . C4 . . . C4 . . .',
  B: 'C4 . . C4 . . C4 . C4 . . C4 . . C4 .',
};
const v5 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar === 0) return R;
  return tag(b.part === 'B' ? KICK.B : KICK.four, 'kick');
});

const v6 = FORM.map((b) => {
  if (b.part === 'intro') return b.bar === 3 ? tag('. . . . C4 . . . C4 . C4 C4 C4 C4 C4 C4', 'snare') : R;
  if (isFill(b)) return tag('. . . . C4 . . . C4 . C4 C4 C4 C4 C4 C4', 'snare');
  return tag('. . . . C4 . . . . . . . C4 . . .', 'snare');
});

const v7 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar < 2) return R;
  return hats(b.part === 'B' ? 'c . o . c . o . c . o . c . o c' : 'c c o c c c o c c c o c c c o c');
});

const v8 = FORM.map((b, i) => {
  if (floorHead(b, i) && b.part !== 'intro') return voice('R - - - - - - - . . . . . . . .', b.c, 'timp');
  return tag('. . . . . . C4 . . . . . . . C4 C4', 'clank');
});

export default {
  tempo: 6,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 56, room: 'room', evol: 28 },
  instruments: {
    lead: { ...INSTRUMENTS.strings, adsr: [12, 4, 6, 6], vol: 100, vibrato: { delay: 10, period: 12, depth: 0.25 }, glide: 2 },
    shadow: { ...INSTRUMENTS.slowstr, vol: 50 },
    arp: { ...INSTRUMENTS.piano, vol: 54 },
    bass: { ...INSTRUMENTS.synbass, adsr: [15, 5, 4, 20], vol: 98 },
    kick: { ...INSTRUMENTS.gkick, vol: 108 },
    snare: { ...INSTRUMENTS.gsnare, vol: 86 },
    chat: { ...INSTRUMENTS.chat, vol: 24 },
    ohat: { ...INSTRUMENTS.ohat, vol: 18 },
    clank: { ...INSTRUMENTS.ltom, vol: 58 },
    timp: { ...INSTRUMENTS.timpani, vol: 96 },
  },
  v1: { rows: bars(v1, BAR_ROWS), pan: -20 },
  v2: { rows: bars(v2, BAR_ROWS), pan: 30 },
  v3: { rows: bars(v3, BAR_ROWS), pan: 55 },
  v4: { rows: bars(v4, BAR_ROWS) },
  v5: { rows: bars(v5, BAR_ROWS) },
  v6: { rows: bars(v6, BAR_ROWS), pan: 10 },
  v7: { rows: bars(v7, BAR_ROWS), pan: -45 },
  v8: { rows: bars(v8, BAR_ROWS), pan: -25 },
};

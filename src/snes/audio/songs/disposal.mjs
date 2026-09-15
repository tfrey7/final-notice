// Disposal Line, its own song (item 2197): F minor at 129 bpm, a factory floor that grinds. Low
// strings saw a 3-3-2 sixteenth ostinato like a conveyor, a low piano hammers the same accents, and
// a grand piano states a short, stamping riff (two hits, a fall, a turn) that the whole A section
// is built from. B lifts to D flat and lets the strings sing over the grind; the breakdown strips
// to the machine (bass, kick, piano) and rebuilds; the return adds a string counter-line and the
// full kit. The Gb and C7 chords keep a gothic pull back to F minor. No brass (Tim: too shrill).
//
// v1 lead: piano riff, strings in B | v2 string counter | v3 grinding string ostinato | v4 low piano
// hammer, bell at section heads | v5 synth bass | v6 kick | v7 snare and fills | v8 hats

import { bars, hats, rest, section, voice } from './chase-kit.mjs';
import { tag, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);

const INTRO_CHORDS = ['Fm', 'Fm', 'Gb', 'C7'];

const A_CHORDS = ['Fm', 'Fm', 'Db', 'Eb', 'Fm', 'Fm', 'Gb', 'C7'];
export const A_LEAD = [
  'C5 - - . C5 . Ab4 - Bb4 - - . G4 - - .',
  'F4 - - - - - - - . . Eb4 - F4 - Ab4 -',
  'Db5 - - . Db5 . C5 - Bb4 - - . Ab4 - - .',
  'G4/v - - - - - - - Bb4 - - - G4 - Eb4 -',
  'C5 - - . C5 . Ab4 - Bb4 - - . G4 - - .',
  'F4 - - - - - - - . . Eb4 - F4 - Bb4 -',
  'Db5 - - . Db5 . Bb4 - Gb4 - - . Ab4 - Bb4 -',
  'C5/v - - - - - - - Bb4 - G4 - E4 - C4 -',
];

const B_CHORDS = ['Db', 'Db', 'Bbm', 'Bbm', 'Gb', 'Ab', 'C', 'C7'];
const B_LEAD = [
  'F5/v - - - - - - - Eb5 - Db5 - C5 - Db5 -',
  'Ab4/v - - - - - - - - - - - . . . .',
  'Db5/v - - - - - - - C5 - Bb4 - A4 - Bb4 -',
  'F4/v - - - - - - - - - - - . . . .',
  'Bb4 - - - Db5 - - - Gb5/v - - - F5 - Eb5 -',
  'Eb5 - - - C5 - - - Ab4/v - - - - - - -',
  'E5/v - - - - - - - G5 - - - E5 - C5 -',
  'Bb4/v - - - - - - - - - - - . . . .',
];
const B_LEAD_2 = [...B_LEAD.slice(0, 7), 'Bb4 - C5 - Db5 - E5 - G5/v - - - - - - -'];

const BREAK_CHORDS = ['Fm', 'Gb', 'Fm', 'Gb', 'Fm', 'Gb', 'C7', 'C7'];
const BREAK_LEAD = [R, R, R, R,
  'C5 - - . C5 . Ab4 - . . . . . . . .',
  'Db5 - - . Db5 . Bb4 - . . . . . . . .',
  'C5 - - . C5 . Ab4 - Bb4 - - . G4 - - .',
  'E4 - - - G4 - - - Bb4 - - - C5/v - - -',
];

const TURN_CHORDS = ['Db', 'Eb', 'C7', 'C7'];
const TURN_LEAD = [
  'Ab4 - - . Ab4 . F4 - Db5 - - . C5 - - .',
  'Bb4 - - . Bb4 . G4 - D5 - - . C5 - - .',
  'C5/v - - - - - - - - - - - Bb4 - G4 -',
  'E4 - - - G4 - - - Bb4 - - - C5 - - -',
];

export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...section('intro', INTRO_CHORDS, [R, R, R, R]),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('A2', A_CHORDS, A_LEAD),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('B2', B_CHORDS, B_LEAD_2),
  ...section('break', BREAK_CHORDS, BREAK_LEAD),
  ...section('A3', A_CHORDS, A_LEAD),
  ...section('turn', TURN_CHORDS, TURN_LEAD),
];

const phrase = (b) => (b.part === 'intro' || b.part === 'turn' ? 4 : 8);
const isFill = (b) => b.bar === phrase(b) - 1;
const inB = (b) => b.part === 'B' || b.part === 'B2';
const bare = (b) => (b.part === 'intro' && b.bar < 2) || (b.part === 'break' && b.bar < 4);

const marked = (rows, inst) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? t.replace(/^[^/]+/, `$&:${inst}`) : t)).join(' ');
const unmarked = (rows) => rows.replaceAll('/v', '');
const v1 = FORM.map((b) => (inB(b) ? marked(b.lead, 'sing') : marked(unmarked(b.lead), 'lead')));

// The counter answers the riff in A2 and the return, and holds under the singing strings in B.
const COUNTER = {
  A: 'F - - - - - - - T - - - - - - -',
  B: 'R - - - - - - - - - - - F - - -',
};
const v2 = FORM.map((b) => {
  if (b.part === 'A2' || b.part === 'A3' || b.part === 'turn') return voice(COUNTER.A, b.c, 'counter', 24);
  if (b.part === 'B2') return voice(COUNTER.B, b.c, 'counter', 12);
  return R;
});

const GRIND = {
  thin: 'R . . R . . R . R . . R . . R .',
  grind: 'R R O R R O R F R R O R R O S F',
  lift: 'R F O R F O R F R F O R F O S O',
};
const v3 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar === 0) return R;
  if (bare(b) || b.part === 'A') return voice(GRIND.thin, b.c, 'grind', 12);
  return voice(inB(b) ? GRIND.lift : GRIND.grind, b.c, 'grind', 12);
});

const HAMMER = 'R . . R . . R . R . . . . . F .';
const v4 = FORM.map((b) => {
  if (b.bar === 0 && b.part !== 'intro' && b.part !== 'A') return voice('O - - - - - - - . . . . . . . .', b.c, 'bell');
  if (b.part === 'intro' && b.bar < 2) return voice('R . . . . . . . R . . . . . . .', b.c, 'hammer');
  return voice(HAMMER, b.c, 'hammer');
});

const BASS = {
  thin: 'R - - . . . . . R - - . . . . .',
  drive: 'R . R R . R R . R . R R . R O R',
  B: 'R - - R - - R - R - - R - - F -',
  fill: 'R R R R F F F F S S S S O O O O',
};
const v5 = FORM.map((b) => {
  if (bare(b) || b.part === 'intro') return voice(BASS.thin, b.c, 'bass');
  if (isFill(b)) return voice(BASS.fill, b.c, 'bass');
  return voice(inB(b) ? BASS.B : BASS.drive, b.c, 'bass');
});

const KICK = {
  one: 'C4 . . . . . . . C4 . . . . . . .',
  drive: 'C4 . . C4 . . C4 . C4 . . C4 . . C4 .',
  B: 'C4 . . . . . C4 . C4 . . . . . . .',
};
const v6 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar < 2) return R;
  return tag(bare(b) || b.part === 'intro' ? KICK.one : inB(b) ? KICK.B : KICK.drive, 'kick');
});

const v7 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar < 3) return R;
  if (bare(b)) return R;
  if (isFill(b)) return tag('. . . . C4 . . . C4 . C4 C4 C4 C4 C4 C4', 'snare');
  if (b.part === 'A') return '. . . . C4:snare/@70 . . . . . . . C4:snare/@70 . . .';
  return '. . . . C4:snare . . . . . . C4:snare/@40 C4:snare . . .';
});

const v8 = FORM.map((b) => {
  if (b.part === 'intro' || bare(b)) return R;
  if (b.part === 'A') return hats('. . c . . . c . . . c . . . c .');
  if (inB(b)) return hats('c . c . c . c . c . c . c . o -');
  return hats('c c o c c o c c c c o c c o c c');
});

export default {
  tempo: 7,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 40, room: 'room', evol: 28 },
  instruments: {
    lead: { ...INSTRUMENTS.piano, vol: 104 },
    sing: { ...INSTRUMENTS.strings, adsr: [11, 4, 6, 8], vol: 88, vibrato: { delay: 14, period: 14, depth: 0.2 } },
    counter: { ...INSTRUMENTS.strings, adsr: [10, 4, 6, 6], vol: 44, pitch: vibrato(0.12, 16, 20) },
    grind: { ...INSTRUMENTS.strings, adsr: [15, 5, 3, 18], vol: 56 },
    hammer: { ...INSTRUMENTS.piano, vol: 62 },
    bell: { ...INSTRUMENTS.bell, vol: 36 },
    bass: { ...INSTRUMENTS.synbass, adsr: [15, 5, 4, 20], vol: 94 },
    kick: { ...INSTRUMENTS.gkick, vol: 106 },
    snare: { ...INSTRUMENTS.gsnare, vol: 88 },
    chat: { ...INSTRUMENTS.chat, vol: 24 },
    ohat: { ...INSTRUMENTS.ohat, vol: 20 },
  },
  v1: { rows: bars(v1, BAR_ROWS), pan: -20 },
  v2: { rows: bars(v2, BAR_ROWS), pan: 60 },
  v3: { rows: bars(v3, BAR_ROWS), pan: -60 },
  v4: { rows: bars(v4, BAR_ROWS), pan: 40 },
  v5: { rows: bars(v5, BAR_ROWS) },
  v6: { rows: bars(v6, BAR_ROWS) },
  v7: { rows: bars(v7, BAR_ROWS), pan: 10 },
  v8: { rows: bars(v8, BAR_ROWS), pan: -40 },
};

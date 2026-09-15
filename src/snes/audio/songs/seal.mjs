// The Great Seal, its own song (item 2197): C minor at 100 bpm, felt in half time, vast and slow.
// Strings state a five-note oath low and patient (C, G, then E flat, D, C falling back), slow
// strings hold the chords like a sky, strings turn eighth-note arpeggios underneath, and a low bell
// tolls each phrase head. B moves by chromatic mediants (E flat minor, B major, A flat minor, E
// major): the ground tilting away, the tune passed to the slow strings. The breakdown sits on C
// against D flat with timpani and slow strings alone, and the return brings a string counter-line
// over the full half-time kit. No brass (Tim: too shrill).
//
// v1 lead: string oath, slow strings in B | v2 string counter | v3 string arpeggios | v4 bell, timpani
// in the breakdown | v5 synth bass | v6 kick | v7 snare and fills | v8 slow strings, hats in the return

import { bars, hats, rest, section, voice } from './chase-kit.mjs';
import { tag, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);
const HOLD = (letter) => [letter, ...Array(BAR_ROWS - 1).fill('-')].join(' ');

const INTRO_CHORDS = ['Cm', 'Cm', 'Ab', 'G'];

const A_CHORDS = ['Cm', 'Cm', 'Ab', 'Ab', 'Fm', 'Db', 'G', 'G'];
export const A_LEAD = [
  'C4/v - - - - - - - G4 - - - - - - -',
  'Eb4 - - - D4 - - - C4 - - - G4/v - - -',
  'Ab4/v - - - - - - - Eb4 - - - - - - -',
  'C5 - - - Bb4 - - - Ab4 - - - Eb4/v - - -',
  'F4/v - - - - - - - C5 - - - - - - -',
  'Db5 - - - C5 - - - Ab4 - - - F4/v - - -',
  'G4/v - - - - - - - B4 - - - D5 - - -',
  'D5/v - - - - - - - - - - - B4 - G4 -',
];

const B_CHORDS = ['Ebm', 'B', 'Ebm', 'B', 'Abm', 'E', 'G', 'G'];
const B_LEAD = [
  'Bb4/v - - - - - - - - - - - Gb4 - Bb4 -',
  'D#5/v - - - - - - - - - - - B4 - F#4 -',
  'Eb5/v - - - - - - - Db5 - Bb4 - Gb4 - Bb4 -',
  'F#4/v - - - - - - - - - - - . . . .',
  'Eb5/v - - - - - - - B4 - - - Ab4 - - -',
  'G#4/v - - - - - - - B4 - - - E5 - - -',
  'D5/v - - - - - - - - - - - B4 - - -',
  'G4/v - - - - - - - F4 - Eb4 - D4 - B3 -',
];

const BREAK_CHORDS = ['Cm', 'Db', 'Cm', 'Db', 'Cm', 'Db', 'G', 'G'];
const BREAK_LEAD = [R, R, R, R,
  'C4/v - - - - - - - G4 - - - - - - -',
  'Db4/v - - - - - - - Ab4 - - - - - - -',
  'G4/v - - - - - - - - - - - B4 - - -',
  'D5/v - - - - - - - - - - - . . . .',
];

const TURN_CHORDS = ['Ab', 'Fm', 'G', 'G'];
const TURN_LEAD = [
  'C5 - - - D5 - - - Ab4/v - - - - - - -',
  'F4 - - - Ab4 - - - C5/v - - - - - - -',
  'B4/v - - - - - - - D5 - - - - - - -',
  'G4/v - - - - - - - - - - - . . . .',
];

export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...section('intro', INTRO_CHORDS, [R, R, R, R]),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('A2', A_CHORDS, A_LEAD),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('break', BREAK_CHORDS, BREAK_LEAD),
  ...section('A3', A_CHORDS, A_LEAD),
  ...section('turn', TURN_CHORDS, TURN_LEAD),
];

const phrase = (b) => (b.part === 'intro' || b.part === 'turn' ? 4 : 8);
const isFill = (b) => b.bar === phrase(b) - 1;
const bareBreak = (b) => b.part === 'break' && b.bar < 4;
const full = (b) => b.part === 'A2' || b.part === 'A3' || b.part === 'turn' || (b.part === 'break' && b.bar >= 4);

const marked = (rows, inst) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? t.replace(/^[^/]+/, `$&:${inst}`) : t)).join(' ');
const v1 = FORM.map((b) => marked(b.lead, b.part === 'B' ? 'sing' : 'lead'));

const v2 = FORM.map((b) => {
  if (b.part === 'A3' || b.part === 'turn') return voice('F - - - - - - - T - - - - - - -', b.c, 'counter', 24);
  if (b.part === 'B') return voice('R - - - - - - - F - - - - - - -', b.c, 'counter', 12);
  return R;
});

const ARP = {
  slow: 'R . F . O . F . R . F . O . F .',
  turn: 'R . F . O . T . F . O . T . F .',
};
const v3 = FORM.map((b) => {
  if ((b.part === 'intro' && b.bar < 2) || bareBreak(b)) return R;
  return voice(b.part === 'B' || b.part === 'A3' ? ARP.turn : ARP.slow, b.c, 'arp', 12);
});

const v4 = FORM.map((b) => {
  if (b.part === 'break') return voice(b.bar === 7 ? 'R R R R R R R R R R R R R R R R' : 'R - - - - - - - . . . . R . R .', b.c, 'timpani');
  if (b.bar % 4 === 0) return voice('R - - - - - - - - - - - . . . .', b.c, 'bell', 12);
  return R;
});

const v5 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar < 2) return voice('R - - - - - - - - - - - - - - -', b.c, 'bass');
  if (isFill(b) && b.part !== 'intro') return voice('R - - - R - - - F - - - S - O -', b.c, 'bass');
  return voice(full(b) ? 'R - - - - - R - R - - - - - F -' : 'R - - - - - - - R - - - - - - -', b.c, 'bass');
});

const v6 = FORM.map((b) => {
  if (b.part === 'intro' || bareBreak(b)) return R;
  if (b.part === 'A' || b.part === 'B') return tag('C4 . . . . . . . . . . . . . . .', 'kick');
  return tag('C4 . . . . . . . . . C4 . . . . .', 'kick');
});

const v7 = FORM.map((b) => {
  if (b.part === 'intro' || bareBreak(b) || b.part === 'A') return R;
  if (isFill(b)) return tag('. . . . . . . . C4 . . . C4 . C4 C4', 'snare');
  return tag('. . . . . . . . C4 . . . . . . .', 'snare');
});

const v8 = FORM.map((b) => {
  if (b.part === 'A3' || b.part === 'turn') return hats('c . . . c . . . c . . . c . o -');
  if (b.part === 'A2') return voice(HOLD('T'), b.c, 'sky', 24);
  return voice(HOLD('R'), b.c, 'sky', 24);
});

export default {
  tempo: 9,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 38, room: 'cathedral', evol: 36 },
  instruments: {
    lead: { ...INSTRUMENTS.strings, adsr: [10, 4, 6, 8], vol: 96, vibrato: { delay: 16, period: 14, depth: 0.2 }, glide: 6 },
    sing: { ...INSTRUMENTS.slowstr, vol: 100, vibrato: { delay: 18, period: 16, depth: 0.15 } },
    counter: { ...INSTRUMENTS.strings, adsr: [9, 4, 6, 6], vol: 42, pitch: vibrato(0.12, 16, 20) },
    organ: { ...INSTRUMENTS.strings, adsr: [11, 7, 7, 1], vol: 48, pitch: vibrato(0.05, 40) },
    arp: { ...INSTRUMENTS.strings, adsr: [14, 6, 4, 14], vol: 46 },
    bell: { ...INSTRUMENTS.bell, vol: 38 },
    timpani: { ...INSTRUMENTS.timpani, vol: 96 },
    bass: { ...INSTRUMENTS.synbass, adsr: [12, 4, 6, 10], vol: 88 },
    kick: { ...INSTRUMENTS.gkick, vol: 104 },
    snare: { ...INSTRUMENTS.gsnare, vol: 92 },
    chat: { ...INSTRUMENTS.chat, vol: 20 },
    ohat: { ...INSTRUMENTS.ohat, vol: 16 },
    sky: { ...INSTRUMENTS.slowstr, vol: 50 },
  },
  v1: { rows: bars(v1, BAR_ROWS), pan: -15 },
  v2: { rows: bars(v2, BAR_ROWS), pan: 60 },
  v3: { rows: bars(v3, BAR_ROWS), pan: -60 },
  v4: { rows: bars(v4, BAR_ROWS), pan: 40 },
  v5: { rows: bars(v5, BAR_ROWS) },
  v6: { rows: bars(v6, BAR_ROWS) },
  v7: { rows: bars(v7, BAR_ROWS), pan: 10 },
  v8: { rows: bars(v8, BAR_ROWS), pan: -30 },
};

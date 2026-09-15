// The ending, written from scratch as corporate wave: Eb major at about 90 bpm, a sax that takes its
// time over held pads, choir and strings, a synth bass that holds, soft drums and a long echo. No
// plucked keys, bells or hits. About 2:15 and it does not loop: intro, A, B, A again, a bridge where
// the choir sings the tune, the last A lifted a half step to E, and an outro that hangs on the major
// seventh while the echo rings out over two silent bars.
//
// v1 alto sax lead (choir in the bridge) | v2 strings counter-line | v3 pad on the third, left |
// v4 pad on the seventh, right | v5 choir on the fifth | v6 synth bass | v7 soft kick and snare | v8 hats

import { bars, hats, rest, section, voice } from './chase-kit.mjs';
import { tag, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
export const TAIL_BARS = 2;
const R = rest(BAR_ROWS);

const A_CHORDS = ['Ebmaj7', 'Cm7', 'Abmaj7', 'Bb', 'Gm7', 'Cm7', 'Fm7', 'Bb7'];
const A_LEAD = [
  'G5 - - - - - - - Bb5 - - - - - - -',
  'G5 - - - - - Eb5 - C5 - - - - - - -',
  'C5 - - - - - Eb5 - G5 - - - - - Ab5 -',
  'F5 - - - - - - - - - - - D5 - - -',
  'D5 - - - - - - - F5 - - - Bb5 - - -',
  'G5 - - - - - - - Eb5 - - - - - - -',
  'Ab5 - - - - - - - C6 - - - Eb5 - - -',
  'D5 - - - - - - - - - - - . . . .',
];

const B_CHORDS = ['Abmaj7', 'Bb', 'Gm7', 'Cm7', 'Abmaj7', 'Bb', 'Ebmaj7', 'Bb7'];
const B_LEAD = [
  'C6 - - - - - - - Bb5 - Ab5 - G5 - - -',
  'F5 - - - - - - - D5 - - - Bb4 - - -',
  'D5 - - - - - F5 - Bb5 - - - - - - -',
  'G5 - - - - - - - Eb5 - - - C5 - - -',
  'Eb5 - - - - - - - G5 - - - C6 - - -',
  'D6 - - - - - - - Bb5 - - - F5 - - -',
  'G5 - - - - - - - - - - - Bb5 - - -',
  'Ab5 - - - - - - - F5 - - - D5 - - -',
];

const BRIDGE_CHORDS = ['Cm7', 'Abmaj7', 'Fm7', 'Bb7', 'Cm7', 'Abmaj7', 'Fm7', 'Bb7'];
const BRIDGE_LEAD = [
  'G4 - - - - - - - - - - - Bb4 - - -',
  'C5 - - - - - - - - - - - Eb5 - - -',
  'Ab4 - - - - - - - C5 - - - - - - -',
  'D5 - - - - - - - - - - - . . . .',
  'G5 - - - - - - - - - - - Bb5 - - -',
  'C6 - - - - - - - - - - - Eb6 - - -',
  'C6 - - - - - - - Ab5 - - - F5 - - -',
  'D5 - - - - - - - F5 - - - Ab5 - - -',
];

const INTRO_CHORDS = ['Ebmaj7', 'Abmaj7', 'Ebmaj7', 'Bb7'];
const INTRO_LEAD = [R, R, R, 'Bb4 - - - - - - - D5 - - - F5 - - -'];
const OUTRO_CHORDS = ['Abmaj7', 'Bb', 'Ebmaj7', 'Ebmaj7'];
const OUTRO_LEAD = [
  'C6 - - - - - - - Bb5 - - - G5 - - -',
  'F5 - - - - - - - D5 - - - Bb4 - - -',
  'Eb5 - - - - - - - G5 - - - Bb5 - - -',
  'D6 - - - - - - - - - - - - - - -',
];

export const FORM = [
  ...section('intro', INTRO_CHORDS, INTRO_LEAD),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('bridge', BRIDGE_CHORDS, BRIDGE_LEAD),
  ...section('A', A_CHORDS, A_LEAD, 1),
  ...section('outro', OUTRO_CHORDS, OUTRO_LEAD, 1),
];
export const LAST = FORM.length - 1;

const HELD = (letter) => [letter, ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const withTail = (list) => [...list, ...Array(TAIL_BARS).fill(R)];

const v1 = FORM.map((b) => tag(b.lead, b.part === 'bridge' ? 'voices' : 'sax'));

const COUNTER = {
  intro: 'T - - - - - - - F - - - - - - -',
  A: 'F - - - - - - - - - - - - - - -',
  B: 'T - - - - - - - S - - - - - - -',
  bridge: 'O - - - - - - - - - - - - - - -',
  outro: 'F - - - - - - - T - - - - - - -',
};
const v2 = FORM.map((b) => voice(COUNTER[b.part], b.c, 'strings', 24));
const v3 = FORM.map((b) => voice(HELD('T'), b.c, 'padL', 24));
const v4 = FORM.map((b) => voice(HELD('S'), b.c, 'padR', 24));
const v5 = FORM.map((b) => (b.part === 'B' || (b.part === 'A' && b.shift) || b.part === 'outro' ? voice(HELD('F'), b.c, 'choir', 24) : R));
const v6 = FORM.map((b) => voice(b.part === 'bridge' || b.part === 'outro' ? HELD('R') : 'R - - - - - - - - - - - F - - -', b.c, 'bass', 12));

const kit = (p) => p.split(' ').map((t) => ({ K: 'C4:kick', S: 'C4:snare' })[t] ?? t).join(' ');
const v7 = FORM.map((b) => (b.part === 'intro' || b.part === 'bridge' || (b.part === 'outro' && b.bar > 1) ? R : kit('K . . . S . . . . . K . S . . .')));
const v8 = FORM.map((b) => (b.part === 'A' || b.part === 'B' ? hats('c . c . c . c . c . c . c . o -') : R));

export default {
  tempo: 10,
  loop: null,
  echo: { mvol: 76, evol: 54, efb: 82, edl: 6, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    sax: { ...INSTRUMENTS.sax, adsr: [11, 4, 6, 5], vol: 86, pan: -6, pitch: vibrato(0.12, 20, 24) },
    voices: { ...INSTRUMENTS.choir, adsr: [10, 3, 6, 2], vol: 80, pan: -6, pitch: vibrato(0.1, 22, 24) },
    strings: { ...INSTRUMENTS.strings, adsr: [9, 3, 6, 2], vol: 48, pan: 30 },
    padL: { ...INSTRUMENTS.pad, adsr: [8, 2, 6, 0], vol: 46, pan: -44 },
    padR: { ...INSTRUMENTS.pad, adsr: [8, 2, 6, 0], vol: 46, pan: 44 },
    choir: { ...INSTRUMENTS.choir, adsr: [8, 3, 6, 2], vol: 36, pan: -20 },
    bass: { ...INSTRUMENTS.synbass, adsr: [12, 2, 6, 10], vol: 80 },
    kick: { ...INSTRUMENTS.gkick, vol: 70 },
    snare: { ...INSTRUMENTS.gsnare, vol: 48, pan: 8 },
    chat: { ...INSTRUMENTS.chat, vol: 30 },
    ohat: { ...INSTRUMENTS.ohat, vol: 26 },
  },
  v1: { rows: bars(withTail(v1), BAR_ROWS) },
  v2: { rows: bars(withTail(v2), BAR_ROWS) },
  v3: { rows: bars(withTail(v3), BAR_ROWS) },
  v4: { rows: bars(withTail(v4), BAR_ROWS) },
  v5: { rows: bars(withTail(v5), BAR_ROWS) },
  v6: { rows: bars(withTail(v6), BAR_ROWS) },
  v7: { rows: bars(withTail(v7), BAR_ROWS) },
  v8: { rows: bars(withTail(v8), BAR_ROWS) },
};

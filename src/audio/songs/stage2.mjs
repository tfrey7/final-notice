// Stage 2, Records Retention: an urgent escape chase in C minor at 180 BPM on sixteenth rows. The
// VRC6 saw carries the lead as synth brass; the triangle drives octave eighths, the VRC6 pulses run
// detuned sixteenth arpeggios a row apart, pulse 1 stabs the offbeats and harmonises the B section,
// pulse 2 sounds the alarm then shadows the brass, and DPCM drums push a broken four. The title's hook
// is quoted once, in the intro (docs/MUSIC.md).
//
// 72 bars, 96 s: intro 4 | A 16 | B 16 | half-time breakdown 8 | A up a tone 16 | B up a tone 8 |
// tag 4, looping to the end of the intro.

import { REST, chord, echo, fold, nameOf, pitchClasses, play, tag, thirdBelow, transpose, vibrato } from './kit.mjs';

export const SCALE = ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb', 'B'];

const A_CHORDS = ['Cm9', 'Abmaj7', 'Bb9', 'Gm7', 'Cm9', 'Abmaj7', 'Fm9', 'G7'];
const A_LEAD = [
  'C5 - . C5 . . Bb4 - C5 - Eb5 - F5 - G5 -',
  'Ab4 - - - - - - - G4 - Ab4 - C5 - Eb5 -',
  'D5 - - - - - Bb4 - - - C5 - D5 - F5 -',
  'D5 - - - - - - - - - - - . . Bb4 B4',
  'G5 - . G5 . . F5 - G5 - Bb5 - Ab5 - G5 -',
  'C5 - - - - - - - Ab4 - C5 - Eb5 - G5 -',
  'Ab5 - - - G5 - - - F5 - - - Eb5 - D5 -',
  'D5 - - - - - - - B4 - - - D5 - F5 -',
];
const A2_LEAD = [
  ...A_LEAD.slice(0, 6),
  'Ab5 - G5 - F5 - Eb5 - F5 - G5 - Ab5 - Bb5 -',
  'B5 - - - - - - - - - - - . . . .',
];

const B_CHORDS = ['Fm9', 'Bb9', 'Ebmaj9', 'Abmaj7', 'Dm7b5', 'G7', 'Cm9', 'G7'];
const B_LEAD = [
  'C6 - - - - - - - Bb5 - - - Ab5 - - -',
  'D6 - - - - - - - C6 - - - Bb5 - - -',
  'G5 - - - - - - - F5 - G5 - Bb5 - D6 -',
  'C6 - - - - - - - - - - - . . . .',
  'Ab5 - - - - - - - F5 - - - D5 - F5 -',
  'G5 - - - - - - - B5 - - - D6 - - -',
  'Eb6 - - - D6 - - - C6 - - - G5 - - -',
  'B5 - - - - - - - . . . . D6 - F6 -',
];
const B2_LEAD = [...B_LEAD.slice(0, 7), 'B5 - - - - - - - - - - - . . . .'];

const BREAK_CHORDS = ['Cm9', 'Cm9', 'Abmaj7', 'Abmaj7', 'Cm9', 'Cm9', 'Abmaj7', 'G7'];
const BREAK_LEAD = [
  REST, REST, REST, REST,
  'G5 - - - - - - - - - - - - - - -',
  'Ab5 - - - - - - - - - - - - - - -',
  'Bb5 - - - - - - - - - - - - - - -',
  'B5 - - - - - - - D6 - F6 - G6 - B6 -',
];

const TAG_CHORDS = ['Fm9', 'G7', 'Fm9', 'G7'];
const TAG_LEAD = [
  'Ab5 - G5 - F5 - Eb5 - D5 - C5 - B4 - D5 -',
  'G5 - - - - - - - - - - - . . . .',
  'Ab5 - G5 - F5 - Eb5 - F5 - G5 - Ab5 - Bb5 -',
  'B5 - - - - - - - D6 - - - F6 - - -',
];

const section = (part, chords, leads, shift = 0) =>
  chords.map((symbol, i) => ({ part, symbol, lead: leads[i], shift, last: i === chords.length - 1 }));

export const FORM = [
  ...section('intro', ['Cm9', 'Cm9', 'Abmaj7', 'G7'], [REST, REST, REST, REST]),
  ...section('A', [...A_CHORDS, ...A_CHORDS], [...A_LEAD, ...A2_LEAD]),
  ...section('B', [...B_CHORDS, ...B_CHORDS], [...B_LEAD, ...B2_LEAD]),
  ...section('breakdown', BREAK_CHORDS, BREAK_LEAD),
  ...section('return', [...A_CHORDS, ...A_CHORDS], [...A_LEAD, ...A2_LEAD], 2),
  ...section('climax', B_CHORDS, B2_LEAD, 2),
  ...section('tag', TAG_CHORDS, TAG_LEAD),
];
export const LOOP_BAR = 4;
export const LEAD = 'saw';

const SINGING = ['B', 'climax'];
const leads = FORM.map((b) => transpose(b.lead, b.shift));
const saw = leads.map((bar) => tag(bar, 'brass'));

const NOD = 'G4 - C5 - Eb5 - D5 - C5 - - - - - - -';
const STABS = '. . X - . . X - . . X - . X - .';
const pulse1 = FORM.map((b, i) => {
  if (b.part === 'intro') return i === 2 ? tag(NOD, 'nod') : REST;
  if (b.part === 'breakdown') return REST;
  if (SINGING.includes(b.part)) {
    const scale = pitchClasses(SCALE, b.shift);
    return leads[i].split(' ').map((t) => (/^[A-G]/.test(t) ? `${thirdBelow(t, scale)}:harm` : t)).join(' ');
  }
  const { root, tones } = chord(b.symbol, b.shift);
  const third = nameOf(fold(root + tones[1], 60, 72));
  return STABS.split(' ').map((t) => (t === 'X' ? `${third}:stab` : t)).join(' ');
});

const shadows = echo(leads, 2, 'echo');
const pulse2 = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? tag('C6 - - - - - - - G5 - - - - - - -', 'siren') : REST;
  return shadows[i];
});

const ARP = [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6];
const arp = ({ root, tones }, inst) =>
  ARP.map((k) => `${nameOf(root + 12 + tones[k % tones.length] + 12 * Math.floor(k / tones.length))}:${inst}`).join(' ');
const arpBar = (b, i) => !(b.part === 'breakdown' || (b.part === 'intro' && i < 2));
const HOLD = 'X - - - - - - - - - - - - - - -';
const pad = (b, tone, lo, hi, inst) => {
  const { root, tones } = chord(b.symbol, b.shift);
  return b.part === 'intro' ? REST : HOLD.replace('X', `${nameOf(fold(root + tones[tone], lo, hi))}:${inst}`);
};
const vrc6p1 = FORM.map((b, i) => (arpBar(b, i) ? arp(chord(b.symbol, b.shift), 'arp1') : pad(b, 1, 57, 69, 'pad1')));
const arpShadow = echo(FORM.map((b) => arp(chord(b.symbol, b.shift), 'arp2')), 1, 'arp2');
const vrc6p2 = FORM.map((b, i) => (arpBar(b, i) ? arpShadow[i] : pad(b, 3, 62, 74, 'pad2')));

const triangle = FORM.map((b) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'breakdown') return play('R - - - - - - - - - - - F - - -', c, 'long');
  return play(b.last ? 'R - O - R - O - F - F - S - O -' : 'R - O - R - O - R - O - R - O -', c, 'drive');
});

const noise = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? '1 . 1 . 1 . 1 . 1 . 1 . 1 . 1 .' : '. . 1 . . . 1 . . . 1 . . . 0:open -';
  if (b.part === 'breakdown') return b.last ? '. . . . . . . . 3 3 2 2 1 1 0 0' : REST;
  if (SINGING.includes(b.part)) return '1 . 1 1 1 . 1 1 1 . 1 1 1 . 0:open -';
  return '. . 1 . . . 1 . . . 1 . . . 0:open -';
});

const DRUMS = {
  groove: 'F - - - F:snare - - - F - F - F:snare - - F',
  fill: 'F - - - F:snare - - - F:snare D:snare F:snare C:snare F:snare B:snare F:snare A:snare',
  half: 'F - - - - - - - F:snare - - - - - - -',
};
const dpcm = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? REST : i === 3 ? DRUMS.fill : DRUMS.groove;
  if (b.last) return DRUMS.fill;
  return b.part === 'breakdown' ? DRUMS.half : DRUMS.groove;
});

const join = (bars) => bars.join(' | ');
const siren = Array.from({ length: 60 }, (_, f) => +(0.4 * Math.sin((2 * Math.PI * f) / 15)).toFixed(3));

export default {
  tempo: 5,
  loop: LOOP_BAR * 16,
  instruments: {
    brass: { env: [9, 11, 13, 14, 14, 13, 13, 12, 12, 12, 11, 11, 11, 10], pitch: vibrato(0.18, 12, 20), glide: 2 },
    nod: { duty: 2, env: [10, 10, 9, 9, 8, 8, 7] },
    stab: { duty: 0, env: [12, 10, 7, 4, 2, 0] },
    harm: { duty: 1, env: [8, 8, 7, 7, 6, 6, 6, 5] },
    siren: { duty: 1, env: [9, 9, 8, 8, 8, 7, 7, 7, 6, 6, 6, 6, 5], pitch: siren },
    echo: { duty: 2, env: [4, 4, 3, 3, 3, 2, 2, 1, 0], pitch: [0.1] },
    arp1: { duty: 3, env: [8, 6, 5, 4, 3, 2] },
    arp2: { duty: 5, env: [5, 4, 3, 2, 1, 0], pitch: [0.1] },
    pad1: { duty: 1, env: [2, 3, 4, 5, 6, 7, 7, 7, 7, 6], pitch: vibrato(0.07, 23) },
    pad2: { duty: 3, env: [2, 3, 4, 5, 5, 6, 6, 6, 6, 5], pitch: vibrato(0.07, 31).map((v) => +(v + 0.1).toFixed(3)) },
    drive: { env: [15, 15, 15, 15, 15, 15, 0] },
    long: { env: [15] },
    hat: { short: true, env: [4, 2, 1, 0] },
    open: { short: true, env: [5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0] },
    kick: { sample: 'kick' },
    snare: { sample: 'snare', env: [13] },
  },
  pulse1: { inst: 'stab', rows: join(pulse1) },
  pulse2: { inst: 'echo', rows: join(pulse2) },
  triangle: { inst: 'drive', rows: join(triangle) },
  noise: { inst: 'hat', rows: join(noise) },
  vrc6p1: { inst: 'arp1', rows: join(vrc6p1) },
  vrc6p2: { inst: 'arp2', rows: join(vrc6p2) },
  saw: { inst: 'brass', rows: join(saw) },
  dpcm: { inst: 'kick', rows: join(dpcm) },
};

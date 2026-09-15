// The boss fight (docs/MUSIC.md): E minor with a phrygian F, 150 BPM on sixteenth rows. A relentless
// Sunsoft saw bass in octaves, a thin 12.5% 2A03 lead that screams and slides, VRC6 tremolo pulses
// that tighten the screw, DPCM kick and snare. The hook gets one low nod in the intro; everything
// else is the boss's own.
//
// 40 bars, 64 s: intro 4 | riff 8 | build 8 | phase change (half time, phrygian) 8 | riff up a minor
// third 8 | tag 4, looping to the end of the intro.

import { REST, chord, fold, nameOf, play, tag, transpose, vibrato } from './kit.mjs';

export const SCALE = ['E', 'F', 'F#', 'G', 'A', 'B', 'C', 'D', 'D#'];
export const HOOK = 'B3 - - - E4 - - - G4 - - F#4 - - E4 - | D#4 - - - B3 - - - - - - - . . . .';

const RIFF_CHORDS = ['Em7', 'Em7', 'Cmaj7', 'B7', 'Em7', 'Em7', 'Cmaj7', 'B7'];
const RIFF_LEAD = [
  'E5 - - E5 - - G5 - - A5 - B5 - - D6 -',
  'B5 - - - - - A5 - G5 - F#5 - G5 - A5 -',
  'G5 - - - - - E5 - - - C5 - E5 - G5 -',
  'F#5 - - - - - - - D#5 - - - F#5 - A5 -',
  'E5 - - E5 - - G5 - - A5 - B5 - - E6 -',
  'D6 - - - B5 - - - C6 - B5 - A5 - G5 -',
  'C6 - - - B5 - - - G5 - - - E5 - F5 -',
  'D#5 - - - - - - - - - - - . . . .',
];

const BUILD_CHORDS = ['Am7', 'Am7', 'Cmaj7', 'Cmaj7', 'D7', 'D7', 'B7', 'B7'];
const BUILD_LEAD = [
  'A4 - - - - - - - C5 - - - E5 - - -',
  'A4 - - - - - - - C5 - - - E5 - G5 -',
  'B4 - - - - - - - E5 - - - G5 - - -',
  'B4 - - - - - - - E5 - - - G5 - B5 -',
  'C5 - - - - - - - F#5 - - - A5 - - -',
  'C5 - F#5 - A5 - C6 - D6 - C6 - A5 - F#5 -',
  'D#5 - F#5 - A5 - B5 - D#6 - B5 - A5 - F#5 -',
  'B5 . B5 . B5 . B5 . D#6 . D#6 . F#6 - - -',
];

const PHASE_CHORDS = ['Em7', 'Fmaj7', 'Em7', 'Fmaj7', 'Dm7', 'Em7', 'B7', 'B7'];
const PHASE_LEAD = [
  'B5 - - - - - - - - - - - - - - -',
  'C6 - - - - - - - - - - - A5 - - -',
  'B5 - - - - - - - G5 - - - E5 - - -',
  'F5 - - - - - - - - - - - E5 - F5 -',
  'D5 - - - - - - - F5 - - - A5 - - -',
  'G5 - - - - - - - B5 - - - E6 - - -',
  'D#6 - - - - - - - - - - - B5 - - -',
  'F#5 - - - A5 - - - B5 - - - D#6 - - -',
];

const TAG_CHORDS = ['Cmaj7', 'B7', 'Cmaj7', 'B7'];
const TAG_LEAD = [
  'E6 - D6 - C6 - B5 - C6 - B5 - A5 - G5 -',
  'F#5 - - - - - - - D#5 - - - B4 - - -',
  'E6 - D6 - C6 - B5 - C6 - D6 - E6 - F#6 -',
  'D#6 - - - - - - - . . . . . . . .',
];

const section = (part, chords, leads, shift = 0) =>
  chords.map((symbol, i) => ({ part, symbol, lead: leads[i], shift, last: i === chords.length - 1 }));

export const FORM = [
  ...section('intro', ['Em7', 'Em7', 'Em7', 'B7'], [REST, REST, REST, REST]),
  ...section('riff', RIFF_CHORDS, RIFF_LEAD),
  ...section('build', BUILD_CHORDS, BUILD_LEAD),
  ...section('phase', PHASE_CHORDS, PHASE_LEAD),
  ...section('riff up', RIFF_CHORDS, RIFF_LEAD, 3),
  ...section('tag', TAG_CHORDS, TAG_LEAD),
];
export const LOOP_BAR = 4;
export const LEAD = 'pulse1';

const leads = FORM.map((b) => transpose(b.lead, b.shift));
const pulse1 = FORM.map((b, i) => tag(leads[i], b.part === 'phase' ? 'scream' : 'lead'));

// Pulse 2: a siren in the intro, then the hook once, low; off-beat stabs on the chord's seventh after.
const hookBars = HOOK.split(' | ');
const STAB = '. . X . . . X . . . X . . X . X';
const pulse2 = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? tag('E5 - - - - - - - F5 - - - - - - -', 'siren') : tag(hookBars[i - 2], 'nod');
  if (b.part === 'phase') return REST;
  const { root, tones } = chord(b.symbol, b.shift);
  const note = nameOf(fold(root + tones[3], 62, 74));
  return STAB.split(' ').map((t) => (t === 'X' ? `${note}:stab` : t)).join(' ');
});

// VRC6 tremolo: the third and fifth hammered on sixteenths, louder bar by bar through the build.
const TREM = Array(16).fill('X').join(' ');
const trem = (tone, lo, hi, base) =>
  FORM.map((b, i) => {
    const { root, tones } = chord(b.symbol, b.shift);
    const note = nameOf(fold(root + tones[tone], lo, hi));
    if (b.part === 'intro') return REST;
    if (b.part === 'phase') return `${note}:${base}pad ${Array(15).fill('-').join(' ')}`;
    const inst = b.part === 'build' ? `${base}t${Math.min(3, Math.floor((i - 12) / 2))}` : `${base}t1`;
    return TREM.split(' ').map((t, r) => (r % 2 ? '.' : `${note}:${inst}`)).join(' ');
  });

const BASS = {
  riff: 'R R O R R R O R R R O R R O R O',
  fill: 'R R O R R R O R F F S S O O O O',
  build: 'R . R . R . R . R R R R O O O O',
  phase: 'R - - - - - - - L - - - R - O -',
};
const saw = FORM.map((b) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'build') return play(b.last ? BASS.fill : BASS.build, c, 'bass');
  if (b.part === 'phase') return play(BASS.phase, c, 'bass');
  return play(b.last ? BASS.fill : BASS.riff, c, 'bass');
});

const triangle = FORM.map((b) => {
  const c = chord(b.symbol, b.shift);
  return b.part === 'phase' ? play('L - - - - - - - - - - - - - - -', c, 'sub') : play('L - . . L - . L . . L - . . L .', c, 'sub');
});

const noise = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 3 ? '1 . 1 . 1 . 1 . 1 . 1 . 1 . 1 .' : '1 1 1 1 1 1 1 1 3:snr 3:snr 2:snr 2:snr 1:snr 1:snr 0:snr 0:snr';
  if (b.part === 'build') {
    const k = i - 12;
    return k < 4 ? '1 . 1 1 1 . 1 1 1 . 1 1 1 . 1 1' : k < 7 ? '1 1 1 1 3:snr . 1 1 1 1 1 1 3:snr . 3:snr .' : Array(16).fill('3:snr').join(' ');
  }
  if (b.part === 'phase') return '. . 1 . . . 1 . . . 1 . . . 0:open -';
  return '1 . 1 1 1 . 1 1 1 . 1 1 1 . 0:open -';
});

const DRUMS = {
  riff: 'F - - F F:snare - - - F - F - F:snare - - -',
  build: 'F - F - F:snare - F - F - F - F:snare - F -',
  roll: 'F:snare F:snare F:snare F:snare F:snare F:snare F:snare F:snare E:snare E:snare D:snare D:snare C:snare C:snare B:snare A:snare',
  phase: 'F - - - - - - - F:snare - - - - - - -',
  fill: 'F - - F F:snare - - - F:snare - F:snare - D:snare - C:snare -',
};
const dpcm = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? REST : i === 3 ? DRUMS.fill : 'F - - - F - - - F - - - F - - -';
  if (b.part === 'build') return b.last ? DRUMS.roll : DRUMS.build;
  if (b.part === 'phase') return b.last ? DRUMS.fill : DRUMS.phase;
  return b.last ? DRUMS.fill : DRUMS.riff;
});

const join = (bars) => bars.join(' | ');
const siren = Array.from({ length: 100 }, (_, f) => +(0.5 * Math.sin((2 * Math.PI * f) / 12)).toFixed(3));
const tremInst = (duty, vol, detune = 0) => ({ duty, env: [vol, vol - 2, vol - 4, 0], pitch: [detune] });

export default {
  tempo: 6,
  loop: LOOP_BAR * 16,
  instruments: {
    lead: { duty: 0, env: [15, 14, 13, 12, 12, 11, 11, 10, 10, 10, 9], pitch: vibrato(0.25, 8, 12), glide: 1 },
    scream: { duty: 0, env: [15, 15, 14, 14, 13, 13, 13, 12], pitch: vibrato(0.4, 6, 18), glide: 3 },
    siren: { duty: 1, env: [8, 8, 8, 7, 7, 7, 6], pitch: siren },
    nod: { duty: 2, env: [9, 9, 8, 8, 7, 7, 6, 6, 5] },
    stab: { duty: 1, env: [10, 8, 5, 3, 1, 0] },
    at0: tremInst(2, 6), at1: tremInst(2, 8), at2: tremInst(2, 10), at3: tremInst(2, 12),
    bt0: tremInst(4, 5, 0.1), bt1: tremInst(4, 7, 0.1), bt2: tremInst(4, 9, 0.1), bt3: tremInst(4, 11, 0.1),
    apad: { duty: 3, env: [3, 4, 5, 6, 7, 7, 7, 7, 6], pitch: vibrato(0.12, 9) },
    bpad: { duty: 6, env: [3, 4, 5, 6, 6, 6, 6, 5], pitch: vibrato(0.12, 11).map((v) => +(v + 0.1).toFixed(3)) },
    bass: { env: [15, 13, 11, 9, 8, 7, 6, 5] },
    sub: { env: [15, 15, 15, 15, 15, 0] },
    hat: { short: true, env: [4, 2, 1, 0] },
    open: { short: true, env: [6, 5, 4, 3, 2, 1, 0] },
    snr: { env: [9, 7, 5, 3, 1, 0] },
    kick: { sample: 'kick' },
    snare: { sample: 'snare', env: [13] },
  },
  pulse1: { inst: 'lead', rows: join(pulse1) },
  pulse2: { inst: 'stab', rows: join(pulse2) },
  triangle: { inst: 'sub', rows: join(triangle) },
  noise: { inst: 'hat', rows: join(noise) },
  vrc6p1: { inst: 'at1', rows: join(trem(1, 55, 67, 'a')) },
  vrc6p2: { inst: 'bt1', rows: join(trem(2, 59, 71, 'b')) },
  saw: { inst: 'bass', rows: join(saw) },
  dpcm: { inst: 'kick', rows: join(dpcm) },
};

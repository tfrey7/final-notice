// Stage 1, Claims and Adjustments: an office-floor funk brawl in D dorian at 112 BPM on sixteenth
// rows. A VRC6 saw slap bass over a triangle sub, a 25% pulse lead that slides with a soft echo, VRC6
// clav chops that open into detuned pads for the B section, and DPCM kick, gated snare and clap. The
// title's hook is quoted once, softly, in the intro (docs/MUSIC.md).
//
// 48 bars, 102 s: intro 4 | A 8 | B 8 | A' 8 | breakdown 8 | A' up a tone 8 | turnaround 4, looping to
// the end of the intro.

import { REST, chord, echo, fold, nameOf, pitchClasses, play, tag, thirdBelow, transpose, vibrato } from './kit.mjs';

export const SCALE = ['D', 'E', 'F', 'G', 'A', 'Bb', 'B', 'C'];

const A_CHORDS = ['Dm9', 'G9', 'Dm9', 'G9', 'Bbmaj7', 'C9', 'Am7', 'Am7'];
const A_LEAD = [
  'D5 . . F5 . G5 . A5 - - . C6 . A5 . G5',
  'A5 - - - . . F5 G5 . . D5 . F5 - . .',
  'D5 . . F5 . G5 . A5 - - . D6 . C6 . A5',
  'B5 - - - A5 - G5 - . . . . . . . .',
  '. . F5 . A5 . C6 - . D6 . C6 A5 - . .',
  'G5 - - . E5 . G5 . Bb5 - - . A5 . G5 .',
  'A5 - - - - - . . E5 . G5 . A5 . C6 .',
  'D6 - - - C6 - A5 - G5 - E5 - . . . .',
];
// The second time round, the last two bars climb instead of falling.
const A2_LEAD = [
  ...A_LEAD.slice(0, 6),
  'A5 . C6 . E6 - - - D6 . C6 . A5 . G5 .',
  'A5 - - - - - - - . . . . D5 E5 F5 G5',
];

const B_CHORDS = ['Bbmaj7', 'C9', 'Am7', 'Dm9', 'Bbmaj7', 'C9', 'Em7', 'Am7'];
const B_LEAD = [
  'F5 - - - - - - - E5 - - - D5 - - -',
  'E5 - - - - - G5 - - - - - Bb5 - - -',
  'A5 - - - - - - - . . G5 - A5 - C6 -',
  'A5 - - - - - - - - - - - . . . .',
  'D6 - - - - - - - C6 - - - A5 - - -',
  'Bb5 - - - - - A5 - - - G5 - - - E5 -',
  'G5 - - - - - - - F5 - E5 - D5 - E5 -',
  'E5 - - - - - - - . . . . . . . .',
];

const BREAK_CHORDS = ['Dm9', 'Dm9', 'G9', 'G9', 'Dm9', 'Dm9', 'G9', 'G9'];
const BREAK_LEAD = [
  REST, REST, REST, REST,
  '. . . . . . . . D6 . C6 . A5 . . .',
  REST,
  '. . . . . . . . F5 . G5 . A5 . C6 .',
  'D6 - - - . . . . . . . . . . . .',
];

const INTRO_LEAD = [REST, REST, 'A4 - - - D5 - - - F5 - - - E5 - D5 -', 'D5 - - - - - - - . . . . . . . .'];

const TURN_CHORDS = ['Bbmaj7', 'C9', 'Bbmaj7', 'C9'];
const TURN_LEAD = [
  'F5 . G5 . A5 . C6 . D6 - - - . . . .',
  'E6 - - - D6 - C6 - Bb5 - A5 - G5 - E5 -',
  'F5 . G5 . A5 . C6 . D6 - - - F6 - - -',
  'E6 - - - - - - - . . . . . . . .',
];

const section = (part, chords, leads, shift = 0) =>
  chords.map((symbol, i) => ({ part, symbol, lead: leads[i], shift, last: i === chords.length - 1 }));

export const FORM = [
  ...section('intro', ['Dm9', 'G9', 'Dm9', 'G9'], INTRO_LEAD),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('B', B_CHORDS, B_LEAD),
  ...section("A'", A_CHORDS, A2_LEAD),
  ...section('breakdown', BREAK_CHORDS, BREAK_LEAD),
  ...section('return', A_CHORDS, A2_LEAD, 2),
  ...section('turnaround', TURN_CHORDS, TURN_LEAD),
];
export const LOOP_BAR = 4;
export const LEAD = 'pulse1';

const GROOVE = ['A', "A'", 'return'];
const LEAD_INST = { intro: 'nod', A: 'lead', B: 'sing', "A'": 'slap', breakdown: 'lead', return: 'slap', turnaround: 'sing' };
const leads = FORM.map((b) => transpose(b.lead, b.shift));

const pulse1 = FORM.map((b, i) => tag(leads[i], LEAD_INST[b.part]));

// The echo trails the lead in the grooves; the singing sections get a harmony a third below.
const echoes = echo(leads, 3, 'echo');
const pulse2 = FORM.map((b, i) => {
  if (GROOVE.includes(b.part)) return echoes[i];
  if (b.part === 'B' || b.part === 'turnaround') {
    const scale = pitchClasses(SCALE, b.shift);
    return leads[i].split(' ').map((t) => (/^[A-G]/.test(t) ? `${thirdBelow(t, scale)}:harm` : t)).join(' ');
  }
  return REST;
});

const BASS = {
  groove: 'R - . R . . O R . . R . S . O .',
  fill: 'R - . R . . O R . F . S . O F R',
  B: 'R - - - . R . . F - - - . O . .',
  breakdown: 'R . . . . . . R O . R . . . . .',
  hold: 'R - - - - - - - - - - - . . . .',
};
const saw = FORM.map((b, i) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'intro') return play(i < 2 ? BASS.hold : i === 3 ? BASS.fill : BASS.groove, c, 'bass');
  if (b.part === 'B' || b.part === 'turnaround') return play(b.last ? BASS.fill : BASS.B, c, 'bass');
  if (b.part === 'breakdown') return play(b.last ? BASS.fill : BASS.breakdown, c, 'bass');
  return play(b.last ? BASS.fill : BASS.groove, c, 'bass');
});

const triangle = FORM.map((b) => play('R - - - - - . . . . R - - - . .', chord(b.symbol, b.shift), 'sub', -12));

// The chord's third and seventh, voiced in the middle, as clav chops or held pads.
const CHOP = '. . X . . . X . . X . . X . . .';
const BREAK_CHOP = '. . . . X . . . . . . . X . X .';
const HOLD = 'X - - - - - - - - - - - - - - -';
const guide = (b, tone, lo, hi) => {
  const { root, tones } = chord(b.symbol, b.shift);
  return nameOf(fold(root + tones[tone], lo, hi));
};
const bed = (tone, lo, hi, chop, pad) =>
  FORM.map((b, i) => {
    const note = guide(b, tone, lo, hi);
    const [pattern, inst] =
      b.part === 'B' || b.part === 'turnaround' || (b.part === 'intro' && i < 2) ? [HOLD, pad]
        : b.part === 'breakdown' ? [BREAK_CHOP, chop]
          : [CHOP, chop];
    return pattern.split(' ').map((t) => (t === 'X' ? `${note}:${inst}` : t)).join(' ');
  });

const HATS = '. 1:hat 0 1:hat . 1:hat 0 1:hat . 1:hat 0 1:hat . 1:hat 0:open -';
const noise = FORM.map((b, i) => {
  if (b.part === 'intro') return i === 0 ? REST : HATS;
  if (b.part === 'B' || b.part === 'turnaround') return '. . 1:hat . . . 1:hat . . . 1:hat . . . 1:hat .';
  if (b.part === 'breakdown') return b.last ? '. . . . . . . . 3 3 2 2 1 1 0 0' : '. . . . . . . . . . . . . . 0:open -';
  return HATS;
});

const DRUMS = {
  groove: 'F - - - F:snare - - F - - F - F:snare - - -',
  fill: 'F - - - F:snare - - F - - F:snare D:snare F:snare C:snare E:snare F:snare',
  B: 'F - - - F:snare - - - - - F - F:snare - - -',
  breakdown: 'F - - - F:clap - - - - - F - F:clap - F:clap -',
};
const dpcm = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? REST : i === 3 ? DRUMS.fill : DRUMS.groove;
  const kind = b.part === 'B' || b.part === 'turnaround' ? 'B' : b.part === 'breakdown' ? 'breakdown' : 'groove';
  return b.last ? DRUMS.fill : DRUMS[kind];
});

const join = (bars) => bars.join(' | ');

export default {
  tempo: 8,
  loop: LOOP_BAR * 16,
  instruments: {
    nod: { duty: 0, env: [6, 7, 8, 8, 8, 7, 7, 6, 6, 5], pitch: vibrato(0.12, 20, 16) },
    lead: { duty: 1, env: [15, 13, 12, 11, 10, 10, 9, 9, 8], glide: 2 },
    slap: { duty: 1, env: [15, 12, 10, 8, 7, 6, 5, 5, 4, 4, 3] },
    sing: { duty: 2, env: [10, 12, 13, 13, 12, 12, 11, 11, 10], pitch: vibrato(0.2, 16, 18) },
    echo: { duty: 1, env: [5, 5, 4, 4, 3, 3, 2, 2, 1, 0], pitch: [0.1] },
    harm: { duty: 0, env: [6, 7, 7, 7, 6, 6, 6, 5], pitch: [0.08] },
    bass: { env: [15, 14, 12, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4] },
    sub: { env: [15] },
    clav: { duty: 3, env: [11, 9, 6, 3, 1, 0] },
    clav2: { duty: 5, env: [9, 7, 5, 3, 1, 0], pitch: [0.08] },
    pad1: { duty: 1, env: [2, 3, 4, 5, 6, 7, 7, 7, 7, 6], pitch: vibrato(0.07, 23) },
    pad2: { duty: 3, env: [2, 3, 4, 5, 5, 6, 6, 6, 6, 5], pitch: vibrato(0.07, 31).map((v) => +(v + 0.1).toFixed(3)) },
    hat: { short: true, env: [4, 2, 1, 0] },
    open: { short: true, env: [5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0] },
    kick: { sample: 'kick' },
    snare: { sample: 'snare', env: [13] },
    clap: { sample: 'clap', env: [14] },
  },
  pulse1: { inst: 'lead', rows: join(pulse1) },
  pulse2: { inst: 'echo', rows: join(pulse2) },
  triangle: { inst: 'sub', rows: join(triangle) },
  noise: { inst: 'hat', rows: join(noise) },
  vrc6p1: { inst: 'clav', rows: join(bed(1, 57, 69, 'clav', 'pad1')) },
  vrc6p2: { inst: 'clav2', rows: join(bed(3, 62, 74, 'clav2', 'pad2')) },
  saw: { inst: 'bass', rows: join(saw) },
  dpcm: { inst: 'kick', rows: join(dpcm) },
};

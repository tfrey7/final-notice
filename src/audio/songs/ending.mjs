// The ending (docs/MUSIC.md): D major at 90 BPM on sixteenth rows, a full arc that closes in triumph.
// A 50% 2A03 flute lead with a late vibrato, VRC6 pads that open into shimmering eighths, a fretless
// saw bass that slides, lazy DPCM backbeat. It climbs through a bridge into a last chorus up a tone
// with a harmony, and the outro sings the hook once, slowly, before landing home on a held tonic.
//
// 36 bars, 96 s, no loop: intro 4 | verse 8 | chorus 8 | bridge 4 | chorus up a tone 8 | outro 4.

import { REST, chord, echo, fold, nameOf, pitchClasses, play, tag, thirdBelow, transpose, vibrato } from './kit.mjs';

export const SCALE = ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'];
export const HOOK = 'A4 - - - D5 - - - F#5 - - - E5 - - - | D5 - - - C#5 - - - A4 - - - - - - -';

const VERSE_CHORDS = ['Dmaj9', 'Bm9', 'Gmaj9', 'A9', 'Dmaj9', 'Gbm7', 'Em9', 'A9'];
const VERSE_LEAD = [
  'F#5 - - - - - E5 - D5 - - - A4 - - -',
  'B4 - - - - - C#5 - D5 - - - F#5 - - -',
  'G5 - - - - - F#5 - D5 - - - B4 - - -',
  'C#5 - - - - - - - E5 - - - - - . .',
  'F#5 - - - - - E5 - D5 - - - A5 - - -',
  'A5 - - - - - F#5 - E5 - - - C#5 - - -',
  'D5 - - - - - E5 - F#5 - - - G5 - - -',
  'E5 - - - - - - - - - - - . . . .',
];

const CHORUS_CHORDS = ['Gmaj9', 'A9', 'Gbm7', 'Bm9', 'Em9', 'A9', 'Dmaj9', 'Dmaj9'];
const CHORUS_LEAD = [
  'B5 - - - - - A5 - - - F#5 - - - D5 -',
  'E5 - - - - - - - C#5 - E5 - A5 - - -',
  'A5 - - - - - - - C#6 - - - A5 - - -',
  'F#5 - - - - - - - D5 - E5 - F#5 - B5 -',
  'B5 - - - - - A5 - G5 - - - F#5 - E5 -',
  'E5 - - - - - - - A5 - B5 - C#6 - E6 -',
  'D6 - - - - - - - C#6 - - - A5 - - -',
  'A5 - - - - - - - - - - - . . . .',
];

const BRIDGE_CHORDS = ['Bm9', 'Gbm7', 'Gmaj9', 'A9'];
const BRIDGE_LEAD = [
  'D5 - F#5 - B5 - - - A5 - - - F#5 - - -',
  'C#5 - E5 - A5 - - - F#5 - - - E5 - - -',
  'D5 - G5 - B5 - - - D6 - - - B5 - - -',
  'C#6 - - - - - - - E6 - - - - - - -',
];

const OUTRO_CHORDS = ['Gmaj9', 'A9', 'Dmaj9', 'Dmaj9'];
const OUTRO_LEAD = [...HOOK.split(' | '), 'D5 - - - - - - - F#5 - - - A5 - - -', 'D6 - - - - - - - - - - - - - - -'];

const section = (part, chords, leads, shift = 0) =>
  chords.map((symbol, i) => ({ part, symbol, lead: leads[i], shift, last: i === chords.length - 1 }));

export const FORM = [
  ...section('intro', ['Dmaj9', 'Gmaj9', 'Dmaj9', 'A9'], [REST, REST, REST, REST]),
  ...section('verse', VERSE_CHORDS, VERSE_LEAD),
  ...section('chorus', CHORUS_CHORDS, CHORUS_LEAD),
  ...section('bridge', BRIDGE_CHORDS, BRIDGE_LEAD),
  ...section('final', CHORUS_CHORDS, CHORUS_LEAD, 2),
  ...section('outro', OUTRO_CHORDS, OUTRO_LEAD, 2),
];
export const LEAD = 'pulse1';

const leads = FORM.map((b) => transpose(b.lead, b.shift));
const LEAD_INST = { intro: 'flute', verse: 'flute', chorus: 'bright', bridge: 'bright', final: 'bright', outro: 'flute' };
const pulse1 = FORM.map((b, i) => tag(leads[i], LEAD_INST[b.part]));

// A soft echo in the verse; a harmony a third below once the key has lifted.
const echoes = echo(leads, 4, 'echo');
const pulse2 = FORM.map((b, i) => {
  if (b.part === 'verse' || b.part === 'chorus' || b.part === 'bridge') return echoes[i];
  if (b.part === 'intro') return REST;
  const scale = pitchClasses(SCALE, b.shift);
  return leads[i].split(' ').map((t) => (/^[A-G]/.test(t) ? `${thirdBelow(t, scale)}:harm` : t)).join(' ');
});

// VRC6 pads on the third and seventh, opening to shimmering eighths in the choruses.
const HOLD = `X ${Array(15).fill('-').join(' ')}`;
const SHIMMER = 'X - X - X - X - X - X - X - X -';
const bed = (tone, lo, hi, pad, shim) =>
  FORM.map((b) => {
    const { root, tones } = chord(b.symbol, b.shift);
    const note = nameOf(fold(root + tones[tone], lo, hi));
    const [pattern, inst] = b.part === 'chorus' || b.part === 'final' ? [SHIMMER, shim] : [HOLD, pad];
    return pattern.split(' ').map((t) => (t === 'X' ? `${note}:${inst}` : t)).join(' ');
  });

// Fretless saw: roots that slide to the fifth and octave; the intro holds the chord's ninth as a pad.
const saw = FORM.map((b, i) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'intro') return `${nameOf(fold(c.root + c.tones[c.tones.length - 1] + 12, 62, 76))}:swell ${Array(15).fill('-').join(' ')}`;
  if (b.part === 'outro' && i === FORM.length - 1) return play(HOLD.replace('X', 'R'), c, 'fret');
  return play(b.last ? 'R - - - - - . R F - - - O - F -' : 'R - - - - - . R F - - - O - . .', c, 'fret');
});

const triangle = FORM.map((b) =>
  b.part === 'chorus' || b.part === 'final' || b.part === 'outro' ? play('L - - - - - - - L - - - - - . .', chord(b.symbol, b.shift), 'sub') : REST,
);

const noise = FORM.map((b, i) => {
  if (b.part === 'intro' || (b.part === 'verse' && i < 8)) return REST;
  if (b.part === 'bridge') return b.last ? '1 1 1 1 1 1 1 1 3:snr 3:snr 2:snr 2:snr 1:snr 1:snr 0:snr 0:snr' : '1 . . . 1 . . . 1 . . . 1 . . .';
  if (i === FORM.length - 1) return '0:open - - - - - - - . . . . . . . .';
  return '. . 1 . . . 1 . . . 1 . . . 0:open -';
});

const DRUMS = {
  back: 'F - - - F:snare - - - - - F - F:snare - - -',
  soft: 'F - - - - - - - F - - - - - - -',
  fill: 'F - - - F:snare - - - F:snare - F:snare - D:snare - C:snare B:snare',
  half: 'F - - - - - - - F:snare - - - - - - -',
  end: 'F - - - - - - - - - - - - - - -',
};
const dpcm = FORM.map((b, i) => {
  if (b.part === 'intro') return REST;
  if (b.part === 'verse') return i < 8 ? REST : b.last ? DRUMS.fill : DRUMS.soft;
  if (b.part === 'bridge') return b.last ? DRUMS.fill : DRUMS.half;
  if (b.part === 'outro') return i === FORM.length - 1 ? DRUMS.end : i === FORM.length - 2 ? DRUMS.fill : DRUMS.half;
  return b.last ? DRUMS.fill : DRUMS.back;
});

const join = (bars) => bars.join(' | ');

export default {
  tempo: 10,
  loop: null,
  instruments: {
    flute: { duty: 2, env: [6, 9, 11, 12, 12, 11, 11, 11, 10, 10, 10, 9], pitch: vibrato(0.18, 22, 24) },
    bright: { duty: 1, env: [12, 13, 13, 12, 12, 11, 11, 11, 10, 10, 10, 9], pitch: vibrato(0.16, 18, 20), glide: 2 },
    echo: { duty: 2, env: [4, 4, 4, 3, 3, 3, 2, 2, 1, 0], pitch: [0.1] },
    harm: { duty: 1, env: [8, 9, 9, 8, 8, 8, 7, 7, 7, 6] },
    pad1: { duty: 3, env: [2, 3, 4, 5, 5, 6, 6, 6, 6, 5], pitch: vibrato(0.06, 25) },
    pad2: { duty: 5, env: [2, 3, 3, 4, 5, 5, 5, 5, 5, 4], pitch: vibrato(0.06, 33).map((v) => +(v + 0.1).toFixed(3)) },
    shim1: { duty: 3, env: [7, 6, 5, 4, 3, 2, 2] },
    shim2: { duty: 5, env: [5, 5, 4, 3, 2, 1, 1], pitch: [0.1] },
    swell: { env: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8] },
    fret: { env: [13, 13, 12, 12, 11, 11, 10, 10, 9], glide: 4, pitch: vibrato(0.1, 24, 30) },
    sub: { env: [15] },
    hat: { short: true, env: [3, 2, 1, 0] },
    open: { short: true, env: [5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0] },
    snr: { env: [7, 5, 3, 1, 0] },
    kick: { sample: 'kick' },
    snare: { sample: 'snare', env: [12] },
  },
  pulse1: { inst: 'flute', rows: join(pulse1) },
  pulse2: { inst: 'echo', rows: join(pulse2) },
  triangle: { inst: 'sub', rows: join(triangle) },
  noise: { inst: 'hat', rows: join(noise) },
  vrc6p1: { inst: 'pad1', rows: join(bed(1, 57, 69, 'pad1', 'shim1')) },
  vrc6p2: { inst: 'pad2', rows: join(bed(3, 62, 74, 'pad2', 'shim2')) },
  saw: { inst: 'fret', rows: join(saw) },
  dpcm: { inst: 'kick', rows: join(dpcm) },
};

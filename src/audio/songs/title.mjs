// The Final Notice theme (docs/THEME.md): F major, 24 bars of eighth notes. Other cues import MELODY
// and CHORDS from here; the earlier title arrangements are title-v1.mjs and title-v2.mjs.
//
// The title song itself is its own track (docs/MUSIC.md): a late-NES corporate wave anthem in Eb major
// at 128 BPM on sixteenth rows. Four-on-the-floor DPCM kick, a gated noise snare, off-beat pumping
// 2A03 chords, a Sunsoft-style octave saw bass, and a glassy VRC6 pulse lead with a detuned echo. The
// hook (C F A G F E C, here Bb Eb G F Eb D Bb) opens the intro nod, the A section and the return.
//
// 48 bars, 90 s: intro 4 | A 8 | A' 8 | B 8 | bridge 8 | return up a tone 8 | tag 4, looping to the end
// of the intro.

import { noteToMidi } from '../apu.mjs';
import * as kit from './kit.mjs';

// One string per bar, 8 rows each. Sections: A 1-8, A' 9-16, B 17-20, A'' 21-24.
export const MELODY = [
  'C5 - F5 - A5 - G5 F5', 'E5 - - - C5 - . .', 'D5 - F5 - Bb5 - A5 G5', 'G5 - - - - - . .',
  'C5 - F5 - A5 - C6 -', 'A5 - - - F5 - D5 -', 'Bb4 - D5 - G5 - F5 E5', 'E5 - - - - - . .',
  'C5 - F5 - A5 - G5 F5', 'E5 - - - C5 - . .', 'D5 - F5 - Bb5 - A5 G5', 'G5 - - - A5 - Bb5 -',
  'A5 - - - F5 - D5 -', 'F5 - - - D5 - Bb4 -', 'C5 - E5 - G5 - Bb5 -', 'A5 - - - - - . .',
  'D6 - C6 - Bb5 - A5 -', 'G5 - - - E5 - C5 -', 'C5 - E5 - F5 - A5 -', 'Bb5 - A5 - G5 - E5 -',
  'C5 - F5 - A5 - G5 F5', 'E5 - - - C5 - . .', 'D5 - F5 - E5 - G5 -', 'F5 - - - - - . .',
];

// One or two chords a bar (two = half a bar each). Root note name and quality.
export const CHORDS = [
  ['F', 'Am', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C'],
  ['F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'C', 'F'],
  ['Bb', 'C', 'Am Dm', 'Gm C'],
  ['F', 'Am', 'Bb C', 'F'],
].flat();

// The same progression as hold-queue harmony: sevenths, ninths, an eleven, ii-V-I turnarounds.
export const WAVE_CHORDS = [
  ['Fmaj9', 'Am7', 'Bbmaj7', 'Gm9 C9', 'Fmaj7', 'Dm9', 'Gm9', 'C13'],
  ['Fmaj9', 'Am7', 'Bbmaj7#11', 'Gm7 C9', 'Dm9', 'Bbmaj7', 'C13', 'Fmaj7'],
  ['Bbmaj9', 'Gm11 C9', 'Am7 Dm9', 'Gm9 C13'],
  ['Fmaj9', 'Am7', 'Bbmaj7 C13', 'Fmaj9'],
].flat();

export const KEY = ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'];

export const chordParts = (bar) =>
  CHORDS[bar].split(' ').map((c) => ({ root: c.replace('m', ''), minor: c.endsWith('m') }));

// Semitones above the root: the third, the seventh and the colour tone the saw pad holds.
const QUALITY = {
  maj7: [4, 11, 7], maj9: [4, 11, 14], 'maj7#11': [4, 11, 18],
  m7: [3, 10, 7], m9: [3, 10, 14], m11: [3, 10, 17], 9: [4, 10, 14], 13: [4, 10, 21],
};

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const nameOf = (midi) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

// The pitch of class `pc` closest to `prev`, folded back an octave if it strays outside lo-hi.
function nearest(pc, prev, lo, hi) {
  let m = prev + ((pc - (prev % 12) + 18) % 12) - 6;
  if (m < lo) m += 12;
  if (m > hi) m -= 12;
  return m;
}

// Each bar's chords voiced for the chips, guide tones led smoothly from chord to chord.
export const VOICINGS = (() => {
  let third = 64;
  let seventh = 70;
  let color = 67;
  return WAVE_CHORDS.map((bar) => {
    const parts = bar.split(' ');
    return parts.map((symbol) => {
      const [, root, quality] = /^([A-G]b?)(m?.*)$/.exec(symbol);
      const [t, s, c] = QUALITY[quality];
      const pc = noteToMidi(`${root}4`) % 12;
      third = nearest((pc + t) % 12, third, 55, 70);
      seventh = nearest((pc + s) % 12, seventh, 60, 75);
      color = nearest((pc + c) % 12, color, 58, 73);
      let bass = noteToMidi(`${root}2`);
      if (bass < noteToMidi('F2')) bass += 12;
      return { symbol, len: 8 / parts.length, root: bass, third, seventh, color };
    });
  });
})();

export const held = (note, inst, len) => [`${nameOf(note)}:${inst}`, ...Array(len - 1).fill('-')].join(' ');

// A slow sine wobble in semitones that waits `delay` frames, long enough to cover any held note.
export const vibrato = (depth, period, delay = 0) =>
  Array.from({ length: 400 }, (_, f) => (f < delay ? 0 : +(depth * Math.sin((2 * Math.PI * (f - delay)) / period)).toFixed(3)));

// ---- The title song ----

const { REST, chord, echo, fold, pitchClasses, play, tag, thirdBelow, transpose } = kit;

export const SCALE = ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'];
export const HOOK = 'Bb4 - Eb5 - G5 - - F5 - - Eb5 - D5 - Bb4 -';

const INTRO_CHORDS = ['Ebmaj9', 'Ebmaj9', 'Abmaj9', 'Bb9'];
const INTRO_LEAD = [REST, REST, HOOK, 'D5 - - - - - - - . . . . . . . .'];

const A_CHORDS = ['Ebmaj9', 'Gm7', 'Abmaj9', 'Bb9', 'Ebmaj9', 'Cm9', 'Fm9', 'Bb9'];
const A_LEAD = [
  HOOK,
  'D5 - - - - - . F5 - . G5 - Bb5 - - -',
  'C6 - - Bb5 - - G5 - - Ab5 - G5 - Eb5 - -',
  'F5 - - - - - - - . . D5 - F5 - Ab5 -',
  'G5 - - - Bb5 - - G5 - - F5 - Eb5 - - -',
  'Eb5 - - - - - . . C5 - Eb5 - G5 - Bb5 -',
  'Ab5 - - G5 - - F5 - - Eb5 - - F5 - G5 -',
  'F5 - - - - - - - - - - - . . . .',
];
// The second pass answers instead of quoting, and climbs out of its last two bars.
const A2_LEAD = [
  'G5 - - F5 - - Eb5 - Bb5 - - - G5 - - -',
  ...A_LEAD.slice(1, 6),
  'Ab5 - Bb5 - C6 - D6 - Eb6 - - - D6 - C6 -',
  'D6 - - - - - - - Bb5 . C6 . D6 . F6 .',
];

const B_CHORDS = ['Cm9', 'Abmaj9', 'Ebmaj9', 'Bb9', 'Cm9', 'Abmaj9', 'Fm9', 'Bb9'];
const B_LEAD = [
  'Eb6 - - - - - - D6 - - - - C6 - - -',
  'C6 - - - - - Bb5 - - - - - G5 - Ab5 -',
  'Bb5 - - - - - - - - - G5 - Bb5 - D6 -',
  'D6 - - - - - - - C6 - - - Bb5 - - -',
  'G5 - - - C6 - - - Eb6 - - - D6 - C6 -',
  'C6 - - - - - - - Bb5 - Ab5 - G5 - Eb5 -',
  'F5 - - - Ab5 - - - C6 - - - Eb6 - - -',
  'D6 - - - - - - - . . . . . . . .',
];

const BRIDGE_CHORDS = ['Abmaj9', 'Abmaj9', 'Gm7', 'Gm7', 'Fm9', 'Fm9', 'Bb9', 'Bb9'];
const BRIDGE_LEAD = [
  REST,
  'G5 - - - - - - - F5 - - - Eb5 - - -',
  REST,
  'D5 - - - - - - - Bb4 - - - D5 - - -',
  REST,
  'C5 - - - Eb5 - - - F5 - - - Ab5 - - -',
  'Bb5 . Bb5 . Bb5 . Bb5 . C6 - D6 - Eb6 - F6 -',
  'F6 - - - - - - - . . . . . . . .',
];

const TAG_CHORDS = ['Abmaj9', 'Bb9', 'Abmaj9', 'Bb9'];
const TAG_LEAD = [
  'C6 - Bb5 - Ab5 - G5 - Ab5 - Bb5 - C6 - Eb6 -',
  'D6 - - - - - - - F5 - G5 - Ab5 - Bb5 -',
  'C6 - Bb5 - Ab5 - G5 - F5 - Eb5 - D5 - Eb5 -',
  'F5 - - - - - - - - - - - . . . .',
];

const section = (part, chords, leads, shift = 0) =>
  chords.map((symbol, i) => ({ part, symbol, lead: leads[i], shift, last: i === chords.length - 1 }));

export const FORM = [
  ...section('intro', INTRO_CHORDS, INTRO_LEAD),
  ...section('A', A_CHORDS, A_LEAD),
  ...section("A'", A_CHORDS, A2_LEAD),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('bridge', BRIDGE_CHORDS, BRIDGE_LEAD),
  ...section('return', A_CHORDS, A_LEAD, 2),
  ...section('tag', TAG_CHORDS, TAG_LEAD),
];
export const LOOP_BAR = 4;
export const LEAD = 'vrc6p1';

const leads = FORM.map((b) => transpose(b.lead, b.shift));
const LEAD_INST = { intro: 'nod', A: 'lead', "A'": 'lead', B: 'sing', bridge: 'sing', return: 'lead', tag: 'lead' };
const vrc6p1 = FORM.map((b, i) => tag(leads[i], LEAD_INST[b.part]));

// The echo trails the lead; the return swaps it for a harmony a third below, the thing that changes.
const echoes = echo(leads, 3, 'echo');
const vrc6p2 = FORM.map((b, i) => {
  if (b.part !== 'return') return echoes[i];
  const scale = pitchClasses(SCALE, b.shift);
  return leads[i].split(' ').map((t) => (/^[A-G]/.test(t) ? `${thirdBelow(t, scale)}:harm` : t)).join(' ');
});

// Off-beat pumping chords on the 2A03 pulses: the third and seventh, held pads in the bridge.
const PUMP = '. . X - . . X - . . X - . . X -';
const B_PUMP = '. . X - . . X - . . X - . X - X';
const HOLD = 'X - - - - - - - - - - - - - - -';
const guide = (b, tone, lo, hi) => {
  const { root, tones } = chord(b.symbol, b.shift);
  return kit.nameOf(fold(root + tones[tone], lo, hi));
};
const pumps = (tone, lo, hi, inst, pad) =>
  FORM.map((b, i) => {
    const note = guide(b, tone, lo, hi);
    const [pattern, name] =
      b.part === 'bridge' || (b.part === 'intro' && i < 2) ? [HOLD, pad] : [b.part === 'B' ? B_PUMP : PUMP, inst];
    return pattern.split(' ').map((t) => (t === 'X' ? `${note}:${name}` : t)).join(' ');
  });

// The Sunsoft bass: octave jumps on the sixteenths, a slide into the fifth at a phrase end.
const BASS = {
  drive: 'R . O R . R O . R . O R . R O R',
  fill: 'R . O R . R O . F . O F S . O F',
  bridge: 'R - - - - - - - R - - - O - - -',
  intro: 'R - - - - - - - - - - - . . . .',
};
const saw = FORM.map((b, i) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'intro') return play(i < 2 ? BASS.intro : i === 3 ? BASS.fill : BASS.drive, c, 'bass');
  if (b.part === 'bridge') return play(b.last ? BASS.fill : BASS.bridge, c, 'bass');
  return play(b.last ? BASS.fill : BASS.drive, c, 'bass');
});

const triangle = FORM.map((b, i) =>
  b.part === 'bridge' || (b.part === 'intro' && i < 2) ? REST : play('L - . . L - . . L - . . L - . .', chord(b.symbol, b.shift), 'thump'),
);

const HATS = '. . 0:open - 1:hat . 0:open - . . 0:open - 1:hat . 0:open -';
const noise = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? REST : i === 3 ? '. . . . 6:gate - . . 6:gate - 6:gate - 5:gate - 4:gate -' : HATS;
  if (b.part === 'bridge') return b.last ? '. . . . . . . . 6:gate 6:gate 5:gate 5:gate 4:gate 4:gate 3:gate 3:gate' : '. . . . 6:gate - . . . . . . 6:gate - . .';
  return b.part === 'B' ? '1:hat . 0:open - 6:gate - 1:hat 1:hat 1:hat . 0:open - 6:gate - 1:hat .' : '. . 0:open - 6:gate - 0:open - . . 0:open - 6:gate - 0:open -';
});

const FLOOR = 'F - - - F - - - F - - - F - - -';
const dpcm = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? REST : i === 3 ? 'F - - - F - - - F:clap - F:clap - F:clap - F:clap -' : FLOOR;
  if (b.part === 'bridge') return b.last ? 'F - - - F - - - F - F - F - F -' : 'F - - - - - - - - - - - F:clap - - -';
  return b.last ? 'F - - - F - - - F - - F:clap - F:clap F:clap -' : FLOOR;
});

const join = (bars) => bars.join(' | ');

export default {
  tempo: 7,
  loop: LOOP_BAR * 16,
  instruments: {
    nod: { duty: 1, env: [7, 8, 9, 9, 8, 8, 7, 7, 6], pitch: vibrato(0.1, 20, 14) },
    lead: { duty: 3, env: [11, 13, 14, 14, 13, 13, 12, 12, 12, 11], pitch: vibrato(0.15, 14, 14), glide: 2 },
    sing: { duty: 7, env: [8, 10, 12, 13, 13, 12, 12, 11, 11, 10], pitch: vibrato(0.22, 16, 16) },
    echo: { duty: 3, env: [5, 5, 4, 4, 3, 3, 2, 2, 1, 0], pitch: [0.12] },
    harm: { duty: 5, env: [7, 8, 8, 7, 7, 6, 6, 6, 5] },
    pump: { duty: 1, env: [9, 8, 7, 5, 4, 3, 2, 1, 0] },
    pump2: { duty: 2, env: [7, 6, 5, 4, 3, 2, 1, 0], pitch: [0.08] },
    pad1: { duty: 1, env: [2, 3, 4, 5, 6, 6, 6, 6, 5], pitch: vibrato(0.07, 23) },
    pad2: { duty: 2, env: [2, 3, 4, 4, 5, 5, 5, 5, 4], pitch: vibrato(0.07, 31) },
    bass: { env: [15, 14, 13, 12, 11, 10, 9, 8, 8, 7, 7, 6], glide: 1 },
    thump: { env: [15, 15, 15, 15, 15, 15, 0], pitch: [7, 4, 2, 1, 0] },
    hat: { short: true, env: [4, 2, 1, 0] },
    open: { short: true, env: [5, 4, 4, 3, 3, 2, 2, 1, 0] },
    gate: { env: [11, 11, 10, 10, 10, 9, 9, 9, 0] },
    kick: { sample: 'kick' },
    clap: { sample: 'clap', env: [14] },
  },
  pulse1: { inst: 'pump', rows: join(pumps(1, 60, 72, 'pump', 'pad1')) },
  pulse2: { inst: 'pump2', rows: join(pumps(3, 63, 75, 'pump2', 'pad2')) },
  triangle: { inst: 'thump', rows: join(triangle) },
  noise: { inst: 'hat', rows: join(noise) },
  vrc6p1: { inst: 'lead', rows: join(vrc6p1) },
  vrc6p2: { inst: 'echo', rows: join(vrc6p2) },
  saw: { inst: 'bass', rows: join(saw) },
  dpcm: { inst: 'kick', rows: join(dpcm) },
};

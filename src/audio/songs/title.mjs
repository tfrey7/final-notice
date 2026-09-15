// The Final Notice theme (docs/THEME.md): F major, 24 bars of eighth notes, loops. Every other cue
// arranges MELODY over CHORDS. This arrangement is corporate wave on the 2A03 plus VRC6
// (docs/MUSIC.md); the first 2A03-only one is title-v1.mjs.

import { noteToMidi } from '../apu.mjs';

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

const PHRASE_ENDS = [3, 7, 11, 15, 19, 23];

const bars = (fn) => VOICINGS.map((parts, bar) => fn(parts, bar)).join(' | ');

const bed = (key, inst) => bars((parts) => parts.map((p) => held(p[key], inst, p.len)).join(' '));

// The pad holds the colour tone; a phrase end swaps its last two rows for a synth brass hit.
const saw = bars((parts, bar) => {
  const rows = parts.map((p) => held(p.color, 'pad', p.len)).join(' ').split(' ');
  if (PHRASE_ENDS.includes(bar)) {
    const last = parts[parts.length - 1];
    rows.splice(6, 2, `${nameOf(last.root + 24)}:brass`, '.');
  }
  return rows.join(' ');
});

// Fretless: the root, an anticipation on the and of three, sliding up to the fifth.
const triangle = bars((parts) =>
  parts.length === 2
    ? parts.map((p) => `${nameOf(p.root)} - - ${nameOf(p.root + 7)}`).join(' ')
    : `${nameOf(parts[0].root)} - - - . ${nameOf(parts[0].root)} ${nameOf(parts[0].root + 7)} -`,
);

const BEAT = 'C . 0:hat . 6:gate . 0:hat 0:hat';
const FILL = 'C . 0:hat . 6:gate . 6:gate 5:gate';
const noise = VOICINGS.map((_, bar) => (PHRASE_ENDS.includes(bar) ? FILL : BEAT)).join(' | ');

export default {
  tempo: 18,
  loop: 0,
  instruments: {
    lead: { duty: 1, env: [9, 11, 12, 12, 12, 11, 11, 11, 10, 10, 10, 10, 9], pitch: vibrato(0.15, 18, 20) },
    chorus: { duty: 2, env: [0, 0, 0, 4, 5, 6, 6, 6, 5, 5, 5, 5, 4], pitch: vibrato(0.1, 25).map((v) => +(v + 0.1).toFixed(3)) },
    bass: { env: [15], glide: 5, pitch: vibrato(0.12, 22, 24) },
    bed: { duty: 2, env: [3, 4, 5, 6, 6, 6, 6, 5], pitch: vibrato(0.06, 23) },
    bed2: { duty: 3, env: [3, 4, 5, 5, 5, 5, 5, 4], pitch: vibrato(0.06, 31) },
    pad: { env: [2, 3, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9, 8] },
    brass: { env: [14, 13, 12, 11, 10, 9, 8, 6, 4, 2, 0] },
    kick: { env: [10, 8, 5, 2, 0], pitch: [0, 1, 2] },
    gate: { env: [12, 11, 11, 10, 10, 10, 9, 9, 9, 9, 0] },
    hat: { short: true, env: [3, 2, 1, 0] },
  },
  pulse1: { inst: 'lead', rows: MELODY.join(' | ') },
  pulse2: { inst: 'chorus', rows: MELODY.join(' | ') },
  triangle: { inst: 'bass', rows: triangle },
  noise: { inst: 'kick', rows: noise },
  vrc6p1: { inst: 'bed', rows: bed('third', 'bed') },
  vrc6p2: { inst: 'bed2', rows: bed('seventh', 'bed2') },
  saw: { inst: 'pad', rows: saw },
};

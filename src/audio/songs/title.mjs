// The Final Notice theme (docs/THEME.md): F major, 24 bars of eighth notes, loops. Every other cue
// arranges MELODY over CHORDS.

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

export const KEY = ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'];

const BASS_ROOT = { F: 'F2', G: 'G2', A: 'A2', Bb: 'Bb2', C: 'C3', D: 'D3', E: 'E3' };
const FIFTH = { F: 'C3', G: 'D3', A: 'E3', Bb: 'F3', C: 'G3', D: 'A3', E: 'B3' };
const ARP_ROOT = { F: 'F4', G: 'G3', A: 'A3', Bb: 'Bb3', C: 'C4', D: 'D4', E: 'E4' };

export const chordParts = (bar) =>
  CHORDS[bar].split(' ').map((c) => ({ root: c.replace('m', ''), minor: c.endsWith('m') }));

// A Famichord: the triad cycled every two frames, long enough to cover a whole bar.
const cycle = (steps) => Array.from({ length: 260 }, (_, f) => steps[Math.floor(f / 2) % steps.length]);

const bars = (fn) => CHORDS.map((_, i) => fn(i)).join(' | ');

const pulse2 = bars((i) => {
  const parts = chordParts(i);
  const hit = ({ root, minor }) => `${ARP_ROOT[root]}:${minor ? 'min' : 'maj'} - - -`;
  return parts.length === 1 ? `${hit(parts[0])} ${hit(parts[0])}` : parts.map(hit).join(' ');
});

const triangle = bars((i) => {
  const parts = chordParts(i);
  if (parts.length === 2) return parts.map(({ root }) => `${BASS_ROOT[root]} - . ${FIFTH[root]}`).join(' ');
  const { root } = parts[0];
  return `${BASS_ROOT[root]} - . ${BASS_ROOT[root]} ${FIFTH[root]} - . ${BASS_ROOT[root]}`;
});

const BEAT = 'A . 0:hat . 5:snare . 0:hat .';
const FILL = 'A . 0:hat . 5:snare 5:snare 4:snare 3:snare';
const noise = bars((i) => ([7, 15, 19, 23].includes(i) ? FILL : BEAT));

export default {
  tempo: 16,
  loop: 0,
  instruments: {
    lead: { duty: 2, env: [13, 12, 11, 10, 10, 9, 9, 9, 8, 8, 8, 8, 7], pitch: [0.2, 0, 0] },
    maj: { duty: 1, env: [7, 6, 6, 5, 5, 5, 4], pitch: cycle([0, 4, 7]) },
    min: { duty: 1, env: [7, 6, 6, 5, 5, 5, 4], pitch: cycle([0, 3, 7]) },
    bass: { env: [15] },
    kick: { env: [9, 7, 5, 3, 1, 0], pitch: [0, 1, 2] },
    snare: { env: [7, 6, 5, 4, 3, 2, 1, 0] },
    hat: { short: true, env: [4, 2, 1, 0] },
  },
  pulse1: { inst: 'lead', rows: MELODY.join(' | ') },
  pulse2: { inst: 'maj', rows: pulse2 },
  triangle: { inst: 'bass', rows: triangle },
  noise: { inst: 'kick', rows: noise },
};

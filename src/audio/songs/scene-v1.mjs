// The first NES scene arrangement, 2A03 only, kept for comparison: bars 1-16, thin lead, held bass,
// no drums, a faint echo from bar 9.

import { MELODY, chordParts } from './title.mjs';

const BARS = 16;
const ROOT = { F: 'F2', G: 'G2', A: 'A2', Bb: 'Bb2', C: 'C3', D: 'D3', E: 'E3' };

const melody = MELODY.slice(0, BARS);

const tokens = melody.join(' ').split(' ');
const echoed = ['.', '.', ...tokens.slice(0, -2)].map((t) => (/^[A-G]/.test(t) ? `${t}:echo` : t));
const echo = Array.from({ length: BARS }, (_, bar) =>
  bar < 8 ? '. . . . . . . .' : echoed.slice(bar * 8, bar * 8 + 8).join(' '),
);

const triangle = melody.map((_, bar) => {
  const parts = chordParts(bar);
  return parts.length === 1
    ? `${ROOT[parts[0].root]} - - - - - . .`
    : parts.map(({ root }) => `${ROOT[root]} - - .`).join(' ');
});

export default {
  tempo: 24,
  loop: 0,
  instruments: {
    lead: { duty: 0, env: [6, 8, 10, 11, 12, 12, 11, 11, 10, 10, 10, 9, 9, 9, 9, 8] },
    echo: { duty: 0, env: [3, 4, 4, 4, 3, 3, 3, 2] },
    bass: { env: [15] },
  },
  pulse1: { inst: 'lead', rows: melody.join(' | ') },
  pulse2: { inst: 'echo', rows: echo.join(' | ') },
  triangle: { inst: 'bass', rows: triangle.join(' | ') },
};

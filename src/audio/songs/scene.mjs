// The theme slowed and sparse for the story scenes (docs/THEME.md, docs/MUSIC.md): bars 1-16, thin
// lead, a faint echo from bar 9, no drums, over the VRC6 chord bed and a swelling saw pad.

import { MELODY, VOICINGS, held, nameOf, vibrato } from './title.mjs';

const BARS = 16;

const melody = MELODY.slice(0, BARS);
const voicings = VOICINGS.slice(0, BARS);

const tokens = melody.join(' ').split(' ');
const echoed = ['.', '.', ...tokens.slice(0, -2)].map((t) => (/^[A-G]/.test(t) ? `${t}:echo` : t));
const echo = Array.from({ length: BARS }, (_, bar) =>
  bar < 8 ? '. . . . . . . .' : echoed.slice(bar * 8, bar * 8 + 8).join(' '),
);

const bars = (fn) => voicings.map(fn).join(' | ');
const bed = (key, inst) => bars((parts) => parts.map((p) => held(p[key], inst, p.len)).join(' '));

const triangle = bars((parts) =>
  parts.length === 1
    ? `${nameOf(parts[0].root)} - - - - - . .`
    : parts.map((p) => `${nameOf(p.root)} - - .`).join(' '),
);

export default {
  tempo: 24,
  loop: 0,
  instruments: {
    lead: { duty: 0, env: [6, 8, 10, 11, 12, 12, 11, 11, 10, 10, 10, 9, 9, 9, 9, 8], pitch: vibrato(0.12, 20, 30) },
    echo: { duty: 0, env: [3, 4, 4, 4, 3, 3, 3, 2] },
    bass: { env: [15], glide: 8 },
    bed: { duty: 1, env: [1, 2, 3, 3, 4, 4, 5, 5, 5, 5, 4], pitch: vibrato(0.06, 29) },
    bed2: { duty: 2, env: [1, 2, 2, 3, 3, 4, 4, 4, 4, 4, 3], pitch: vibrato(0.06, 37) },
    pad: { env: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7, 6] },
  },
  pulse1: { inst: 'lead', rows: melody.join(' | ') },
  pulse2: { inst: 'echo', rows: echo.join(' | ') },
  triangle: { inst: 'bass', rows: triangle },
  vrc6p1: { inst: 'bed', rows: bed('third', 'bed') },
  vrc6p2: { inst: 'bed2', rows: bed('seventh', 'bed2') },
  saw: { inst: 'pad', rows: bed('color', 'pad') },
};

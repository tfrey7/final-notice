// The story-scene cue on the S-DSP: the NES scene song (src/audio/songs/scene.mjs), the theme's first
// sixteen bars slowed and sparse, re-voiced for eight sampled voices (docs/THEME.md, "The scene
// arrangement").
//
// v1 electric piano melody | v2 a soft piano a quarter note behind from bar 9 | v3 synth bass on each
// chord's root | v4-v5 warm pad on the third and seventh | v6 strings on the colour tone | v7 choir
// doubling the third from bar 9 | v8 a bell on the colour tone every four bars. No drums; the echo
// carries the room.

import { MELODY, VOICINGS, held, nameOf } from '../../../audio/songs/title.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BARS = 16;
export const BAR_ROWS = 8;
export const MELODY_BARS = MELODY.slice(0, BARS);

const voicings = VOICINGS.slice(0, BARS);
const REST = Array(BAR_ROWS).fill('.').join(' ');
const on = (rows, inst) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? `${t}:${inst}` : t)).join(' ');

const v1 = MELODY_BARS.map((bar) => on(bar, 'keys'));

const tokens = MELODY_BARS.join(' ').split(' ');
const echoed = ['.', '.', ...tokens.slice(0, -2)];
const v2 = Array.from({ length: BARS }, (_, bar) => (bar < 8 ? REST : on(echoed.slice(bar * 8, bar * 8 + 8).join(' '), 'echo')));

const bars = (fn) => voicings.map(fn);
const bed = (key, inst, from = 0) => bars((parts, bar) => (bar < from ? REST : parts.map((p) => held(p[key], inst, p.len)).join(' ')));

const v3 = bars((parts) =>
  parts.length === 1 ? `${nameOf(parts[0].root)}:bass - - - - - . .` : parts.map((p) => `${nameOf(p.root)}:bass - - .`).join(' '),
);
const v4 = bed('third', 'padL');
const v5 = bed('seventh', 'padR');
const v6 = bed('color', 'str');
const v7 = bed('third', 'choir', 8);
const v8 = bars((parts, bar) => (bar % 4 ? REST : `${nameOf(parts[0].color + 12)}:bell - - - - - - -`));

const join = (rows) => rows.join(' | ');

export default {
  tempo: 24,
  loop: 0,
  echo: { mvol: 88, evol: 44, efb: 72, edl: 6, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    keys: { ...INSTRUMENTS.epiano, adsr: [14, 4, 4, 15], vol: 104, pan: -10 },
    echo: { ...INSTRUMENTS.epiano, adsr: [14, 4, 3, 17], vol: 44, pan: 44 },
    bass: { ...INSTRUMENTS.synbass, adsr: [12, 2, 6, 12], vol: 84 },
    padL: { ...INSTRUMENTS.pad, adsr: [8, 2, 6, 0], vol: 50, pan: -44 },
    padR: { ...INSTRUMENTS.pad, adsr: [8, 2, 6, 0], vol: 50, pan: 44 },
    str: { ...INSTRUMENTS.strings, adsr: [9, 3, 6, 2], vol: 40 },
    choir: { ...INSTRUMENTS.choir, adsr: [8, 3, 6, 2], vol: 34, pan: -20 },
    bell: { ...INSTRUMENTS.bell, vol: 48, pan: 30 },
  },
  v1: { rows: join(v1) },
  v2: { rows: join(v2) },
  v3: { rows: join(v3) },
  v4: { rows: join(v4) },
  v5: { rows: join(v5) },
  v6: { rows: join(v6) },
  v7: { rows: join(v7) },
  v8: { rows: join(v8) },
};

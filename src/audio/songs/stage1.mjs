// Stage 1's brawler groove (docs/THEME.md), pushed toward corporate wave: the theme at 120 BPM with
// swung eighths on a 24-row bar (6 rows a beat, a swung pair is 4 + 2). A 4-bar hook intro, the
// whole theme (the loop), a clipped stab break and the short A'' to come home. Pulse 1 leads, pulse
// 2 echoes it softly and stabs ninth-chord arpeggios, the triangle slaps an octave bass that walks
// through the chord, and the noise keeps a firm kick and snare under soft hats, with rows left open
// for punches.

import { MELODY, chordParts } from './title.mjs';

const BAR = 24;
const ROOT = { F: 'F2', G: 'G2', A: 'A2', Bb: 'Bb2', C: 'C3', D: 'D3', E: 'E3' };
const THIRD = { F: 'A2', G: 'Bb2', A: 'C3', Bb: 'D3', C: 'E3', D: 'F3', E: 'G3' };
const FIFTH = { F: 'C3', G: 'D3', A: 'E3', Bb: 'F3', C: 'G3', D: 'A3', E: 'B3' };
const STAB = { F: 'F4', G: 'G4', A: 'A4', Bb: 'Bb4', C: 'C5', D: 'D4', E: 'E4' };
// The richest chord each root keeps inside F major.
const CHORD = { F: 'maj9', Bb: 'maj9', C: 'dom9', D: 'min9', G: 'min9', A: 'min7' };
const up = (note) => note.replace(/\d$/, (o) => String(Number(o) + 1));

// Each bar is [theme bar, lead style, drums]. lead: 'legato' or 'clip'; drums: 'beat' or 'fill'.
const theme = (from, to, fills) =>
  Array.from({ length: to - from }, (_, i) => [from + i, 'legato', fills.includes(from + i) ? 'fill' : 'beat']);

const INTRO = [[0, 'legato', 'beat'], [1, 'legato', 'beat'], [0, 'legato', 'beat'], [1, 'legato', 'fill']];
const LOOP = theme(0, 24, [7, 15, 19, 23]);
const BREAK = [[0, 'clip', 'beat'], [1, 'clip', 'beat'], [2, 'clip', 'beat'], [3, 'clip', 'fill']];
const HOME = theme(20, 24, [23]);
const PLAN = [...INTRO, ...LOOP, ...BREAK, ...HOME];

// Swing: the on-beat eighth takes 4 rows, the off-beat one 2.
const lead = ([bar, how]) =>
  MELODY[bar]
    .split(' ')
    .map((t, i) => {
      const len = i % 2 === 0 ? 4 : 2;
      const fill = (tok) => Array(len - 1).fill(tok).join(' ');
      if (t === '.') return `. ${fill('.')}`;
      if (t === '-') return how === 'clip' ? `. ${fill('.')}` : `- ${fill('-')}`;
      return how === 'clip' ? `${t}:clip ${fill('.')}` : `${t} ${fill('-')}`;
    })
    .join(' ');

const STAB_ROWS = [4, 10, 16, 22];
const ECHO_DELAY = 3;

const pulse2 = () => {
  const leadRows = PLAN.map(lead).join(' ').split(' ');
  const echo = [...Array(ECHO_DELAY).fill('.'), ...leadRows.slice(0, -ECHO_DELAY)].map((t) =>
    /^[A-G]/.test(t) ? `${t.split(':')[0]}:echo` : t,
  );
  return PLAN.map(([bar, how], b) => {
    const parts = chordParts(bar);
    return Array.from({ length: BAR }, (_, row) => {
      if (STAB_ROWS.includes(row)) {
        const { root } = parts[parts.length === 2 && row >= BAR / 2 ? 1 : 0];
        return `${STAB[root]}:${CHORD[root]}`;
      }
      return how === 'clip' ? '.' : echo[b * BAR + row];
    }).join(' ');
  }).join(' | ');
};

// Slap octaves on the swung off-beats, walking root, third and fifth through the bar.
const bass = ([bar]) => {
  const parts = chordParts(bar);
  if (parts.length === 2) {
    return parts.map(({ root: c }) => `${ROOT[c]} - - . ${up(ROOT[c])} . ${FIFTH[c]} - - . ${up(ROOT[c])} .`).join(' ');
  }
  const c = parts[0].root;
  const [r, o, t, f] = [ROOT[c], up(ROOT[c]), THIRD[c], FIFTH[c]];
  return `${r} - - . ${o} . . . ${r} . ${o} . ${f} - - . ${o} . ${t} - - . ${f} .`;
};

const BEAT = 'A . . . 0:hat . 5:snare . . . 0:hat . A . . . A . 5:snare . . . 0:hat .';
const FILL = 'A . . . 0:hat . 5:snare . . . 0:hat . A . 5:snare . 4:snare . 4:snare 3:snare 3:snare 2:snare 2:snare 2:snare';
const drums = ([, , kind]) => (kind === 'fill' ? FILL : BEAT);

const cycle = (steps) => Array.from({ length: 20 }, (_, f) => steps[f % steps.length]);
const stab = (steps) => ({ duty: 2, env: [9, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0], pitch: cycle(steps) });

export default {
  tempo: 5,
  loop: INTRO.length * BAR,
  instruments: {
    lead: { duty: 2, env: [14, 14, 13, 12, 11, 11, 10, 10, 10, 9] },
    clip: { duty: 1, env: [15, 13, 10, 7, 4, 2, 0] },
    echo: { duty: 2, env: [5, 5, 4, 4, 3, 3, 3, 2], pitch: [0.12] },
    maj9: stab([0, 4, 7, 11, 14]),
    dom9: stab([0, 4, 7, 10, 14]),
    min9: stab([0, 3, 7, 10, 14]),
    min7: stab([0, 3, 7, 10]),
    bass: { env: [15] },
    kick: { env: [15, 13, 10, 7, 4, 2, 0], pitch: [0, 1, 2, 3] },
    snare: { env: [12, 10, 8, 6, 4, 3, 1, 0] },
    hat: { short: true, env: [3, 2, 1, 0] },
  },
  pulse1: { inst: 'lead', rows: PLAN.map(lead).join(' | ') },
  pulse2: { inst: 'echo', rows: pulse2() },
  triangle: { inst: 'bass', rows: PLAN.map(bass).join(' | ') },
  noise: { inst: 'kick', rows: PLAN.map(drums).join(' | ') },
};

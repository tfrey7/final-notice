// The theme as an escape (docs/THEME.md): 180 BPM over a staccato octave-driving triangle, offbeat
// Famichord stabs and eighth-note hats. A sour pulse that sags flat doubles the hook when it goes wrong.
//
// 48 bars, 64 s: intro 4 | A A' B A'' 24 | sour A + B 12 | A' 8, looping to the end of the intro.

import { MELODY, CHORDS } from './title.mjs';

const ROOT = { F: 'F2', G: 'G2', A: 'A2', Bb: 'Bb2', C: 'C3', D: 'D3', E: 'E3' };
const OCTAVE = { F: 'F3', G: 'G3', A: 'A3', Bb: 'Bb3', C: 'C4', D: 'D4', E: 'E4' };
const FIFTH = { F: 'C3', G: 'D3', A: 'E3', Bb: 'F3', C: 'G3', D: 'A3', E: 'B3' };
const STAB = { F: 'F4', G: 'G4', A: 'A4', Bb: 'Bb4', C: 'C5', D: 'D4', E: 'E4' };

const theme = (i, part) => ({ chord: CHORDS[i], melody: MELODY[i], part });
const REST = '. . . . . . . .';

const INTRO = [
  { chord: 'F', part: 'intro', drums: 'hats' },
  { chord: 'F', part: 'intro' },
  { chord: 'F', part: 'intro', melody: 'C5 - F5 - A5 - G5 F5' },
  { chord: 'Am', part: 'intro', melody: 'E5 - - - - - - -' },
];
const range = (from, to) => Array.from({ length: to - from }, (_, k) => from + k);
const SECTIONS = [
  INTRO,
  range(0, 24).map((i) => theme(i, 'main')),
  [...range(0, 8), ...range(16, 20)].map((i) => theme(i, 'sour')),
  range(8, 16).map((i) => theme(i, 'main')),
];
const BARS = SECTIONS.flatMap((section) => section.map((bar, k) => ({ ...bar, fill: k === section.length - 1 })));

export const LOOP_BAR = INTRO.length;

const parts = (chord) => chord.split(' ').map((c) => ({ root: c.replace('m', ''), minor: c.endsWith('m') }));
const tag = (bar, inst) => bar.split(' ').map((t) => (/^[A-G]/.test(t) ? `${t}:${inst}` : t)).join(' ');

const pulse1 = BARS.map((b) => (b.part === 'intro' ? REST : b.part === 'sour' ? tag(b.melody, 'thin') : b.melody));

const pulse2 = BARS.map((b) => {
  if (b.part !== 'main') return b.melody ? tag(b.melody, 'sour') : REST;
  const hits = parts(b.chord).map(({ root, minor }) => {
    const stab = `${STAB[root]}:${minor ? 'min' : 'maj'}`;
    return `. ${stab} . ${stab}`;
  });
  return (hits.length === 1 ? [hits[0], hits[0]] : hits).join(' ');
});

const triangle = BARS.map((b) => {
  const ps = parts(b.chord);
  if (ps.length === 2) return ps.map(({ root }) => `${ROOT[root]} ${OCTAVE[root]} ${ROOT[root]} ${FIFTH[root]}`).join(' ');
  const { root } = ps[0];
  return `${ROOT[root]} ${OCTAVE[root]} ${ROOT[root]} ${OCTAVE[root]} ${ROOT[root]} ${ROOT[root]} ${FIFTH[root]} ${OCTAVE[root]}`;
});

const HATS = '0:hat 0:hat 0:hat 0:hat 0:hat 0:hat 0:hat 0:hat';
const BEAT = 'A 0:hat 5:snare 0:hat A A 5:snare 0:hat';
const FILL = 'A 0:hat 5:snare 0:hat 5:snare 4:snare 3:snare 2:snare';
const noise = BARS.map((b) => (b.drums === 'hats' ? HATS : b.fill ? FILL : BEAT));

const cycle = (steps) => Array.from({ length: 24 }, (_, f) => steps[Math.floor(f / 2) % steps.length]);
// A third of a semitone flat, then sagging towards a semitone and a third flat as the note is held.
const sag = Array.from({ length: 60 }, (_, f) => Math.max(-1.3, -0.3 - Math.max(0, f - 10) * 0.03));

export default {
  tempo: 10,
  loop: LOOP_BAR * 8,
  instruments: {
    lead: { duty: 2, env: [14, 12, 11, 10, 10, 9, 9, 9, 8], pitch: [0.2, 0, 0] },
    thin: { duty: 1, env: [11, 10, 9, 9, 8, 8, 7] },
    sour: { duty: 1, env: [9, 9, 8, 8, 7, 7, 7, 6], pitch: sag },
    maj: { duty: 1, env: [8, 6, 4, 2, 0], pitch: cycle([0, 4, 7]) },
    min: { duty: 1, env: [8, 6, 4, 2, 0], pitch: cycle([0, 3, 7]) },
    bass: { env: [15, 15, 15, 15, 15, 15, 15, 0] },
    kick: { env: [11, 8, 5, 3, 1, 0], pitch: [0, 1, 2] },
    snare: { env: [9, 7, 5, 4, 3, 2, 1, 0] },
    hat: { short: true, env: [5, 3, 1, 0] },
  },
  pulse1: { inst: 'lead', rows: pulse1.join(' | ') },
  pulse2: { inst: 'sour', rows: pulse2.join(' | ') },
  triangle: { inst: 'bass', rows: triangle.join(' | ') },
  noise: { inst: 'kick', rows: noise.join(' | ') },
};

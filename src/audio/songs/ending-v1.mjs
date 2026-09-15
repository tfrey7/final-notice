// The theme over the credits (docs/THEME.md): the title melody played straight through once, warm,
// with a quarter-note echo from the second verse. The last phrase refuses to go home: bar 24 hangs
// on C instead of F, and a two-bar tag starts the hook again and stops on its G, left open for the
// next case.
//
// 28 bars at 112 BPM, 60 s, no loop: intro 2 | A A' B 20 | A'' left open 4 | tag 2.

import { MELODY, CHORDS } from './title.mjs';

const ROOT = { F: 'F2', G: 'G2', A: 'A2', Bb: 'Bb2', C: 'C3', D: 'D3', E: 'E3' };
const FIFTH = { F: 'C3', G: 'D3', A: 'E3', Bb: 'F3', C: 'G3', D: 'A3', E: 'B3' };
const STAB = { F: 'F4', G: 'G4', A: 'A4', Bb: 'Bb4', C: 'C4', D: 'D4', E: 'E4' };

const REST = '. . . . . . . .';

export const OPEN_BARS = [
  { chord: 'F', melody: 'C5 - F5 - A5 - G5 F5' },
  { chord: 'Am', melody: 'E5 - - - C5 - . .' },
  { chord: 'Bb C', melody: 'D5 - F5 - E5 - G5 -' },
  { chord: 'C', melody: 'G5 - - - E5 - D5 -' },
];
export const TAG = [
  { chord: 'F', melody: 'C5 - F5 - A5 - - -', tag: true },
  { chord: 'C', melody: 'G5 - - - - - - -', tag: true, last: true },
];

const BARS = [
  { chord: 'F', melody: REST, intro: true },
  { chord: 'C', melody: REST, intro: true },
  ...MELODY.slice(0, 20).map((melody, i) => ({ chord: CHORDS[i], melody, echo: i >= 8 })),
  ...OPEN_BARS.map((b) => ({ ...b, echo: true })),
  ...TAG,
];

export const BAR_COUNT = BARS.length;

const parts = (chord) => chord.split(' ').map((c) => ({ root: c.replace('m', ''), minor: c.endsWith('m') }));

const pulse1 = BARS.map((b) => b.melody);

// The echo: the melody a quarter note late, so each bar takes the last two rows of the bar before.
const flat = BARS.map((b) => (b.echo ? b.melody : REST).split(' '));
const pulse2 = BARS.map((b, i) => {
  if (b.intro || (!b.echo && !b.tag)) {
    const hits = parts(b.chord).map(({ root, minor }) => `${STAB[root]}:${minor ? 'min' : 'maj'} - . .`);
    return (hits.length === 1 ? [hits[0], hits[0]] : hits).join(' ');
  }
  const carried = (flat[i - 1] ?? REST.split(' ')).slice(6).map((t) => (t === '-' ? '.' : t));
  return [...carried, ...flat[i].slice(0, 6)].map((t) => (/^[A-G]/.test(t) ? `${t}:echo` : t)).join(' ');
});

const triangle = BARS.map((b) => {
  const ps = parts(b.chord);
  if (b.last) return `${ROOT.C} - - - - - - -`;
  if (ps.length === 2) return ps.map(({ root }) => `${ROOT[root]} - ${FIFTH[root]} .`).join(' ');
  const { root } = ps[0];
  return `${ROOT[root]} - . ${ROOT[root]} ${FIFTH[root]} - ${ROOT[root]} .`;
});

const BEAT = 'A . 0:hat . 6:snare . 0:hat .';
const FILL = 'A . 0:hat . 6:snare 5:snare 4:snare 3:snare';
const noise = BARS.map((b, i) => {
  if (b.intro || b.tag) return REST;
  return [9, 17, 21].includes(i) ? FILL : BEAT;
});

const cycle = (steps) => Array.from({ length: 32 }, (_, f) => steps[Math.floor(f / 2) % steps.length]);

export default {
  tempo: 16,
  loop: null,
  instruments: {
    lead: { duty: 2, env: [8, 10, 11, 11, 10, 10, 10, 9, 9, 9, 9, 8] },
    echo: { duty: 0, env: [4, 5, 5, 5, 4, 4, 4, 3] },
    maj: { duty: 1, env: [6, 5, 4, 3, 2, 1, 0], pitch: cycle([0, 4, 7]) },
    min: { duty: 1, env: [6, 5, 4, 3, 2, 1, 0], pitch: cycle([0, 3, 7]) },
    bass: { env: [15] },
    kick: { env: [9, 6, 3, 1, 0], pitch: [0, 1, 2] },
    snare: { env: [6, 5, 4, 3, 2, 1, 0] },
    hat: { short: true, env: [3, 2, 1, 0] },
  },
  pulse1: { inst: 'lead', rows: pulse1.join(' | ') },
  pulse2: { inst: 'echo', rows: pulse2.join(' | ') },
  triangle: { inst: 'bass', rows: triangle.join(' | ') },
  noise: { inst: 'kick', rows: noise.join(' | ') },
};

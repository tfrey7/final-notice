// The theme as a boss fight (docs/THEME.md): the hook's first five notes, C F A G F E C, cut into a
// relentless eighth-note ostinato on pulse 2 over an octave-pumping triangle pedal on D, Bb, G and A.
// Pulse 1 states the hook in long notes above it; the second half climbs an octave and drives harder.
//
// 36 bars at 225 BPM, 38 s: intro 4 | A 8 | A up 8 | B 8 | A drive 8, looping to the end of the intro.

// One ostinato cell per pedal, each the hook's shape moved within F major.
const CELL = {
  D: 'C4 F4 A4 G4 F4 E4 C4 F4',
  Bb: 'D4 F4 Bb4 A4 G4 F4 D4 F4',
  G: 'D4 G4 Bb4 A4 G4 F4 D4 G4',
  A: 'E4 A4 C5 Bb4 A4 G4 E4 A4',
};
const PEDAL = { D: ['D2', 'D3'], Bb: ['Bb1', 'Bb2'], G: ['G1', 'G2'], A: ['A1', 'A2'] };

const up = (bar) => bar.replace(/([A-G]b?)(\d)/g, (_, n, o) => `${n}${+o + 1}`);
const tag = (bar, inst) => bar.split(' ').map((t) => (/^[A-G]/.test(t) ? `${t}:${inst}` : t)).join(' ');
const REST = '. . . . . . . .';

const A_ROOTS = ['D', 'D', 'Bb', 'Bb', 'G', 'G', 'A', 'A'];
const B_ROOTS = ['G', 'G', 'A', 'A', 'Bb', 'Bb', 'A', 'A'];

// The hook in long notes, answered by its own shape a fourth higher, hanging on the E of the A pedal.
const HOOK_LONG = [
  'C5 - - - F5 - - -', 'A5 - - - G5 - F5 -', 'E5 - - - - - - -', 'C5 - - - - - . .',
  'D5 - - - G5 - - -', 'Bb5 - - - A5 - G5 -', 'E5 - - - - - - -', 'E5 - - - - - . .',
];
// The bridge: the hook's first bar snapped off and thrown back, each time a step higher.
const HOOK_CUT = [
  'D5 - G5 - Bb5 - A5 G5', REST, 'E5 - A5 - C6 - Bb5 A5', REST,
  'F5 - Bb5 - D6 - C6 Bb5', REST, 'E5 - A5 - C6 - - -', 'E6 - - - - - . .',
];

const bar = (root, lead, opts = {}) => ({ root, lead, ...opts });
const SECTIONS = [
  ['D', 'D', 'D', 'A'].map((r, k) => bar(r, REST, { intro: true, fill: k === 3 })),
  A_ROOTS.map((r, k) => bar(r, HOOK_LONG[k], { fill: k === 7 })),
  A_ROOTS.map((r, k) => bar(r, tag(up(HOOK_LONG[k]), 'high'), { high: true, fill: k === 7 })),
  B_ROOTS.map((r, k) => bar(r, HOOK_CUT[k], { fill: k === 7 })),
  A_ROOTS.map((r, k) => bar(r, HOOK_LONG[k], { high: true, drive: true, fill: k >= 6 })),
];
const BARS = SECTIONS.flat();

export const LOOP_BAR = SECTIONS[0].length;
export const BAR_COUNT = BARS.length;

const pulse1 = BARS.map((b) => b.lead);

const pulse2 = BARS.map((b) => (b.high ? tag(up(CELL[b.root]), 'grind') : CELL[b.root]));

const triangle = BARS.map((b) => {
  const [lo, hi] = PEDAL[b.root];
  return `${lo} ${lo} ${hi} ${lo} ${lo} ${hi} ${lo} ${hi}`;
});

const PULSE = 'A 0:hat A 0:hat A 0:hat A 0:hat';
const BEAT = 'A 0:hat 5:snare 0:hat A A 5:snare 0:hat';
const DRIVE = 'A 5:snare A 5:snare A 5:snare A 5:snare';
const FILL = 'A 0:hat 5:snare 5:snare 4:snare 3:snare 2:snare 1:snare';
const noise = BARS.map((b) => (b.fill ? FILL : b.intro ? PULSE : b.drive ? DRIVE : BEAT));

export default {
  tempo: 8,
  loop: LOOP_BAR * 8,
  instruments: {
    lead: { duty: 2, env: [13, 12, 11, 11, 10, 10, 10, 9, 9, 9, 8], pitch: [0.3, 0.1, 0] },
    high: { duty: 1, env: [12, 11, 10, 10, 9, 9, 9, 8], pitch: [0.3, 0.1, 0] },
    osti: { duty: 0, env: [10, 8, 6, 4, 2, 0] },
    grind: { duty: 1, env: [9, 7, 5, 3, 1, 0] },
    bass: { env: [15, 15, 15, 15, 15, 0] },
    kick: { env: [12, 9, 6, 3, 1, 0], pitch: [0, 1, 2] },
    snare: { env: [10, 8, 6, 4, 3, 2, 1, 0] },
    hat: { short: true, env: [5, 3, 1, 0] },
  },
  pulse1: { inst: 'lead', rows: pulse1.join(' | ') },
  pulse2: { inst: 'osti', rows: pulse2.join(' | ') },
  triangle: { inst: 'bass', rows: triangle.join(' | ') },
  noise: { inst: 'kick', rows: noise.join(' | ') },
};

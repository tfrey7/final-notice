// The six jingles, each built on the title theme's opening motif (C F A G F E, title.mjs) and
// played once. The player loads songs by file name, so each has a one-line file of its own.
// Pulse 2 carries only harmony here, so effects that take it lose nothing that matters.

const INSTRUMENTS = {
  lead: { duty: 2, env: [15, 13, 12, 11, 10, 10, 9] },
  ring: { duty: 2, env: [15, 14, 13, 12, 11, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0] },
  harm: { duty: 1, env: [9, 8, 7, 7, 6] },
  sad: { duty: 1, env: [12, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0] },
  droop: {
    duty: 2,
    env: [12, 11, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0],
    pitch: Array.from({ length: 30 }, (_, f) => -f * 0.12),
  },
  bass: { env: [15] },
  kick: { env: [13, 9, 5, 2, 0], pitch: [0, 1, 2] },
  snare: { env: [12, 9, 6, 4, 2, 0] },
  hat: { short: true, env: [5, 3, 1, 0] },
};

const jingle = (tempo, channels) => ({ tempo, loop: null, instruments: INSTRUMENTS, ...channels });

// Ready, go: the motif climbs straight to a held high F.
export const stageStart = jingle(6, {
  pulse1: { inst: 'lead', rows: 'C5 - F5 - A5 - C6 - | A5 - C6 - F6:ring - - - | - - - - - - . .' },
  pulse2: { inst: 'harm', rows: 'A4 - C5 - F5 - A5 - | F5 - A5 - C6 - - - | - - - - - - . .' },
  triangle: { inst: 'bass', rows: 'F2 - - - F3 - - - | Bb2 - C3 - F3 - - - | - - - - - - . .' },
  noise: { inst: 'kick', rows: 'C . 0:hat . 6:snare . 0:hat 0:hat | C . 0:hat . 6:snare 6:snare 5:snare 5:snare | C . . . . . . .' },
});

// The whole motif at a run, then a proper cadence home to F.
export const stageClear = jingle(6, {
  pulse1: { inst: 'lead', rows: 'C5 F5 A5 G5 F5 E5 D5 E5 | F5 - A5 - C6 - A5 - | Bb5 - A5 - G5 - E5 - | F5:ring - - - - - - - | . . . .' },
  pulse2: { inst: 'harm', rows: 'A4 C5 F5 E5 D5 C5 Bb4 C5 | C5 - F5 - A5 - F5 - | D5 - F5 - E5 - C5 - | A4 - - - - - - - | . . . .' },
  triangle: { inst: 'bass', rows: 'F2 - - - F3 - - - | F2 - C3 - F3 - C3 - | Bb2 - - - C3 - - - | F2 - - - - - - . | . . . .' },
  noise: { inst: 'kick', rows: 'C . 0:hat 0:hat 6:snare . 0:hat 0:hat | C . 0:hat . 6:snare . 0:hat . | C . 0:hat . 6:snare 6:snare 5:snare 5:snare | C . . . . . . . | . . . .' },
});

// The motif backwards and falling, the last note sagging flat. Short, so respawn comes quickly.
export const lifeLost = jingle(5, {
  pulse1: { inst: 'lead', rows: 'A5 G5 F5 E5 | D5 - C5 - | Bb4 - - A4:droop - - - - . .' },
  triangle: { inst: 'bass', rows: 'F3 - - - | Bb2 - - - | C3 - - F2 - - - - . .' },
});

// The motif slowed into F minor, no drums.
export const gameOver = jingle(10, {
  pulse1: { inst: 'sad', rows: 'C5 - F5 - Ab5 - G5 F5 | E5 - - - C5 - - - | F4 - - - .' },
  pulse2: { inst: 'harm', rows: 'Ab4 - C5 - C5 - Bb4 Ab4 | G4 - - - E4 - - - | C4 - - - .' },
  triangle: { inst: 'bass', rows: 'F2 - - - Db3 - - - | C3 - - - C2 - - - | F2 - - - .' },
});

// Back on the clock: the motif picks itself up and lands on a bright C.
export const continueJingle = jingle(6, {
  pulse1: { inst: 'lead', rows: 'C5 F5 A5 G5 F5 - E5 - | F5 - A5 - C6:ring - - - | - - - .' },
  pulse2: { inst: 'harm', rows: 'A4 C5 F5 E5 D5 - C5 - | C5 - F5 - A5 - - - | - - - .' },
  triangle: { inst: 'bass', rows: 'F2 - - - C3 - - - | F2 - C3 - F3 - - - | - - - .' },
  noise: { inst: 'kick', rows: 'C . 0:hat . C . 6:snare . | C . 0:hat . 6:snare 5:snare 5:snare 5:snare | C . . .' },
});

// A quick high flourish of the motif for an item worth a tune.
export const pickup = jingle(4, {
  pulse1: { inst: 'lead', rows: 'C6 F6 A6 G6 F6 - - - C7:ring - - - - - . .' },
  pulse2: { inst: 'harm', rows: 'A5 C6 F6 E6 C6 - - - F6 - - - - - . .' },
  triangle: { inst: 'bass', rows: 'F3 - - - - - - - F2 - - - - - . .' },
});

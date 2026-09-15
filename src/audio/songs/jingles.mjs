// The six jingles, late-Famicom style with a corporate wave gloss: DPCM kick, gated snare and orchestra
// stab, VRC6 saw brass stingers, bright "transaction approved" chimes echoed on a VRC6 pulse, and phone
// and fax textures. Each still nods to the title's motif (C F A G F E) and plays once. The player loads
// songs by file name, so each has a one-line file; the first set is jingles-v1.mjs.

const INSTRUMENTS = {
  lead: { duty: 1, env: [14, 13, 12, 11, 11, 10, 10, 9] },
  // The strike flicks up an octave for one frame, then rings: a point-of-sale chime.
  chime: { duty: 2, env: [15, 15, 13, 12, 11, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0], pitch: [12, 0] },
  harm: { duty: 0, env: [9, 8, 8, 7, 7, 6] },
  bell: { duty: 3, env: [7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0] },
  beep: { duty: 2, env: [12, 12, 12, 12, 0] },
  echo: { duty: 3, env: [6, 6, 6, 6, 0] },
  // Call dropped: the note slides a whole octave down.
  drop: { duty: 1, env: [13, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0], pitch: Array.from({ length: 40 }, (_, f) => -12 * (1 - Math.exp(-f / 12))) },
  dropEcho: { duty: 3, env: [6, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 0], pitch: Array.from({ length: 40 }, (_, f) => -12 * (1 - Math.exp(-f / 12))) },
  sad: { duty: 1, env: [12, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0] },
  busy: { duty: 2, env: [9, 9, 9, 9, 9, 9, 0] },
  dial: { duty: 1, env: [8, 8, 0] },
  // VRC6 saw: a swelling brass hold, a short brass stab, a slow pad and a falling brass drop.
  brass: { env: [8, 10, 12, 13, 14, 14, 13, 13, 12, 12, 12, 11] },
  stab: { env: [15, 14, 12, 10, 8, 6, 4, 2, 0] },
  pad: { env: [3, 4, 5, 6, 7, 8, 8, 8, 8, 8, 8, 7] },
  fall: { env: [14, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0], pitch: Array.from({ length: 50 }, (_, f) => -f * 0.5) },
  bass: { env: [15] },
  bassFall: { env: [15], pitch: Array.from({ length: 50 }, (_, f) => -f * 0.3) },
  hat: { short: true, env: [5, 3, 1, 0] },
  fax: { short: true, env: [6, 7, 5, 7, 4, 6, 3, 0] },
  kick: { sample: 'kick' },
  snare: { sample: 'snare', env: [13] },
  ks: { sample: 'kickSnare' },
  orch: { sample: 'stab' },
  hit: { sample: 'hit' },
};

const jingle = (tempo, channels) => ({ tempo, loop: null, instruments: INSTRUMENTS, ...channels });

// Ready, go: the motif climbs to a chiming F over a stab, brass rising under it.
export const stageStart = jingle(6, {
  pulse1: { inst: 'lead', rows: 'C5 F5 A5 C6 A5 C6 F6:chime - | - - - - - - - - | - - - - . . . .' },
  pulse2: { inst: 'harm', rows: 'A4 C5 F5 A5 F5 A5 C6:chime - | - - - - - - - - | - - - - . . . .' },
  vrc6p1: { inst: 'bell', rows: '. C5 F5 A5 C6 A5 C6 F6 | - - - - - - - - | - - . . . . . .' },
  saw: { inst: 'brass', rows: 'F3:stab . . F3:stab . . A3 - | C4 - - - - - - - | - - - - . . . .' },
  triangle: { inst: 'bass', rows: 'F2 . F2 . F2 . C3 - | F2 - - - - - - - | - - - - . . . .' },
  dpcm: { inst: 'kick', rows: 'F:orch - - F:ks - - F:snare - | F:orch - - - - - - - | . . . . . . . .' },
  noise: { inst: 'hat', rows: '. 0 . 0 . 0 0 0 | . . . . . . . . | . . . . . . . .' },
});

// Transaction approved: the motif at a run, a two-tone chime, brass stabs, home on a ringing F.
export const stageClear = jingle(6, {
  pulse1: { inst: 'lead', rows: 'C6 F6 A6 G6 F6 E6 D6 E6 | F6:chime - C7:chime - - - - - | E6 F6 G6 A6 C7:chime - - - | - - - - - . . .' },
  pulse2: { inst: 'harm', rows: 'A5 C6 F6 E6 D6 C6 Bb5 C6 | C6:chime - G6:chime - - - - - | C6 D6 E6 F6 A6:chime - - - | - - - - - . . .' },
  vrc6p1: { inst: 'bell', rows: '. C6 F6 A6 G6 F6 E6 D6 | E6 F6 - C7 - - - - | - E6 F6 G6 A6 C7 - - | - - - - . . . .' },
  saw: { inst: 'stab', rows: 'F3 . . F3 . . C4 . | Bb3:brass - - - C4:brass - - - | Bb3 . C4 . F4:brass - - - | - - - - - . . .' },
  triangle: { inst: 'bass', rows: 'F2 . F3 . F2 . C3 . | Bb2 - - - C3 - - - | Bb2 . C3 . F2 - - - | - - - - - . . .' },
  dpcm: { inst: 'kick', rows: 'F - - - F:snare - - - | F - F - F:snare - F:snare - | F - F:snare - F:orch - - - | - - - - . . . .' },
  noise: { inst: 'hat', rows: '. 0 . 0 . 0 . 0 | . 0 . 0 . 0 . 0 | . 0 . 0 . . . . | . . . . . . . .' },
});

// Call dropped: three falling line tones, then everything slides away an octave. Short, so respawn
// comes quickly.
export const lifeLost = jingle(5, {
  pulse1: { inst: 'beep', rows: 'G6 . Eb6 . Bb5 . . . | A5:drop - - - - - - - | - - . .' },
  vrc6p1: { inst: 'echo', rows: '. G6 . Eb6 . Bb5 . . | . A5:dropEcho - - - - - - | - - . .' },
  saw: { inst: 'fall', rows: '. . . . . . . . | D4 - - - - - - - | - - . .' },
  triangle: { inst: 'bassFall', rows: '. . . . . . . . | D3 - - - - - - - | - . . .' },
  dpcm: { inst: 'hit', rows: '. . . . . . . . | F - - - . . . . | . . . .' },
  noise: { inst: 'fax', rows: '. . . . . . . . | . . . . . . . . | 1 - . .' },
});

// The motif slowed into F minor over a saw pad, a low stab, and a busy signal to close.
export const gameOver = jingle(10, {
  pulse1: { inst: 'sad', rows: 'C5 - F5 - Ab5 - G5 F5 | E5 - - - C5 - - - | F4 - - - . . . .' },
  pulse2: { inst: 'harm', rows: 'Ab4 - C5 - C5 - Bb4 Ab4 | G4 - - - E4 - - - | C4 - - - B4:busy . B4:busy .' },
  saw: { inst: 'pad', rows: 'Db4 - - - - - - - | C4 - - - - - - - | F3:stab . . . . . . .' },
  triangle: { inst: 'bass', rows: 'F2 - - - Db3 - - - | C3 - - - C2 - - - | F2 - - - . . . .' },
  dpcm: { inst: 'orch', rows: 'F - - - . . . . | . . . . . . . . | C - - - . . . .' },
});

// Back on the clock: a dial-up handshake connects, and the motif picks itself up onto a chime.
export const continueJingle = jingle(5, {
  pulse1: { inst: 'lead', rows: '. . . . . . . . | C5 F5 A5 G5 F5 - E5 - | F5 - A5 - C6:chime - - - | - - - - . . . .' },
  pulse2: { inst: 'harm', rows: 'A6:dial E7:dial A6:dial E7:dial B6:dial F#7:dial . . | A4 C5 F5 E5 D5 - C5 - | C5 - F5 - A5:chime - - - | - - - - . . . .' },
  vrc6p1: { inst: 'bell', rows: '. . . . . . . . | . C5 F5 A5 G5 F5 - E5 | - F5 - A5 - C6 - - | - - - . . . . .' },
  noise: { inst: 'hat', rows: '1:fax 1:fax 0:fax 1:fax 2:fax 0:fax . . | . 0 . 0 . 0 . 0 | . 0 . 0 . . . . | . . . . . . . .' },
  saw: { inst: 'stab', rows: '. . . . . . . . | F3 . . . C4 . . . | Bb3:brass - C4:brass - F4:brass - - - | - - - - . . . .' },
  triangle: { inst: 'bass', rows: '. . . . . . . . | F2 . F3 . C3 . C3 . | Bb2 - C3 - F2 - - - | - - - - . . . .' },
  dpcm: { inst: 'kick', rows: '. . . . . . F:ks - | F - - - F:snare - - - | F - F:snare - F:orch - - - | - - - - . . . .' },
});

// A quick approved flourish for an item worth a tune.
export const pickup = jingle(4, {
  pulse1: { inst: 'lead', rows: 'C6 F6 A6 C7:chime - - F7:chime - - - - - - - . .' },
  pulse2: { inst: 'harm', rows: 'A5 C6 F6 A6:chime - - C7:chime - - - - - - - . .' },
  vrc6p1: { inst: 'bell', rows: '. . C6 F6 A6 C7 - - F7 - - - - - . .' },
  saw: { inst: 'stab', rows: '. . . . . . F4 . . . . . . . . .' },
  triangle: { inst: 'bass', rows: 'F3 - - - - - F2 - - - - - . . . .' },
  dpcm: { inst: 'orch', rows: 'F - - . . . F:snare - - . . . . . . .' },
});

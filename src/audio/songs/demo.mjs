// Eight bars in C minor that exercise all four channels. The sound test's tune, not a game cue.

export default {
  tempo: 12,
  loop: 0,
  instruments: {
    lead: { duty: 2, env: [15, 14, 13, 12, 11, 11, 10, 10, 9, 9, 9, 8], pitch: [0.3, 0, 0] },
    harm: { duty: 1, env: [8, 8, 7, 7, 6, 6, 6, 5, 5, 5, 5, 4] },
    bass: { env: [15] },
    kick: { env: [15, 12, 9, 6, 4, 2, 1, 0], pitch: [0, 1, 2, 3] },
    snare: { env: [13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] },
    hat: { short: true, env: [7, 4, 2, 0] },
  },
  pulse1: {
    inst: 'lead',
    rows: `C5 - Eb5 - G5 - - . | F5 - Eb5 - D5 - C5 . | Bb4 - C5 - D5 - Eb5 - | D5 - - - - - . .
           C5 - Eb5 - G5 - C6 - | Bb5 - Ab5 - G5 - F5 - | Eb5 - D5 - Eb5 - F5 - | G5 - - - - - . .`,
  },
  pulse2: {
    inst: 'harm',
    rows: `Eb4 - - - G4 - - - | Ab4 - - - F4 - - - | F4 - - - Bb4 - - - | B4 - - - G4 - - -
           Eb4 - - - G4 - - - | Ab4 - - - C5 - - - | G4 - - - Bb4 - - - | B4 - - - D5 - - -`,
  },
  triangle: {
    inst: 'bass',
    rows: `C3 . C3 C4 C3 . G2 . | F2 . F2 F3 F2 . C3 . | Bb2 . Bb2 Bb3 Bb2 . F2 . | G2 . G2 G3 G2 . D3 .
           C3 . C3 C4 C3 . G2 . | Ab2 . Ab2 Ab3 Ab2 . Eb3 . | Eb3 . Eb3 Eb4 Bb2 . Bb2 . | G2 . G2 G3 G2 . B2 .`,
  },
  noise: {
    inst: 'kick',
    rows: `A 0:hat 5:snare 0:hat A A 5:snare 0:hat | A 0:hat 5:snare 0:hat A A 5:snare 0:hat
           A 0:hat 5:snare 0:hat A A 5:snare 0:hat | A 0:hat 5:snare 0:hat A 5:snare 5:snare 5:snare
           A 0:hat 5:snare 0:hat A A 5:snare 0:hat | A 0:hat 5:snare 0:hat A A 5:snare 0:hat
           A 0:hat 5:snare 0:hat A A 5:snare 0:hat | 5:snare 5:snare 5:snare 5:snare 4:snare 4:snare 3:snare 3:snare`,
  },
};

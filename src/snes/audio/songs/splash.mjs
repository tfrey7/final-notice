// The boot splash's chime: a bell arpeggio rising as the Celeryman.ai logo wipes on, a soft pad
// under it, and two high pings as the star glints on the "i". Three seconds, played once, no loop.
const rows = (...parts) => parts.map(([note, len]) => (note ? [note, ...Array(len - 1).fill('-')] : Array(len).fill('.'))).flat().join(' ') + ' .';

export default {
  tempo: 3, loop: null,
  echo: { mvol: 80, evol: 34, efb: 60, edl: 5, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    chime: { sample: 'rec-bell', adsr: [15, 5, 2, 17], vol: 110, echo: true },
    bell: { sample: 'rec-bell', adsr: [15, 5, 1, 19], vol: 64, pan: -35, echo: true },
    spark: { sample: 'rec-bell', adsr: [15, 6, 1, 20], vol: 70, pan: 35, echo: true },
    pad: { sample: 'rec-pad', adsr: [9, 2, 6, 0], vol: 52, echo: true },
  },
  v1: { inst: 'chime', rows: rows(['G5', 3], ['B5', 3], ['D6', 3], ['G6', 36]) },
  v2: { inst: 'bell', rows: rows([null, 1], ['G5', 3], ['B5', 3], ['D6', 3], ['G6', 34]) },
  v3: { inst: 'spark', rows: rows([null, 28], ['D7', 2], ['G7', 2], [null, 2], ['D7', 2], ['G7', 20]) },
  v4: { inst: 'pad', rows: rows([null, 12], ['G4', 40]) },
  v5: { inst: 'pad', rows: rows([null, 12], ['D5', 40]) },
};

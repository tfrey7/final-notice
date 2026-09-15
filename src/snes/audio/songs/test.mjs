// The synth's test tune: eight voices in C minor, lead and pads through the echo, a pitch-modulated
// bell on the last two voices, placeholder samples only.

const hold = (note, rows = 16) => [note, ...Array(rows - 1).fill('-')].join(' ');
const bars = (...list) => list.join(' | ');
const rest = hold('.', 16).replace(/-/g, '.');

const bassBar = (lo, hi) => `${lo} . ${lo} . ${hi} . ${lo} . ${lo} . ${lo} . ${hi} . ${lo} ${lo}`;
const arp = (a, b, c) => `${a} . ${b} . ${c} . ${b} . ${a} . ${b} . ${c} . ${b} .`;
const beat = 'C4:hat . C4:hat . C4:snare - C4:hat . C4:hat . C4:hat . C4:snare - C4:hat C4:hat';

export default {
  tempo: 6,
  loop: 0,
  echo: { mvol: 60, evol: 34, efb: 64, edl: 6, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    lead: { sample: 'saw', adsr: [14, 3, 5, 12], vol: 78, pan: -24, echo: true },
    pad: { sample: 'saw', adsr: [10, 2, 6, 0], vol: 34, echo: true },
    bass: { sample: 'square', adsr: [15, 4, 4, 16], vol: 110 },
    kick: { sample: 'kick', adsr: [15, 7, 7, 0], vol: 127 },
    hat: { noise: 29, adsr: [15, 7, 0, 27], vol: 36, pan: 30 },
    snare: { noise: 26, adsr: [15, 6, 0, 22], vol: 80, echo: true },
    mod: { sample: 'square', gain: { mode: 'direct', value: 24 }, vol: 0 },
    bell: { sample: 'saw', adsr: [15, 5, 2, 18], vol: 52, pan: 40, echo: true, pmod: true },
  },
  v1: {
    inst: 'lead',
    rows: bars(
      'C5 - - - Eb5 - G5 - - - F5 - Eb5 - D5 -',
      'C5 - - - - - . . Ab4 - C5 - Eb5 - - -',
      'G5 - - - F5 - Eb5 - - - D5 - Eb5 - F5 -',
      'D5 - - - - - . . Bb4 - D5 - F5 - - -',
      'C5 - - - Eb5 - G5 - - - F5 - Eb5 - D5 -',
      'C5 - - - - - . . Eb5 - Ab5 - G5 - F5 -',
      'G5 - - - Bb5 - G5 - - - F5 - Eb5 - F5 -',
      'D5 - - - - - - - . . . . . . . .',
    ),
  },
  v2: { inst: 'pad', rows: bars(...[1, 2].flatMap(() => ['G4', 'Eb4', 'Bb4', 'F4'].map((n) => hold(n)))) },
  v3: { inst: 'pad', rows: bars(...[1, 2].flatMap(() => ['Eb4', 'C4', 'G4', 'D4'].map((n) => hold(n)))) },
  v4: { inst: 'bass', rows: bars(...[1, 2].flatMap(() => [['C2', 'C3'], ['Ab1', 'Ab2'], ['Eb2', 'Eb3'], ['Bb1', 'Bb2']].map(([a, b]) => bassBar(a, b)))) },
  v5: { inst: 'kick', rows: bars(...Array(8).fill('C4 . . . C4 . . . C4 . . . C4 . C4 .')) },
  v6: { inst: 'hat', rows: bars(...Array(8).fill(beat)) },
  v7: { inst: 'mod', rows: bars(rest, rest, rest, rest, arp('C6', 'G5', 'Eb6'), arp('C6', 'Ab5', 'Eb6'), arp('Bb5', 'G5', 'Eb6'), arp('Bb5', 'F5', 'D6')) },
  v8: { inst: 'bell', rows: bars(rest, rest, rest, rest, arp('C6', 'G5', 'Eb6'), arp('C6', 'Ab5', 'Eb6'), arp('Bb5', 'G5', 'Eb6'), arp('Bb5', 'F5', 'D6')) },
};

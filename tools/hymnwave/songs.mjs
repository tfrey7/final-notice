// The hymnwave sketches: church pipe organ crossed with 80s/90s corporate wave. Original tunes.

import { chordsOf, line } from './engine.mjs';
import { held, stabs, bassline, drums, at, eighths, sixteenths } from './parts.mjs';

const P = { organ: 19, epFM: 5, rhodes: 4, vibes: 11, bells: 14, fretless: 35, slap: 36, timpani: 47, choir: 52, brass: 62, sax: 65, pad: 89 };
const KIT = { bank: 128, program: 16 };
const STD = { bank: 128, program: 0 };
const D = { kick: 36, rim: 37, snare: 38, clap: 39, hat: 42, open: 46, crash: 49, shaker: 82 };

// A: organ-led cathedral, the corporate groove underneath. 96 bpm, D minor.
const A_CYCLE = [
  ['D2', 'D3 A3 E4 F4'], ['Bb1', 'D3 A3 D4 F4'], ['G1', 'F3 A3 Bb3 D4'],
  [[2, 'A1', 'E3 G3 A3 D4'], [2, 'A1', 'E3 G3 A3 C#4']],
  ['D2', 'F3 A3 C4 E4'], ['C2', 'E3 A3 C4 F4'],
  [[2, 'G1', 'F3 Bb3 D4'], [2, 'C2', 'G3 Bb3 D4 F4']],
  [[2, 'A1', 'E3 G3 A3 D4'], [2, 'A1', 'E3 G3 Bb3 C#4']],
];
const A_END = ['D2', 'D3 A3 E4 F#4'];
const aChords = chordsOf([...A_CYCLE.slice(0, 4), ...A_CYCLE, ...A_CYCLE, A_END, A_END]);
const A_TUNE = [
  'D5 - - - A4 - C5 D5', 'F5 - - - E5 - D5 -', 'D5 - - - Bb4 - C5 D5', 'E5 - - - C#5 - A4 -',
  'A5 - - - G5 - F5 E5', 'F5 - - - C5 - A4 C5', 'Bb4 - D5 - G5 - F5 E5', 'E5 - - - C#5 - - -',
];
const aTune = [...at(line(A_TUNE, { vel: 96 }), 4), ...at(line(A_TUNE, { vel: 104 }), 12)];
const aBars = 22;
const groove = { from: 4, to: 20 };

const organAlone = {
  bpm: 96, bars: aBars, tail: 5,
  hall: { room: 0.96, damp: 0.3, predelay: 0.035 },
  tracks: [
    { name: 'organ chords', program: P.organ, gain: 0.34, send: 0.55, env: { a: 0.05, r: 0.5 }, spread: 0.6,
      notes: held(aChords, { vel: 84 }) },
    { name: 'organ pedal', program: P.organ, gain: 0.5, send: 0.4, env: { a: 0.08, r: 0.6 },
      notes: held(aChords, { bass: true, vel: 96 }) },
    { name: 'organ tune', program: P.organ, gain: 0.5, send: 0.5, pan: 0.1, env: { a: 0.03, r: 0.35 },
      notes: [...aTune, ...at(line(A_TUNE, { vel: 80, octave: -1 }), 12)] },
    { name: 'FM sheen on the tune', program: P.epFM, gain: 0.22, send: 0.3, pan: -0.25, env: { r: 0.4 },
      chorus: { mix: 0.4 }, notes: at(line(A_TUNE, { vel: 90, octave: 1 }), 12) },
    { name: 'warm pad', program: P.pad, gain: 0.28, send: 0.4, env: { a: 0.6, r: 1.2 }, chorus: { mix: 0.5, rate: 0.3 },
      notes: held(aChords, { from: 4, vel: 80, octave: 1 }) },
    { name: 'FM stabs', program: P.epFM, gain: 0.22, send: 0.25, pan: 0.3, env: { r: 0.25 }, chorus: { mix: 0.35 },
      notes: stabs(aChords, [[0.5, 0.3], [1.75, 0.25, 64], [3, 0.4]], { ...groove, bars: aBars }) },
    { name: 'fretless', program: P.fretless, gain: 0.7, send: 0.08, env: { a: 0.01, r: 0.12 },
      notes: bassline(aChords, [[0, 1.3, 0], [1.5, 0.45, 0, 70], [2.5, 0.8, 7], [3.5, 0.45, 12, 76]], { ...groove, bars: aBars }) },
    { name: 'kick', ...KIT, gain: 0.8, send: 0.02, oneShot: true, r: 0.05,
      notes: drums({ [D.kick]: [0, [2.5, 84]] }, groove) },
    { name: 'gated snare', ...KIT, gain: 0.5, send: 0.05, oneShot: true, gatedRoom: 0.8,
      notes: drums({ [D.snare]: [1, 3] }, { ...groove, vel: 92 }) },
    { name: 'hats and shaker', ...STD, gain: 0.26, send: 0.1, oneShot: true, pan: 0.35, spread: 0.3,
      notes: [...drums({ [D.hat]: eighths(80, 50) }, groove), ...drums({ [D.shaker]: sixteenths(60, 38) }, groove)] },
    { name: 'crash', ...STD, gain: 0.3, send: 0.3, oneShot: true, pan: -0.3,
      notes: drums({ [D.crash]: [0] }, { from: 4, to: 5 }).concat(drums({ [D.crash]: [0] }, { from: 12, to: 13 })) },
    { name: 'choir', program: P.choir, gain: 0.3, send: 0.6, env: { a: 0.4, r: 1 }, spread: 0.8,
      notes: held(aChords, { from: 12, vel: 78 }) },
    { name: 'bell', program: P.bells, gain: 0.35, send: 0.6, oneShot: true, pan: 0.2,
      notes: [0, 4, 12, 20].map((bar) => [bar * 4, 3, 62, 90, bar]) },
    { name: 'brass swell', program: P.brass, gain: 0.22, send: 0.35, env: { a: 0.5, r: 0.4 },
      notes: [...held(aChords, { from: 11, to: 12 }), ...held(aChords, { from: 19, to: 20 })].filter((n) => n[0] % 4 >= 2) },
  ],
};

// B: corporate wave first, the organ breaking through as the hook. 104 bpm, Eb major into C minor.
const B_VERSE = [
  ['Eb2', 'G3 Bb3 D4 F4'], ['C2', 'Eb3 G3 Bb3 D4'], ['Ab1', 'Bb3 C4 Eb4 G4'], ['Bb1', 'Ab3 C4 Eb4 F4'],
];
const B_HOOK = [
  ['C2', 'C3 G3 C4 Eb4'], ['Ab1', 'Eb3 Ab3 C4 Eb4'], ['G1', 'Eb3 G3 Bb3 Eb4'],
  [[2, 'Bb1', 'F3 Bb3 Eb4'], [2, 'Bb1', 'F3 Bb3 D4']],
];
const bBars = 24;
const bChords = chordsOf([...B_VERSE, ...B_VERSE, ...B_HOOK, ...B_HOOK, ...B_VERSE, ...B_HOOK.slice(0, 3), ['Eb2', 'Eb3 G3 Bb3 D4']]);
const B_LEAD = ['Bb4 - - - . G4 Bb4 C5', 'D5 - - - C5 - Bb4 G4', 'C5 - - - Eb5 - D5 C5', 'D5 - - - . . . .'];
const B_LEAD2 = [...B_LEAD.slice(0, 3), 'F5 - - - D5 - . .'];
const B_HOOK_TUNE = ['G5 - - - C6 - Bb5 -', 'Ab5 - - - G5 - Eb5 -', 'F5 - G5 - Bb5 - - G5', 'F5 - - - D5 - - -'];
const B_LAST = [...B_HOOK_TUNE.slice(0, 3), 'Eb5 - - - - - - -'];
const hookBars = (b) => (b >= 8 && b < 16) || b >= 20;
const bGroove = { from: 0, to: 23 };
const bHookTune = [...at(line([...B_HOOK_TUNE, ...B_HOOK_TUNE], { vel: 108 }), 8), ...at(line(B_LAST, { vel: 108 }), 20)];

const organHook = {
  bpm: 104, bars: bBars, tail: 4,
  hall: { room: 0.93, damp: 0.3, predelay: 0.03 },
  tracks: [
    { name: 'kick', ...KIT, gain: 0.85, send: 0.02, oneShot: true,
      notes: drums({ [D.kick]: [0, [1.5, 70], 2.5] }, bGroove) },
    { name: 'gated snare', ...KIT, gain: 0.55, send: 0.04, oneShot: true, gatedRoom: 1,
      notes: [...drums({ [D.snare]: [1, 3] }, { ...bGroove, vel: 96 }),
        ...[7, 15, 19].flatMap((bar) => [2.5, 2.75, 3, 3.25, 3.5, 3.75].map((o, i) => [bar * 4 + o, 0.25, D.snare, 70 + i * 6, bar]))] },
    { name: 'clap', ...STD, gain: 0.3, send: 0.2, oneShot: true, level: (b) => (hookBars(b) ? 1 : 0),
      notes: drums({ [D.clap]: [3] }, bGroove) },
    { name: 'hats', ...STD, gain: 0.24, send: 0.08, oneShot: true, pan: 0.35,
      notes: [...drums({ [D.hat]: sixteenths(84, 48) }, bGroove), ...drums({ [D.open]: [[3.5, 60]] }, { from: 8, to: 16 })] },
    { name: 'crash', ...STD, gain: 0.32, send: 0.3, oneShot: true, pan: -0.3,
      notes: [8, 16, 20, 23].flatMap((bar) => drums({ [D.crash]: [0] }, { from: bar, to: bar + 1 })) },
    { name: 'slap bass', program: P.slap, gain: 0.55, send: 0.05, env: { r: 0.08 },
      notes: bassline(bChords, [[0, 0.45, 0, 100], [0.75, 0.2, 12, 84], [1.5, 0.4, 0, 90], [2, 0.2, 12, 80],
        [2.5, 0.45, 7, 94], [3, 0.2, 10, 78], [3.5, 0.4, 12, 88]], { ...bGroove, bars: bBars }) },
    { name: 'FM stabs', program: P.epFM, gain: 0.28, send: 0.25, pan: 0.25, chorus: { mix: 0.4 }, env: { r: 0.3 },
      level: (b) => (hookBars(b) ? 0.55 : 1),
      notes: stabs(bChords, [[0.5, 0.3], [1.5, 0.25, 70], [3, 0.5]], { ...bGroove, bars: bBars, octave: 1 }) },
    { name: 'warm pad', program: P.pad, gain: 0.26, send: 0.4, env: { a: 0.5, r: 1 }, chorus: { mix: 0.5, rate: 0.25 },
      notes: held(bChords, { vel: 80 }) },
    { name: 'sax lead', program: P.sax, gain: 0.34, send: 0.3, pan: -0.15, env: { a: 0.02, r: 0.25 },
      notes: [...line([...B_LEAD, ...B_LEAD2], { vel: 92 }), ...at(line(B_LEAD2, { vel: 96 }), 16)] },
    { name: 'organ hook', program: P.organ, gain: 0.55, send: 0.55, pan: 0.05, env: { a: 0.03, r: 0.4 },
      notes: [...bHookTune, ...bHookTune.map(([b, d, m, v, bar]) => [b, d, m - 12, v - 16, bar])] },
    { name: 'organ chords', program: P.organ, gain: 0.3, send: 0.55, env: { a: 0.06, r: 0.6 }, spread: 0.6,
      level: (b) => (hookBars(b) ? 1 : b >= 16 ? 0.45 : 0),
      notes: [...held(bChords, { vel: 84 }), ...held(bChords, { bass: true, vel: 90, from: 8 }).filter((n) => hookBars(n[4]))] },
    { name: 'choir', program: P.choir, gain: 0.3, send: 0.6, env: { a: 0.3, r: 1 }, spread: 0.8, level: (b) => (hookBars(b) ? 1 : 0),
      notes: held(bChords, { vel: 80 }) },
    { name: 'bell', program: P.bells, gain: 0.35, send: 0.6, oneShot: true,
      notes: [8, 12, 20, 23].map((bar) => [bar * 4, 3, 60, 92, bar]) },
    { name: 'brass swell', program: P.brass, gain: 0.25, send: 0.35, env: { a: 0.45, r: 0.3 },
      notes: [7, 19].flatMap((bar) => held(bChords, { from: bar, to: bar + 1 })).map(([b, d, m, v, bar]) => [b + 2, 2, m, v, bar]) },
  ],
};

// C: office muzak that slowly becomes a mass. 70 bpm, Ab major sliding into F minor.
const cBars = 16;
const cChords = chordsOf([
  ['Ab1', 'G3 C4 Eb4'], ['F1', 'Ab3 C4 Eb4 G4'], ['Db2', 'F3 Ab3 C4'], ['Eb2', 'G3 Bb3 C4 Eb4'],
  ['Ab1', 'G3 C4 Eb4'], ['F1', 'Ab3 C4 Eb4 G4'], ['Db2', 'F3 Ab3 C4'], [[2, 'C2', 'G3 Bb3 F4'], [2, 'C2', 'G3 Bb3 E4']],
  ['F1', 'F3 Ab3 C4'], ['Db2', 'F3 Ab3 Db4'], ['Bb1', 'F3 Bb3 Db4'], ['C2', 'E3 G3 Bb3 Db4'],
  ['F1', 'F3 Ab3 C4 F4'], ['Db2', 'F3 Ab3 C4 F4'], [[2, 'Bb1', 'F3 Bb3 Db4'], [2, 'C2', 'E3 G3 Bb3 C4']], ['F1', 'F3 C4 F4'],
]);
const C_OFFICE = [
  'C5 - - Eb5 - - Db5 C5', 'Ab4 - - - - - . .', 'F5 - - Eb5 - - Db5 C5', 'Bb4 - - - - - . .',
  'C5 - - Eb5 - - Db5 C5', 'Ab4 - - - F4 - G4 Ab4', 'F4 - - Ab4 - - C5 Db5', 'C5 - - - - - . .',
];
const C_MASS = [
  'C5 - - - Eb5 - Db5 -', 'C5 - - - Ab4 - - -', 'Db5 - - - C5 - Bb4 -', 'C5 - - - - - - -',
  'F5 - - - Ab5 - G5 -', 'F5 - - - C5 - - -', 'Db5 - - - E5 - - -', 'F5 - - - - - - -',
];
const office = (b) => (b < 5 ? 1 : b < 8 ? 1 - (b - 4) * 0.25 : 0);
const massTune = at(line(C_MASS, { vel: 96 }), 8);

const intoMass = {
  bpm: 70, bars: cBars, tail: 6,
  hall: { room: 0.97, damp: 0.25, predelay: 0.04 },
  tracks: [
    { name: 'vibes', program: P.vibes, gain: 0.42, send: 0.25, pan: 0.2, level: office, env: { r: 0.6 },
      notes: line(C_OFFICE, { vel: 88 }) },
    { name: 'rhodes', program: P.rhodes, gain: 0.34, send: 0.2, pan: -0.2, level: office, chorus: { mix: 0.45, rate: 0.4 }, env: { r: 0.4 },
      notes: stabs(cChords, [[0, 1.5], [2, 1.2, 70], [3.5, 0.4, 60]], { from: 0, to: 8, bars: cBars }) },
    { name: 'fretless', program: P.fretless, gain: 0.6, send: 0.08, level: office, env: { r: 0.2 },
      notes: bassline(cChords, [[0, 1.8, 0], [2, 1, 7, 76], [3, 0.9, 12, 70]], { from: 0, to: 8, bars: cBars }) },
    { name: 'office kit', ...STD, gain: 0.3, send: 0.12, oneShot: true, level: office, pan: 0.25,
      notes: [...drums({ [D.shaker]: eighths(62, 40), [D.rim]: [[1, 70], [3, 70]] }, { to: 8 }), ...drums({ [D.kick]: [0, [2.5, 60]] }, { to: 8, vel: 80 })] },
    { name: 'pad', program: P.pad, gain: 0.24, send: 0.4, env: { a: 0.8, r: 1.4 }, chorus: { mix: 0.5, rate: 0.2 }, level: (b) => (b < 10 ? 1 : 0.5),
      notes: held(cChords, { octave: 1, vel: 76 }) },
    { name: 'organ pedal', program: P.organ, gain: 0.55, send: 0.45, env: { a: 0.3, r: 1 },
      level: (b) => (b < 4 ? 0 : b < 8 ? 0.25 + (b - 4) * 0.18 : 1),
      notes: [...[4, 5, 6, 7].map((bar) => [bar * 4, 4, 36, 90, bar]), ...held(cChords, { bass: true, from: 8, vel: 96 })] },
    { name: 'organ chords', program: P.organ, gain: 0.36, send: 0.6, env: { a: 0.15, r: 1 }, spread: 0.6,
      level: (b) => (b < 6 ? 0 : b < 8 ? 0.3 + (b - 6) * 0.3 : 1),
      notes: held(cChords, { vel: 86 }) },
    { name: 'choir', program: P.choir, gain: 0.34, send: 0.7, env: { a: 0.4, r: 1.2 }, spread: 0.8,
      level: (b) => (b < 8 ? 0 : b < 12 ? 0.7 : 1),
      notes: [...held(cChords, { from: 8, vel: 80 }), ...massTune] },
    { name: 'organ tune', program: P.organ, gain: 0.5, send: 0.6, env: { a: 0.04, r: 0.6 },
      notes: [...massTune.filter((n) => n[4] >= 12), ...massTune.filter((n) => n[4] >= 12).map(([b, d, m, v, bar]) => [b, d, m - 12, v - 14, bar])] },
    { name: 'timpani heartbeat', program: P.timpani, gain: 0.45, send: 0.35, oneShot: true,
      notes: Array.from({ length: 7 }, (_, i) => 8 + i).flatMap((bar) => [[bar * 4, 1, 41, 92, bar], [bar * 4 + 0.6, 1, 41, 70, bar], [bar * 4 + 2, 1, 41, 84, bar], [bar * 4 + 2.6, 1, 41, 62, bar]]) },
    { name: 'bell', program: P.bells, gain: 0.34, send: 0.7, oneShot: true,
      notes: [[0, 2, 72, 60, 0], [16, 2, 72, 60, 4], ...Array.from({ length: 8 }, (_, i) => [(8 + i) * 4, 3, 53, 94, 8 + i])] },
  ],
};

export default { 'organ-over-groove': organAlone, 'organ-hook': organHook, 'office-into-mass': intoMass };

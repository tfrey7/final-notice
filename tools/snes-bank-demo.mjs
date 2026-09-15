// The bank's orchestral and drum additions heard together: grand piano over a slow string pad and a
// fretless sub-bass, with timpani, the tom pair and a crash coming in on the second phrase.
//
//   node tools/snes-bank-demo.mjs <out.wav> [seconds]

import { writeFileSync } from 'node:fs';
import { renderSong } from '../src/snes/audio/player.mjs';
import { INSTRUMENTS } from '../src/snes/audio/recorded.mjs';
import { wav } from './snes-render.mjs';

const R = '. . . . . . . . . . . . . . . .';
const held = (note) => `${note} ${Array(15).fill('-').join(' ')}`;

const PIANO = [
  'C5 - - - Eb5 - G5 - - - F5 - Eb5 - D5 -', 'Eb5 - - - - - - - G4 - C5 - Eb5 - - -',
  'Ab5 - - - G5 - Eb5 - - - C5 - Eb5 - Ab5 -', 'G5 - - - - - - - . . Eb5 - F5 - G5 -',
  'F5 - - - D5 - Bb4 - - - D5 - F5 - Bb5 -', 'Ab5 - - - G5 - - - F5 - - - D5 - - -',
  'G5 - - - B4 - D5 - - - F5 - Eb5 - D5 -', 'C5 - - - - - - - - - - - . . . .',
];
const CHORDS = [['G4', 'Eb4', 'C2'], ['Ab4', 'Eb4', 'Ab1'], ['F4', 'D4', 'Bb1'], ['G4', 'D4', 'G1']];
const bass = (n) => `${n} - - - - - ${n} - ${n} - - - - - - -`;
const TOMS = 'C4:ltom . . C4:ltom . . C4:htom . C4:ltom . . C4:ltom C4:htom . C4:htom C4:htom';
const FILL = 'C4:htom . C4:htom . C4:htom . C4:ltom . C4:ltom . C4:ltom . C4:ltom C4:ltom C4:ltom C4:ltom';

const phrase = (drums) => {
  const v = { v1: [], v2: [], v3: [], v4: [], v5: [], v6: [], v7: [] };
  PIANO.forEach((row, i) => {
    const [hi, lo, root] = CHORDS[i >> 1];
    const head = i % 2 === 0;
    v.v1.push(row);
    v.v2.push(head ? held(hi) : R.replace(/\./g, '-'));
    v.v3.push(head ? held(lo) : R.replace(/\./g, '-'));
    v.v4.push(bass(root));
    v.v5.push(!drums ? R : head ? `${root.replace(/\d/, '2')} - - - - - - - . . . . . . . .` : `. . . . . . . . ${root.replace(/\d/, '2')} . G1 . C2 C2 C2 C2`);
    v.v6.push(!drums ? R : i === 7 ? FILL : TOMS);
    v.v7.push(drums && i % 4 === 0 ? held('C4') : R);
  });
  return v;
};

const a = phrase(false);
const b = phrase(true);
const rows = (k) => [...a[k], ...b[k]].join(' | ');

export const demo = {
  tempo: 8, loop: 128,
  echo: { mvol: 38, room: 'cathedral', evol: 30 },
  instruments: {
    piano: { ...INSTRUMENTS.piano, vol: 96, pan: -10 },
    str: { ...INSTRUMENTS.slowstr, vol: 62 },
    bass: { ...INSTRUMENTS.subbass, vol: 118 },
    timp: { ...INSTRUMENTS.timpani, vol: 100, pan: 20 },
    ltom: INSTRUMENTS.ltom,
    htom: INSTRUMENTS.htom,
    crash: { ...INSTRUMENTS.crash, vol: 70 },
  },
  v1: { inst: 'piano', rows: rows('v1') },
  v2: { inst: 'str', rows: rows('v2'), pan: 50 },
  v3: { inst: 'str', rows: rows('v3'), pan: -50 },
  v4: { inst: 'bass', rows: rows('v4') },
  v5: { inst: 'timp', rows: rows('v5') },
  v6: { inst: 'ltom', rows: rows('v6') },
  v7: { inst: 'crash', rows: rows('v7') },
};

if (process.argv[1]?.endsWith('snes-bank-demo.mjs')) {
  const [out, seconds = '30'] = process.argv.slice(2);
  writeFileSync(out, wav(renderSong(demo, Number(seconds))));
  console.log(out);
}

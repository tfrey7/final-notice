// The pipe organ heard two ways: a D minor chorale on the organ alone (reed stop on the tune, the
// full church organ taking it on the repeat, chords held over the pedal), and Stage 1's opening with
// the organ standing in for its string pad and choir, the faint hint the ground floor gets.
//
//   node tools/snes-organ-demo.mjs <out dir> [seconds]

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSong } from '../src/snes/audio/player.mjs';
import { INSTRUMENTS } from '../src/snes/audio/recorded.mjs';
import stage1 from '../src/snes/audio/songs/stage1.mjs';
import { wav } from './snes-render.mjs';

const held = (note) => `${note} ${Array(15).fill('-').join(' ')}`;

const TUNE = [
  'D5 - - - - - - - F5 - - - E5 - D5 -', 'F5 - - - - - - - D5 - - - Bb4 - - -',
  'G5 - - - - - - - Bb5 - - - A5 - G5 -', 'E5 - - - - - - - C#5 - - - A4 - - -',
  'A5 - - - - - - - F5 - - - D5 - F5 -', 'G5 - - - - - - - E5 - - - C5 - E5 -',
  'F5 - - - - - - - D5 - - - Bb4 - D5 -', 'C#5 - - - - - - - - - - - . . . .',
];
const CHORDS = [
  ['F4', 'D4', 'A3', 'D2'], ['F4', 'D4', 'Bb3', 'Bb1'], ['G4', 'D4', 'Bb3', 'G1'], ['E4', 'C#4', 'A3', 'A1'],
  ['F4', 'D4', 'A3', 'D2'], ['E4', 'C4', 'G3', 'C2'], ['F4', 'D4', 'Bb3', 'Bb1'], ['E4', 'C#4', 'A3', 'A1'],
];
const lead = (inst, octave) => TUNE.map((bar) => bar.replace(/([A-G][b#]?)(\d)/g, (_, n, o) => `${n}${Number(o) + octave}:${inst}`));
const pass = [...lead('reed', 0), ...lead('lead', -1)];
const part = (i) => [...CHORDS, ...CHORDS].map((c) => held(c[i])).join(' | ');

export const chorale = {
  tempo: 8, loop: 0,
  echo: { room: 'cathedral', mvol: 36, evol: 34 },
  instruments: {
    reed: { ...INSTRUMENTS.reed, vol: 66, pan: -12, vibrato: { delay: 20, period: 14, depth: 0.08 } },
    lead: { ...INSTRUMENTS.organ, vol: 78, pan: -12 },
    organ: { ...INSTRUMENTS.organ, vol: 50 },
    pedal: { ...INSTRUMENTS.pedal, vol: 120 },
  },
  v1: { rows: pass.join(' | ') },
  v2: { inst: 'organ', rows: part(0), pan: 40 },
  v3: { inst: 'organ', rows: part(1) },
  v4: { inst: 'organ', rows: part(2), pan: -40 },
  v5: { inst: 'pedal', rows: part(3) },
};

// Stage 1 as written, its pad and choir handed to the organ.
export const stage1Organ = {
  ...stage1,
  instruments: {
    ...stage1.instruments,
    pad: { ...INSTRUMENTS.organ, vol: 46, pan: -100 },
    choir: { ...INSTRUMENTS.organ, vol: 50, pan: -100 },
  },
};

if (process.argv[1]?.endsWith('snes-organ-demo.mjs')) {
  const [dir, seconds = '30'] = process.argv.slice(2);
  for (const [name, song] of [['organ', chorale], ['stage1-organ', stage1Organ]]) {
    const out = join(dir, `${name}.wav`);
    writeFileSync(out, wav(renderSong(song, Number(seconds))));
    console.log(out);
  }
}

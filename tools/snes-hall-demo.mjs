// The player's expression, room and dropout features heard on an existing song: the Great Seal as it
// ships, and the same notes with a cathedral room, parts panned apart, delayed vibrato on the long
// brass notes, slides into big leaps, and layers that leave and return by section.
//
//   node tools/snes-hall-demo.mjs <out dir> [seconds]

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import seal, { BAR_ROWS, FORM, QUOTE_BAR } from '../src/snes/audio/songs/seal-v1.mjs';
import { renderSong } from '../src/snes/audio/player.mjs';
import { noteToMidi } from '../src/audio/apu.mjs';
import { wav } from './snes-render.mjs';

// Long notes sing with a late vibrato; a leap of a fourth or more slides in.
export function ornament(rows) {
  const tokens = rows.split(/\s+/).filter(Boolean);
  const notes = tokens.filter((t) => t !== '|');
  let last = null;
  let k = 0;
  return tokens.map((t) => {
    if (t === '|') return t;
    const at = k++;
    if (t === '-' || t === '.') return t;
    let holds = 0;
    while (notes[at + 1 + holds] === '-') holds++;
    const midi = noteToMidi(t.split(':')[0]);
    let marked = t;
    if (last !== null && Math.abs(midi - last) >= 5) marked += '/p4';
    if (holds >= 3) marked += '/v';
    last = midi;
    return marked;
  }).join(' ');
}

// Drums wait out the intro, hats sit out the first A, the bell tolls only at phrase heads, and the
// break starts with the kit gone.
export function sealDrops() {
  const drops = [];
  const seen = {};
  FORM.forEach((b, i) => {
    const pass = Math.floor((seen[b.part] = (seen[b.part] ?? -1) + 1) / 8);
    const voices = [];
    if (b.part === 'intro') voices.push('v6', 'v7', 'v8', ...(b.bar < 2 ? ['v5'] : []));
    if (b.part === 'A' && pass === 0) voices.push('v8', ...(b.bar < 4 ? ['v3'] : []));
    if (b.part === 'break' && b.bar < 4) voices.push('v6', 'v7', 'v8');
    if (i !== QUOTE_BAR && b.bar % 4 !== 0) voices.push('v4');
    if (voices.length) drops.push({ from: i * BAR_ROWS, to: (i + 1) * BAR_ROWS, voices });
  });
  return drops;
}

export const hall = {
  ...seal,
  echo: { mvol: 42, room: 'cathedral', evol: 34 },
  v1: { ...seal.v1, rows: ornament(seal.v1.rows), pan: -25 },
  v2: { ...seal.v2, pan: 70 },
  v3: { ...seal.v3, pan: -70 },
  v4: { ...seal.v4, pan: 60 },
  v7: { ...seal.v7, pan: -20 },
  v8: { ...seal.v8, pan: 70 },
  drops: sealDrops(),
};

if (process.argv[1]?.endsWith('snes-hall-demo.mjs')) {
  const [dir, seconds = '32'] = process.argv.slice(2);
  for (const [name, song] of [['seal-before', seal], ['seal-hall', hall]]) {
    const out = join(dir, `${name}.wav`);
    writeFileSync(out, wav(renderSong(song, Number(seconds))));
    console.log(out);
  }
}

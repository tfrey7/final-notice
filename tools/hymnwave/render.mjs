// Renders the hymnwave sketches to 44.1 kHz stereo WAV.
//
//   node tools/hymnwave/render.mjs <FluidR3_GM.sf2> [out dir] [sketch names...]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderSong, wav, RATE } from './engine.mjs';
import SKETCHES from './songs.mjs';

const [sfPath, dir = 'tools/hymnwave/out', ...names] = process.argv.slice(2);
if (!sfPath) throw new Error('usage: node tools/hymnwave/render.mjs <FluidR3_GM.sf2> [out dir] [names...]');
const sf = readFileSync(sfPath);
mkdirSync(dir, { recursive: true });
for (const [name, song] of Object.entries(SKETCHES)) {
  if (names.length && !names.includes(name)) continue;
  const started = Date.now();
  const out = join(dir, `${name}.wav`);
  const mix = renderSong(sf, song);
  writeFileSync(out, wav(mix));
  console.log(`${out}  ${(mix[0].length / RATE).toFixed(1)} s  rendered in ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

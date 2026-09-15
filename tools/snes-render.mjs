// Renders an SNES song offline to a 16-bit stereo WAV at the S-DSP's 32 kHz.
//
//   node tools/snes-render.mjs <song name> <out.wav> [seconds]

import { writeFileSync } from 'node:fs';
import { renderSong } from '../src/snes/audio/player.mjs';

export function wav({ left, right, sampleRate }) {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  const s16 = (x) => Math.round(Math.max(-1, Math.min(1, x)) * 32767);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(s16(left[i]), 44 + i * 4);
    buf.writeInt16LE(s16(right[i]), 46 + i * 4);
  }
  return buf;
}

if (process.argv[1]?.endsWith('snes-render.mjs')) {
  const [name, out, seconds = '20'] = process.argv.slice(2);
  const { default: song } = await import(`../src/snes/audio/songs/${name}.mjs`);
  writeFileSync(out, wav(renderSong(song, Number(seconds))));
  console.log(out);
}

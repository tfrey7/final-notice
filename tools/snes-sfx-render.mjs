// Renders SNES sound effects offline to 32 kHz WAVs, through the same echo the stages use.
//
//   node tools/snes-sfx-render.mjs <out dir> <effect> [effect...]   one WAV per effect, named for it
//   node tools/snes-sfx-render.mjs <out.wav> --reel <effect...>      every effect in turn, 0.7 s apart

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSequencer, SFX } from '../src/snes/audio/player.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import { wav } from './snes-render.mjs';

const ECHO = { mvol: 100, evol: 30, efb: 40, edl: 4, fir: [12, 33, 43, 43, 19, -2, -13, -7] };

export function renderEffects(names, gap = 0.7, tail = 0.6) {
  const seq = createSequencer();
  seq.dsp.setEcho(ECHO);
  const step = Math.round(gap * DSP_HZ);
  const n = step * (names.length - 1) + Math.round(tail * DSP_HZ);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  let at = 0;
  for (const [i, name] of names.entries()) {
    seq.sfx(SFX[name]);
    const len = i === names.length - 1 ? n - at : step;
    seq.render(left.subarray(at), right.subarray(at), len);
    at += len;
  }
  return { left, right, sampleRate: DSP_HZ };
}

if (process.argv[1]?.endsWith('snes-sfx-render.mjs')) {
  const [out, ...rest] = process.argv.slice(2);
  if (rest[0] === '--reel') writeFileSync(out, wav(renderEffects(rest.slice(1))));
  else for (const name of rest) writeFileSync(join(out, `${name}.wav`), wav(renderEffects([name], 0, 0.9)));
  console.log(out);
}

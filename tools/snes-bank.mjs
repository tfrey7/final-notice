// Builds the recorded SNES bank from FluidR3_GM (MIT, Frank Wen): each instrument takes one sample
// from the SoundFont, resampled so its loop is a whole number of 16-sample BRR blocks and a whole
// number of pitch periods, crossfaded at the seam, BRR-encoded and written as base64.
//
//   node tools/snes-bank.mjs <FluidR3_GM.sf2>   writes src/snes/audio/recorded-brr.mjs
//   node tools/snes-bank.mjs <sf2> --list       prints the melodic presets and drum kits

import { readFileSync, writeFileSync } from 'node:fs';
import { readSf2, pick } from './sf2.mjs';
import { brrEncode } from '../src/snes/audio/spc.mjs';

const DSP_HZ = 32000;
const PEAK = 22000;
const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);

// rate: roughly the rate to store at; attack and loop in seconds; bright lifts the treble the
// S-DSP's Gaussian filter takes off, kept small so the top stays soft; hit: a one-shot of that
// many seconds.
export const RECIPES = {
  epiano: { program: 4, key: 60, rate: 16000, attack: 0.35, loop: 0.15, bright: 0.25 },
  pad: { program: 89, key: 60, rate: 12000, attack: 0.25, loop: 0.4, bright: 0.15 },
  bell: { program: 14, key: 72, rate: 22000, attack: 0.25, loop: 0.05, bright: 0.15 },
  slap: { program: 36, key: 40, rate: 16000, attack: 0.14, loop: 0.05, bright: 0.2 },
  synbass: { program: 38, key: 36, rate: 12000, attack: 0.1, loop: 0.05, bright: 0.15 },
  sax: { program: 65, key: 67, rate: 16000, attack: 0.16, loop: 0.12, bright: 0.2 },
  brass: { program: 61, key: 60, rate: 16000, attack: 0.14, loop: 0.1, bright: 0.2 },
  strings: { program: 48, key: 60, rate: 14000, attack: 0.2, loop: 0.35, bright: 0.15 },
  choir: { program: 52, key: 60, rate: 14000, attack: 0.2, loop: 0.35, bright: 0.15 },
  sqlead: { program: 80, key: 72, rate: 16000, attack: 0.03, loop: 0.03, bright: 0 },
  piano: { program: 0, key: 60, rate: 14000, attack: 0.45, loop: 0.25, bright: 0.1 },
  slowstr: { program: 49, key: 60, rate: 12500, attack: 0.3, loop: 0.3, bright: 0 },
  subbass: { program: 35, key: 33, rate: 11000, attack: 0.2, loop: 0.1, bright: 0 },
  timpani: { program: 47, key: 43, rate: 11000, attack: 0.3, loop: 0.1, bright: 0 },
  organ: { program: 19, key: 60, rate: 8000, attack: 0.02, loop: 0.05, bright: 0 },
  gkick: { bank: 128, program: 16, key: 36, rate: 16000, hit: 0.3, bright: 0.1 },
  gsnare: { bank: 128, program: 16, key: 38, rate: 16000, hit: 0.28, bright: 0.15 },
  chat: { bank: 128, program: 0, key: 42, rate: 22000, hit: 0.08, bright: 0 },
  ohat: { bank: 128, program: 0, key: 46, rate: 16000, hit: 0.3, bright: 0.1 },
  clap: { bank: 128, program: 0, key: 39, rate: 16000, hit: 0.25, bright: 0.1 },
  orch: { program: 55, key: 60, rate: 12000, hit: 0.3, bright: 0.15 },
  ltom: { bank: 128, program: 16, key: 41, rate: 14000, hit: 0.32, bright: 0 },
  htom: { bank: 128, program: 16, key: 45, rate: 14000, hit: 0.28, bright: 0 },
  crash: { bank: 128, program: 0, key: 49, rate: 14000, hit: 0.5, bright: 0 },
};

// Plays the SoundFont's own loop out to `seconds`, so a short looped sample has room to cut from.
function unroll(s, seconds) {
  const n = Math.max(Math.round(seconds * s.rate), 16);
  if (!s.loops || s.loopEnd <= s.loopStart + 1) return s.pcm.subarray(0, Math.min(n, s.pcm.length));
  const out = new Float64Array(n);
  const span = s.loopEnd - s.loopStart;
  for (let i = 0; i < n; i++) out[i] = s.pcm[i < s.loopEnd ? i : s.loopStart + ((i - s.loopStart) % span)];
  return out;
}

// Windowed-sinc resampling, band-limited to the lower of the two Nyquists.
function resample(src, from, to, n) {
  const ratio = to / from;
  const cut = Math.min(1, ratio);
  const width = 8 / cut;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / ratio;
    const lo = Math.max(0, Math.ceil(x - width));
    const hi = Math.min(src.length - 1, Math.floor(x + width));
    let sum = 0;
    for (let j = lo; j <= hi; j++) {
      const d = x - j;
      const w = d === 0 ? 1 : Math.sin(Math.PI * d * cut) / (Math.PI * d * cut);
      const win = 0.5 + 0.5 * Math.cos((Math.PI * d) / width);
      sum += src[j] * cut * w * win;
    }
    out[i] = sum;
  }
  return out;
}

function brighten(wave, amount) {
  if (!amount) return wave;
  let y = 0;
  return wave.map((x) => {
    y += 0.3 * (x - y);
    return x + amount * (x - y);
  });
}

function normalise(wave) {
  let max = 0;
  for (const x of wave) max = Math.max(max, Math.abs(x));
  return wave.map((x) => Math.round((x * PEAK) / (max || 1)));
}

const toBlock = (n) => Math.ceil(n / 16) * 16;

export function build(sf, recipe) {
  const s = pick(sf, recipe);
  if (recipe.hit) {
    const rate = recipe.rate;
    const n = toBlock(Math.round(recipe.hit * rate));
    const src = unroll(s, recipe.hit + 0.05);
    const wave = resample(src, s.rate, rate, n);
    const tail = Math.round(n * 0.2);
    for (let i = n - tail; i < n; i++) wave[i] *= ((n - i) / tail) ** 2;
    const pcm = normalise(brighten(wave, recipe.bright));
    return { s, rate, pcm, loop: null, rootHz: midiToHz(60 + 12 * Math.log2(DSP_HZ / rate)) };
  }
  const f0 = midiToHz(s.rootMidi);
  const periods = Math.max(1, Math.round(recipe.loop * f0));
  const len = 16 * Math.max(1, Math.round((periods * recipe.rate) / f0 / 16));
  const rate = (len * f0) / periods;
  const loop = toBlock(Math.round(recipe.attack * rate));
  const fadeLen = Math.min(loop, Math.floor(len / 2));
  const n = loop + len;
  const src = unroll(s, (n + 16) / rate + 0.05);
  const wave = resample(src, s.rate, rate, n);
  const out = Float64Array.from(wave);
  for (let j = 0; j < fadeLen; j++) {
    const w = (j + 1) / fadeLen;
    const k = n - fadeLen + j;
    out[k] = (1 - w) * wave[k] + w * wave[loop - fadeLen + j];
  }
  const pcm = normalise(brighten(out, recipe.bright));
  return { s, rate, pcm, loop, rootHz: (f0 * DSP_HZ) / rate };
}

export function pack({ blocks }) {
  const bytes = Buffer.alloc(blocks.length * 9);
  blocks.forEach(({ shift, filter, nibbles }, b) => {
    bytes[b * 9] = (shift << 4) | (filter << 2);
    for (let i = 0; i < 16; i++) bytes[b * 9 + 1 + (i >> 1)] |= (nibbles[i] & 15) << (i & 1 ? 0 : 4);
  });
  return bytes.toString('base64');
}

if (process.argv[1]?.endsWith('snes-bank.mjs')) {
  const sf = readSf2(readFileSync(process.argv[2]));
  if (process.argv.includes('--list')) {
    for (const p of sf.presets) console.log(p.bank, p.program, p.name);
  } else {
    const lines = [];
    let total = 0;
    for (const [key, recipe] of Object.entries(RECIPES)) {
      const { s, rate, pcm, loop, rootHz } = build(sf, recipe);
      const brr = brrEncode(pcm, loop);
      total += brr.blocks.length * 9;
      console.log(key.padEnd(8), s.preset, '/', s.sample, `${Math.round(rate)} Hz`, `${brr.blocks.length * 9} B`);
      lines.push(`  ${key}: { preset: ${JSON.stringify(s.preset)}, sample: ${JSON.stringify(s.sample)}, rate: ${Math.round(rate)}, rootHz: ${rootHz.toFixed(4)}, loop: ${loop}, brr: '${pack(brr)}' },`);
    }
    console.log('total', total, 'B');
    const head = '// Generated by tools/snes-bank.mjs from FluidR3_GM.sf2 (MIT, Copyright (c) 2000-2002, 2008 Frank Wen).\n// Each brr string is 9-byte BRR blocks: shift<<4 | filter<<2, then 16 nibbles.\n\nexport default {\n';
    writeFileSync(new URL('../src/snes/audio/recorded-brr.mjs', import.meta.url), `${head}${lines.join('\n')}\n};\n`);
  }
}

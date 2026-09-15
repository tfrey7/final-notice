// Wordless fight sounds (item 2330), crushed through each character's SNES chain and played dry.
//
//   node tools/grunts.mjs --sketch <out dir>          one reel per way: Ward, Mercer, Associate, Manager
//   node tools/grunts.mjs --bake <a|b|c> [<out dir>]  every fighter's grunts, the chosen way, into
//                                                     src/snes/audio/grunts-brr.mjs, plus a reel per fighter
//
// A: Kokoro (8936) saying the grunt as a word. B: Chatterbox (8937) acting it, with the character's
// Kokoro sample take as its voice reference. C: built from nothing, a glottal pulse through vowel
// formants at the character's pitch.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digitize, parseWav, takeSpeed, voiceOf } from '../src/snes/audio/voice.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import { SAMPLES, createSequencer } from '../src/snes/audio/player.mjs';
import { SOUNDS, VARIATIONS, gruntId } from '../src/snes/audio/grunts.mjs';
import { take } from './voice.mjs';
import { pack } from './snes-bank.mjs';
import { wav } from './snes-render.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const KOKORO = process.env.FINAL_NOTICE_KOKORO_URL ?? 'http://127.0.0.1:8936/speak';
const CHATTERBOX = process.env.FINAL_NOTICE_CHATTERBOX_URL ?? 'http://127.0.0.1:8937/speak';
const CONTAINER = process.env.CHATTERBOX_CONTAINER ?? 'jarvis-voice-chatterbox-1';
const REF_DIR = process.env.CHATTERBOX_REF_DIR ?? '/tmp/final-notice-grunt-refs';

export const FIGHTERS = ['ward', 'mercer', 'associate', 'supervisor', 'manager', 'counsel', 'vellum', 'bellwether'];
const SKETCH = { ward: 0, mercer: 0, associate: 0, manager: 0 };
const SKETCH_SOUNDS = { grunt: 'hurt', big: 'big', knockdown: 'knockdown' };
export const LONGEST = { hurt: 0.35, big: 0.5, knockdown: 1.1, effort: 0.45, death: 1.4 };

// What each fighter says, as a word for the speech models; the first of each is the sketch's.
const MAN = {
  hurt: ['Hnk!', 'Ngh!', 'Guh!'], big: ['Hurgh!', 'Oof!', 'Gwah!'], knockdown: ['Aaagh!', 'Waaugh!', 'Uwaah!'],
  effort: ['Hyah!', 'Hup!', 'Hrah!'], death: ['Aaaaaagh...', 'Nnnoooo...', 'Uuuaaagh...'],
};
const WOMAN = {
  hurt: ['Ah!', 'Ugh!', 'Kyah!'], big: ['Hyah!', 'Augh!', 'Gah!'], knockdown: ['Aaaah!', 'Kyaaah!', 'Waaah!'],
  effort: ['Hah!', 'Hyup!', 'Tchah!'], death: ['Aaaaaah...', 'Nnnoooo...', 'Aaaahhh...'],
};
export const WORDS = {
  ward: MAN,
  mercer: { ...MAN, hurt: ['Nngh!', 'Tch!', 'Hmf!'], big: ['Oof!', 'Hurk!', 'Gahh!'], knockdown: ['Aarrgh!', 'Waugh!', 'Gnaaah!'] },
  associate: WOMAN,
  supervisor: { ...WOMAN, hurt: ['Hmph!', 'Ugh!', 'Gah!'], big: ['Oof!', 'Hurgh!', 'Augh!'] },
  manager: { ...MAN, hurt: ['Hrm!', 'Hmph!', 'Gruh!'], big: ['Hoof!', 'Oomph!', 'Grrah!'], knockdown: ['Uuoohh!', 'Waaugh!', 'Gwoooh!'], effort: ['Hrrah!', 'Hnnrrgh!', 'Huaah!'] },
  counsel: { ...WOMAN, hurt: ['Ah!', 'Tsk!', 'Ow!'] },
  vellum: { ...MAN, hurt: ['Ah!', 'Hnh!', 'Oh!'], death: ['Aaaaahhh...', 'Nooooo...', 'Ohhhhh...'] },
  bellwether: { ...MAN, hurt: ['Hrmm!', 'Hnnh!', 'Guh!'], big: ['Hoof!', 'Grraah!', 'Oomph!'], effort: ['Hraaah!', 'Hnnaah!', 'Haaa!'] },
};

// The synth's throat: f0 in Hz, formant scale, roughness (period-doubling rasp) and breath.
export const THROATS = {
  ward: { f0: 128, formants: 1, rough: 0.12, breath: 0.18 },
  mercer: { f0: 98, formants: 0.94, rough: 0.45, breath: 0.35 },
  associate: { f0: 235, formants: 1.18, rough: 0.05, breath: 0.3 },
  supervisor: { f0: 185, formants: 1.1, rough: 0.2, breath: 0.2 },
  manager: { f0: 78, formants: 0.86, rough: 0.55, breath: 0.22 },
  counsel: { f0: 215, formants: 1.2, rough: 0.02, breath: 0.25 },
  vellum: { f0: 118, formants: 1.02, rough: 0.08, breath: 0.32 },
  bellwether: { f0: 88, formants: 0.9, rough: 0.3, breath: 0.2 },
};

const VOWELS = {
  hurt: { f: [560, 1050, 2450], len: 0.2, from: 1.1, to: 0.85, attack: 0.008, decay: 3.5 },
  big: { f: [520, 880, 2400], len: 0.34, from: 1.25, to: 0.7, attack: 0.012, decay: 3.5 },
  knockdown: { f: [760, 1220, 2600], len: 0.75, from: 1.45, to: 0.62, attack: 0.03, decay: 2.2 },
  effort: { f: [650, 1150, 2500], len: 0.24, from: 0.95, to: 1.15, attack: 0.005, decay: 3 },
  death: { f: [700, 1150, 2500], len: 1.1, from: 1.3, to: 0.5, attack: 0.03, decay: 1.8 },
};
const EXAGGERATION = { hurt: 0.8, big: 1.1, knockdown: 1.1, effort: 0.9, death: 1.2 };

function mulberry(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resonator(hz, bw, rate) {
  const r = Math.exp((-Math.PI * bw) / rate);
  const a1 = 2 * r * Math.cos((2 * Math.PI * hz) / rate);
  const a2 = -r * r;
  const g = 1 - r;
  let y1 = 0;
  let y2 = 0;
  return (x) => {
    const y = g * x + a1 * y1 + a2 * y2;
    y2 = y1;
    y1 = y;
    return y;
  };
}

// A synthesized grunt as a take ({ pcm, rate }); the variation reseeds its length, formants and jitter.
export function synthGrunt(who, sound, variation = 0) {
  const t = THROATS[who];
  const v = VOWELS[sound];
  const rate = 24000;
  const rand = mulberry((variation + 1) * 7919 + who.length * 31 + sound.length);
  const len = v.len * (0.9 + rand() * 0.2);
  const pitch = 1 + (rand() - 0.5) * 0.12;
  const n = Math.round(rate * len);
  const bands = v.f.map((hz, i) => resonator(hz * t.formants * (0.94 + rand() * 0.12), 80 + i * 60, rate));
  const gains = [1, 0.55, 0.22];
  const pcm = new Float64Array(n);
  let phase = 0;
  let cycle = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const f0 = t.f0 * pitch * (v.from + (v.to - v.from) * Math.sqrt(p)) * (1 + (rand() - 0.5) * 0.04);
    phase += f0 / rate;
    if (phase >= 1) { phase -= 1; cycle++; }
    const pulse = phase < 0.6 ? Math.sin((Math.PI * phase) / 0.6) ** 2 : 0;
    const rasp = cycle % 2 ? 1 - t.rough : 1;
    const env = Math.min(1, i / (rate * v.attack)) * Math.exp(-p * v.decay) * Math.min(1, (n - i) / (rate * 0.03));
    const src = (pulse - 0.3) * rasp * (1 - t.breath * p) + (rand() - 0.5) * t.breath * (0.4 + p);
    pcm[i] = env * bands.reduce((s, b, k) => s + gains[k] * b(src), 0);
  }
  return { pcm, rate };
}

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}: ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

const kokoroGrunt = async (who, text) => parseWav(await post(KOKORO, { text, voice: voiceOf(who).voice, speed: takeSpeed(voiceOf(who)) }));
const chatterboxGrunt = async (who, text, exaggeration) => parseWav(await post(CHATTERBOX, { text, ref: `..${REF_DIR}/${who}.wav`, exaggeration, cfg_weight: 0.3 }));

// Cut a take to the sound's longest length with a short fade, so a model that rambles stays a grunt.
export function cap({ pcm, rate }, sound) {
  let peak = 0;
  for (const s of pcm) peak = Math.max(peak, Math.abs(s));
  const start = Math.max(0, pcm.findIndex((s) => Math.abs(s) > peak * 0.05) - Math.round(rate * 0.01));
  const n = Math.min(pcm.length - start, Math.round(rate * LONGEST[sound]));
  const fade = Math.round(rate * 0.06);
  const out = pcm.slice(start, start + n);
  for (let i = 0; i < fade && i < n; i++) out[n - 1 - i] *= i / fade;
  return { pcm: out, rate };
}

// The speech takes play at the cast pitch; the synth is already at its pitch.
const shiftOf = (who, way) => (way === 'c' ? 0 : voiceOf(who).pitch);

async function sendRef(who, dir) {
  const t = await take(who, voiceOf(who).sample);
  const ref = join(dir, `${who}-ref.wav`);
  writeFileSync(ref, wav({ left: Float32Array.from(t.pcm), right: Float32Array.from(t.pcm), sampleRate: t.rate }));
  execFileSync('docker', ['cp', ref, `${CONTAINER}:${REF_DIR}/${who}.wav`]);
}

async function makeTake(way, who, sound, i) {
  if (way === 'c') return synthGrunt(who, sound, i);
  const text = WORDS[who][sound][i];
  return cap(way === 'a' ? await kokoroGrunt(who, text) : await chatterboxGrunt(who, text, EXAGGERATION[sound]), sound);
}

// A take through the character's chain on one dry S-DSP voice, 32 kHz stereo.
export function renderDry(who, takeData, shift) {
  const v = voiceOf(who);
  const sample = digitize(who, takeData);
  const key = `grunt:${who}`;
  SAMPLES[key] = sample;
  const seconds = sample.pcm.length / (v.rate * 2 ** (shift / 12)) + 0.05;
  const seq = createSequencer();
  seq.sfx({ layers: [{ delay: 0, steps: [[{ sample: key, adsr: v.adsr, vol: v.vol, echo: false }, 60 + shift, Math.ceil(seconds * 60)]] }] });
  const len = Math.round(DSP_HZ * seconds);
  const left = new Float32Array(len);
  const right = new Float32Array(len);
  seq.render(left, right, len);
  return { left, right, sampleRate: DSP_HZ };
}

export function bakeGrunt(who, takeData, shift) {
  const v = voiceOf(who);
  const s = digitize(who, takeData);
  const frames = Math.ceil((s.pcm.length / (DSP_HZ * (261.6256 / s.rootHz) * 2 ** (shift / 12))) * 60) + 2;
  return { midi: 60 + shift, frames, rootHz: Number(s.rootHz.toFixed(4)), brr: pack(s.brr) };
}

export function reel(parts) {
  const len = parts.reduce((n, p) => n + (p.gap ? Math.round(DSP_HZ * p.gap) : p.left.length), 0);
  const left = new Float32Array(len);
  const right = new Float32Array(len);
  let at = 0;
  for (const p of parts) {
    if (p.gap) { at += Math.round(DSP_HZ * p.gap); continue; }
    left.set(p.left, at);
    right.set(p.right, at);
    at += p.left.length;
  }
  return { left, right, sampleRate: DSP_HZ };
}

async function sketch(out) {
  mkdirSync(join(out, 'takes'), { recursive: true });
  execFileSync('docker', ['exec', CONTAINER, 'mkdir', '-p', REF_DIR]);
  const ways = { a: [], b: [], c: [] };
  for (const who of Object.keys(SKETCH)) {
    await sendRef(who, join(out, 'takes'));
    for (const sound of Object.values(SKETCH_SOUNDS)) {
      for (const way of Object.keys(ways)) ways[way].push(renderDry(who, await makeTake(way, who, sound, 0), shiftOf(who, way)), { gap: 0.35 });
    }
    for (const w of Object.values(ways)) w.push({ gap: 0.6 });
  }
  const names = { a: 'grunts-a-kokoro.wav', b: 'grunts-b-chatterbox.wav', c: 'grunts-c-synth.wav' };
  for (const [k, parts] of Object.entries(ways)) writeFileSync(join(out, names[k]), wav(reel(parts)));
  execFileSync('docker', ['exec', CONTAINER, 'rm', '-rf', REF_DIR]);
}

async function bake(way, out) {
  if (out) mkdirSync(join(out, 'takes'), { recursive: true });
  if (way === 'b') execFileSync('docker', ['exec', CONTAINER, 'mkdir', '-p', REF_DIR]);
  const rows = [];
  for (const who of FIGHTERS) {
    if (way === 'b') await sendRef(who, out);
    const parts = [];
    for (const sound of SOUNDS) {
      for (let i = 0; i < VARIATIONS; i++) {
        const t = await makeTake(way, who, sound, i);
        const b = bakeGrunt(who, t, shiftOf(who, way));
        rows.push(`  '${gruntId(who, sound, i)}': { midi: ${b.midi}, frames: ${b.frames}, rootHz: ${b.rootHz}, brr: '${b.brr}' },`);
        if (out) parts.push(renderDry(who, t, shiftOf(who, way)), { gap: 0.3 });
      }
      if (out) parts.push({ gap: 0.4 });
    }
    if (out) writeFileSync(join(out, `${who}-grunts.wav`), wav(reel(parts)));
    console.log(who, 'baked');
  }
  if (way === 'b') execFileSync('docker', ['exec', CONTAINER, 'rm', '-rf', REF_DIR]);
  const head = `// Generated by tools/grunts.mjs --bake ${way}. Each brr string is 9-byte BRR blocks: shift<<4 | filter<<2, then 16 nibbles.\n\nexport default {\n`;
  writeFileSync(process.env.GRUNTS_MODULE ?? join(ROOT, 'src', 'snes', 'audio', 'grunts-brr.mjs'), `${head}${rows.join('\n')}\n};\n`);
}

if (process.argv[1]?.endsWith('grunts.mjs')) {
  const [first, arg, dir] = process.argv.slice(2);
  if (first === '--sketch' && arg) await sketch(arg);
  else if (first === '--bake' && ['a', 'b', 'c'].includes(arg)) await bake(arg, dir);
  else {
    console.error('usage: node tools/grunts.mjs --sketch <out dir> | --bake <a|b|c> [<out dir>]');
    process.exit(1);
  }
}

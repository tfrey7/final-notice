// The voice cast. Each character is a voice model run locally whose takes are kept, full quality,
// in assets/voice: those are the MASTERS, and nothing ever crushes one in place. The SNES version
// is made from a master by one digitizing chain — band limit, low sample rate, drive, 4-bit BRR
// blocks, played back pitched with a touch of echo — and that happens on the way into the game,
// never at recording time. How hard it bites is the CRUSH setting below, so the house sound can
// change without re-recording a line. The models are not bit-exact twice, so a take is recorded
// once and the chain is pure: the same master, character and crush always give the same bytes.
// tools/voice.mjs records and renders. The knowledge base recipe `final-notice-voice-cast` is the
// source of truth; keep them in step.

import { DSP_HZ, makeSample } from './spc.mjs';
import { midiToHz } from '../../audio/apu.mjs';
import { SAMPLES, createSequencer } from './player.mjs';

export const CHAIN = {
  generator: 'Kokoro 82M (hexgrad/Kokoro-82M, Apache-2.0), local, 24 kHz mono takes',
  rate: 12000, highHz: 120, lowHz: 4800, drive: 2, peak: 22000,
  adsr: [15, 7, 7, 0], vol: 127,
  echo: { mvol: 100, evol: 24, efb: 30, edl: 3, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
};

// How hard the SNES crush bites, as one dial with three settings. `rate` is the sample rate the
// line is stored at (the 1 MB voice budget is spent here: every second costs rate * 9/16 bytes of
// BRR); `driveX` and `lowX` scale the character's own drive and top end; `bits` quantizes ahead of
// BRR for extra grain, 0 for none. `master` is not a crush at all — it is the clean recording, and
// only a bake-off or a listening test ever asks for it.
export const CRUSH = {
  light: { rate: 16000, driveX: 0.75, lowX: 1.25, bits: 0, notes: 'clearest: 16 kHz, softer bite, top end open' },
  house: { rate: 12000, driveX: 1, lowX: 1, bits: 0, notes: '12 kHz, the chain as tuned per character' },
  hard: { rate: 8000, driveX: 1.5, lowX: 0.72, bits: 6, notes: "grittiest: 8 kHz, 6-bit grain, hard drive — Tim's pick" },
};

export const CRUSH_LEVELS = Object.keys(CRUSH);

// Tim picked `hard` off the four-way bake-off (item 2334, m10082): 8 kHz with real grain on it,
// against the clean master and the two softer settings.
export const CRUSH_DEFAULT = 'hard';

let level = CRUSH_LEVELS.includes(globalThis.process?.env?.FINAL_NOTICE_CRUSH) ? globalThis.process.env.FINAL_NOTICE_CRUSH : CRUSH_DEFAULT;

export const crushLevel = () => level;

export function setCrush(name) {
  if (!CRUSH[name]) throw new Error(`no crush "${name}"; the levels are ${CRUSH_LEVELS.join(', ')}`);
  level = name;
  return level;
}

// voice: Kokoro voice; speed: Kokoro pace; pitch: semitones the S-DSP plays the take at (the take
// is recorded at speed / 2^(pitch/12) so the pace survives); drive, highHz and lowHz override CHAIN.
// actor 'chatterbox' (Tim's pick, item 2329): the lines are acted by the local Chatterbox (MIT) at
// `exaggeration`, borrowing the voice from the character's Kokoro sample-line take.
export const CAST = {
  ward: {
    name: 'Ellis Ward', notes: 'by-the-book veteran: stiff, uptight, precise',
    voice: 'am_michael', speed: 1.02, pitch: 1, drive: 1.1, highHz: 240, actor: 'chatterbox', exaggeration: 0.5,
    sample: 'Serve the company its own Final Notice.',
  },
  mercer: {
    name: 'Frank Mercer', notes: 'rule-bending partner, older than he looks: gruff, dry, sarcastic',
    voice: 'am_fenrir', speed: 0.98, pitch: -3, drive: 2,
    sample: 'For good reasons.',
  },
  vellum: {
    name: 'Vellum', notes: 'corrupt former auditor: smooth, polite, desperate underneath',
    voice: 'bm_fable', speed: 0.9, pitch: 0, drive: 1.8, highHz: 150, actor: 'chatterbox', exaggeration: 0.7,
    sample: 'The agency lost my file.',
  },
  bellwether: {
    name: 'Bellwether', notes: 'the boss: warm and fatherly; `bellwether:cold` once he turns',
    voice: 'am_onyx', speed: 0.88, pitch: -1, drive: 1.3, highHz: 90, actor: 'chatterbox', exaggeration: 0.6,
    sample: 'Bring me the Master File.',
    moods: { cold: { pitch: -3, speed: 0.8, drive: 2.4, lowHz: 3400, exaggeration: 0.4, sample: 'Approved at the top.' } },
  },
  tuesday: {
    name: 'The man who died on Tuesday', notes: 'guilty company employee: nervous, apologetic, fast talker',
    voice: 'am_puck', speed: 1.25, pitch: 2, drive: 1.4, highHz: 200, actor: 'chatterbox', exaggeration: 0.9,
    sample: 'Forty-seven lifetimes. I helped build it.',
  },
  associate: {
    name: 'Security Associate', notes: 'wiry young woman, fast rusher: clipped, loud bark',
    voice: 'af_nova', speed: 1.15, pitch: 1, drive: 3.2, highHz: 250, actor: 'chatterbox', exaggeration: 0.8,
    sample: 'Keep working!',
  },
  supervisor: {
    name: 'Security Supervisor', notes: 'stocky woman, the blocker: low, stern and flat',
    voice: 'af_kore', speed: 1, pitch: -2, drive: 3, highHz: 180, actor: 'chatterbox', exaggeration: 0.6,
    sample: 'Working and billed.',
  },
  manager: {
    name: 'Security Manager', notes: 'enormous bald man, grabs and charges: low, slow rumble',
    voice: 'bm_lewis', speed: 0.9, pitch: -4, drive: 2.6, highHz: 100, actor: 'chatterbox', exaggeration: 0.7,
    sample: 'Keep them at their desks.',
  },
  counsel: {
    name: 'Security Counsel', notes: 'tall narrow woman, ranged paperwork: crisp, cold, lawyerly',
    voice: 'bf_emma', speed: 1.05, pitch: 0, drive: 1.8, highHz: 400, lowHz: 4000, actor: 'chatterbox', exaggeration: 0.6,
    sample: 'Signed each one over.',
  },
  kemp: {
    name: 'Mrs. Adele Kemp', notes: 'eighty, died this evening, the intro only: soft, frail, mildly surprised',
    voice: 'bf_isabella', speed: 0.88, pitch: -1, drive: 1.3, highHz: 150, lowHz: 4200,
    sample: 'Oh. I was only resting my eyes.',
  },
  speaker: {
    name: 'Wall-speaker announcer', notes: 'flat corporate PA: tinny, crushed',
    voice: 'am_echo', speed: 1, pitch: 0, drive: 4, highHz: 700, lowHz: 3000,
    sample: 'Now serving the newly dead.',
  },
};

export const castNames = () => Object.entries(CAST).flatMap(([k, c]) => [k, ...Object.keys(c.moods ?? {}).map((m) => `${k}:${m}`)]);

// The character's settings with the crush applied on top. `at` names the strength; left out it is
// the house level, which is what everything in the game uses.
export function voiceOf(who, at = level) {
  const [key, mood] = String(who).split(':');
  const base = CAST[key];
  if (!base || (mood && !base.moods?.[mood])) throw new Error(`no voice "${who}"; the cast is ${castNames().join(', ')}`);
  const { moods, ...rest } = base;
  const v = { ...CHAIN, ...rest, ...(mood ? moods[mood] : {}), key: who };
  const crush = CRUSH[at];
  if (!crush) throw new Error(`no crush "${at}"; the levels are ${CRUSH_LEVELS.join(', ')}`);
  return { ...v, rate: crush.rate, drive: v.drive * crush.driveX, lowHz: v.lowHz * crush.lowX, bits: crush.bits, crush: at };
}

// The pace Kokoro is asked for, so the take lands at `speed` once the S-DSP pitches it.
export const takeSpeed = (v) => Math.round((v.speed / 2 ** (v.pitch / 12)) * 1000) / 1000;

// What a take was asked, hashed into its name. A Chatterbox take sets no pace, so its name leaves it out.
export const takeKey = (v, text) => (v.actor === 'chatterbox' ? `chatterbox|${v.voice}|${v.exaggeration}|${text}` : `${v.voice}|${takeSpeed(v)}|${text}`);
export const takePrefix = (v) => (v.actor === 'chatterbox' ? `cb-${v.voice}` : v.voice);

// A take's file name in assets/voice/takes: the voice and a hash of what it was asked.
export async function takeFile(who, text) {
  const v = voiceOf(who);
  const digest = await globalThis.crypto.subtle.digest('SHA-1', new TextEncoder().encode(takeKey(v, text)));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${takePrefix(v)}-${hex.slice(0, 10)}.wav`;
}

// A WAV file's first channel as floats in -1..1: 16-bit PCM or 32-bit float.
export function parseWav(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at) => String.fromCharCode(...bytes.subarray(at, at + 4));
  let fmt = null;
  for (let at = 12; at + 8 <= bytes.length; ) {
    const size = view.getUint32(at + 4, true);
    if (tag(at) === 'fmt ') fmt = { format: view.getUint16(at + 8, true), channels: view.getUint16(at + 10, true), rate: view.getUint32(at + 12, true), bits: view.getUint16(at + 22, true) };
    if (tag(at) === 'data' && fmt) {
      const step = (fmt.bits / 8) * fmt.channels;
      const n = Math.floor(Math.min(size, bytes.length - at - 8) / step);
      const pcm = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const o = at + 8 + i * step;
        pcm[i] = fmt.format === 3 ? view.getFloat32(o, true) : view.getInt16(o, true) / 32768;
      }
      return { pcm, rate: fmt.rate };
    }
    at += 8 + size + (size % 2);
  }
  throw new Error('not a PCM WAV');
}

const onePole = (hz, rate) => 1 - Math.exp((-2 * Math.PI * hz) / rate);

function lowpass(x, hz, rate) {
  const a = onePole(hz, rate);
  const y = Float64Array.from(x);
  for (let pass = 0; pass < 2; pass++) for (let i = 0, s = 0; i < y.length; i++) y[i] = s += a * (y[i] - s);
  return y;
}

function highpass(x, hz, rate) {
  const low = lowpass(x, hz, rate);
  return x.map((v, i) => v - low[i]);
}

function trim(x, rate) {
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  const floor = max * 0.02;
  const pad = Math.round(rate * 0.02);
  let a = x.findIndex((v) => Math.abs(v) > floor);
  let b = x.findLastIndex((v) => Math.abs(v) > floor);
  if (a < 0) return x;
  return x.subarray(Math.max(0, a - pad), Math.min(x.length, b + pad));
}

// The digitizing chain: a master take ({ pcm, rate }) in the character's voice, as an S-DSP sample,
// crushed at `at` (the house level by default). The master itself is never touched.
export function digitize(who, take, at = level) {
  const v = voiceOf(who, at);
  let x = trim(take.pcm, take.rate);
  x = lowpass(highpass(x, v.highHz, take.rate), v.lowHz, take.rate);
  const n = Math.ceil((x.length * v.rate) / take.rate / 16) * 16;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const at = (i * take.rate) / v.rate;
    const j = Math.floor(at);
    out[i] = j + 1 < x.length ? x[j] + (x[j + 1] - x[j]) * (at - j) : (x[j] ?? 0);
  }
  let max = 0;
  for (const s of out) max = Math.max(max, Math.abs(s));
  const k = Math.tanh(v.drive);
  let wave = out.map((s) => (Math.tanh((v.drive * s) / (max || 1)) / k) * v.peak);
  if (v.bits) {
    const step = (2 * v.peak) / 2 ** v.bits;
    wave = wave.map((s) => Math.round(s / step) * step);
  }
  return { ...makeSample(wave), rootHz: midiToHz(60 + 12 * Math.log2(DSP_HZ / v.rate)) };
}

// The master played through the S-DSP at the character's pitch with the chain's echo, 32 kHz stereo.
export function renderLine(who, take, at = level) {
  const v = voiceOf(who, at);
  const sample = digitize(who, take, at);
  const key = `voice:${who}:${at}`;
  SAMPLES[key] = sample;
  const seconds = sample.pcm.length / (v.rate * 2 ** (v.pitch / 12)) + 0.6;
  const seq = createSequencer();
  seq.dsp.setEcho(v.echo);
  seq.sfx({ layers: [{ delay: 0, steps: [[{ sample: key, adsr: v.adsr, vol: v.vol, echo: true }, 60 + v.pitch, Math.ceil(seconds * 60)]] }] });
  const len = Math.round(DSP_HZ * seconds);
  const left = new Float32Array(len);
  const right = new Float32Array(len);
  seq.render(left, right, len);
  return { left, right, sampleRate: DSP_HZ };
}

// The master itself, untouched but for the silence trimmed off each end: the "before" in a crush
// bake-off. It never reaches the game.
export function masterClip(take) {
  const x = trim(take.pcm, take.rate);
  const mono = Float32Array.from(x);
  return { left: mono, right: mono, sampleRate: take.rate };
}

// What a set of lines costs at a crush level: BRR is nine bytes per sixteen samples, so a second
// of speech costs rate * 9/16 bytes. The SNES voice budget is 1 MB of sample data.
export const VOICE_BUDGET = 1024 * 1024;
export const crushBytes = (seconds, at = level) => Math.round(seconds * CRUSH[at].rate * (9 / 16));

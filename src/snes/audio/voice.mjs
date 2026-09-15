// The voice cast. Each character is a Kokoro 82M voice (Apache-2.0, run locally) whose takes are
// kept in assets/voice/takes, then one digitizing chain crushes a take into an S-DSP sample: band
// limit, 12 kHz, drive, 4-bit BRR blocks, played back pitched on a voice with a touch of echo.
// Kokoro on the GPU is not bit-exact twice, so a take is recorded once and the chain is pure: the
// same take, character and chain always give the same bytes. tools/voice.mjs records and renders.
// The knowledge base recipe `final-notice-voice-cast` is the source of truth; keep them in step.

import { DSP_HZ, makeSample } from './spc.mjs';
import { midiToHz } from '../../audio/apu.mjs';
import { SAMPLES, createSequencer } from './player.mjs';

export const CHAIN = {
  generator: 'Kokoro 82M (hexgrad/Kokoro-82M, Apache-2.0), local, 24 kHz mono takes',
  rate: 12000, highHz: 120, lowHz: 4800, drive: 2, peak: 22000,
  adsr: [15, 7, 7, 0], vol: 127,
  echo: { mvol: 100, evol: 24, efb: 30, edl: 3, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
};

// voice: Kokoro voice; speed: Kokoro pace; pitch: semitones the S-DSP plays the take at (the take
// is recorded at speed / 2^(pitch/12) so the pace survives); drive, highHz and lowHz override CHAIN.
export const CAST = {
  ward: {
    name: 'Ellis Ward', notes: 'by-the-book veteran: stiff, uptight, precise',
    voice: 'am_michael', speed: 1.02, pitch: 1, drive: 1.1, highHz: 240,
    sample: 'Serve the company its own Final Notice.',
  },
  mercer: {
    name: 'Frank Mercer', notes: 'rule-bending partner, older than he looks: gruff, dry, sarcastic',
    voice: 'am_fenrir', speed: 0.98, pitch: -3, drive: 2,
    sample: 'For good reasons.',
  },
  vellum: {
    name: 'Vellum', notes: 'corrupt former auditor: smooth, polite, desperate underneath',
    voice: 'bm_fable', speed: 0.9, pitch: 0, drive: 1.8, highHz: 150,
    sample: 'The agency lost my file.',
  },
  bellwether: {
    name: 'Bellwether', notes: 'the boss: warm and fatherly; `bellwether:cold` once he turns',
    voice: 'am_onyx', speed: 0.88, pitch: -1, drive: 1.3, highHz: 90,
    sample: 'Bring me the Master File.',
    moods: { cold: { pitch: -3, speed: 0.8, drive: 2.4, lowHz: 3400, sample: 'Approved at the top.' } },
  },
  tuesday: {
    name: 'The man who died on Tuesday', notes: 'guilty company employee: nervous, apologetic, fast talker',
    voice: 'am_puck', speed: 1.25, pitch: 2, drive: 1.4, highHz: 200,
    sample: 'Forty-seven lifetimes. I helped build it.',
  },
  associate: {
    name: 'Security Associate', notes: 'wiry young woman, fast rusher: clipped, loud bark',
    voice: 'af_nova', speed: 1.15, pitch: 1, drive: 3.2, highHz: 250,
    sample: 'Keep working!',
  },
  supervisor: {
    name: 'Security Supervisor', notes: 'stocky woman, the blocker: low, stern and flat',
    voice: 'af_kore', speed: 1, pitch: -2, drive: 3, highHz: 180,
    sample: 'Working and billed.',
  },
  manager: {
    name: 'Security Manager', notes: 'enormous bald man, grabs and charges: low, slow rumble',
    voice: 'bm_lewis', speed: 0.9, pitch: -4, drive: 2.6, highHz: 100,
    sample: 'Keep them at their desks.',
  },
  counsel: {
    name: 'Security Counsel', notes: 'tall narrow woman, ranged paperwork: crisp, cold, lawyerly',
    voice: 'bf_emma', speed: 1.05, pitch: 0, drive: 1.8, highHz: 400, lowHz: 4000,
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

export function voiceOf(who) {
  const [key, mood] = String(who).split(':');
  const base = CAST[key];
  if (!base || (mood && !base.moods?.[mood])) throw new Error(`no voice "${who}"; the cast is ${castNames().join(', ')}`);
  const { moods, ...rest } = base;
  return { ...CHAIN, ...rest, ...(mood ? moods[mood] : {}), key: who };
}

// The pace Kokoro is asked for, so the take lands at `speed` once the S-DSP pitches it.
export const takeSpeed = (v) => Math.round((v.speed / 2 ** (v.pitch / 12)) * 1000) / 1000;

// A take's file name in assets/voice/takes: the Kokoro voice and a hash of what it was asked.
export async function takeFile(who, text) {
  const v = voiceOf(who);
  const digest = await globalThis.crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${v.voice}|${takeSpeed(v)}|${text}`));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${v.voice}-${hex.slice(0, 10)}.wav`;
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

// The digitizing chain: a take ({ pcm, rate }) in the character's voice, as an S-DSP sample.
export function digitize(who, take) {
  const v = voiceOf(who);
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
  const wave = out.map((s) => (Math.tanh((v.drive * s) / (max || 1)) / k) * v.peak);
  return { ...makeSample(wave), rootHz: midiToHz(60 + 12 * Math.log2(DSP_HZ / v.rate)) };
}

// The take played through the S-DSP at the character's pitch with the chain's echo, 32 kHz stereo.
export function renderLine(who, take) {
  const v = voiceOf(who);
  const sample = digitize(who, take);
  const key = `voice:${who}`;
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

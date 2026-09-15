// A small full-fidelity sampler and mixer for direction sketches: FluidR3_GM samples played at
// 44.1 kHz stereo, a Freeverb hall, a gated snare room, chorus and a soft master limiter.

import { readSf2, pick } from '../sf2.mjs';

export const RATE = 44100;

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(name) {
  const m = /^([A-G])([b#]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

// Eighth-note text: a note name starts a note, '-' holds it, '.' rests, '|' is decoration.
export function line(bars, { start = 0, step = 0.5, vel = 90, octave = 0 } = {}) {
  const out = [];
  let beat = start;
  let cur = null;
  for (const tok of bars.join(' ').split(/\s+/)) {
    if (!tok || tok === '|') continue;
    if (tok === '-') { if (cur) cur[1] += step; } else if (tok === '.') cur = null;
    else { cur = [beat, step, midi(tok) + 12 * octave, vel]; out.push(cur); }
    beat += step;
  }
  return out;
}

// A progression is one entry per bar: [bass, tones] or a list of [beats, bass, tones] halves.
export function chordsOf(prog, beatsPerBar = 4) {
  const out = [];
  prog.forEach((bar, i) => {
    const parts = Array.isArray(bar[0]) ? bar : [[beatsPerBar, ...bar]];
    let at = i * beatsPerBar;
    for (const [beats, bass, tones] of parts) {
      out.push({ bar: i, beat: at, dur: beats, bass: midi(bass), tones: tones.split(' ').map(midi) });
      at += beats;
    }
  });
  return out;
}

const mulberry = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function renderTrack(sf, track, bpm, len) {
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  const spb = 60 / bpm;
  const cache = new Map();
  const rng = mulberry(track.seed ?? 11);
  const { a = 0.004, r = 0.15, decay = 0 } = track.env ?? {};
  for (const [beat, dur, note, vel, bar] of track.notes) {
    let s = cache.get(note);
    if (!s) {
      s = pick(sf, { bank: track.bank ?? 0, program: track.program, key: Math.max(0, Math.min(127, note)) });
      s.pcm = Float32Array.from(s.pcm, (x) => x / 32768);
      cache.set(note, s);
    }
    const level = track.level ? track.level(bar ?? Math.floor(beat / 4)) : 1;
    if (level <= 0) continue;
    const t0 = Math.round((beat * spb + (rng() - 0.5) * (track.human ?? 0.008)) * RATE);
    const ratio = 2 ** ((note - s.rootMidi) / 12) * (s.rate / RATE);
    const loopLen = s.loopEnd - s.loopStart;
    const loops = s.loops && loopLen > 32 && !track.oneShot;
    const holdN = track.oneShot ? s.pcm.length / ratio : dur * spb * RATE;
    const total = Math.min(holdN + r * RATE, len - t0);
    const g = (vel / 127) ** 1.5 * (track.gain ?? 1) * level * (0.92 + rng() * 0.16);
    const pan = Math.max(-1, Math.min(1, (track.pan ?? 0) + (track.spread ?? 0) * (rng() - 0.5)));
    const gl = Math.cos((pan + 1) * Math.PI / 4) * g;
    const gr = Math.sin((pan + 1) * Math.PI / 4) * g;
    const aN = Math.max(1, a * RATE);
    let pos = 0;
    for (let i = 0; i < total; i++) {
      if (loops) { while (pos >= s.loopEnd) pos -= loopLen; } else if (pos >= s.pcm.length - 1) break;
      const p = pos | 0;
      const x = s.pcm[p] + (s.pcm[p + 1] - s.pcm[p]) * (pos - p);
      let env = i < aN ? i / aN : 1;
      if (decay) env *= Math.exp(-i / (decay * RATE));
      if (i > holdN) env *= Math.exp(-5 * (i - holdN) / (r * RATE));
      const at = t0 + i;
      if (at >= 0) { L[at] += x * env * gl; R[at] += x * env * gr; }
      pos += ratio;
    }
  }
  if (track.lowpass) lowpass(L, R, track.lowpass);
  if (track.chorus) chorus(L, R, track.chorus);
  return [L, R];
}

function lowpass(L, R, hz) {
  const k = 1 - Math.exp(-2 * Math.PI * hz / RATE);
  for (const ch of [L, R]) { let y = 0; for (let i = 0; i < ch.length; i++) ch[i] = y += k * (ch[i] - y); }
}

function chorus(L, R, { mix = 0.5, rate = 0.5, depth = 0.0025, base = 0.014 } = {}) {
  const inL = L.slice();
  const inR = R.slice();
  const tap = (buf, t) => { const p = Math.floor(t); return p < 0 ? 0 : buf[p] + (buf[p + 1] - buf[p]) * (t - p); };
  for (let i = 0; i < L.length - 1; i++) {
    const ph = 2 * Math.PI * rate * i / RATE;
    L[i] = inL[i] * (1 - mix) + tap(inR, i - (base + depth * Math.sin(ph)) * RATE) * mix;
    R[i] = inR[i] * (1 - mix) + tap(inL, i - (base + depth * Math.cos(ph)) * RATE) * mix;
  }
}

// Freeverb (Jezar's public-domain design).
export function reverb(inL, inR, { room = 0.85, damp = 0.35, predelay = 0.02, width = 1 } = {}) {
  const n = inL.length;
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  const fb = room * 0.28 + 0.7;
  const d1 = damp * 0.4;
  const d2 = 1 - d1;
  const comb = (t) => ({ buf: new Float32Array(t), i: 0, store: 0 });
  const ap = (t) => ({ buf: new Float32Array(t), i: 0 });
  const CT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const AT = [556, 441, 341, 225];
  const cl = CT.map(comb), cr = CT.map((t) => comb(t + 23));
  const al = AT.map(ap), ar = AT.map((t) => ap(t + 23));
  const pre = Math.round(predelay * RATE);
  const run = (x, combs, aps) => {
    let y = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.store = o * d2 + c.store * d1;
      c.buf[c.i] = x + c.store * fb;
      c.i = (c.i + 1) % c.buf.length;
      y += o;
    }
    for (const a of aps) {
      const o = a.buf[a.i];
      a.buf[a.i] = y + o * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      y = o - y;
    }
    return y;
  };
  for (let i = 0; i < n; i++) {
    const x = i >= pre ? (inL[i - pre] + inR[i - pre]) * 0.015 : 0;
    const l = run(x, cl, al);
    const r = run(x, cr, ar);
    const w1 = (1 + width) / 2, w2 = (1 - width) / 2;
    outL[i] = l * w1 + r * w2;
    outR[i] = r * w1 + l * w2;
  }
  return [outL, outR];
}

// The 80s gated snare: a bright room that is cut off a quarter second after each hit.
function gated(L, R, hits, hold = 0.26) {
  const [wl, wr] = reverb(L, R, { room: 0.9, damp: 0.1, predelay: 0.005 });
  const gate = new Float32Array(L.length);
  for (const t of hits) {
    const s = Math.round(t * RATE);
    const h = Math.round(hold * RATE);
    const f = Math.round(0.03 * RATE);
    for (let i = 0; i < h + f && s + i < gate.length; i++) gate[s + i] = Math.max(gate[s + i], i < h ? 1 : 1 - (i - h) / f);
  }
  for (let i = 0; i < L.length; i++) { wl[i] *= gate[i] * 2.2; wr[i] *= gate[i] * 2.2; }
  return [wl, wr];
}

export function renderSong(sfBuf, song) {
  const sf = readSf2(sfBuf);
  const spb = 60 / song.bpm;
  const len = Math.ceil((song.bars * 4 * spb + (song.tail ?? 4)) * RATE);
  const mixL = new Float32Array(len), mixR = new Float32Array(len);
  const sendL = new Float32Array(len), sendR = new Float32Array(len);
  for (const track of song.tracks) {
    if (!track.notes.length) continue;
    const [L, R] = renderTrack(sf, track, song.bpm, len);
    const send = track.send ?? 0.2;
    for (let i = 0; i < len; i++) {
      mixL[i] += L[i]; mixR[i] += R[i];
      sendL[i] += L[i] * send; sendR[i] += R[i] * send;
    }
    if (track.gatedRoom) {
      const [gl, gr] = gated(L, R, track.notes.map((n) => n[0] * spb));
      for (let i = 0; i < len; i++) { mixL[i] += gl[i] * track.gatedRoom; mixR[i] += gr[i] * track.gatedRoom; }
    }
  }
  const [wl, wr] = reverb(sendL, sendR, song.hall ?? {});
  for (let i = 0; i < len; i++) { mixL[i] += wl[i]; mixR[i] += wr[i]; }
  return master(mixL, mixR);
}

function master(L, R) {
  let sum = 0;
  for (let i = 0; i < L.length; i++) sum += L[i] * L[i] + R[i] * R[i];
  const rms = Math.sqrt(sum / (2 * L.length)) || 1;
  const g = 0.16 / rms;
  let peak = 0;
  for (const ch of [L, R]) {
    for (let i = 0; i < ch.length; i++) { ch[i] = Math.tanh(ch[i] * g * 1.1) / 1.1; peak = Math.max(peak, Math.abs(ch[i])); }
  }
  const trim = peak > 0.95 ? 0.95 / peak : 1;
  for (const ch of [L, R]) for (let i = 0; i < ch.length; i++) ch[i] *= trim;
  return [L, R];
}

export function wav([L, R]) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  const q = (x) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
  for (let i = 0; i < n; i++) { buf.writeInt16LE(q(L[i]), 44 + i * 4); buf.writeInt16LE(q(R[i]), 46 + i * 4); }
  return buf;
}

// The 2A03's four tone channels, synthesised in WebAudio: pulse 1 and 2, triangle and noise.
// The pure helpers at the top run under node --test; createApu needs an AudioContext.

export const CPU_HZ = 1789773;
export const FRAME_HZ = 60;
export const CHANNELS = ['pulse1', 'pulse2', 'triangle', 'noise'];

// Duty 0-3 = 12.5%, 25%, 50%, 75%, as the 2A03's 8-step sequencer plays them.
export const DUTY_TABLES = [
  [0, 1, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0],
  [1, 0, 0, 1, 1, 1, 1, 1],
];

// NTSC noise periods, index 0 (highest) to 15 (lowest).
export const NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 127, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];

// Output per unit of 4-bit level, from the linear approximation of the 2A03 mixer.
export const LEVEL = { pulse1: 0.00752, pulse2: 0.00752, triangle: 0.00851, noise: 0.00494 };

const NOTE_STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteToMidi(name) {
  const m = /^([A-Ga-g])(#|b)?(-?\d)$/.exec(String(name));
  if (!m) return null;
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + NOTE_STEPS[m[1].toUpperCase()] + accidental;
}

export const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

const clampPeriod = (p) => Math.max(0, Math.min(2047, Math.round(p)));
export const pulsePeriod = (hz) => clampPeriod(CPU_HZ / (16 * hz) - 1);
export const pulseHz = (period) => CPU_HZ / (16 * (period + 1));
export const trianglePeriod = (hz) => clampPeriod(CPU_HZ / (32 * hz) - 1);
export const triangleHz = (period) => CPU_HZ / (32 * (period + 1));

// A pulse period under 8 silences the channel on the hardware.
export const pulseAudible = (period) => period >= 8;

export function lfsrStep(reg, short = false) {
  const feedback = (reg ^ (reg >> (short ? 6 : 1))) & 1;
  return (reg >> 1) | (feedback << 14);
}

// The channel outputs its volume while bit 0 is clear.
export function noiseSequence(short = false) {
  const out = [];
  let reg = 1;
  do {
    out.push(reg & 1 ? 0 : 1);
    reg = lfsrStep(reg, short);
  } while (reg !== 1);
  return out;
}

export function triangleSteps() {
  const down = Array.from({ length: 16 }, (_, i) => 15 - i);
  return [...down, ...down.slice().reverse()];
}

export function mixGain(channel, volume) {
  const v = Math.max(0, Math.min(15, Math.round(volume)));
  // The triangle has no volume control: its buffer already swings the full 15 levels.
  if (channel === 'triangle') return v > 0 ? LEVEL.triangle : 0;
  return LEVEL[channel] * v;
}

// Hertz a voice plays at: pitch is a MIDI note (fractional for sweeps) quantised to the channel's
// 11-bit period, or a noise period index.
export function channelRate(channel, pitch) {
  if (channel === 'noise') {
    const idx = Math.max(0, Math.min(15, Math.round(pitch)));
    return CPU_HZ / NOISE_PERIODS[idx];
  }
  if (channel === 'triangle') return triangleHz(trianglePeriod(midiToHz(pitch)));
  const period = pulsePeriod(midiToHz(pitch));
  return pulseAudible(period) ? pulseHz(period) : 0;
}

const PULSE_STEP = 16;
const TRIANGLE_STEP = 4;
const MASTER = 3.2;

function makeBuffer(ctx, samples) {
  const buf = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buf.getChannelData(0).set(samples);
  return buf;
}

function centred(values, scale) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.map((v) => (v - mean) * scale);
}

export function createApu(ctx) {
  const master = ctx.createGain();
  master.gain.value = MASTER;
  // The console's output stage: a DC-blocking high-pass and a gentle low-pass.
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 90;
  highpass.Q.value = 0.5;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 14000;
  lowpass.Q.value = 0.5;
  master.connect(highpass).connect(lowpass).connect(ctx.destination);

  const buses = {};
  const meters = {};
  for (const ch of CHANNELS) {
    buses[ch] = ctx.createGain();
    meters[ch] = ctx.createAnalyser();
    meters[ch].fftSize = 512;
    buses[ch].connect(master);
    buses[ch].connect(meters[ch]);
  }

  const expand = (steps, per) => steps.flatMap((s) => Array(per).fill(s));
  const pulseBuffers = DUTY_TABLES.map((t) => makeBuffer(ctx, centred(expand(t, PULSE_STEP), 1)));
  const triangleBuffer = makeBuffer(ctx, centred(expand(triangleSteps(), TRIANGLE_STEP), 1));
  const noiseBuffers = {
    long: makeBuffer(ctx, centred(noiseSequence(false), 1)),
    short: makeBuffer(ctx, centred(noiseSequence(true), 1)),
  };

  function bufferFor(channel, spec) {
    if (channel === 'triangle') return { buffer: triangleBuffer, cycle: triangleBuffer.length };
    if (channel === 'noise') return { buffer: spec.short ? noiseBuffers.short : noiseBuffers.long, cycle: 1 };
    return { buffer: pulseBuffers[spec.duty ?? 2], cycle: 8 * PULSE_STEP };
  }

  // spec: { frames, duty, short, at(f) -> { vol, pitch } }. Returns { src, start, end }.
  function voice(channel, when, spec) {
    const { buffer, cycle } = bufferFor(channel, spec);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    let lastGain = -1;
    let lastRate = -1;
    for (let f = 0; f < spec.frames; f++) {
      const { vol, pitch } = spec.at(f);
      const hz = channelRate(channel, pitch);
      const g = hz > 0 ? mixGain(channel, vol) : 0;
      const t = when + f / FRAME_HZ;
      if (g !== lastGain) gain.gain.setValueAtTime(g, t);
      const rate = hz > 0 ? (hz * cycle) / ctx.sampleRate : lastRate;
      if (rate > 0 && rate !== lastRate) src.playbackRate.setValueAtTime(rate, t);
      lastGain = g;
      lastRate = rate;
    }
    src.connect(gain).connect(buses[channel]);
    const end = when + spec.frames / FRAME_HZ;
    src.start(when);
    src.stop(end);
    return { src, start: when, end };
  }

  function silence(v, at) {
    if (!v || v.end <= at) return;
    try {
      v.src.stop(Math.max(at, v.start));
    } catch {
      // already stopped
    }
    v.end = at;
  }

  function level(channel) {
    const data = new Float32Array(meters[channel].fftSize);
    meters[channel].getFloatTimeDomainData(data);
    let peak = 0;
    for (const s of data) peak = Math.max(peak, Math.abs(s));
    return peak;
  }

  return { ctx, voice, silence, level };
}

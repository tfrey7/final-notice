// The corporate-wave instrument bank: every sample is synthesised here and stored as a BRR-style
// loop (or a one-shot for drums), with the ADSR and mix each instrument plays with. Melodic samples
// are a short attack followed by a whole number of cycles, so the loop seam is exact; drums are
// generated at 16 kHz where their top end allows it, which halves their bytes.

import { midiToHz } from '../../audio/apu.mjs';
import { DSP_HZ, makeSample } from './spc.mjs';

export const BUDGET_BYTES = 60 * 1024;
const BRR_BLOCK_BYTES = 9;
const TAU = 2 * Math.PI;
const PEAK = 22000;

export function noise(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

const toBlock = (n) => Math.ceil(n / 16) * 16;
const fade = (i, len) => (i < len ? (1 - i / len) ** 2 : 0);
export const gate = (t, end, len) => (t < end ? 1 : Math.max(0, 1 - (t - end) / len));

function saw(phase, partials, tilt = 1) {
  let s = 0;
  for (let k = 1; k <= partials; k++) s += Math.sin(k * phase) / k ** tilt;
  return s;
}

function normalise(wave) {
  let max = 0;
  for (const x of wave) max = Math.max(max, Math.abs(x));
  return wave.map((x) => (x * PEAK) / (max || 1));
}

export const lowpass = (a) => (wave) => {
  let y = 0;
  return wave.map((x) => (y += a * (x - y)));
};

export const highpass = (a) => (wave) => {
  let y = 0;
  let prev = 0;
  return wave.map((x) => {
    y = a * (y + x - prev);
    prev = x;
    return y;
  });
};

// An attack of `attack` samples, then a loop of `loopLen` samples that fn keeps periodic.
function tone({ hz, attack = 0, loopLen, fn }) {
  const loop = toBlock(attack);
  const wave = normalise(Float64Array.from({ length: loop + loopLen }, (_, i) => fn(i)));
  return { ...makeSample(wave, loop), rootHz: hz };
}

// A one-shot at `rate`, sounding natural when played at C4.
export function hit({ rate, seconds, fn, post = (w) => w }) {
  const n = toBlock(Math.round(rate * seconds));
  const wave = normalise(post(Float64Array.from({ length: n }, (_, i) => fn(i / rate, i))));
  return { ...makeSample(wave), rootHz: midiToHz(60 + 12 * Math.log2(DSP_HZ / rate)) };
}

const cyclePhase = (i, cycle) => (TAU * i) / cycle;

export const SAMPLES = {
  // Two-operator FM: a warm 1:1 body whose index settles, and a 14:1 tine that dies in 30 ms.
  epiano: tone({
    hz: DSP_HZ / 64, attack: 2400, loopLen: 64,
    fn: (i) => {
      const p = cyclePhase(i, 64);
      return Math.sin(p + (0.8 + 1.4 * fade(i, 2400)) * Math.sin(p)) + 0.5 * fade(i, 900) * Math.sin(14 * p);
    },
  }),
  // Two soft saws 75 and 76 cycles to the loop: a slow 3 Hz chorus baked into one loop.
  pad: tone({
    hz: (DSP_HZ * 75.5) / 9600, loopLen: 9600,
    fn: (i) => saw((TAU * 75 * i) / 9600, 6, 1.4) + saw((TAU * 76 * i) / 9600, 6, 1.4),
  }),
  bell: tone({
    hz: DSP_HZ / 64, attack: 1600, loopLen: 64,
    fn: (i) => {
      const p = cyclePhase(i, 64);
      return Math.sin(p) + 0.2 * Math.sin(4 * p) + 0.6 * fade(i, 1600) * Math.sin(2.76 * p) + 0.3 * fade(i, 400) * Math.sin(10 * p);
    },
  }),
  slap: (() => {
    const n = noise(11);
    return tone({
      hz: DSP_HZ / 128, attack: 960, loopLen: 128,
      fn: (i) => {
        const p = cyclePhase(i, 128);
        const pop = Math.sin(9 * p) + 0.8 * Math.sin(11 * p) + 0.6 * Math.sin(13 * p) + 0.5 * Math.sin(16 * p);
        return saw(p, 8, 1.2) + 1.2 * fade(i, 960) * pop + 0.8 * fade(i, 200) * n();
      },
    });
  })(),
  // A saw through a resonant peak that sweeps down onto the third harmonic.
  synbass: tone({
    hz: DSP_HZ / 128, attack: 640, loopLen: 128,
    fn: (i) => {
      const p = cyclePhase(i, 128);
      const w = fade(i, 640);
      let s = 0;
      for (let k = 1; k <= 12; k++) s += (Math.sin(k * p) / k) * (1 + (2 + 4 * w) * Math.exp(-((k - 3 - 6 * w) ** 2) / 2));
      return s;
    },
  }),
  // A reedy spectrum with one 5 Hz vibrato cycle across the loop, and breath on the attack.
  sax: (() => {
    const n = noise(23);
    const amps = [1, 0.9, 0.75, 0.6, 0.35, 0.3, 0.2, 0.12, 0.1, 0.06];
    return tone({
      hz: DSP_HZ / 128, attack: 1280, loopLen: 6400,
      fn: (i) => {
        const p = cyclePhase(i, 128) + 0.35 * Math.sin(cyclePhase(i, 6400));
        return amps.reduce((s, a, k) => s + a * Math.sin((k + 1) * p), 0) + 0.25 * fade(i, 1280) * n();
      },
    });
  })(),
  // A saw whose upper partials blare on the attack and settle.
  brass: tone({
    hz: DSP_HZ / 128, attack: 1440, loopLen: 128,
    fn: (i) => {
      const p = cyclePhase(i, 128);
      const blare = i < 1440 ? Math.sin((Math.PI * i) / 1440) ** 2 : 0;
      let s = 0;
      for (let k = 1; k <= 14; k++) s += (Math.sin(k * p) / k ** 1.1) * (1 + (blare * k) / 5);
      return s;
    },
  }),
  sqlead: tone({
    hz: DSP_HZ / 64, loopLen: 64,
    fn: (i) => {
      const p = cyclePhase(i, 64);
      let s = 0;
      for (let k = 1; k <= 9; k += 2) s += Math.sin(k * p) / k ** 1.1;
      return s;
    },
  }),
  gkick: (() => {
    const n = noise(31);
    let phase = 0;
    let room = 0;
    return hit({
      rate: 16000, seconds: 0.22,
      fn: (t, i) => {
        phase += (TAU * (50 + 140 * Math.exp(-t * 35))) / 16000;
        room += 0.15 * (n() - room);
        return (Math.sin(phase) * Math.exp(-t * 6) + 0.6 * fade(i, 60) * n() + 0.5 * room) * gate(t, 0.18, 0.02);
      },
    });
  })(),
  // A snare with its reverb held flat and cut dead: the gated-snare sound of 1985.
  gsnare: (() => {
    const n = noise(47);
    let verb = 0;
    return hit({
      rate: 16000, seconds: 0.24,
      fn: (t) => {
        verb += 0.35 * (n() - verb);
        const body = 0.7 * Math.sin(TAU * 185 * t) * Math.exp(-t * 30) + 0.3 * Math.sin(TAU * 330 * t) * Math.exp(-t * 40);
        return (body + n() * Math.exp(-t * 18) + 0.9 * verb) * gate(t, 0.2, 0.02);
      },
    });
  })(),
  chat: (() => {
    const n = noise(59);
    return hit({
      rate: DSP_HZ, seconds: 0.06,
      fn: (t) => (metal(t) + n()) * Math.exp(-t * 60),
      post: highpass(0.6),
    });
  })(),
  ohat: (() => {
    const n = noise(61);
    return hit({
      rate: DSP_HZ, seconds: 0.2,
      fn: (t) => (metal(t) + n()) * Math.exp(-t * 9) * gate(t, 0.17, 0.03),
      post: highpass(0.6),
    });
  })(),
  clap: (() => {
    const n = noise(71);
    return hit({
      rate: 16000, seconds: 0.25,
      fn: (t) => {
        const bursts = [0, 0.011, 0.022].reduce((s, t0) => s + (t >= t0 ? Math.exp(-(t - t0) * 300) : 0), 0);
        return n() * (bursts + (t >= 0.03 ? 0.6 * Math.exp(-(t - 0.03) * 14) : 0)) * gate(t, 0.22, 0.03);
      },
      post: (w) => lowpass(0.5)(highpass(0.8)(w)),
    });
  })(),
  // A C major stack of detuned saws across three octaves, struck and let go.
  orch: (() => {
    const n = noise(83);
    const notes = [48, 55, 60, 64, 67, 72].map((m, j) => midiToHz(m) * (1 + (j % 2 ? 0.003 : -0.003)));
    return hit({
      rate: 16000, seconds: 0.6,
      fn: (t) => {
        const chord = notes.reduce((s, hz) => s + saw(TAU * hz * t, Math.min(10, Math.floor(7000 / hz)), 1), 0);
        return (chord + 2 * n() * Math.exp(-t * 80)) * Math.min(1, t / 0.004) * Math.exp(-t * 4) * gate(t, 0.55, 0.05);
      },
      post: lowpass(0.6),
    });
  })(),
};

// The 808's six detuned square oscillators, the metal under both hats.
function metal(t) {
  return [205.3, 304.4, 369.6, 522.7, 540, 800].reduce((s, hz) => s + Math.sign(Math.sin(TAU * hz * 2.2 * t)), 0) / 3;
}

const row = (text, key) => text.split(/\s+/).map((t) => (/^[A-G]/.test(t) ? `${t}:${key}` : t)).join(' ');
const DEMO_ROWS = 20;

// Instruments in the song format, in the plan's order. demo: up to three voices of 20 rows each.
export const INSTRUMENTS = {
  epiano: {
    label: 'DX electric piano', group: 'Keys', sample: 'epiano', adsr: [15, 4, 3, 17], vol: 90, echo: true,
    demo: ['Eb5 - - - D5 - Bb4 - - - G4 - - - - - - - . .', 'G4 - - - - - - - - - - - - - - - - - . .', 'Bb3 - - - - - - - - - - - - - - - - - . .'],
  },
  pad: {
    label: 'warm pad', group: 'Keys', sample: 'pad', adsr: [5, 2, 6, 0], vol: 48, echo: true,
    demo: ['Bb4 - - - - - - - - - - - - - - - - - . .', 'G4 - - - - - - - - - - - - - - - - - . .', 'Eb4 - - - - - - - - - - - - - - - - - . .'],
  },
  bell: {
    label: 'bell', group: 'Keys', sample: 'bell', adsr: [15, 5, 1, 19], vol: 127, pan: 30, echo: true,
    demo: ['Bb5 . G5 . Eb5 . F5 . G5 - - - Bb5 - - - - - . .'],
  },
  slap: {
    label: 'slap bass', group: 'Bass', sample: 'slap', adsr: [15, 3, 3, 20], vol: 127,
    demo: ['Eb2 - . Eb3 . Eb2 . . Bb1 - . Bb2 . C#3 C3 . Eb2 - . .'],
  },
  synbass: {
    label: 'synth bass', group: 'Bass', sample: 'synbass', adsr: [15, 2, 5, 14], vol: 110,
    demo: ['C2 - C2 . C3 . C2 - Ab1 - Ab1 . Ab2 . Ab1 - Bb1 - Bb2 .'],
  },
  sax: {
    label: 'alto sax', group: 'Lead', sample: 'sax', adsr: [13, 6, 6, 8], vol: 96, echo: true,
    demo: ['G4 - - Bb4 - C5 - - - - Eb5 - D5 - C5 - - - . .'],
  },
  brass: {
    label: 'brass stab', group: 'Lead', sample: 'brass', adsr: [15, 3, 2, 18], vol: 84, echo: true,
    demo: [
      'Bb4 . . Bb4 - . . . C5 . . C5 - . . . Eb5 - . .',
      'F4 . . F4 - . . . G4 . . G4 - . . . Bb4 - . .',
      'D4 . . D4 - . . . Eb4 . . Eb4 - . . . G4 - . .',
    ],
  },
  sqlead: {
    label: 'square lead', group: 'Lead', sample: 'sqlead', adsr: [14, 7, 6, 4], vol: 48, pan: -20, echo: true,
    demo: ['C5 - Eb5 - G5 - C6 - - - Bb5 - G5 - Ab5 - G5 - - .'],
  },
  gkick: { label: 'gated kick', group: 'Drums', sample: 'gkick', adsr: [15, 7, 7, 0], vol: 120, demo: ['C4 - - - C4 - - - C4 - - - C4 - - - C4 - C4 -'] },
  gsnare: { label: 'gated snare', group: 'Drums', sample: 'gsnare', adsr: [15, 7, 7, 0], vol: 127, demo: ['. . . . C4 - - - . . . . C4 - - - C4 - - -'] },
  chat: { label: 'closed hat', group: 'Drums', sample: 'chat', adsr: [15, 7, 7, 0], vol: 120, pan: 24, demo: ['C4 - C4 - C4 - C4 - C4 - C4 - C4 - C4 - C4 C4 C4 -'] },
  ohat: { label: 'open hat', group: 'Drums', sample: 'ohat', adsr: [15, 7, 7, 0], vol: 110, pan: 24, demo: ['. . C4 - . . C4 - . . C4 - . . C4 - . . C4 -'] },
  clap: { label: 'clap', group: 'Drums', sample: 'clap', adsr: [15, 7, 7, 0], vol: 127, echo: true, demo: ['. . . . C4 - - - . . . . C4 - - - . . C4 -'] },
  orch: { label: 'orchestra hit', group: 'Drums', sample: 'orch', adsr: [15, 7, 7, 0], vol: 116, echo: true, demo: ['C4 - - - - - . . Eb4 - - - - - . . G4 - - -'] },
};

export const sampleBytes = (sample) => sample.brr.blocks.length * BRR_BLOCK_BYTES;
export const bankBytes = () => Object.values(SAMPLES).reduce((sum, s) => sum + sampleBytes(s), 0);

// A song that plays each named instrument's demo in turn, two seconds apiece.
export function demoSong(keys = Object.keys(INSTRUMENTS), table = INSTRUMENTS) {
  const voices = [[], [], []];
  for (const key of keys) {
    const { demo } = table[key];
    voices.forEach((rows, v) => rows.push(demo[v] ? row(demo[v], key) : Array(DEMO_ROWS).fill('.').join(' ')));
  }
  const song = {
    tempo: 6,
    loop: null,
    echo: { mvol: 100, evol: 30, efb: 48, edl: 5, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
    instruments: Object.fromEntries(keys.map((k) => [k, table[k]])),
  };
  voices.forEach((rows, v) => {
    song[`v${v + 1}`] = { rows: rows.join(' | ') };
  });
  return song;
}

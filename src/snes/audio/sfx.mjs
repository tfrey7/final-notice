// Sound effects under their NES names, on samples: the bank's effect sounds (punch, hit, whoosh, wax
// crack, stamp, alarm bell, typewriter click, paper flutter) and one synthesised voice line per boss,
// in the manner of Sunset Riders' taunts. No recordings: the voices are a pulse through three
// formant resonators, sung phoneme by phoneme.
//
// An effect is { layers: [...] }, at most two: the first takes voice 8 (or 7 when 8 is already an
// effect's), the second the other, and both go back to the music when their steps run out.
//   delay: frames of silence before the layer's first step (the voice is already taken)
//   steps: [inst, midi, frames, to] — `to` bends the pitch there on the Kirby-era curve;
//          inst null is a rest

import { DSP_HZ, makeSample } from './spc.mjs';
import { noise, hit, lowpass, highpass, gate, BUDGET_BYTES, bankBytes, sampleBytes } from './bank.mjs';
import { registerTuning } from '../../tune.mjs';

const TAU = 2 * Math.PI;
const decay = (t, k) => Math.exp(-t * k);
const drive = (k) => (wave) => wave.map((x) => Math.tanh(k * x));
const norm = (wave) => {
  let max = 0;
  for (const x of wave) max = Math.max(max, Math.abs(x));
  return wave.map((x) => x / (max || 1));
};

// Two-pole resonators, one per formant, retuned each sample as the mouth moves.
function resonator() {
  let y1 = 0;
  let y2 = 0;
  return (x, hz, bw, rate) => {
    const r = Math.exp((-Math.PI * bw) / rate);
    const y = (1 - r) * x + 2 * r * Math.cos((TAU * hz) / rate) * y1 - r * r * y2;
    y2 = y1;
    y1 = y;
    return y;
  };
}

const FORMANTS = {
  aa: [730, 1090, 2440], ae: [660, 1720, 2410], eh: [530, 1840, 2480], ih: [390, 1990, 2550],
  iy: [270, 2290, 3010], uw: [300, 870, 2240], uh: [440, 1020, 2240], ow: [570, 840, 2410],
  er: [490, 1350, 1690], l: [360, 1100, 2700], n: [280, 1500, 2600], v: [300, 1100, 2300],
};

// A line is [phoneme, ms, f0, kind]: kind 's' or 'f' is hiss, 'burst' a stop's click, '_' silence.
function speak({ rate = 8000, line, drive: k = 2, seed }) {
  const n = noise(seed);
  const res = [resonator(), resonator(), resonator()];
  const total = line.reduce((s, [, ms]) => s + ms, 0) / 1000;
  const cur = [500, 1500, 2500];
  let phase = 0;
  let hiss = 0;
  let at = 0;
  let idx = 0;
  let f0 = line[0][2] || 100;
  let amp = 0;
  return hit({
    rate, seconds: total,
    fn: (t) => {
      while (idx < line.length - 1 && t >= at + line[idx][1] / 1000) at += line[idx++][1] / 1000;
      const [ph, ms, pitch, kind] = line[idx];
      const next = line[idx + 1];
      const into = Math.min(1, (t - at) / (ms / 1000));
      const target = FORMANTS[ph] ?? cur;
      for (let j = 0; j < 3; j++) cur[j] += 0.004 * (target[j] - cur[j]) * (8000 / rate);
      if (pitch) f0 = pitch + ((next?.[2] || pitch) - pitch) * into;
      const voiced = FORMANTS[ph] && ph !== '_' ? 1 : 0;
      amp += 0.01 * ((voiced ? (ph === 'n' || ph === 'l' || ph === 'v' ? 0.5 : 1) : 0) - amp);
      phase = (phase + f0 / rate) % 1;
      const pulse = (1 - 2 * phase) * amp + 0.06 * n() * amp;
      let s = res[0](pulse, cur[0], 80, rate) + 0.6 * res[1](pulse, cur[1], 110, rate) + 0.3 * res[2](pulse, cur[2], 160, rate);
      const w = n();
      if (kind === 's' || kind === 'f') s += (kind === 's' ? 0.5 : 0.2) * (w - hiss) * Math.sin(Math.PI * into);
      if (kind === 'burst') s += 0.6 * w * decay(t - at, 120);
      hiss = w;
      return s * Math.min(1, (total - t) * 30);
    },
    post: (wave) => drive(k)(norm(lowpass(0.7)(wave))),
  });
}

export const FX_SAMPLES = {
  punch: (() => {
    const n = noise(101);
    let p = 0;
    return hit({
      rate: 16000, seconds: 0.14,
      fn: (t) => {
        p += (TAU * (55 + 70 * decay(t, 40))) / 16000;
        return Math.sin(p) * decay(t, 22) + 0.8 * n() * decay(t, 90);
      },
      post: lowpass(0.5),
    });
  })(),
  hit: (() => {
    const n = noise(103);
    let p = 0;
    return hit({
      rate: 16000, seconds: 0.24,
      fn: (t) => {
        p += (TAU * (40 + 90 * decay(t, 25))) / 16000;
        return Math.sin(p) * decay(t, 12) + n() * decay(t, 28);
      },
      post: (w) => drive(2.5)(norm(lowpass(0.45)(w))),
    });
  })(),
  whoosh: (() => {
    const n = noise(107);
    let lo = 0;
    let band = 0;
    return hit({
      rate: 12000, seconds: 0.28,
      fn: (t) => {
        const env = Math.sin((Math.PI * t) / 0.28) ** 2;
        band += (0.05 + 0.35 * env) * (n() - band);
        lo += 0.02 * (band - lo);
        return (band - lo) * env;
      },
    });
  })(),
  waxCrack: (() => {
    const n = noise(109);
    const pop = noise(113);
    let snap = 0;
    return hit({
      rate: 16000, seconds: 0.3,
      fn: (t) => {
        if ((pop() + 1) / 2 < 0.02 * decay(t, 8)) snap = 1;
        snap *= 0.93;
        return snap * n() + 0.7 * Math.sin(TAU * 70 * t) * decay(t, 30);
      },
      post: highpass(0.9),
    });
  })(),
  stamp: (() => {
    const n = noise(127);
    let p = 0;
    return hit({
      rate: 16000, seconds: 0.25,
      fn: (t) => {
        p += (TAU * (60 + 100 * decay(t, 30))) / 16000;
        return (Math.sin(p) * decay(t, 14) + 1.2 * n() * decay(t, 160) + 0.35 * n() * decay(t, 20)) * gate(t, 0.2, 0.03);
      },
      post: lowpass(0.6),
    });
  })(),
  // A desk phone's bell: 1000 Hz and its clangy partials, struck twenty times a second.
  ring: (() => {
    const len = 1600;
    const wave = Array.from({ length: len }, (_, i) => {
      const p = (TAU * i) / len;
      const strike = decay(((i * 20) % len) / len / 20, 60);
      return 16000 * strike * (Math.sin(50 * p) + 0.5 * Math.sin(119 * p) + 0.3 * Math.sin(138 * p));
    });
    return { ...makeSample(wave, 0), rootHz: (DSP_HZ * 50) / len };
  })(),
  click: (() => {
    const n = noise(131);
    return hit({ rate: DSP_HZ, seconds: 0.05, fn: (t) => n() * decay(t, 250) + Math.sin(TAU * 2500 * t) * decay(t, 120), post: highpass(0.7) });
  })(),
  paper: (() => {
    const n = noise(137);
    return hit({
      rate: 12000, seconds: 0.28,
      fn: (t) => n() * (0.5 + 0.5 * Math.sin(TAU * 28 * t)) ** 3 * Math.sin((Math.PI * t) / 0.28),
      post: highpass(0.5),
    });
  })(),
  // The menu's paperwork: a pencil ticking a ledger row, and a sheet slid back across the desk.
  pencil: (() => {
    const n = noise(157);
    return hit({
      rate: 16000, seconds: 0.07,
      fn: (t) => n() * decay(t, 70) * (0.55 + 0.45 * Math.sin(TAU * 210 * t)) + 0.5 * Math.sin(TAU * 1900 * t) * decay(t, 260),
      post: highpass(0.6),
    });
  })(),
  paperSlide: (() => {
    const n = noise(163);
    const grain = noise(167);
    let band = 0;
    let lo = 0;
    let rub = 1;
    return hit({
      rate: 12000, seconds: 0.4,
      fn: (t) => {
        const env = Math.min(1, t / 0.05) * Math.min(1, (0.4 - t) / 0.16);
        if ((grain() + 1) / 2 < 0.004) rub = 0.4;
        rub += 0.01 * (1 - rub);
        band += (0.12 + 0.3 * env) * (n() - band);
        lo += 0.03 * (band - lo);
        return (band - lo) * env * rub;
      },
    });
  })(),
  // The brawl's bone and furniture crunch: bit-crushed noise bursts over a dropping thump, at 8 kHz.
  crunch: (() => {
    const n = noise(173);
    const pop = noise(179);
    let p = 0;
    let held = 0;
    return hit({
      rate: 8000, seconds: 0.18,
      fn: (t, i) => {
        p += (TAU * (45 + 120 * decay(t, 30))) / 8000;
        if (i % 3 === 0) held = n();
        const grit = (pop() + 1) / 2 < 0.25 ? held * 1.6 : held * 0.5;
        return 0.9 * Math.sin(p) * decay(t, 16) + grit * decay(t, 18);
      },
      post: (w) => drive(3)(norm(w)).map((x) => Math.round(x * 6) / 6),
    });
  })(),
  // Metal struck: an inharmonic cluster looping every 256 samples, after a noisy strike.
  clang: (() => {
    const n = noise(181);
    const attack = 800;
    const partials = [[13, 1], [29, 0.6], [37, 0.45], [53, 0.3], [71, 0.2]];
    const wave = Array.from({ length: attack + 256 }, (_, i) => {
      const strike = i < attack ? (1 - i / attack) ** 2 : 0;
      const ring = partials.reduce((s, [k, a]) => s + a * Math.sin((TAU * k * i) / 256), 0);
      return 9000 * ring * (1 + 0.8 * strike) + 8000 * n() * strike ** 3;
    });
    return { ...makeSample(wave, attack), rootHz: (DSP_HZ * 13) / 256 };
  })(),
  // The hold music's phone-line voice: a narrow pulse with its fundamental thinned and its top cut,
  // stepped to 32 levels.
  phone: (() => {
    const len = 64;
    const wave = Array.from({ length: len }, (_, i) => {
      let s = 0;
      for (let k = 1; k <= 7; k++) s += ((k === 1 ? 0.4 : 1) * Math.sin(Math.PI * k * 0.3) * Math.cos((TAU * k * i) / len)) / k;
      return Math.round(s * 16) * 1000;
    });
    return { ...makeSample(wave, 0), rootHz: DSP_HZ / len };
  })(),

  // Deputy Director Vellum, low and pleased with himself: "You're overdue."
  vellumLine: speak({
    seed: 139,
    line: [['iy', 50, 118], ['uw', 90, 122], ['er', 90, 115], ['_', 70, 0], ['ow', 120, 128], ['v', 50, 116, 'f'], ['er', 90, 108], ['_', 20, 0, 'burst'], ['uw', 280, 102], ['uw', 60, 78]],
  }),
  // The Records Custodian, clipped and officious: "File denied!"
  custodianLine: speak({
    seed: 149, drive: 3,
    line: [['_', 90, 0, 'f'], ['aa', 100, 170], ['iy', 60, 180], ['l', 80, 160], ['_', 40, 0], ['_', 20, 0, 'burst'], ['ih', 60, 175], ['n', 60, 170], ['aa', 110, 205], ['iy', 90, 185], ['_', 40, 0, 'burst']],
  }),
  // The Great Seal, slow as a press coming down: "Sealed."
  sealLine: speak({
    seed: 151, drive: 1.6,
    line: [['_', 150, 0, 's'], ['iy', 280, 82], ['l', 150, 76], ['_', 30, 0, 'burst'], ['uh', 140, 64]],
  }),
};

const I = {
  punch: { sample: 'punch', adsr: [15, 7, 7, 0], vol: 127 },
  hit: { sample: 'hit', adsr: [15, 7, 7, 0], vol: 120 },
  kick: { sample: 'rec-gkick', adsr: [15, 7, 7, 0], vol: 110 },
  whoosh: { sample: 'whoosh', adsr: [15, 7, 7, 0], vol: 110 },
  wax: { sample: 'waxCrack', adsr: [15, 7, 7, 0], vol: 120, echo: true },
  stamp: { sample: 'stamp', adsr: [15, 7, 7, 0], vol: 127, echo: true },
  orch: { sample: 'rec-orch', adsr: [15, 7, 7, 0], vol: 120, echo: true },
  ring: { sample: 'ring', adsr: [15, 7, 7, 0], vol: 70, pan: 20 },
  click: { sample: 'click', adsr: [15, 7, 7, 0], vol: 100 },
  paper: { sample: 'paper', adsr: [15, 7, 7, 0], vol: 110, pan: -20 },
  pencil: { sample: 'pencil', adsr: [15, 7, 7, 0], vol: 96, pan: 12 },
  slide: { sample: 'paperSlide', adsr: [15, 7, 7, 0], vol: 120, pan: -12 },
  lead: { sample: 'rec-sqlead', adsr: [15, 7, 7, 0], vol: 60, echo: true },
  leadEcho: { sample: 'rec-sqlead', adsr: [15, 7, 7, 0], vol: 28, pan: 40, echo: true },
  bell: { sample: 'rec-bell', adsr: [15, 5, 3, 16], vol: 100, echo: true },
  bellEcho: { sample: 'rec-bell', adsr: [15, 5, 3, 16], vol: 44, pan: -40, echo: true },
  keys: { sample: 'rec-epiano', adsr: [15, 5, 3, 16], vol: 90, echo: true },
  brass: { sample: 'rec-brass', adsr: [15, 3, 5, 12], vol: 90, echo: true },
  sax: { sample: 'rec-sax', adsr: [15, 4, 5, 10], vol: 90, echo: true },
  bass: { sample: 'rec-synbass', adsr: [15, 4, 3, 14], vol: 120 },
  voice: { sample: null, adsr: [15, 7, 7, 0], vol: 127, echo: true },
  crunch: { sample: 'crunch', adsr: [15, 7, 7, 0], vol: 120 },
  clang: { sample: 'clang', adsr: [15, 4, 2, 20], vol: 96, echo: true },
};

const fx = (...layers) => ({ layers });
const layer = (steps, delay = 0) => ({ steps, delay });
const echoOf = (steps, inst) => steps.map(([i, ...rest]) => [i && inst, ...rest]);
const run = (inst, list) => list.map(([midi, frames, to]) => [inst, midi, frames, to]);
const voiceFrames = (key) => Math.ceil((FX_SAMPLES[key].pcm.length / (DSP_HZ / (FX_SAMPLES[key].rootHz / 261.6256))) * 60);
const line = (key, midi = 60) => fx(layer([[{ ...I.voice, sample: key }, midi, Math.ceil(voiceFrames(key) * 2 ** ((60 - midi) / 12)) + 2]]));

const jump = run(I.lead, [[60, 14, 86]]);
const zap = [...run(I.bell, [[96, 2], [91, 2]]), [I.lead, 91, 8, 72]];
const tape = Array.from({ length: 11 }, (_, i) => [I.lead, 70 - i * 1.2 + (i % 2 ? 4 : 0), 2]);
const chime = run(I.bell, [[100, 1], [88, 3], [95, 20]]);
const arp = run(I.bell, [[65, 3], [69, 3], [72, 3], [76, 3], [79, 3], [84, 16]]);
const holdChime = run(I.keys, [[89, 3], [93, 3], [96, 3], [100, 14]]);
const ring = [[I.ring, 86, 20], [null, 0, 8], [I.ring, 86, 20]];

export const SFX = {
  punch: fx(layer(run(I.punch, [[60, 9]]))),
  hit: fx(layer(run(I.hit, [[60, 15]])), layer(run(I.bass, [[50, 10, 30]]))),
  knockdown: fx(layer(run(I.hit, [[53, 20]])), layer(run(I.kick, [[55, 14]]), 16)),
  jump: fx(layer(jump), layer(echoOf(jump, I.leadEcho), 4)),
  land: fx(layer(run(I.kick, [[64, 8]])), layer(run(I.click, [[48, 3]]))),
  grab: fx(layer(run(I.keys, [[67, 2], [74, 2], [79, 8]])), layer(run(I.click, [[55, 3]]))),
  throw: fx(layer(run(I.whoosh, [[60, 17]])), layer(run(I.leadEcho, [[70, 10, 84]]))),
  step: fx(layer(run(I.click, [[43, 3]]))),
  injunction: fx(
    layer([...run(I.orch, [[65, 26]]), ...run(I.stamp, [[48, 20]])]),
    layer([...run(I.brass, [[65, 4], [72, 4], [77, 18]]), [I.brass, 77, 20, 41]]),
  ),
  cast: fx(layer(zap), layer(echoOf(zap, I.leadEcho), 5)),
  carbonCopy: fx(
    layer([...run(I.paper, [[67, 8]]), [null, 0, 2], ...run(I.paper, [[70, 8]]), [null, 0, 2], ...run(I.paper, [[74, 12]])]),
    layer(Array.from({ length: 16 }, (_, i) => [I.leadEcho, i % 2 ? 93 : 98, 1])),
  ),
  redTape: fx(layer(tape), layer(run(I.paper, [[55, 17]]))),
  margin: fx(layer([[I.sax, 60, 9, 75], ...run(I.sax, [[82, 2], [77, 2], [82, 2], [77, 2], [72, 5]])]), layer(run(I.hit, [[64, 14]]), 9)),
  waxBreak: fx(layer(run(I.wax, [[60, 20]])), layer(run(I.bell, [[98, 2], [93, 2], [89, 2], [86, 2], [81, 10]]))),
  pickup: fx(layer(chime), layer(echoOf(chime, I.bellEcho), 4)),
  heal: fx(layer(arp), layer(echoOf(arp, I.bellEcho), 5)),
  blip: fx(layer(run(I.click, [[72, 3]]))),
  menu: fx(layer(run(I.bell, [[88, 2], [95, 6]]))),
  pause: fx(layer(holdChime), layer(echoOf(holdChime, I.bellEcho), 6)),
  alarm: fx(layer(ring), layer(ring.map(([i, m, f]) => [i && { ...I.ring, vol: 40, pan: -30 }, m - 3, f]))),
  stamp: fx(layer(run(I.stamp, [[60, 15]])), layer([[I.bass, 52, 10, 33]])),
  // Scene 3's break room: the tubes' buzz under five seconds of silence, the desk phone, one bass note.
  buzz: fx(layer([[{ ...I.lead, vol: 14 }, 30, 28], [null, 0, 2], [{ ...I.lead, vol: 14 }, 30, 26]]), layer([[{ ...I.lead, vol: 8, pan: -30 }, 49, 56]])),
  phone: fx(layer(ring.map(([i, m, f]) => [i && { ...I.ring, vol: 50 }, m + 5, f]))),
  bassNote: fx(layer(run(I.bass, [[34, 50]]))),
  // Menus: the cursor, confirm and cancel.
  pencil: fx(layer(run(I.pencil, [[60, 5]]))),
  stampOk: fx(layer(run(I.stamp, [[65, 12]])), layer(run(I.click, [[50, 3]]))),
  paperSlide: fx(layer(run(I.slide, [[60, 26]]))),
  // The title logo landing: one low brass stab over a bass note.
  brassHit: fx(layer([[{ ...I.brass, vol: 127 }, 46, 34]]), layer([[I.bass, 34, 30]])),
  relay: fx(layer(run(I.click, [[36, 3]])), layer(run(I.kick, [[43, 6]]), 1)),
  conveyor: fx(layer(run(I.click, [[40, 3], [0, 3], [40, 3], [0, 3]]).map((s, i) => (i % 2 ? [null, 0, 3] : s))), layer(run(I.bass, [[36, 4], [36, 4], [37, 4]]))),
  vellumLine: line('vellumLine'),
  custodianLine: line('custodianLine'),
  sealLine: line('sealLine', 57),

  // The brawl, in the Streets of Rage 2 manner: a light hit snaps, a heavy one crunches, a finisher
  // lands an orchestra hit on the crunch.
  swing: fx(layer([[{ ...I.whoosh, vol: 84 }, 67, 10, 74]])),
  hitLight: fx(layer(run(I.punch, [[62, 8]])), layer(run({ ...I.click, vol: 80 }, [[48, 3]]))),
  hitHeavy: fx(layer(run(I.hit, [[57, 16]])), layer(run(I.crunch, [[52, 12]]))),
  finisher: fx(layer(run(I.crunch, [[46, 22]])), layer(run({ ...I.orch, vol: 110 }, [[53, 24]]), 1)),
  thud: fx(layer(run({ ...I.kick, vol: 127 }, [[45, 14]])), layer(run(I.hit, [[41, 18]]))),
  hurt: fx(layer(run(I.hit, [[52, 14]])), layer([[{ ...I.bass, vol: 100 }, 55, 12, 40]])),
  ko: fx(layer(run(I.crunch, [[43, 20]])), layer([[I.bass, 48, 30, 24]], 2)),
  block: fx(layer(run({ ...I.clang, vol: 64 }, [[60, 6]])), layer(run(I.punch, [[70, 5]]))),
  guardSmash: fx(layer(run(I.hit, [[50, 18]])), layer([[null, 0, 2], ...run(I.crunch, [[60, 12]])])),
  objection: fx(layer(run({ ...I.clang, vol: 120 }, [[72, 40]])), layer([...run(I.stamp, [[55, 15]]), [I.bass, 43, 12, 31]])),
  roomClear: fx(layer([...run(I.crunch, [[45, 6]]), ...run({ ...I.orch, vol: 127 }, [[57, 30]])]), layer([...run(I.brass, [[65, 4], [70, 4]]), [{ ...I.brass, vol: 110 }, 77, 26, 74]])),
  telegraph: fx(layer([[I.bell, 96, 2], [null, 0, 3], [I.bell, 96, 6]])),
  staplerHit: fx(layer(run({ ...I.clang, vol: 80 }, [[79, 8]])), layer(run(I.punch, [[67, 6]]))),
  binderHit: fx(layer(run(I.paper, [[72, 6]])), layer(run(I.punch, [[58, 8]]))),
  stampHit: fx(layer(run(I.stamp, [[62, 12]])), layer(run(I.punch, [[60, 6]]))),
  deskSmash: fx(layer([...run(I.kick, [[52, 6]]), ...run(I.crunch, [[46, 16]])]), layer(run(I.paper, [[58, 14]]), 3)),
  cabinetSmash: fx(layer([...run(I.crunch, [[52, 8]]), ...run({ ...I.clang, vol: 110 }, [[48, 26]])]), layer(run(I.hit, [[55, 14]]))),
  weaponPickup: fx(layer(run(I.click, [[60, 3]])), layer(run(I.bell, [[91, 2], [98, 8]]))),
};

// The brawl's effects, each with a volume the ?tune panel can move.
export const BRAWL_SFX = ['swing', 'hitLight', 'hitHeavy', 'finisher', 'thud', 'hurt', 'ko', 'block', 'guardSmash', 'objection',
  'roomClear', 'telegraph', 'staplerHit', 'binderHit', 'stampHit', 'deskSmash', 'cabinetSmash', 'weaponPickup', 'throw'];
export const SFX_VOLUME = registerTuning('snes-sfx-volume', Object.fromEntries(BRAWL_SFX.map((name) => [name, 1])),
  Object.fromEntries(BRAWL_SFX.map((name) => [name, [0, 2, 0.05]])));

export const atVolume = (def, k = 1) => (k === 1 ? def : {
  layers: def.layers.map((l) => ({ ...l, steps: l.steps.map(([inst, ...rest]) => [inst && { ...inst, vol: Math.min(127, Math.round(inst.vol * k)) }, ...rest]) })),
});

export const soundBytes = () => bankBytes() + Object.values(FX_SAMPLES).reduce((sum, s) => sum + sampleBytes(s), 0);
export { BUDGET_BYTES };

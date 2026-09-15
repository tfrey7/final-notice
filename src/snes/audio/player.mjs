/*
 * The SNES music and effect player: the NES tracker rows, widened to eight voices, played through
 * the S-DSP in spc.mjs. Same calls as src/audio/player.mjs: playSong, stopSong, sfx, hasSong,
 * unlocked, currentSong, channelStatus.
 *
 * SONG FORMAT. src/snes/audio/songs/<name>.mjs default-exports:
 *
 *   export default {
 *     tempo: 6, loop: 0,
 *     echo: { evol: 45, efb: 70, edl: 6, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
 *     instruments: {
 *       lead: { sample: 'saw', adsr: [14, 3, 5, 10], vol: 90, pan: -20, echo: true },
 *       hat:  { noise: 30, gain: { mode: 'direct', value: 60 } },   // noise at rate 30
 *       bell: { sample: 'saw', adsr: [15, 5, 2, 14], pmod: true },  // bent by the voice before
 *     },
 *     v1: { inst: 'lead', rows: 'C5 - Eb5 - . | ...' }, ... v8,
 *   };
 *
 * Rows read exactly as the NES player's: a note, '-' holds, '.' is silence (a key-off), '|' marks a
 * bar, <note>:<inst> is the instrument column. vol is 0-127, pan -127 (left) to 127 (right).
 */

import { noteToMidi, midiToHz } from '../../audio/apu.mjs';
import { DSP_HZ, VOICES, brrDecode, createDsp, makeSample } from './spc.mjs';
import { SAMPLES as BANK, INSTRUMENTS as INSTRUMENTS_V1, demoSong } from './bank.mjs';
import { SAMPLES as RECORDED, INSTRUMENTS } from './recorded.mjs';
import { SFX, FX_SAMPLES, SFX_VOLUME, atVolume } from './sfx.mjs';
import { unpack } from './recorded.mjs';
import BARKS from './barks-brr.mjs';

export { INSTRUMENTS, INSTRUMENTS_V1, SFX };

export const VOICE_NAMES = Array.from({ length: VOICES }, (_, i) => `v${i + 1}`);
const FRAME_HZ = 60;

// The bank, plus the synth card's test samples: a saw loop, a soft square loop and a kick.
export const SAMPLES = (() => {
  const cycle = (n, fn) => Array.from({ length: n }, (_, i) => fn(i / n));
  const saw = cycle(64, (p) => {
    let s = 0;
    for (let k = 1; k <= 12; k++) s += Math.sin(2 * Math.PI * k * p) / k;
    return 9000 * s;
  });
  const square = cycle(32, (p) => 11000 * (Math.sin(2 * Math.PI * p) + Math.sin(6 * Math.PI * p) / 3 + Math.sin(10 * Math.PI * p) / 5));
  let phase = 0;
  const kick = Array.from({ length: 6400 }, (_, i) => {
    const t = i / DSP_HZ;
    phase += (2 * Math.PI * (45 + 130 * Math.exp(-t * 30))) / DSP_HZ;
    return 26000 * Math.sin(phase) * Math.exp(-t * 9) * Math.min(1, (6400 - i) / 400);
  });
  return {
    ...BANK,
    ...RECORDED,
    ...FX_SAMPLES,
    saw: { ...makeSample(saw, 0), rootHz: DSP_HZ / 64 },
    square: { ...makeSample(square, 0), rootHz: DSP_HZ / 32 },
    kick: { ...makeSample(kick), rootHz: midiToHz(60) },
    ...Object.fromEntries(Object.entries(BARKS).map(([id, b]) => {
      const brr = { blocks: unpack(b.brr), loop: null };
      return [`bark:${id}`, { brr, pcm: brrDecode(brr), loop: null, rootHz: b.rootHz }];
    })),
  };
})();

// The partners' brawl lines play on voice 6, so a punch or a hit taking voices 7 and 8 never cuts one off.
export const BARK_VOICE = 5;
export const barkFrames = (id) => BARKS[id]?.frames ?? 0;
export const barkEffect = (id) => ({
  voice: BARK_VOICE,
  layers: [{ delay: 0, steps: [[{ sample: `bark:${id}`, adsr: [15, 7, 7, 0], vol: 127, echo: true }, BARKS[id].midi, BARKS[id].frames]] }],
});

// A note's expression marks, each after a '/': v[delay] delayed vibrato, p[frames] portamento from
// the voice's last note, b<+-semitones> a bend across the note, @<vol>[><vol>] its volume, ramped.
function parseMark(voice, row, mark, note) {
  let m;
  if ((m = /^v(\d*)$/.exec(mark))) note.vibrato = m[1] === '' ? true : Number(m[1]);
  else if ((m = /^p(\d*)$/.exec(mark))) note.glide = m[1] === '' ? true : Number(m[1]);
  else if ((m = /^b([+-]\d+(?:\.\d+)?)$/.exec(mark))) note.bend = Number(m[1]);
  else if ((m = /^@(\d+)(?:>(\d+))?$/.exec(mark))) [note.vol, note.volTo] = [Number(m[1]), m[2] === undefined ? undefined : Number(m[2])];
  else throw new Error(`${voice} row ${row}: cannot read mark "/${mark}"`);
}

export function parseRows(voice, text, defaultInst) {
  const tokens = String(text ?? '').split(/\s+/).filter((t) => t && t !== '|');
  let current = null;
  let last = null;
  return tokens.map((token, row) => {
    if (token === '-') {
      if (current) current.len += 1;
      return current;
    }
    if (token === '.') return (current = null);
    const [head, ...marks] = token.split('/');
    const [name, inst = defaultInst] = head.split(':');
    const pitch = noteToMidi(name);
    if (pitch === null) throw new Error(`${voice} row ${row}: cannot read "${token}"`);
    current = { start: row, pitch, inst, len: 1 };
    for (const mark of marks) parseMark(voice, row, mark, current);
    if (current.glide !== undefined) current.from = last ?? pitch;
    last = pitch;
    return current;
  });
}

// Echo presets a song picks with echo.room; its own evol, efb, edl or fir still win. Feedback stays
// at or under $60 and each FIR sums to 128, so no room runs away (docs/research/snes-composition.md §3).
export const ROOMS = {
  room: { evol: 30, efb: 48, edl: 3, fir: [127, 0, 0, 0, 0, 0, 0, 0] },
  studio: { evol: 45, efb: 70, edl: 6, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  hall: { evol: 42, efb: 84, edl: 9, fir: [0, 24, 40, 40, 24, 0, 0, 0] },
  cathedral: { evol: 46, efb: 96, edl: 13, fir: [8, 20, 28, 32, 24, 12, 4, 0] },
  // Stone close by: a quick first reflection, a tail that dies in about a second, and a wide
  // low-pass that darkens each repeat so the organ and choir never pile up into a wash.
  chapel: { evol: 40, efb: 70, edl: 7, fir: [2, 8, 18, 30, 32, 22, 12, 4] },
  cave: { evol: 38, efb: 92, edl: 15, fir: [64, 32, 16, 8, 4, 2, 1, 1] },
};

function resolveEcho({ room, ...echo } = {}) {
  if (room === undefined) return echo;
  if (!ROOMS[room]) throw new Error(`no room "${room}"`);
  return { ...ROOMS[room], ...echo };
}

// drops: [{ from, to, voices: ['v6', ...] }] silences those voices on rows from..to-1, so a layer
// leaves at a section boundary and comes back at the next.
function dropMask(drops = [], length) {
  const mask = VOICE_NAMES.map(() => new Uint8Array(length));
  for (const { from, to = length, voices } of drops) {
    for (const v of voices) {
      const i = VOICE_NAMES.indexOf(v);
      if (i < 0) throw new Error(`drop names no voice "${v}"`);
      mask[i].fill(1, Math.max(0, from), Math.min(length, to));
    }
  }
  return mask;
}

export function compileSong(def) {
  const voices = VOICE_NAMES.map((v) => (def[v] ? parseRows(v, def[v].rows, def[v].inst) : []));
  const length = Math.max(1, ...voices.map((r) => r.length));
  voices.forEach((rows, i) => {
    while (rows.length < length) rows.push(null);
    for (const n of rows) if (n && !def.instruments?.[n.inst]) throw new Error(`${VOICE_NAMES[i]}: no instrument "${n.inst}"`);
  });
  const loop = def.loop ?? null;
  if (loop !== null && (loop < 0 || loop >= length)) throw new Error(`loop row ${loop} is outside the song`);
  // A part's own pan, vol or echo send outranks its instrument's.
  const parts = VOICE_NAMES.map((v) => {
    const { pan, vol, echo } = def[v] ?? {};
    return Object.fromEntries(Object.entries({ pan, vol, echo }).filter(([, x]) => x !== undefined));
  });
  return {
    tempo: def.tempo ?? 6, loop, length, voices, parts, dropped: dropMask(def.drops, length),
    instruments: def.instruments ?? {}, echo: resolveEcho(def.echo),
  };
}

const VIBRATO = { delay: 12, period: 10, depth: 0.3 };

// A note's pitch in semitones and its volume on frame f: the instrument's pitch list, then the note's marks.
export function expression(note, inst, f, tempo) {
  let midi = note.pitch;
  if (inst.pitch) midi += inst.pitch[Math.min(f, inst.pitch.length - 1)];
  if (note.glide !== undefined) {
    const frames = note.glide === true ? inst.glide ?? 6 : note.glide;
    if (f < frames) midi += (note.from - note.pitch) * (1 - f / frames);
  }
  if (note.bend !== undefined) midi += note.bend * Math.min(1, f / Math.max(1, note.len * tempo - 1));
  if (note.vibrato !== undefined) {
    const vib = { ...VIBRATO, ...inst.vibrato };
    const delay = note.vibrato === true ? vib.delay : note.vibrato;
    const t = f - delay;
    if (t > 0) midi += vib.depth * Math.min(1, t / vib.period) * Math.sin((2 * Math.PI * t) / vib.period);
  }
  let vol = note.vol;
  if (note.volTo !== undefined) vol += (note.volTo - note.vol) * Math.min(1, f / Math.max(1, note.len * tempo - 1));
  return { midi, vol };
}

const moves = (note, inst) => !!inst.pitch || note.glide !== undefined || note.bend !== undefined || note.vibrato !== undefined;

// An instrument as the DSP keys it, and the 16-bit pitch that sounds a MIDI note on it.
export function dspInstrument(inst) {
  const vol = inst.vol ?? 100;
  const pan = Math.max(-127, Math.min(127, inst.pan ?? 0));
  return {
    sample: inst.sample ? SAMPLES[inst.sample] : null,
    adsr: inst.adsr, gain: inst.gain, echo: inst.echo, pmod: inst.pmod,
    noise: inst.noise !== undefined, noiseRate: inst.noise,
    volL: Math.round((vol * (127 - Math.max(0, pan))) / 127),
    volR: Math.round((vol * (127 + Math.min(0, pan))) / 127),
  };
}

export function notePitch(inst, midi) {
  const rootHz = inst.sample ? SAMPLES[inst.sample].rootHz : midiToHz(60);
  return Math.max(0, Math.min(0x7fff, Math.round((0x1000 * midiToHz(midi)) / rootHz)));
}

// An effect takes voice 8, or 7 when 8 is already an effect's, and gives it back when done.
export function stealVoice(owners) {
  if (!owners[7]) return 7;
  if (!owners[6]) return 6;
  return 7;
}

// A step's pitch on frame f of n: straight, or bent toward `to` fast at first and settling.
const bendAt = (midi, to, f, n) => (to === undefined ? midi : to + (midi - to) * Math.exp((-4 * f) / Math.max(1, n - 1)));

export const DUCK_FRAMES = 12;

// The frame clock: song rows and effect steps key the DSP on 60 Hz frames, and render() fills samples between.
export function createSequencer(dsp = createDsp()) {
  let song = null;
  let pos = 0;
  let pass = 0;
  let carry = 0;
  const keyed = new Array(VOICES).fill(null);
  const owners = new Array(VOICES).fill(null);
  let solo = null;
  // Hold music: `held` is the song it replaced, `ramp` a master-volume fade over DUCK_FRAMES.
  let held = null;
  let ramp = null;
  const fade = (to, then, back) => { ramp = { from: dsp.reg.mvol, to, f: 0, then, back }; };

  // Only these song voices sound (a set of indices), or every voice when null.
  function setSolo(voices) {
    solo = voices ? new Set(voices) : null;
  }

  function start(compiled) {
    song = compiled;
    pos = 0;
    pass = 0;
    solo = null;
    dsp.setEcho(compiled.echo);
    for (let i = 0; i < VOICES; i++) if (!owners[i]) release(i);
  }

  function play(compiled) {
    if (held || ramp) dsp.reg.mvol = held?.mvol ?? ramp.back ?? ramp.to;
    held = null;
    ramp = null;
    start(compiled);
  }

  // The song fades out, `compiled` fades in over it; endHold brings the song back at the row it left.
  function hold(compiled) {
    if (held || (ramp && ramp.to === 0)) return;
    const mvol = ramp?.to ?? dsp.reg.mvol;
    fade(0, () => {
      held = { song, pos, pass, mvol };
      start(compiled);
      const level = dsp.reg.mvol;
      dsp.reg.mvol = 0;
      fade(level);
    }, mvol);
  }

  function endHold() {
    if (!held) {
      if (ramp?.to === 0) fade(ramp.back);
      return;
    }
    ({ song, pos, pass } = held);
    const { mvol } = held;
    held = null;
    for (let i = 0; i < VOICES; i++) if (!owners[i]) release(i);
    if (song) dsp.setEcho(song.echo);
    dsp.reg.mvol = 0;
    fade(mvol);
  }

  function release(i) {
    dsp.keyOff(i);
    keyed[i] = null;
  }

  function stop() {
    song = null;
    for (let i = 0; i < VOICES; i++) if (!owners[i]) release(i);
  }

  // Each layer takes its voice at once, silencing the song there, and plays its first step after its delay.
  function sfx(def) {
    const first = def.voice ?? stealVoice(owners);
    return def.layers.slice(0, def.voice === undefined ? 2 : 1).map((layer, k) => {
      const i = k === 0 ? first : 13 - first;
      const steps = Array(layer.delay ?? 0).fill(null);
      for (const [inst, midi, frames, to] of layer.steps) {
        for (let f = 0; f < frames; f++) steps.push(inst ? { inst, midi: bendAt(midi, to, f, frames), first: f === 0, bend: to !== undefined } : null);
      }
      owners[i] = { steps, f: 0 };
      release(i);
      return i;
    });
  }

  function frame() {
    if (ramp) {
      ramp.f++;
      dsp.reg.mvol = Math.round(ramp.from + ((ramp.to - ramp.from) * ramp.f) / DUCK_FRAMES);
      if (ramp.f >= DUCK_FRAMES) {
        const { then } = ramp;
        ramp = null;
        then?.();
      }
    }
    for (let i = 0; i < VOICES; i++) {
      const own = owners[i];
      if (!own) continue;
      if (own.f >= own.steps.length) {
        owners[i] = null;
        release(i);
        continue;
      }
      const step = own.steps[own.f++];
      if (!step) dsp.keyOff(i);
      else if (step.first) dsp.keyOn(i, dspInstrument(step.inst), notePitch(step.inst, step.midi));
      else if (step.bend) dsp.setPitch(i, notePitch(step.inst, step.midi));
    }
    if (!song) return;
    if (pos >= song.length * song.tempo) {
      if (song.loop === null) return stop();
      pos = song.loop * song.tempo;
      pass++;
    }
    const row = Math.floor(pos / song.tempo);
    for (let i = 0; i < VOICES; i++) {
      if (owners[i]) continue;
      if ((solo && !solo.has(i)) || song.dropped?.[i][row]) {
        if (keyed[i]) release(i);
        continue;
      }
      const note = song.voices[i][row];
      const id = note ? `${pass}:${note.start}` : null;
      const inst = note && { ...song.instruments[note.inst], ...song.parts?.[i] };
      if (!note) {
        if (keyed[i]) release(i);
        continue;
      }
      const f = pos - note.start * song.tempo;
      const { midi, vol } = expression(note, inst, f, song.tempo);
      const keyedInst = vol === undefined ? inst : { ...inst, vol };
      if (id !== keyed[i]) {
        dsp.keyOn(i, dspInstrument(keyedInst), notePitch(inst, midi));
        keyed[i] = id;
      } else {
        if (moves(note, inst)) dsp.setPitch(i, notePitch(inst, midi));
        if (note.volTo !== undefined) {
          const { volL, volR } = dspInstrument(keyedInst);
          dsp.setVolume(i, volL, volR);
        }
      }
    }
    pos++;
  }

  function render(left, right, n) {
    let done = 0;
    while (done < n) {
      if (carry <= 0) {
        frame();
        carry += DSP_HZ / FRAME_HZ;
      }
      const chunk = Math.min(n - done, Math.ceil(carry));
      dsp.render(left, right, done, chunk);
      carry -= chunk;
      done += chunk;
    }
  }

  const playing = () => !!song;
  const owner = (i) => (owners[i] ? 'sfx' : song ? 'song' : 'idle');
  const holding = () => !!held;
  const at = () => ({ song, pos, pass });
  return { dsp, play, stop, sfx, render, playing, owner, setSolo, hold, endHold, holding, at };
}

// A whole song, rendered with no browser: what the sound test plays, sample for sample.
export function renderSong(def, seconds) {
  const seq = createSequencer();
  seq.play(compileSong(def));
  const n = Math.round(seconds * DSP_HZ);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  seq.render(left, right, n);
  return { left, right, sampleRate: DSP_HZ };
}

let ctx = null;
let seq = null;
let songName = null;
let pending = null;
const songCache = new Map();
const MASTER = 0.9;

export function unlock() {
  if (typeof window === 'undefined') return false;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    try {
      ctx = new Ctor({ sampleRate: DSP_HZ });
    } catch {
      ctx = new Ctor();
    }
    seq = createSequencer();
    // The DSP runs on the page at 32 kHz; a context at another rate gets its samples held to fit.
    const node = ctx.createScriptProcessor(2048, 0, 2);
    const ratio = DSP_HZ / ctx.sampleRate;
    let bufL = new Float32Array(0);
    let bufR = new Float32Array(0);
    let read = 0;
    node.onaudioprocess = (e) => {
      const outL = e.outputBuffer.getChannelData(0);
      const outR = e.outputBuffer.getChannelData(1);
      const need = Math.ceil(outL.length * ratio + read) + 1;
      if (bufL.length !== need) {
        bufL = new Float32Array(need);
        bufR = new Float32Array(need);
      }
      const whole = Math.floor(outL.length * ratio + read);
      seq.render(bufL, bufR, whole);
      for (let i = 0; i < outL.length; i++) {
        const j = Math.min(whole - 1, Math.floor(i * ratio + read));
        outL[i] = bufL[j];
        outR[i] = bufR[j];
      }
      read = (outL.length * ratio + read) % 1;
    };
    // A GainNode starts at 1, so it is held at 0 and opened on a render-block edge.
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const block = 128 / ctx.sampleRate;
    gain.gain.setValueAtTime(MASTER, Math.ceil((ctx.currentTime + 0.02) / block) * block);
    master = gain;
    setMono(mono);
    node.connect(gain).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  if (pending) {
    const name = pending;
    pending = null;
    playSong(name);
  }
  return true;
}

export const unlocked = () => !!ctx;

// Mono folds the two channels into one at the master gain; the destination plays it on both speakers.
let master = null;
let mono = false;
export function setMono(on) {
  mono = !!on;
  if (!master) return;
  master.channelCountMode = 'explicit';
  master.channelInterpretation = 'speakers';
  master.channelCount = mono ? 1 : 2;
}

if (typeof window !== 'undefined') {
  const gesture = () => {
    if (unlock()) {
      window.removeEventListener('pointerdown', gesture, true);
      window.removeEventListener('keydown', gesture, true);
    }
  };
  window.addEventListener('pointerdown', gesture, true);
  window.addEventListener('keydown', gesture, true);
}

async function loadSong(name) {
  if (!/^[A-Za-z0-9_-]+$/.test(name)) return null;
  if (!songCache.has(name)) {
    songCache.set(name, import(`./songs/${name}.mjs`).then((m) => compileSong(m.default)).catch(() => null));
  }
  return songCache.get(name);
}

export const hasSong = async (name) => !!(await loadSong(name));

export async function playSong(name) {
  if (!ctx) {
    pending = name;
    return;
  }
  const compiled = await loadSong(name);
  if (!compiled) return;
  seq.play(compiled);
  songName = name;
}

// v1 plays the synthesised first bank's instrument of that name.
export function playInstrument(key, v1 = false) {
  const table = v1 ? INSTRUMENTS_V1 : INSTRUMENTS;
  if (!seq || !table[key]) return;
  seq.play(compileSong(demoSong([key], table)));
  songName = null;
}

export function stopSong() {
  pending = null;
  songName = null;
  seq?.stop();
}

// Pause's hold music: ducks whatever is playing and loops `name` until endHold puts it back.
let holdWanted = false;
let beforeHold;

export async function holdMusic(name = 'hold') {
  holdWanted = true;
  const compiled = seq && (await loadSong(name));
  if (!compiled || !holdWanted || beforeHold !== undefined) return;
  beforeHold = songName;
  seq.hold(compiled);
  songName = name;
}

export function endHold() {
  holdWanted = false;
  if (beforeHold === undefined) return;
  seq.endHold();
  songName = beforeHold;
  beforeHold = undefined;
}

export const currentSong = () => (seq?.playing() ? songName : null);

// Drop the song to these voices (indices) without losing its place; null brings every voice back.
export function soloSong(voices) {
  seq?.setSolo(voices);
}

export function sfx(name) {
  if (SFX[name] && seq) seq.sfx(atVolume(SFX[name], SFX_VOLUME[name]));
}

export function bark(id) {
  if (BARKS[id] && seq) seq.sfx(barkEffect(id));
}

// A sound built on the fly, such as a voice line whose sample was loaded at run time.
export function sfxDef(def) {
  if (seq) seq.sfx(def);
}

export function channelStatus() {
  return VOICE_NAMES.map((channel, i) => ({
    channel,
    level: seq ? seq.dsp.voices[i].peak / 32768 : 0,
    owner: seq ? seq.owner(i) : 'idle',
  }));
}

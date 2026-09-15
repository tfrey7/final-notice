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
import { DSP_HZ, VOICES, createDsp, makeSample } from './spc.mjs';
import { SAMPLES as BANK, INSTRUMENTS, demoSong } from './bank.mjs';
import { SFX, FX_SAMPLES } from './sfx.mjs';

export { INSTRUMENTS, SFX };

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
    ...FX_SAMPLES,
    saw: { ...makeSample(saw, 0), rootHz: DSP_HZ / 64 },
    square: { ...makeSample(square, 0), rootHz: DSP_HZ / 32 },
    kick: { ...makeSample(kick), rootHz: midiToHz(60) },
  };
})();

export function parseRows(voice, text, defaultInst) {
  const tokens = String(text ?? '').split(/\s+/).filter((t) => t && t !== '|');
  let current = null;
  return tokens.map((token, row) => {
    if (token === '-') {
      if (current) current.len += 1;
      return current;
    }
    if (token === '.') return (current = null);
    const [name, inst = defaultInst] = token.split(':');
    const pitch = noteToMidi(name);
    if (pitch === null) throw new Error(`${voice} row ${row}: cannot read "${token}"`);
    return (current = { start: row, pitch, inst, len: 1 });
  });
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
  return { tempo: def.tempo ?? 6, loop, length, voices, instruments: def.instruments ?? {}, echo: def.echo ?? {} };
}

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

// The frame clock: song rows and effect steps key the DSP on 60 Hz frames, and render() fills samples between.
export function createSequencer(dsp = createDsp()) {
  let song = null;
  let pos = 0;
  let pass = 0;
  let carry = 0;
  const keyed = new Array(VOICES).fill(null);
  const owners = new Array(VOICES).fill(null);

  function play(compiled) {
    song = compiled;
    pos = 0;
    pass = 0;
    dsp.setEcho(compiled.echo);
    for (let i = 0; i < VOICES; i++) if (!owners[i]) release(i);
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
    const first = stealVoice(owners);
    return def.layers.slice(0, 2).map((layer, k) => {
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
      const note = song.voices[i][row];
      const id = note ? `${pass}:${note.start}` : null;
      const inst = note && song.instruments[note.inst];
      if (id !== keyed[i]) {
        if (!note) release(i);
        else {
          dsp.keyOn(i, dspInstrument(inst), notePitch(inst, note.pitch));
          keyed[i] = id;
        }
      }
      // An instrument's `pitch` list bends each note by semitones a frame, its last entry held.
      if (inst?.pitch) {
        const f = pos - note.start * song.tempo;
        dsp.setPitch(i, notePitch(inst, note.pitch + inst.pitch[Math.min(f, inst.pitch.length - 1)]));
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
  return { dsp, play, stop, sfx, render, playing, owner };
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

export function playInstrument(key) {
  if (!seq || !INSTRUMENTS[key]) return;
  seq.play(compileSong(demoSong([key])));
  songName = null;
}

export function stopSong() {
  pending = null;
  songName = null;
  seq?.stop();
}

export const currentSong = () => (seq?.playing() ? songName : null);

export function sfx(name) {
  if (SFX[name] && seq) seq.sfx(SFX[name]);
}

export function channelStatus() {
  return VOICE_NAMES.map((channel, i) => ({
    channel,
    level: seq ? seq.dsp.voices[i].peak / 32768 : 0,
    owner: seq ? seq.owner(i) : 'idle',
  }));
}

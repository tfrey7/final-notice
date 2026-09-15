/*
 * The music and sound-effect player.
 *
 *   playSong(name)  loads src/audio/songs/<name>.mjs and plays it; a missing song does nothing
 *   stopSong()
 *   sfx(name)       plays an effect from src/audio/sfx.mjs; a missing name does nothing
 *
 * Nothing sounds until the first click or key press (the browser's rule); a song asked for before
 * then starts on that gesture.
 *
 * SONG FORMAT. A song file default-exports:
 *
 *   export default {
 *     tempo: 12,            // frames per row, at 60 frames a second
 *     loop: 0,              // the row to jump back to at the end, or null for a jingle that stops
 *     instruments: {
 *       lead:  { duty: 2, env: [15, 13, 11, 10, 9] },  // pulse: duty 0-3 = 12.5/25/50/75%
 *       bass:  { env: [15] },                            // triangle: only 0 (off) or on matters
 *       kick:  { env: [15, 10, 5, 2, 0], pitch: [0, 1, 2] },       // noise
 *       metal: { short: true, env: [12, 8, 4, 0] },     // noise in its short, metallic mode
 *     },
 *     pulse1:   { inst: 'lead', rows: 'C5 - Eb5 - G5 - - . | F5 - ...' },
 *     pulse2:   { inst: 'harm', rows: '...' },
 *     triangle: { inst: 'bass', rows: '...' },
 *     noise:    { inst: 'kick', rows: 'D 0:hat 5:snare . ...' },
 *     vrc6p1, vrc6p2: VRC6 pulses, duty 0-7 = 1/16 to 8/16
 *     saw:            the VRC6 sawtooth
 *     dpcm:           DPCM samples: 0-F is the playback rate (F is the sample as recorded), and the
 *                     instrument names the sample, e.g. kick: { sample: 'kick' }
 *   };
 *
 * rows is one token per row, separated by spaces; '|' is ignored and is there to mark bars.
 *   C4, C#4, Eb4   a note (pulse and triangle; the triangle sounds the note as written)
 *   0-F            a noise period, 0 highest to F lowest (noise channel)
 *   -              hold the note before
 *   .              silence
 *   <token>:<inst> the note with another instrument from the table
 * An instrument's env is the 4-bit volume for each frame of the note, the last value held; pitch
 * (optional) is a per-frame offset added to the note (semitones, or noise period steps), last held;
 * glide (optional) slides in from the channel's previous note over that many frames.
 * A missing channel is silent. Shorter channels are padded with silence to the longest.
 */

import { SONG_CHANNELS as CHANNELS, FRAME_HZ, createApu, noteToMidi } from './apu.mjs';
import { SFX, layersOf } from './sfx.mjs';
import { SFX_V1 } from './sfx-v1.mjs';

export function parseRows(channel, text, defaultInst) {
  const tokens = String(text ?? '').split(/\s+/).filter((t) => t && t !== '|');
  const rows = [];
  let current = null;
  let last = null;
  tokens.forEach((token, row) => {
    if (token === '-') {
      if (current) current.len += 1;
      rows.push(current);
      return;
    }
    if (token === '.') {
      current = null;
      rows.push(null);
      return;
    }
    const [name, inst = defaultInst] = token.split(':');
    const indexed = channel === 'noise' || channel === 'dpcm';
    const pitch = indexed ? parseInt(name, 16) : noteToMidi(name);
    if (pitch === null || Number.isNaN(pitch) || (indexed && !/^[0-9A-Fa-f]$/.test(name))) {
      throw new Error(`${channel} row ${row}: cannot read "${token}"`);
    }
    current = { start: row, pitch, inst, len: 1 };
    if (last) current.from = last.pitch;
    last = current;
    rows.push(current);
  });
  return rows;
}

export function compileSong(def) {
  const channels = {};
  let length = 0;
  for (const ch of CHANNELS) {
    channels[ch] = def[ch] ? parseRows(ch, def[ch].rows, def[ch].inst) : [];
    length = Math.max(length, channels[ch].length);
  }
  for (const ch of CHANNELS) {
    while (channels[ch].length < length) channels[ch].push(null);
    for (const note of channels[ch]) {
      if (note && !def.instruments?.[note.inst]) throw new Error(`${ch}: no instrument "${note.inst}"`);
    }
  }
  const loop = def.loop ?? null;
  if (loop !== null && (loop < 0 || loop >= length)) throw new Error(`loop row ${loop} is outside the song`);
  return { tempo: def.tempo ?? 8, loop, length, channels, instruments: def.instruments ?? {} };
}

const at = (list, i) => (list && list.length ? list[Math.min(i, list.length - 1)] : undefined);

// The pitch a note sounds `f` frames in: its pitch envelope, plus a slide from the last note.
export function pitchAt(note, inst, f) {
  let pitch = note.pitch + (at(inst.pitch, f) ?? 0);
  if (inst.glide && note.from !== undefined && f < inst.glide) pitch += (note.from - note.pitch) * (1 - f / inst.glide);
  return pitch;
}

// What a channel plays at song frame `pos`: the note, how far into it and how many frames are left.
export function noteAt(song, channel, pos) {
  const row = Math.floor(pos / song.tempo);
  const note = song.channels[channel][row];
  if (!note) return null;
  const into = pos - note.start * song.tempo;
  return { note, into, left: note.len * song.tempo - into };
}

let ctx = null;
let apu = null;
let song = null;
let songToken = 0;
let pending = null;
let pos = 0;
let pass = 0;
let nextTime = 0;
let timer = null;
const songCache = new Map();
const songVoices = Object.fromEntries(CHANNELS.map((ch) => [ch, { id: null, v: null }]));
const owners = Object.fromEntries(CHANNELS.map((ch) => [ch, null]));

const LOOKAHEAD = 0.12;

export function unlock() {
  if (typeof window === 'undefined') return false;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    apu = createApu(ctx);
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
    songCache.set(
      name,
      import(`./songs/${name}.mjs`).then((m) => compileSong(m.default)).catch(() => null),
    );
  }
  return songCache.get(name);
}

export const hasSong = async (name) => !!(await loadSong(name));

export async function playSong(name) {
  const token = ++songToken;
  if (!ctx) {
    pending = name;
    return;
  }
  const compiled = await loadSong(name);
  if (token !== songToken || !compiled) return;
  stopSong();
  songToken = token;
  song = compiled;
  songName = name;
  pos = 0;
  pass = 0;
  nextTime = ctx.currentTime + 0.05;
  timer = setInterval(schedule, 25);
  schedule();
}

let songName = null;
export const currentSong = () => songName;

export function stopSong() {
  songToken++;
  pending = null;
  if (timer) clearInterval(timer);
  timer = null;
  song = null;
  songName = null;
  if (!ctx) return;
  for (const ch of CHANNELS) {
    apu.silence(songVoices[ch].v, ctx.currentTime);
    songVoices[ch] = { id: null, v: null };
  }
}

function schedule() {
  if (!song) return;
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    if (pos >= song.length * song.tempo) {
      if (song.loop === null) {
        stopSong();
        return;
      }
      pos = song.loop * song.tempo;
      pass++;
    }
    for (const ch of CHANNELS) scheduleChannel(ch, nextTime);
    pos++;
    nextTime += 1 / FRAME_HZ;
  }
}

function scheduleChannel(ch, t) {
  const owner = owners[ch];
  if (owner && owner.end > t) return;
  const playing = noteAt(song, ch, pos);
  const slot = songVoices[ch];
  if (!playing) return;
  const id = `${pass}:${playing.note.start}`;
  if (slot.id === id && slot.v && slot.v.end > t) return;
  const inst = song.instruments[playing.note.inst];
  const { into, note } = playing;
  apu.silence(slot.v, t);
  const v = apu.voice(ch, t, {
    frames: playing.left,
    duty: inst.duty,
    short: inst.short,
    sample: inst.sample,
    at: (f) => ({ vol: at(inst.env, f + into) ?? 15, pitch: pitchAt(note, inst, f + into) }),
  });
  songVoices[ch] = { id, v };
}

// Each layer of an effect takes its channel for its length; the song picks the channel up again after.
// A name ending -v1 plays the first set.
export function sfx(name) {
  const def = SFX[name] ?? (String(name).endsWith('-v1') ? SFX_V1[name.slice(0, -3)] : undefined);
  if (!def || !ctx) return;
  const now = ctx.currentTime + 0.01;
  for (const layer of layersOf(def)) {
    const ch = layer.channel;
    const t = now + (layer.delay ?? 0) / FRAME_HZ;
    apu.silence(owners[ch], t);
    apu.silence(songVoices[ch].v, t);
    songVoices[ch] = { id: null, v: null };
    owners[ch] = apu.voice(ch, t, {
      frames: layer.frames.length,
      duty: layer.duty,
      short: layer.short,
      sample: layer.sample,
      at: (f) => ({ pitch: layer.frames[f][0], vol: layer.frames[f][1] }),
    });
  }
}

// For the sound test's meters: each channel's output peak and who holds it.
export function channelStatus() {
  const now = ctx ? ctx.currentTime : 0;
  return CHANNELS.map((ch) => ({
    channel: ch,
    level: apu ? apu.level(ch) : 0,
    owner: owners[ch] && owners[ch].end > now ? 'sfx' : song ? 'song' : 'idle',
  }));
}

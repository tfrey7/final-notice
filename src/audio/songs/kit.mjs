// Helpers the stage songs share: note names, chord tones, transposition and bar builders.

import { noteToMidi } from '../apu.mjs';

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const nameOf = (midi) => `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

export const REST = Array(16).fill('.').join(' ');

// Semitones above the root, the chord's tones from the bottom.
const QUALITY = {
  m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], m7b5: [0, 3, 6, 10],
  maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], 7: [0, 4, 7, 10], 9: [0, 4, 7, 10, 14],
};

// 'Dm9' moved up `shift` semitones: its bass root between E2 and Eb3 and its tones.
export function chord(symbol, shift = 0) {
  const [, name, quality] = /^([A-G]b?)(.*)$/.exec(symbol);
  const root = fold(noteToMidi(`${name}2`) + shift, noteToMidi('E2'), noteToMidi('Eb3'));
  return { root, tones: QUALITY[quality] };
}

export function fold(m, lo, hi) {
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return m;
}

const eachNote = (rows, fn) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? fn(t) : t)).join(' ');
export const transpose = (rows, n) =>
  n ? eachNote(rows, (t) => { const [note, ...rest] = t.split(':'); return [nameOf(noteToMidi(note) + n), ...rest].join(':'); }) : rows;
export const tag = (rows, inst) => rows.split(' ').map((t) => (t === '.' || t === '-' || t.includes(':') ? t : `${t}:${inst}`)).join(' ');

// A pattern of chord letters: R root, O octave, F fifth (the chord's third tone), S seventh, L root an
// octave down; anything else passes through.
export function play(pattern, { root, tones }, inst, octave = 0) {
  const step = { R: 0, O: 12, F: tones[2], S: tones[3], L: -12 };
  return pattern.split(' ').map((t) => (t in step ? `${nameOf(root + octave + step[t])}:${inst}` : t)).join(' ');
}

// A slow sine wobble in semitones after `delay` frames, long enough to cover any held note.
export const vibrato = (depth, period, delay = 0) =>
  Array.from({ length: 400 }, (_, f) => (f < delay ? 0 : +(depth * Math.sin((2 * Math.PI * (f - delay)) / period)).toFixed(3)));

// Every row of a channel `late` rows behind, under `inst`; the first rows of each bar rest so a note
// never carries across a bar where the key may change.
export function echo(bars, late, inst) {
  const rows = bars.join(' ').split(' ');
  const shifted = [...Array(late).fill('.'), ...rows.slice(0, -late)];
  return bars.map((_, b) =>
    shifted.slice(b * 16, b * 16 + 16).map((t, r) => {
      if (r < late) return '.';
      return /^[A-G]/.test(t) ? `${t.split(':')[0]}:${inst}` : t;
    }).join(' '),
  );
}

// The note a third below `note` that stays in `scale` (pitch classes), for a harmony line.
export function thirdBelow(note, scale) {
  const m = noteToMidi(note);
  const pick = [m - 3, m - 4, m - 5].find((c) => scale.has(((c % 12) + 12) % 12));
  return nameOf(pick ?? m - 12);
}

export const pitchClasses = (names, shift = 0) => new Set(names.map((n) => (noteToMidi(`${n}4`) + shift) % 12));

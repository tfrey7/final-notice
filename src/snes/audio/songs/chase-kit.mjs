// Bar builders for the from-scratch Stage 2 chase sketches (item 2026).

import { noteToMidi } from '../../../audio/apu.mjs';
import { fold, nameOf } from '../../../audio/songs/kit.mjs';

const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10] };

// 'Bb', 'Dm' or 'B7': the bass root between C2 and B2 and the chord's tones.
export function triad(symbol) {
  const [, name, quality] = /^([A-G][b#]?)(.*)$/.exec(symbol);
  return { root: fold(noteToMidi(`${name}2`), 36, 47), tones: QUALITY[quality] };
}

// Chord letters: R root, T third, F fifth, S seventh (flat seventh on a triad), O octave, H the
// third an octave up, U the fifth an octave up. Anything else passes through.
export function voice(pattern, { root, tones }, inst, octave = 0) {
  const step = { R: 0, T: tones[1], F: tones[2], S: tones[3] ?? 10, O: 12, H: 12 + tones[1], U: 12 + tones[2] };
  return pattern.split(' ').map((t) => (t in step ? `${nameOf(root + octave + step[t])}:${inst}` : t)).join(' ');
}

export const rest = (rows) => Array(rows).fill('.').join(' ');

// Short codes for the hats: c closed, o open.
export const hats = (pattern) => pattern.split(' ').map((t) => ({ c: 'C4:chat', o: 'C4:ohat' })[t] ?? t).join(' ');

export function bars(list, rows) {
  list.forEach((bar, i) => {
    const n = bar.split(' ').length;
    if (n !== rows) throw new Error(`bar ${i} has ${n} rows, not ${rows}`);
  });
  return list.join(' | ');
}

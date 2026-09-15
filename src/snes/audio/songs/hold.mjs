// Hold music for the pause form: the title theme's hook quoted as an eight-bar fragment (lesson S10),
// down a phone line. Pure corporate wave, unhurried: a thin band-limited lead with a slow vibrato,
// soft pads on the guide tones, Rhodes stabs, the bass lifted an octave the way a handset loses the
// low end, and a whisper of hat. Everything sits near the centre, as a phone is mono.

import { HOOK } from '../../../audio/songs/title.mjs';
import * as kit from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

const { REST, chord, fold, nameOf, play, vibrato } = kit;

export const BAR_ROWS = 16;
export const CHORDS = ['Ebmaj9', 'Gm7', 'Abmaj9', 'Bb9', 'Ebmaj9', 'Cm9', 'Abmaj9', 'Bb9'];
export const LEAD = [
  HOOK,
  'D5 - - - - - - - . . . . . . . .',
  'C6 - - Bb5 - - G5 - - Ab5 - G5 - Eb5 - -',
  'F5 - - - - - - - . . . . . . . .',
  HOOK,
  'D5 - - - - - . F5 - . G5 - Bb5 - - -',
  'C6 - Bb5 - Ab5 - G5 - F5 - Eb5 - D5 - Eb5 -',
  'F5 - - - - - - - . . . . . . . .',
];

const on = (rows, inst) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? `${t}:${inst}` : t)).join(' ');
const HOLD = ['X', ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const guide = (tone, lo, hi, inst) =>
  CHORDS.map((symbol) => {
    const { root, tones } = chord(symbol);
    return HOLD.replace('X', `${nameOf(fold(root + tones[tone], lo, hi))}:${inst}`);
  });

const STABS = '. . . . X - - - . . . . X - - .';
const v4 = CHORDS.map((symbol) => {
  const { root, tones } = chord(symbol);
  const note = nameOf(fold(root + tones[tones.length - 1], 67, 79));
  return STABS.replace(/X/g, `${note}:keys`);
});

const v5 = CHORDS.map((symbol) => play('R - - - - - . R - - - F - - O -', chord(symbol), 'bass', 12));
const v6 = CHORDS.map((_, i) => (i === 0 ? REST : '. . C4:hat . . . C4:hat . . . C4:hat . . . C4:hat .'));

const join = (bars) => bars.join(' | ');

export default {
  tempo: 9,
  loop: 0,
  echo: { mvol: 76, evol: 22, efb: 36, edl: 3, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    phone: { sample: 'phone', adsr: [12, 4, 6, 12], vol: 66, pan: -4, echo: true, pitch: vibrato(0.14, 24, 16) },
    padL: { ...INSTRUMENTS.pad, vol: 30, pan: -14 },
    padR: { ...INSTRUMENTS.pad, vol: 30, pan: 14 },
    keys: { ...INSTRUMENTS.epiano, adsr: [15, 5, 2, 18], vol: 44, pan: 10 },
    bass: { ...INSTRUMENTS.synbass, vol: 62 },
    hat: { ...INSTRUMENTS.chat, vol: 26, pan: 8 },
  },
  v1: { rows: join(LEAD.map((bar) => on(bar, 'phone'))) },
  v2: { rows: join(guide(1, 55, 66, 'padL')) },
  v3: { rows: join(guide(3, 60, 71, 'padR')) },
  v4: { rows: join(v4) },
  v5: { rows: join(v5) },
  v6: { rows: join(v6) },
};

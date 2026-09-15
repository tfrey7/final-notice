// Disposal Line: the Stage 2 chase material in the gothic cosmic band (docs/SNES-DESCENT.md §4), slowed
// to the boss's drive. The Rhodes and square arpeggios and the pads are gone: strings in the organ
// register arpeggiate the chords, a tubular bell tolls every other downbeat, and the intro's third bar
// quotes the title hook in C minor on the bell.
//
// The song builds like the Great Seal: the first phrase of A is bass, kick and space, the second brings
// the harmony strings and the groove, and the rest thickens the drums and moves the bass.
//
// v1 brass lead | v2 strings a third below | v3 organ-register strings | v4 tubular bell | v5 synth bass
// | v6 kick | v7 snare and tom fill | v8 hats

import { FORM, LOOP_BAR, SCALE } from '../../../audio/songs/stage2.mjs';
import { hats, voice } from './chase-kit.mjs';
import { REST, chord, tag, thirdBelow, pitchClasses, transpose, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';
import { QUOTE } from './seal-v1.mjs';

export { FORM, LOOP_BAR };
export const BAR_ROWS = 16;
export const QUOTE_BAR = 2;

const LEADS = FORM.map((b) => transpose(b.lead, b.shift));
const mapNotes = (rows, fn) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? fn(t) : t)).join(' ');

// rise: the intro; thin and drive: the first two phrases of A; full: everything after it but the
// breakdown.
const phase = (b, i) => {
  if (b.part === 'intro') return 'rise';
  if (b.part === 'breakdown') return 'half';
  if (i < 12) return i < 8 ? 'thin' : 'drive';
  return 'full';
};

// The brass plays an octave down: up high it was the shrill part of the mix.
const v1 = LEADS.map((bar) => tag(transpose(bar, -12), 'brass'));
const v2 = FORM.map((b, i) => (['rise', 'half', 'thin'].includes(phase(b, i))
  ? REST
  : mapNotes(LEADS[i], (t) => `${thirdBelow(t, pitchClasses(SCALE, b.shift))}:strings`)));

const ARP = ['R . F . O . F . T . F . O . F .', 'R . T . F . O . F . T . R . T .'];
const v3 = FORM.map((b, i) => voice(ARP[i % 2], chord(b.symbol, b.shift), 'organ', 12));

const v4 = FORM.map((b, i) => {
  if (i === QUOTE_BAR) return QUOTE;
  if (i % 2) return REST;
  return voice('R - - - - - - - . . . . . . . .', chord(b.symbol, b.shift), 'toll', 12);
});

const BASS = {
  pulse: 'R . R . R . R . R . R . R R R R',
  thin: 'R - - - . . . . F - - - . . . .',
  drive: 'R R O R R R O R R R O R R O F O',
  moved: 'R . R O . R O . R . F O . F S .',
  turn: 'R O R O F O F O S O S O O - R -',
  half: 'R - - - R - - - R - - - F - S -',
};
const v5 = FORM.map((b, i) => {
  const p = phase(b, i);
  const pattern = b.last && p !== 'rise' ? BASS.turn
    : { rise: BASS.pulse, half: BASS.half, thin: BASS.thin, drive: BASS.drive, full: BASS.moved }[p];
  return voice(pattern, chord(b.symbol, b.shift), 'bass');
});

const fill = (b, i) => b.last || (b.part === 'intro' && i === 3) || i === 7 || i === 11;
const KICK = {
  rise: 'C4 . . . . . . . . . . . . . . .',
  half: 'C4 . . . . . . . . . . . . . . .',
  thin: 'C4 . . . . . . . C4 . . . . . . .',
  drive: 'C4 . . . . . . . C4 . C4 . . . . C4',
  full: 'C4 . . C4 . . . . C4 . C4 . . . C4 .',
};
const v6 = FORM.map((b, i) => tag(fill(b, i) ? KICK.thin : KICK[phase(b, i)], 'kick'));

const v7 = FORM.map((b, i) => {
  const p = phase(b, i);
  if (fill(b, i)) return tag('. . . . C4 . . . C4 Bb3 A3 G3 F3 . F3 .', 'snare');
  if (p === 'rise') return REST;
  if (p === 'half') return tag('. . . . . . . . C4 . . . . . . .', 'snare');
  if (p === 'thin') return '. . . . C4:snare/@60 . . . . . . . C4:snare/@60 . . .';
  if (p === 'full') return '. . . . C4:snare . . C4:snare/@36 . . . . C4:snare . . C4:snare/@36';
  return tag('. . . . C4 . . . . . . . C4 . . .', 'snare');
});

const v8 = FORM.map((b, i) => {
  const p = phase(b, i);
  if (p === 'rise') return i === 3 ? hats('c . . . c . . . c . . . c . . .') : REST;
  if (p === 'half') return REST;
  if (p === 'thin') return hats('. . c . . . c . . . c . . . c .');
  if (p === 'full') return hats('c c c . c c c . c c c . c . o -');
  return hats('c . c . c . c . c . c . c . o -');
});

const join = (list) => list.join(' | ');

export default {
  tempo: 7,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 30, evol: 32, efb: 92, edl: 7, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    brass: { ...INSTRUMENTS.brass, adsr: [13, 3, 6, 6], vol: 108, pan: -40, pitch: vibrato(0.45, 14, 10) },
    strings: { ...INSTRUMENTS.strings, vol: 46, pan: 80, pitch: vibrato(0.15, 16, 20) },
    organ: { ...INSTRUMENTS.strings, adsr: [11, 7, 7, 1], vol: 46, pan: -84, pitch: vibrato(0.05, 40) },
    toll: { ...INSTRUMENTS.bell, vol: 48, pan: 84 },
    bell: { ...INSTRUMENTS.bell, vol: 72, pan: 30 },
    bass: { ...INSTRUMENTS.synbass, adsr: [15, 6, 3, 22], vol: 96 },
    kick: { ...INSTRUMENTS.gkick, vol: 100 },
    snare: { ...INSTRUMENTS.gsnare, vol: 96, pan: 14 },
    chat: { ...INSTRUMENTS.chat, vol: 22, pan: 50 },
    ohat: { ...INSTRUMENTS.ohat, vol: 18, pan: -36 },
  },
  v1: { rows: join(v1) },
  v2: { rows: join(v2) },
  v3: { rows: join(v3) },
  v4: { rows: join(v4) },
  v5: { rows: join(v5) },
  v6: { rows: join(v6) },
  v7: { rows: join(v7) },
  v8: { rows: join(v8) },
};

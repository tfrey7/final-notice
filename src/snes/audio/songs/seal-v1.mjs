// The Great Seal: the boss material in the gothic cosmic band (docs/SNES-DESCENT.md §4). The brass lead,
// string counter, driving bass and kit stay; the choir and pad give way to strings in the organ register
// and a tubular bell tolling every other downbeat. The intro's second bar quotes the title hook, moved to
// C minor, on the bell: the one corporate thing left.
//
// The song builds instead of arriving as one wall: the organ strings move in arpeggios rather than
// holding the chord, the first phrase of A is bass, kick and space, the second brings the counter and
// the groove, and the repeat of A thickens the drums and moves the bass.
//
// v1 brass lead | v2 strings counter-melody | v3 organ-register strings | v4 tubular bell | v5 synth
// bass | v6 kick | v7 snare and fills | v8 hats

import boss, { BAR_ROWS, FORM } from './boss.mjs';
import { bars, hats, rest, voice } from './chase-kit.mjs';
import { tag, transpose, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export { BAR_ROWS, FORM, LOOP_BAR } from './boss.mjs';

export const QUOTE_BAR = 1;
export const QUOTE = 'G4:bell - C5:bell - Eb5:bell - - D5:bell - - C5:bell - B4:bell - G4:bell -';

const R = rest(BAR_ROWS);

// rise: the intro; thin and drive: the two phrases of the first A; full: everything after, with the
// breakdown's bare bars thinned again.
const phase = (b, i) => {
  if (b.part === 'intro') return 'rise';
  if (i < 12) return b.bar < 4 ? 'thin' : 'drive';
  if (b.part === 'break' && b.bar < 4) return 'thin';
  return 'full';
};
const lastBar = (b) => b.bar === 7 || ((b.part === 'turn' || b.part === 'intro') && b.bar === 3);

// The brass sits an octave under the boss's: up high it was the shrill part of the mix.
const v1 = FORM.map((b) => tag(transpose(b.lead, -12), 'lead'));

const v2 = FORM.map((b, i) => {
  const p = phase(b, i);
  if (p === 'rise' || (p === 'thin' && b.part !== 'break')) return R;
  return boss.v2.rows.split(' | ')[i];
});

const ARP = ['R . F . O . F . T . F . O . F .', 'R . T . F . O . F . T . R . T .'];
const v3 = FORM.map((b, i) => voice(ARP[i % 2], b.c, 'organ', 12));

const v4 = FORM.map((b, i) => {
  if (i === QUOTE_BAR) return QUOTE;
  if (i % 2) return R;
  return voice(b.bar === 0 && b.part === 'intro' ? 'R - - - - - - - - - - - . . . .' : 'R - - - - - - - . . . . . . . .', b.c, 'toll', 12);
});

const BASS = {
  pulse: 'R . R . R . R . R . R . R R R R',
  thin: 'R - - - . . . . F - - - . . . .',
  A: 'R . O . R R O . R . O . F . S .',
  A2: 'R . R O . R O . R . F O . F S .',
  B: 'R R O R R R O R F F O F S S O S',
  fill: 'R R R R F F F F S S S S O O O O',
};
const v5 = FORM.map((b, i) => {
  const p = phase(b, i);
  const pattern = p === 'rise' ? (b.bar === 2 ? BASS.pulse : BASS.A)
    : p === 'thin' ? BASS.thin
      : lastBar(b) ? BASS.fill
        : b.part === 'B' || b.part === 'turn' ? BASS.B
          : p === 'full' && b.part === 'A' ? BASS.A2 : BASS.A;
  return voice(pattern, b.c, 'bass');
});

const KICK = {
  one: 'C4 . . . . . . . . . . . . . . .',
  half: 'C4 . . . . . . . C4 . . . . . . .',
  groove: 'C4 . . . . . . . C4 . C4 . . . . .',
  push: 'C4 . . C4 . . . . C4 . C4 . . . C4 .',
};
const v6 = FORM.map((b, i) => {
  const p = phase(b, i);
  return tag(p === 'rise' ? KICK.one : p === 'thin' || lastBar(b) ? KICK.half : p === 'full' ? KICK.push : KICK.groove, 'kick');
});

const v7 = FORM.map((b, i) => {
  const p = phase(b, i);
  if (b.part === 'break' && b.bar === 7) return tag('C4 . C4 . C4 . C4 . C4 C4 C4 C4 C4 C4 C4 C4', 'roll');
  if (lastBar(b)) return tag('. . . . C4 . . . C4 . Bb3 . A3 C4 G3 F3', 'snare');
  if (p === 'rise') return R;
  if (p === 'thin') return '. . . . C4:snare/@60 . . . . . . . C4:snare/@60 . . .';
  if (p === 'full') return '. . . . C4:snare . . C4:snare/@36 . . . . C4:snare . . C4:snare/@36';
  return tag('. . . . C4 . . . . . . . C4 . . .', 'snare');
});

const v8 = FORM.map((b, i) => {
  const p = phase(b, i);
  if (p === 'rise') return b.bar === 3 ? hats('c . . . c . . . c . . . c . . .') : R;
  if (p === 'thin') return hats('. . c . . . c . . . c . . . c .');
  if (p === 'full') return hats('c c c . c c c . c c c . c . o -');
  return hats('c . c c c . c c c . c c c . o -');
});

export default {
  ...boss,
  echo: { mvol: 30, evol: 32, efb: 92, edl: 7, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    lead: { ...boss.instruments.lead, vol: 108, pan: -40, pitch: vibrato(0.45, 14, 10) },
    counter: { ...boss.instruments.counter, vol: 56, pan: 80 },
    organ: { ...INSTRUMENTS.strings, adsr: [11, 7, 7, 1], vol: 48, pan: -84, pitch: vibrato(0.05, 40) },
    toll: { ...INSTRUMENTS.bell, vol: 48, pan: 84 },
    bell: { ...INSTRUMENTS.bell, vol: 72, pan: 30 },
    bass: boss.instruments.bass,
    kick: boss.instruments.kick,
    snare: { ...boss.instruments.snare, pan: 14 },
    roll: { ...boss.instruments.roll, pan: -40 },
    chat: { ...boss.instruments.chat, vol: 22, pan: 50 },
    ohat: { ...boss.instruments.ohat, vol: 18, pan: -36 },
  },
  v1: { rows: bars(v1, BAR_ROWS) },
  v2: { rows: bars(v2, BAR_ROWS) },
  v3: { rows: bars(v3, BAR_ROWS) },
  v4: { rows: bars(v4, BAR_ROWS) },
  v5: { rows: bars(v5, BAR_ROWS) },
  v6: { rows: bars(v6, BAR_ROWS) },
  v7: { rows: bars(v7, BAR_ROWS) },
  v8: { rows: bars(v8, BAR_ROWS) },
};

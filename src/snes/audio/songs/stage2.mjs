// Stage 2 on the S-DSP: the NES escape chase's form, melody and harmony (src/audio/songs/stage2.mjs)
// re-voiced for eight recorded-sample voices in the SNES arrangement style (docs/MUSIC.md).
//
// v1 brass section lead | v2 Rhodes arpeggio, left, a warm pad in the breakdown | v3 square-lead arpeggio
// a row behind, right, the upper pad in the breakdown | v4 synth bass octave eighths | v5 gated kick |
// v6 gated snare, its fill stepping down like toms | v7 hats | v8 the alarm and the title nod in the
// intro, then the lead a third below, Castlevania III style. Effects steal v8 then v7; the NES software
// echo of the lead is the hardware echo here, long and deep.

import { FORM, LOOP_BAR, SCALE } from '../../../audio/songs/stage2.mjs';
import * as kit from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

const { REST, chord, echo, fold, nameOf, pitchClasses, play, tag, thirdBelow, transpose, vibrato } = kit;

export const BAR_ROWS = 16;
export const LEADS = FORM.map((b) => transpose(b.lead, b.shift));

const mapNotes = (rows, fn) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? fn(t) : t)).join(' ');
const SINGING = ['B', 'climax'];

const v1 = LEADS.map((bar) => tag(bar, 'brass'));

const ARP = [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6];
const arp = ({ root, tones }, inst) =>
  ARP.map((k) => `${nameOf(root + 12 + tones[k % tones.length] + 12 * Math.floor(k / tones.length))}:${inst}`).join(' ');
const arpBar = (b, i) => !(b.part === 'breakdown' || (b.part === 'intro' && i < 2));
const HOLD = 'X - - - - - - - - - - - - - - -';
const pad = (b, tone, lo, hi, inst) => {
  const { root, tones } = chord(b.symbol, b.shift);
  return b.part === 'intro' ? REST : HOLD.replace('X', `${nameOf(fold(root + tones[tone], lo, hi))}:${inst}`);
};
const v2 = FORM.map((b, i) => (arpBar(b, i) ? arp(chord(b.symbol, b.shift), 'arpL') : pad(b, 1, 57, 69, 'padL')));
const arpShadow = echo(FORM.map((b) => arp(chord(b.symbol, b.shift), 'arpR')), 1, 'arpR');
const v3 = FORM.map((b, i) => (arpBar(b, i) ? arpShadow[i] : pad(b, 3, 62, 74, 'padR')));

// Castlevania III's engine room: octaves pumped in sixteenths, pushed off the beat, a climbing turnaround.
const BASS = {
  drive: 'R R O R R R O R R R O R R O F O',
  turn: 'R O R O F O F O S O S O O - R -',
  half: 'R - - - R - - - R - - - F - S -',
};
const v4 = FORM.map((b) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'breakdown') return play(b.last ? BASS.turn : BASS.half, c, b.last ? 'bass' : 'bassLong');
  return play(b.last ? BASS.turn : BASS.drive, c, 'bass');
});

// The NES DPCM line split in two lanes; each hit cuts the other lane's ring, which is the gate.
const DRUMS = {
  groove: 'F - - - F:snare - - - F - F - F:snare - - F',
  fill: 'F - - - F:snare - - - F:snare D:snare F:snare C:snare F:snare B:snare F:snare A:snare',
  half: 'F - - - - - - - F:snare - - - - - - -',
};
const TOMS = { F: 'C4', D: 'Bb3', C: 'A3', B: 'G3', A: 'F3' };
const drumBar = (b, i) => {
  if (b.part === 'intro') return i < 2 ? null : i === 3 ? DRUMS.fill : DRUMS.groove;
  if (b.last) return DRUMS.fill;
  return b.part === 'breakdown' ? DRUMS.half : DRUMS.groove;
};
const v5 = FORM.map((b, i) => {
  const bar = drumBar(b, i);
  return bar ? bar.split(' ').map((t) => (t === 'F' ? 'C4:kick' : t.endsWith(':snare') ? '.' : t)).join(' ') : REST;
});
const v6 = FORM.map((b, i) => {
  const bar = drumBar(b, i);
  return bar ? bar.split(' ').map((t) => (t === 'F' ? '.' : t.endsWith(':snare') ? `${TOMS[t[0]]}:snare` : t)).join(' ') : REST;
});

const HATS = { 1: 'C4:chat', 2: 'D4:chat', 3: 'E4:chat', 0: 'C4:ohat', '0:open': 'C4:ohat' };
const v7 = FORM.map((b, i) => {
  const p = b.part === 'intro' ? (i < 2 ? '1 . 1 . 1 . 1 . 1 . 1 . 1 . 1 .' : '. . 1 . . . 1 . . . 1 . . . 0:open -')
    : b.part === 'breakdown' ? (b.last ? '. . . . . . . . 3 3 2 2 1 1 0 0' : REST)
      : SINGING.includes(b.part) ? '1 . 1 1 1 . 1 1 1 . 1 1 1 . 0:open -'
        : '. . 1 . . . 1 . . . 1 . . . 0:open -';
  return p.split(' ').map((t) => HATS[t] ?? t).join(' ');
});

// The lead doubled a third below wherever it sings, strings in A and the tag, brass in B.
const NOD = 'G4 - C5 - Eb5 - D5 - C5 - - - - - - -';
const v8 = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? tag('C6 - - - - - - - G5 - - - - - - -', 'siren') : i === 2 ? tag(NOD, 'nod') : REST;
  if (b.part === 'breakdown') return REST;
  const scale = pitchClasses(SCALE, b.shift);
  return mapNotes(LEADS[i], (t) => `${thirdBelow(t, scale)}:${SINGING.includes(b.part) ? 'harm' : 'sharm'}`);
});

const join = (bars) => bars.join(' | ');

export default {
  tempo: 5,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 78, evol: 42, efb: 70, edl: 5, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    brass: { ...INSTRUMENTS.brass, vol: 127, pan: -6, pitch: vibrato(0.22, 12, 14) },
    harm: { ...INSTRUMENTS.brass, vol: 50, pan: 30, pitch: vibrato(0.22, 12, 14) },
    sharm: { ...INSTRUMENTS.strings, vol: 52, pan: 30, pitch: vibrato(0.15, 13, 18) },
    arpL: { ...INSTRUMENTS.epiano, adsr: [15, 6, 2, 22], vol: 50, pan: -44 },
    arpR: { ...INSTRUMENTS.sqlead, adsr: [15, 6, 2, 22], vol: 38, pan: 44 },
    padL: { ...INSTRUMENTS.pad, vol: 56, pan: -40 },
    padR: { ...INSTRUMENTS.pad, vol: 50, pan: 40 },
    bass: { ...INSTRUMENTS.synbass, adsr: [15, 6, 3, 22], vol: 96 },
    bassLong: { ...INSTRUMENTS.synbass, adsr: [15, 2, 5, 10], vol: 90 },
    kick: { ...INSTRUMENTS.gkick, vol: 104 },
    snare: { ...INSTRUMENTS.gsnare, vol: 106 },
    chat: { ...INSTRUMENTS.chat, vol: 60 },
    ohat: { ...INSTRUMENTS.ohat, vol: 50 },
    siren: { ...INSTRUMENTS.strings, vol: 74, pan: 20 },
    nod: { ...INSTRUMENTS.strings, vol: 70, pan: 20 },
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

// The title theme on the S-DSP: the NES title song's form, melody and harmony (src/audio/songs/title.mjs)
// arranged as late-era corporate wave for eight sampled voices (docs/THEME.md, "SNES arrangement").
//
// v1 alto sax lead (DX piano in the intro and bridge) | v2 DX piano off-beat stabs, a sax harmony in
// the return | v3-v4 warm pad on the guide tones | v5 slap bass | v6 gated kick and clap | v7 gated
// snare | v8 hats. The lead, pads, piano and clap go through the echo; the drums and bass stay dry.

import { FORM, LOOP_BAR, SCALE } from '../../../audio/songs/title.mjs';
import * as kit from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../bank.mjs';

const { REST, chord, fold, nameOf, pitchClasses, play, thirdBelow, transpose } = kit;

export const BAR_ROWS = 16;
export const LEADS = FORM.map((b) => transpose(b.lead, b.shift));

const mapNotes = (rows, fn) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? fn(t) : t)).join(' ');
const on = (rows, inst) => mapNotes(rows, (t) => `${t}:${inst}`);
const hits = (pattern, inst) => pattern.split(' ').map((t) => (t === 'X' ? `C4:${inst}` : t)).join(' ');

const LEAD_INST = { intro: 'keys', A: 'sax', "A'": 'sax', B: 'sax', bridge: 'keys', return: 'sax', tag: 'sax' };
const v1 = FORM.map((b, i) => on(LEADS[i], LEAD_INST[b.part]));

// Off-beat piano stabs on the chord's colour tone; the return trades them for a sax a third below.
const PUMP = '. . X - . . X - . . X - . . X -';
const B_PUMP = '. . X - . . X - . . X - . X - X';
const v2 = FORM.map((b, i) => {
  if (b.part === 'return') {
    const scale = pitchClasses(SCALE, b.shift);
    return mapNotes(LEADS[i], (t) => `${thirdBelow(t, scale)}:harm`);
  }
  if (b.part === 'bridge' || (b.part === 'intro' && i < 2)) return REST;
  const { root, tones } = chord(b.symbol, b.shift);
  const note = nameOf(fold(root + tones[tones.length - 1], 67, 79));
  return (b.part === 'B' ? B_PUMP : PUMP).split(' ').map((t) => (t === 'X' ? `${note}:stab` : t)).join(' ');
});

// The pad holds the third and seventh a whole bar, struck again on every bar.
const HOLD = ['X', ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const pad = (tone, lo, hi, inst) =>
  FORM.map((b) => {
    const { root, tones } = chord(b.symbol, b.shift);
    return HOLD.replace('X', `${nameOf(fold(root + tones[tone], lo, hi))}:${inst}`);
  });
const v3 = pad(1, 55, 66, 'padL');
const v4 = pad(3, 60, 71, 'padR');

// The NES Sunsoft bass line, now thumbed and popped: octave jumps on the sixteenths.
const BASS = {
  drive: 'R . O R . R O . R . O R . R O R',
  fill: 'R . O R . R O . F . O F S . O F',
  bridge: 'R - - - - - - - R - - - O - - -',
  intro: 'R - - - - - - - - - - - . . . .',
};
const v5 = FORM.map((b, i) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'intro') return play(i < 2 ? BASS.intro : i === 3 ? BASS.fill : BASS.drive, c, 'slap');
  if (b.part === 'bridge') return play(b.last ? BASS.fill : BASS.bridge, c, 'slap');
  return play(b.last ? BASS.fill : BASS.drive, c, 'slap');
});

// K kick, C clap: four on the floor, claps into each section's turn.
const FLOOR = 'K - - - K - - - K - - - K - - -';
const kickRow = (p) => p.split(' ').map((t) => (t === 'K' ? 'C4:kick' : t === 'C' ? 'C4:clap' : t)).join(' ');
const v6 = FORM.map((b, i) => {
  if (b.part === 'intro') return kickRow(i < 2 ? REST : i === 3 ? 'K - - - K - - - C - C - C - C -' : FLOOR);
  if (b.part === 'bridge') return kickRow(b.last ? 'K - - - K - - - K - K - K - K -' : 'K - - - - - - - - - - - C - - -');
  return kickRow(b.last ? 'K - - - K - - - K - - C - C C -' : FLOOR);
});

// The gated snare on the backbeat; its fills step down in pitch like toms.
const v7 = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? REST : i === 3 ? '. . . . C4:snare - . . C4:snare - C4:snare - A3:snare - F3:snare -' : '. . . . X - . . . . . . X - . .';
  if (b.part === 'bridge') return b.last ? '. . . . . . . . C4:snare C4:snare A3:snare A3:snare F3:snare F3:snare D3:snare D3:snare' : '. . . . X - . . . . . . X - . .';
  return b.last ? '. . . . X - . . . . X - A3:snare - F3:snare -' : '. . . . X - . . . . . . X - . .';
}).map((r) => hits(r, 'snare'));

const HATS = '. . O - H . O - . . O - H . O -';
const B_HATS = 'H . O - . . H H H . O - . . H .';
const v8 = FORM.map((b, i) => {
  const p = b.part === 'bridge' || (b.part === 'intro' && i < 3) ? REST : b.part === 'B' ? B_HATS : HATS;
  return p.split(' ').map((t) => (t === 'H' ? 'C4:chat' : t === 'O' ? 'C4:ohat' : t)).join(' ');
});

const join = (bars) => bars.join(' | ');

export default {
  tempo: 7,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 84, evol: 32, efb: 60, edl: 4, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    sax: { ...INSTRUMENTS.sax, vol: 92, pan: -8 },
    keys: { ...INSTRUMENTS.epiano, vol: 100, pan: -8 },
    harm: { ...INSTRUMENTS.sax, vol: 58, pan: 40 },
    stab: { ...INSTRUMENTS.epiano, adsr: [15, 5, 1, 20], vol: 54, pan: 36 },
    padL: { ...INSTRUMENTS.pad, vol: 40, pan: -40 },
    padR: { ...INSTRUMENTS.pad, vol: 40, pan: 40 },
    slap: { ...INSTRUMENTS.slap, vol: 112 },
    kick: { ...INSTRUMENTS.gkick, vol: 118 },
    clap: { ...INSTRUMENTS.clap, vol: 90, pan: -16 },
    snare: { ...INSTRUMENTS.gsnare, vol: 104 },
    chat: { ...INSTRUMENTS.chat, vol: 70 },
    ohat: { ...INSTRUMENTS.ohat, vol: 56 },
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

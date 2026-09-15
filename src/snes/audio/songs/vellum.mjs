// Vellum's duel, the first boss theme on the expressive engine (item 2160). E harmonic minor at 150
// bpm, loud from bar one: a sixteenth-note string ostinato, syncopated brass stabs, timpani and toms
// pounding under a kick and snare, and a brass lead that cries in short runs rather than long lines.
// Desperate, not villainous: the harmony keeps climbing (a chromatic B section that stalls on B7, a
// Phrygian F against E, a key change up a semitone) and the loop never lands on a settled tonic.
// vellum-pinch.mjs is the same material, faster and higher, for his last third of health.
//
// v1 brass lead | v2 string ostinato | v3 brass stabs, slow strings in B | v4 timpani | v5 synth bass |
// v6 kick | v7 snare | v8 toms and crash

import { bars, rest, section, voice } from './chase-kit.mjs';
import { nameOf } from '../../../audio/songs/kit.mjs';
import { noteToMidi } from '../../../audio/apu.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);

// A lead bar under `inst`, moved `shift` semitones, keeping each note's expression marks.
export const lead = (rows, inst, shift = 0) => rows.split(' ').map((t) => {
  if (!/^[A-G]/.test(t)) return t;
  const [name, ...marks] = t.split('/');
  return [`${nameOf(noteToMidi(name) + shift)}:${inst}`, ...marks].join('/');
}).join(' ');

// A section in a new key: only the chord roots move here, since section() would push the lead through
// kit.transpose, which mangles marked notes, and lead() shifts it again in arrange().
export const keyed = (part, chords, leads, shift) =>
  section(part, chords, leads).map((b) => ({ ...b, c: { ...b.c, root: b.c.root + shift }, shift }));

export const INTRO_CHORDS =['Em', 'Em', 'C', 'B7'];
export const INTRO_LEAD = [R, R, 'C6/v - - - - - - - - - - - - - - -', 'B5/v - - - - - - - A5 - F#5 - D#5 - B4 -'];

export const A_CHORDS = ['Em', 'C', 'Am', 'B7', 'Em', 'C', 'F', 'B7'];
export const A_LEAD = [
  'E5 - - B4 E5 - G5 - F#5 - E5 - D#5 - E5 -',
  'G5/v - - - - - - - E5 . G5 . C6/p4 - B5 -',
  'A5 - - - G5 - F#5 - E5 - - - C5 - E5 -',
  'D#5/v - - - - - - - F#5 . A5 . B5 - - -',
  'G5/p4 - - - B5 - G5 - E5 - G5 - B5 - C6 -',
  'B5 - A5 - G5 - E5 - G5/v - - - - - E5 -',
  'A5 - - - C6 - - - F5 - A5 - C6 - B5 -',
  'B5/v - - - - - - - A5 - F#5 - D#5 - B4 -',
];
export const A_LEAD_2 = [...A_LEAD.slice(0, 7), 'B5/v - - - - - - - - - - - . . . .'];

// Rising by semitones under a lead that climbs with it, stalling on the dominant.
export const B_CHORDS = ['Am', 'Bb', 'B', 'C', 'C#dim', 'D', 'D#dim', 'B7'];
export const B_LEAD = [
  'E5/v - - - - - - - D5 - C5 - A4 - C5 -',
  'F5/v - - - - - - - D5 - Bb4 - D5 - F5 -',
  'F#5/v - - - - - - - D#5 - B4 - D#5 - F#5 -',
  'G5/v - - - - - - - E5 - C5 - E5 - G5 -',
  'G5 . G5 . E5 - G5 - C#6/p3 - - - G5 - E5 -',
  'A5 . A5 . F#5 - A5 - D6/p3 - - - A5 - F#5 -',
  'A5 . A5 . F#5 - A5 - D#6/p3 - - - C6 - A5 -',
  'B5/v - - - - - - - - - - - F#5 - D#5 -',
];
export const B_LEAD_2 = [...B_LEAD.slice(0, 7), 'B5 - A#5 - A5 - G#5 - G5 - F#5 - F5 - E5 -'];

// E against F, then the dominant of F minor for the key change.
const BREAK_CHORDS = ['Em', 'F', 'Em', 'F', 'Em', 'F', 'C7', 'C7'];
const BREAK_LEAD = [
  R, R, R, R,
  'E5 . . E5 . . G5 . . G5 . . B5 - - -',
  'C6 . . C6 . . A5 . . A5 . . F5 - - -',
  'E5 . . E5 . . G5 . . Bb5 . . C6 - - -',
  'C6/v - - - - - - - Bb5 - G5 - E5 - C5 -',
];

// Out of F minor by climbing semitones, dropping onto B7 for the top of A.
const TURN_CHORDS = ['Db', 'D', 'Eb', 'B7'];
const TURN_LEAD = [
  'F5 - Ab5 - Db6 - - - C6 - Ab5 - F5 - Ab5 -',
  'F#5 - A5 - D6 - - - C#6 - A5 - F#5 - A5 -',
  'G5 - Bb5 - Eb6 - - - D6 - Bb5 - G5 - Bb5 -',
  'F#5 - A5 - B5 - D#6 - B5/v - - - - - - -',
];

export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...section('intro', INTRO_CHORDS, INTRO_LEAD),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('A2', A_CHORDS, A_LEAD_2),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('B2', B_CHORDS, B_LEAD_2),
  ...section('break', BREAK_CHORDS, BREAK_LEAD),
  ...keyed('A', A_CHORDS, A_LEAD, 1),
  ...keyed('A2', A_CHORDS, A_LEAD_2, 1),
  ...section('turn', TURN_CHORDS, TURN_LEAD),
];

const OSTINATO = {
  drive: 'R O F O R O F O R O F O T O F O',
  climb: 'R F O F R F O F R F O F R F O F',
};
const STABS = 'H . . H . . H . . . H . H . . .';
const HELD = 'O - - - - - - - - - - - - - - -';
const TIMPANI = {
  drive: 'R - - - - - - - . . . . F . R .',
  pound: 'R . . R . . R . . R . . R . R R',
  fill: 'R . R . R . R . R R R R R R R R',
};
const BASS = {
  drive: 'R . R . O . R . R . R . O . R .',
  climb: 'R R O R R R O R R R O R R R O R',
  pound: 'R . . R . . R . . R . . R . . .',
};
const KICK = {
  drive: 'C4 . . . . . C4 . C4 . . . . . . .',
  climb: 'C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .',
  pound: 'C4 . . C4 . . C4 . . C4 . . C4 . C4 C4',
};
const SNARE = {
  drive: '. . . . C4 . . . . . . . C4 . . C4',
  climb: '. . . . C4 . . . . . . . C4 . . .',
  fill: 'C4 . C4 . C4 . C4 . C4 C4 C4 C4 C4 C4 C4 C4',
};
const TOMS = {
  drive: '. . H . . . L . . . H . L . . .',
  crash: 'X - - - - - - - . . H . L . L .',
  pound: 'L . L . H . L . L . H . H H L L',
  fill: 'H H H H L L L L . . . . . . . .',
};
const toms = (p) => p.split(' ').map((t) => ({ H: 'C4:htom', L: 'C4:ltom', X: 'C4:crash' })[t] ?? t).join(' ');

const phrase = (b) => (b.part === 'turn' || b.part === 'intro' ? 4 : 8);
const isFill = (b) => b.bar === phrase(b) - 1;
const climbs = (b) => b.part === 'B' || b.part === 'B2';
const pounds = (b) => b.part === 'intro' || (b.part === 'break' && b.bar < 6);

// The eight voices of a form; `pinch` drives every bar as hard as the B section.
export function arrange(form, { pinch = false } = {}) {
  const drive = (b) => (pinch || climbs(b) ? 'climb' : 'drive');
  return {
    v1: form.map((b) => lead(b.lead, 'lead', b.shift - 12)),
    v2: form.map((b) => voice(OSTINATO[drive(b)], b.c, 'ostinato', 12)),
    v3: form.map((b) => (climbs(b) && !pinch ? voice(HELD, b.c, 'slow', 12) : voice(STABS, b.c, 'stab'))),
    v4: form.map((b) => voice(isFill(b) ? TIMPANI.fill : pounds(b) || pinch ? TIMPANI.pound : TIMPANI.drive, b.c, 'timpani')),
    v5: form.map((b) => voice(pounds(b) ? BASS.pound : BASS[drive(b)], b.c, 'bass')),
    v6: form.map((b) => (pounds(b) ? KICK.pound : KICK[drive(b)]).split(' ').map((t) => (t === 'C4' ? 'C4:kick' : t)).join(' ')),
    v7: form.map((b) => {
      if (isFill(b)) return SNARE.fill.replaceAll('C4', 'C4:snare');
      if (pounds(b) && !pinch) return R;
      return SNARE[drive(b)].replaceAll('C4', 'C4:snare');
    }),
    v8: form.map((b) => toms(isFill(b) ? TOMS.fill : b.bar % 4 === 0 ? TOMS.crash : pounds(b) || pinch ? TOMS.pound : TOMS.drive)),
  };
}

// Layers leave and return at section boundaries (docs/research/snes-composition.md §7, gap 1): the
// second A loses its toms for four bars, B starts without the snare, the break without bass or kick.
export function vellumDrops(form) {
  const drops = [];
  form.forEach((b, i) => {
    const voices = [];
    if (b.part === 'A2' && b.bar < 4) voices.push('v8');
    if (b.part === 'B' && b.bar < 4) voices.push('v7');
    if (b.part === 'break' && b.bar < 4) voices.push('v5', 'v6');
    if (voices.length) drops.push({ from: i * BAR_ROWS, to: (i + 1) * BAR_ROWS, voices });
  });
  return drops;
}

export const INSTRUMENTS_USED = {
  lead: { ...INSTRUMENTS.brass, adsr: [14, 3, 6, 8], vol: 112, vibrato: { delay: 8, period: 9, depth: 0.35 }, glide: 4 },
  ostinato: { ...INSTRUMENTS.strings, adsr: [14, 5, 4, 12], vol: 58 },
  stab: { ...INSTRUMENTS.brass, adsr: [14, 5, 3, 16], vol: 64 },
  slow: { ...INSTRUMENTS.slowstr, vol: 60 },
  timpani: { ...INSTRUMENTS.timpani, vol: 108 },
  bass: { ...INSTRUMENTS.synbass, vol: 96 },
  kick: { ...INSTRUMENTS.gkick, vol: 112 },
  snare: { ...INSTRUMENTS.gsnare, vol: 90 },
  htom: { ...INSTRUMENTS.htom, vol: 96 },
  ltom: { ...INSTRUMENTS.ltom, vol: 104 },
  crash: { ...INSTRUMENTS.crash, vol: 62 },
};

const parts = arrange(FORM);

export default {
  tempo: 6,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 60, room: 'studio', evol: 34 },
  instruments: INSTRUMENTS_USED,
  drops: vellumDrops(FORM),
  v1: { rows: bars(parts.v1, BAR_ROWS), pan: -20 },
  v2: { rows: bars(parts.v2, BAR_ROWS), pan: 60 },
  v3: { rows: bars(parts.v3, BAR_ROWS), pan: -60 },
  v4: { rows: bars(parts.v4, BAR_ROWS) },
  v5: { rows: bars(parts.v5, BAR_ROWS) },
  v6: { rows: bars(parts.v6, BAR_ROWS) },
  v7: { rows: bars(parts.v7, BAR_ROWS), pan: 12 },
  v8: { rows: bars(parts.v8, BAR_ROWS), pan: -30 },
};

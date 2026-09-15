// Bellwether bound to the Great Seal, the final boss (item 2225). Three phases, three songs, each its own
// sound (Tim, 16:00 EDT 09-15: "phase 1 should be super ominous. 2nd is frantic. 3 is epic climax").
// Phase 1, this file: C minor at 100 bpm, no ostinato. A low string line creeps over held organ chords, the
// pedal stop and a low choir, a bell tolls every other bar, and timpani and kick beat like a heart; Db and
// a tritone Gb against C keep it from ever settling. bellwether-2.mjs is the frantic phase, bellwether-3.mjs
// the climax. The organ is up front in all three, the pedal stop holding the bass (item 2247).
//
// Phase 1: v1 string lead | v2 organ | v3 low choir | v4 timpani heartbeat | v5 organ pedal | v6 kick |
// v7 low tom | v8 bell

import { bars, rest, section, voice } from './chase-kit.mjs';
import { lead } from './vellum.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);

// A section moved `shift` semitones. section()'s own shift runs the lead through kit.transpose, which
// mangles expression marks and then lead() shifts it a second time, so only the chords move here.
export const keyed = (part, chords, leads, shift = 0) =>
  section(part, chords, leads).map((b) => ({ ...b, c: { ...b.c, root: b.c.root + shift }, shift }));

const INTRO_CHORDS = ['Cm', 'Cm', 'Db', 'G7'];
const INTRO_LEAD = [R, R, R, 'G3/v - - - - - - - - - - - - - - -'];

const OMEN_CHORDS = ['Cm', 'Db', 'Cm', 'Gb', 'Cm', 'Db', 'Fm', 'G7'];
const OMEN_LEAD = [
  'C4/v - - - - - - - - - - - Db4 - - -',
  'C4/v - - - - - - - - - - - . . . .',
  'G3 - - - Ab3 - - - B3/v - - - - - - -',
  'C4/v - - - - - - - - - - - . . . .',
  'Eb4/v - - - - - - - D4 - - - Db4 - - -',
  'C4/v - - - - - - - - - - - . . . .',
  'F4/v - - - - - - - Eb4 - - - Db4 - - -',
  'B3/v - - - - - - - - - - - - - - -',
];

const DREAD_CHORDS = ['Ab', 'G7', 'Ab', 'Gb', 'Cm', 'Gb', 'Fm', 'G7'];
const DREAD_LEAD = [
  'Eb4/v - - - - - - - - - - - F4 - - -',
  'D4/v - - - - - - - - - - - . . . .',
  'Eb4/v - - - - - - - - - - - Gb4 - - -',
  'F4/v - - - - - - - - - - - . . . .',
  'G4/v - - - - - - - Ab4 - - - G4 - - -',
  'Gb4/v - - - - - - - - - - - . . . .',
  'F4/v - - - - - - - Eb4 - - - D4 - - -',
  'D4/v - - - - - - - B3 - - - G3 - - -',
];

// The frantic phase's material, shared with bellwether-2.mjs.
export const A_CHORDS = ['Cm', 'Ab', 'Fm', 'G7', 'Cm', 'Db', 'Bb', 'G7'];
export const A_LEAD_2 = [
  'C4 . C4 . Eb4 - G4 - C5 - - - B4 - G4 -',
  'Ab4/v - - - - - - - C5 . Ab4 . Eb4 - F4 -',
  'F4 - - Ab4 C5 - - - Ab4 - F4 - C4 - Eb4 -',
  'D4/v - - - - - - - F4 . G4 . Ab4 - B4 -',
  'C5/p4 - - - G4 - Eb4 - C4 - Eb4 - G4 - C5 -',
  'Db5 - C5 - Ab4 - F4 - Db4 - F4 - Ab4 - Db5 -',
  'Bb4 - - - D5 - - - F4 - Bb4 - D5 - C5 -',
  'B4/v - - - - - - - - - - - . . . .',
];
export const B_CHORDS = ['Fm', 'Gb', 'G', 'Ab', 'Adim', 'Bb', 'Bdim', 'G7'];
export const B_LEAD_2 = [
  'C5/v - - - - - - - Ab4 - F4 - C4 - F4 -',
  'Db5/v - - - - - - - Bb4 - Gb4 - Db4 - Gb4 -',
  'D5/v - - - - - - - B4 - G4 - D4 - G4 -',
  'Eb5/v - - - - - - - C5 - Ab4 - Eb4 - Ab4 -',
  'C5 . C5 . A4 - C5 - Eb5/p3 - - - C5 - A4 -',
  'D5 . D5 . Bb4 - D5 - F4/p3 - - - Bb4 - D5 -',
  'D5 . D5 . B4 - D5 - Ab4 - - - B4 - D5 -',
  'D5 - Db5 - C5 - B4 - Bb4 - A4 - Ab4 - G4 -',
];

export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...keyed('intro', INTRO_CHORDS, INTRO_LEAD),
  ...keyed('A', OMEN_CHORDS, OMEN_LEAD),
  ...keyed('B', DREAD_CHORDS, DREAD_LEAD),
  ...keyed('A', OMEN_CHORDS, OMEN_LEAD),
  ...keyed('B', DREAD_CHORDS, DREAD_LEAD),
];

const tom = (p) => p.split(' ').map((t) => ({ H: 'C4:htom', L: 'C4:ltom', X: 'C4:crash' })[t] ?? t).join(' ');
const drum = (p, inst) => p.replaceAll('C4', `C4:${inst}`);
const phrase = (b) => (b.part === 'intro' ? 4 : 8);
const isFill = (b) => b.bar === phrase(b) - 1;

const OMEN = {
  organ: 'R - - - - - - - F - - - T - - -',
  choir: 'T - - - - - - - - - - - - - - -',
  heart: 'R . . R . . . . . . . . . . . .',
  roll: 'R R R R R R R R R R R R R R R R',
  pedal: 'R - - - - - - - - - - - - - - -',
  kick: 'C4 . . C4 . . . . . . . . . . . .',
  knock: '. . . . . . . . . . . . L . . .',
  rumble: 'L . L . L . L . L L L L L L L L',
  toll: 'O - - - - - - - . . . . . . . .',
};
const FRANTIC = {
  organ: 'R T F O R T F O R T F O R T F O',
  hits: 'H . . H . . H . . H . . H . H .',
  timpani: 'R . . . R . . . R . . . R . R R',
  bass: 'R - R - O - R - R - R - O - R -',
  kick: 'C4 . C4 . C4 . C4 . C4 . C4 . C4 . C4 .',
  snare: '. . . . C4 . . C4 . . C4 . C4 . C4 C4',
  roll: 'C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4',
  toms: 'H . L . H . L . H . L . H H L L',
};
const EPIC = {
  organ: 'R O F O R O F O R O F O R O F O',
  choir: 'O - - - - - - - U - - - - - - -',
  timpani: 'R . . R . . R . R . R . R R R R',
  pedal: 'R - - - - - - - O - - - R - - -',
  kick: 'C4 . . . C4 . . . C4 . . . C4 . . .',
  snare: '. . . . C4 . . . . . . . C4 . C4 C4',
  fill: 'C4 . C4 . C4 . C4 . C4 C4 C4 C4 C4 C4 C4 C4',
  crash: 'X - - - . . . . . . H . L . L L',
  toms: '. . . . . . . . . . H . L . L L',
};

const ARRANGE = {
  1: (b) => ({
    v1: lead(b.lead, 'lead', b.shift),
    v2: voice(OMEN.organ, b.c, 'organ', 12),
    v3: voice(OMEN.choir, b.c, 'choir', 12),
    v4: voice(isFill(b) ? OMEN.roll : OMEN.heart, b.c, 'timpani'),
    v5: voice(OMEN.pedal, b.c, 'pedal'),
    v6: drum(OMEN.kick, 'kick'),
    v7: tom(isFill(b) ? OMEN.rumble : OMEN.knock),
    v8: b.bar % 2 === 0 ? voice(OMEN.toll, b.c, 'bell', 12) : R,
  }),
  2: (b) => ({
    v1: lead(b.lead, 'lead', b.shift),
    v2: voice(FRANTIC.organ, b.c, 'organ', 12),
    v3: voice(FRANTIC.hits, b.c, 'hit'),
    v4: voice(FRANTIC.timpani, b.c, 'timpani'),
    v5: voice(FRANTIC.bass, b.c, 'pedal'),
    v6: drum(FRANTIC.kick, 'kick'),
    v7: drum(isFill(b) ? FRANTIC.roll : FRANTIC.snare, 'snare'),
    v8: tom(FRANTIC.toms),
  }),
  3: (b) => ({
    v1: lead(b.lead, 'lead', b.shift),
    v2: voice(EPIC.organ, b.c, 'organ', 12),
    v3: voice(EPIC.choir, b.c, 'choir', 12),
    v4: voice(EPIC.timpani, b.c, 'timpani'),
    v5: voice(EPIC.pedal, b.c, 'pedal'),
    v6: drum(EPIC.kick, 'kick'),
    v7: drum(isFill(b) ? EPIC.fill : EPIC.snare, 'snare'),
    v8: tom(b.bar % 2 === 0 ? EPIC.crash : EPIC.toms),
  }),
};

export function arrange(form, { phase = 1 } = {}) {
  const rows = form.map(ARRANGE[phase]);
  return Object.fromEntries(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'].map((v) => [v, rows.map((r) => r[v])]));
}

const SETTINGS = {
  1: {
    tempo: 9,
    echo: { mvol: 60, room: 'hall', evol: 44 },
    instruments: {
      lead: { ...INSTRUMENTS.strings, adsr: [12, 3, 6, 6], vol: 104, vibrato: { delay: 12, period: 11, depth: 0.3 } },
      organ: { ...INSTRUMENTS.organ, adsr: [10, 2, 6, 2], vol: 100 },
      choir: { ...INSTRUMENTS.choir, vol: 70 },
      timpani: { ...INSTRUMENTS.timpani, vol: 116 },
      pedal: { ...INSTRUMENTS.pedal, adsr: [11, 3, 7, 2], vol: 124 },
      kick: { ...INSTRUMENTS.gkick, vol: 108 },
      ltom: { ...INSTRUMENTS.ltom, vol: 100 },
      bell: { ...INSTRUMENTS.bell, vol: 84 },
    },
  },
  2: {
    tempo: 5,
    echo: { mvol: 60, room: 'studio', evol: 32 },
    instruments: {
      lead: { ...INSTRUMENTS.strings, adsr: [14, 3, 6, 10], vol: 108, glide: 3 },
      organ: { ...INSTRUMENTS.organ, adsr: [15, 5, 5, 14], vol: 96 },
      hit: { ...INSTRUMENTS.orch, vol: 70 },
      timpani: { ...INSTRUMENTS.timpani, vol: 110 },
      pedal: { ...INSTRUMENTS.pedal, adsr: [15, 4, 6, 12], vol: 120 },
      kick: { ...INSTRUMENTS.gkick, vol: 112 },
      snare: { ...INSTRUMENTS.gsnare, vol: 92 },
      htom: { ...INSTRUMENTS.htom, vol: 92 },
      ltom: { ...INSTRUMENTS.ltom, vol: 100 },
    },
  },
  3: {
    tempo: 7,
    echo: { mvol: 62, room: 'hall', evol: 38 },
    instruments: {
      lead: { ...INSTRUMENTS.brass, adsr: [13, 3, 6, 6], vol: 112, vibrato: { delay: 10, period: 9, depth: 0.35 }, glide: 4 },
      organ: { ...INSTRUMENTS.organ, adsr: [14, 4, 6, 8], vol: 94 },
      choir: { ...INSTRUMENTS.choir, vol: 76 },
      timpani: { ...INSTRUMENTS.timpani, vol: 118 },
      pedal: { ...INSTRUMENTS.pedal, adsr: [13, 3, 7, 3], vol: 124 },
      kick: { ...INSTRUMENTS.gkick, vol: 112 },
      snare: { ...INSTRUMENTS.gsnare, vol: 94 },
      htom: { ...INSTRUMENTS.htom, vol: 96 },
      ltom: { ...INSTRUMENTS.ltom, vol: 104 },
      crash: { ...INSTRUMENTS.crash, vol: 64 },
    },
  },
};

// One phase's song: the form's voices with that phase's tempo, room and instruments.
export function phaseSong(form, phase, extra = {}) {
  const parts = arrange(form, { phase });
  const pan = { v1: -20, v2: 50, v3: -50, v7: 12, v8: 30 };
  return {
    loop: 0,
    drops: [],
    ...SETTINGS[phase],
    ...extra,
    ...Object.fromEntries(Object.entries(parts).map(([v, list]) => [v, { rows: bars(list, BAR_ROWS), ...(pan[v] ? { pan: pan[v] } : {}) }])),
  };
}

// The intro opens on the organ, choir and bell before the heartbeat starts.
const drops = [{ from: 0, to: 2 * BAR_ROWS, voices: ['v4', 'v5', 'v6', 'v7'] }];

export default phaseSong(FORM, 1, { loop: LOOP_BAR * BAR_ROWS, drops });

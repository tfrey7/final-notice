// Stage 5, the executive chapel brawl (item 2225). D minor at 129 bpm, pipe organ first (Tim, 16:05 EDT
// 09-15: "Needs more pipe organ music"): the melody on the church organ, organ figuration churning under
// it, an organ pedal for the bass, a held choir, a bell tolling at each phrase head, and timpani, toms,
// kick and snare keeping the fight moving. Phrygian Eb against D in A2, a lift to the relative major in B
// where the choir opens up, and a break where the organ, choir and bell stand alone.
//
// v1 organ lead | v2 organ figuration | v3 choir | v4 bell and timpani | v5 organ pedal | v6 kick |
// v7 snare | v8 toms and crash

import { bars, rest, section, voice } from './chase-kit.mjs';
import { lead } from './vellum.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);

const INTRO_CHORDS = ['Dm', 'Dm', 'Bb', 'A7'];
const INTRO_LEAD = [R, R, 'D5/v - - - - - - - - - - - C#5 - - -', 'E5/v - - - - - - - D5 - C#5 - A4 - E4 -'];

const A_CHORDS = ['Dm', 'Bb', 'Gm', 'A7', 'Dm', 'F', 'Gm', 'A7'];
const A_LEAD = [
  'D5 - A4 - F4 - A4 - D5 - E5 - F5/v - - -',
  'F5 - D5 - Bb4 - D5 - F5 - G5 - F5 - D5 -',
  'Eb5/v - - - D5 - - - Bb4 - A4 - G4 - Bb4 -',
  'A4 - C#5 - E5 - G5/v - - - F5 - E5 - C#5 -',
  'D5 . D5 . F5 . D5 . A5/v - - - G5 - F5 -',
  'E5 - F5 - C5 - A4 - F4 - A4 - C5 - F5 -',
  'G5 - F5 - Eb5 - D5 - C5 - Bb4 - A4 - G4 -',
  'A4/v - - - - - - - C#5 - E5 - A5/v - - -',
];
const A_LEAD_END = [...A_LEAD.slice(0, 7), 'A4/v - - - - - - - - - - - . . . .'];

const A2_CHORDS = ['Dm', 'Eb', 'Dm', 'Eb', 'Gm', 'Bb', 'Gm', 'A7'];
const A2_LEAD = [
  'A5/v - - - F5 - D5 - A4 - D5 - F5 - A5 -',
  'G5/v - - - Eb5 - Bb4 - G4 - Bb4 - Eb5 - G5 -',
  'F5/v - - - D5 - A4 - F4 - A4 - D5 - F5 -',
  'Eb5/v - - - - - - - D5 - Bb4 - G4 - Eb4 -',
  'D5 . D5 . G5 . D5 . Bb5/v - - - A5 - G5 -',
  'F5 - D5 - Bb4 - D5 - F5 - Bb5 - A5 - F5 -',
  'G5 - D5 - Bb4 - G4 - Eb5 - D5 - C#5 - Bb4 -',
  'A4/v - - - - - - - E4 - G4 - A4 - C#5 -',
];

const B_CHORDS = ['Bb', 'F', 'Gm', 'Dm', 'Bb', 'C', 'A7', 'A7'];
const B_LEAD = [
  'D5/v - - - - - - - F5 - - - Bb5 - - -',
  'A5/v - - - - - - - C5 - - - F5 - - -',
  'G5/v - - - - - - - Bb4 - - - D5 - - -',
  'F5/v - - - - - - - A4 - - - D5 - - -',
  'D5 - F5 - Bb5/v - - - A5 - G5 - F5 - D5 -',
  'E5 - G5 - Bb5/v - - - A5 - G5 - E5 - C5 -',
  'C#5 - E5 - A5/v - - - G5 - F5 - E5 - C#5 -',
  'A4/v - - - - - - - - - - - . . . .',
];

const BREAK_CHORDS = ['Dm', 'Eb', 'Dm', 'Eb', 'Dm', 'Eb', 'Gm', 'A7'];
const BREAK_LEAD = [
  R, R, R, R,
  'D5 . . D5 . . F5 . . F5 . . A5/v - - -',
  'G5 . . G5 . . Eb5 . . Eb5 . . Bb4/v - - -',
  'D5 . . D5 . . G5 . . Bb5 . . A5 - G5 -',
  'A4 - C#5 - E5 - G5 - A5 - G5 - E5 - C#5 -',
];

const TURN_CHORDS = ['Gm', 'A7', 'Bb', 'A7'];
const TURN_LEAD = [
  'Bb4 - D5 - G5/v - - - F5 - D5 - Bb4 - D5 -',
  'C#5 - E5 - A5/v - - - G5 - E5 - C#5 - E5 -',
  'D5 - F5 - Bb5/v - - - A5 - F5 - D5 - F5 -',
  'E5/v - - - - - - - C#5 - A4 - E4 - . .',
];

export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...section('intro', INTRO_CHORDS, INTRO_LEAD),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('A2', A2_CHORDS, A2_LEAD),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('break', BREAK_CHORDS, BREAK_LEAD),
  ...section('A', A_CHORDS, A_LEAD_END),
  ...section('turn', TURN_CHORDS, TURN_LEAD),
];

const FIGURATION = {
  drive: 'R F O F T F O F R F O F T F O F',
  open: 'H - - - - - - - U - - - - - - -',
};
const CHOIR = {
  drive: 'O - - - - - - - - - - - - - - -',
  open: 'H - - - - - - - U - - - - - - -',
};
const TOLL = 'O - - - - - - - . . . . . . . .';
const TIMPANI = {
  drive: 'R - - - . . . . . . . . F . R .',
  fill: 'R . R . R . R . R R R R R R R R',
};
const PEDAL = {
  drive: 'R - - - - - - - R - - - O - - -',
  open: 'R - - - - - - - F - - - - - - -',
};
const KICK = {
  drive: 'C4 . . . . . C4 . . . C4 . . . . .',
  pound: 'C4 . . C4 . . C4 . . C4 . . C4 . C4 C4',
};
const SNARE = {
  drive: '. . . . C4 . . . . . . . C4 . . .',
  fill: 'C4 . C4 . C4 . C4 . C4 C4 C4 C4 C4 C4 C4 C4',
};
const TOMS = {
  drive: '. . . . . . L . . . H . . . . .',
  crash: 'X - - - . . . . . . H . L . . .',
  fill: 'H H H H L L L L . . . . . . . .',
};
const toms = (p) => p.split(' ').map((t) => ({ H: 'C4:htom', L: 'C4:ltom', X: 'C4:crash' })[t] ?? t).join(' ');

const phrase = (b) => (b.part === 'turn' || b.part === 'intro' ? 4 : 8);
const isFill = (b) => b.bar === phrase(b) - 1;
const opens = (b) => b.part === 'B';
const pounds = (b) => b.part === 'intro' || b.part === 'break';

export function arrange(form) {
  return {
    v1: form.map((b) => lead(b.lead, 'lead')),
    v2: form.map((b) => voice(FIGURATION[opens(b) ? 'open' : 'drive'], b.c, 'arp', 12)),
    v3: form.map((b) => voice(CHOIR[opens(b) || pounds(b) ? 'open' : 'drive'], b.c, 'choir', 12)),
    v4: form.map((b) => (isFill(b) ? voice(TIMPANI.fill, b.c, 'timpani') : b.bar % 4 === 0 ? voice(TOLL, b.c, 'bell', 24) : voice(TIMPANI.drive, b.c, 'timpani'))),
    v5: form.map((b) => voice(PEDAL[opens(b) ? 'open' : 'drive'], b.c, 'pedal')),
    v6: form.map((b) => (pounds(b) ? KICK.pound : KICK.drive).replaceAll('C4', 'C4:kick')),
    v7: form.map((b) => (isFill(b) ? SNARE.fill : SNARE.drive).replaceAll('C4', 'C4:snare')),
    v8: form.map((b) => toms(isFill(b) ? TOMS.fill : b.bar % 4 === 0 ? TOMS.crash : TOMS.drive)),
  };
}

// Contrast by subtraction: A2 loses its toms for four bars, B starts without the snare, and the break
// opens on organ, choir, bell and timpani with the kit gone.
export function chapelDrops(form) {
  const drops = [];
  form.forEach((b, i) => {
    const voices = [];
    if (b.part === 'A2' && b.bar < 4) voices.push('v8');
    if (b.part === 'B' && b.bar < 4) voices.push('v7');
    if (b.part === 'break' && b.bar < 4) voices.push('v6', 'v7', 'v8');
    if (voices.length) drops.push({ from: i * BAR_ROWS, to: (i + 1) * BAR_ROWS, voices });
  });
  return drops;
}

export const INSTRUMENTS_USED = {
  lead: { ...INSTRUMENTS.organ, adsr: [14, 4, 7, 6], vol: 110, vibrato: { delay: 14, period: 12, depth: 0.12 } },
  arp: { ...INSTRUMENTS.organ, adsr: [15, 5, 5, 12], vol: 56 },
  choir: { ...INSTRUMENTS.choir, vol: 74 },
  bell: { ...INSTRUMENTS.bell, vol: 76 },
  timpani: { ...INSTRUMENTS.timpani, vol: 100 },
  pedal: { ...INSTRUMENTS.organ, adsr: [13, 2, 7, 6], vol: 104 },
  kick: { ...INSTRUMENTS.gkick, vol: 104 },
  snare: { ...INSTRUMENTS.gsnare, vol: 84 },
  htom: { ...INSTRUMENTS.htom, vol: 88 },
  ltom: { ...INSTRUMENTS.ltom, vol: 96 },
  crash: { ...INSTRUMENTS.crash, vol: 56 },
};

const parts = arrange(FORM);

export default {
  tempo: 7,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 60, room: 'hall', evol: 44 },
  instruments: INSTRUMENTS_USED,
  drops: chapelDrops(FORM),
  v1: { rows: bars(parts.v1, BAR_ROWS), pan: -12 },
  v2: { rows: bars(parts.v2, BAR_ROWS), pan: 50 },
  v3: { rows: bars(parts.v3, BAR_ROWS), pan: -50 },
  v4: { rows: bars(parts.v4, BAR_ROWS), pan: 20 },
  v5: { rows: bars(parts.v5, BAR_ROWS) },
  v6: { rows: bars(parts.v6, BAR_ROWS) },
  v7: { rows: bars(parts.v7, BAR_ROWS), pan: 12 },
  v8: { rows: bars(parts.v8, BAR_ROWS), pan: -30 },
};

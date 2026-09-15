// Stage 3, the Backrooms (item 2224): B minor at 129 bpm, the same office after hours, again and again.
// A Rhodes lead states a climbing four-note figure that comes back a semitone wrong (Bm to C, and the
// second time its C sharp sags to C natural against the chord). The A phrase is seven bars, so the loop
// never lands where the ear expects. B turns to a muzak-sweet Gmaj7 wash that sours on C and F#7. A slow
// string hum wobbles under everything like a fluorescent tube; the hats type in uneven bursts; a bell
// dings like a carriage return, and in the breakdown a phone rings that nobody answers. No brass.
//
// v1 Rhodes lead, strings in B | v2 wobbling string hum | v3 synth bass | v4 low piano stabs, pad in B |
// v5 kick | v6 snare and fills | v7 typewriter hats | v8 bell

import { bars, hats, rest, section, voice } from './chase-kit.mjs';
import { tag, vibrato } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);

const INTRO_CHORDS = ['Bm', 'C', 'Bm', 'C'];

const A_CHORDS = ['Bm', 'Bm', 'G', 'F#', 'Bm', 'C', 'F#7'];
const A_LEAD = [
  'F#4 - B4 - C#5 - D5 - - . C#5 - B4 - F#4 -',
  'A4/v - - - - - - - . . F#4 . A4 . B4 .',
  'D5 - - . D5 . B4 - G4 - - . B4 - D5 -',
  'C#5/v - - - - - - - A#4 - - - F#4 - - -',
  'F#4 - B4 - C#5 - D5 - - . C#5 - B4 - F#4 -',
  'G4 - C5 - D5 - E5 - - . D5 - C5 - G4 -',
  'A#4 - - - C#5 - - - E5/v - - - - - - -',
];
// The second time round the room is wrong: the figure's C sharp sags to C.
const A_LEAD_2 = A_LEAD.map((bar, i) => (i === 4 ? 'F#4 - B4 - C5 - D5 - - . C5 - B4 - F#4 -' : bar));

const B_CHORDS = ['Gmaj7', 'F#m7', 'Em7', 'Dmaj7', 'Gmaj7', 'F#m7', 'C', 'F#7'];
const B_LEAD = [
  'B4/v - - - - - - - A4 - - - F#4 - - -',
  'A4/v - - - - - - - - - - - C#5 - - -',
  'G4/v - - - - - - - F#4 - E4 - D4 - E4 -',
  'F#4/v - - - - - - - - - - - . . . .',
  'B4/v - - - - - - - D5 - - - C#5 - - -',
  'A4/v - - - - - - - E5 - - - C#5 - - -',
  'C5/v - - - - - - - - - - - B4 - G4 -',
  'A#4/v - - - - - - - - - - - . . . .',
];

const BREAK_CHORDS = ['Bm', 'C', 'Bm', 'C', 'Bm', 'F#7'];
const BREAK_LEAD = [R, R,
  'F#4 - B4 - C#5 - D5 - . . . . . . . .',
  R,
  'F#4 - B4 - C5 - D5 - . . . . . . . .',
  'A#4 - - - C#5 - - - E5 - - - F#5 - - -',
];

const TURN_CHORDS = ['C', 'F#7'];
const TURN_LEAD = [
  'G4 - C5 - E5 - G5 - E5 - C5 - G4 - E4 -',
  'F#4/v - - - - - - - E4 - C#4 - A#3 - C#4 -',
];

export const LOOP_BAR = INTRO_CHORDS.length;
export const FORM = [
  ...section('intro', INTRO_CHORDS, [R, R, R, R]),
  ...section('A', A_CHORDS, A_LEAD),
  ...section('A2', A_CHORDS, A_LEAD_2),
  ...section('B', B_CHORDS, B_LEAD),
  ...section('break', BREAK_CHORDS, BREAK_LEAD),
  ...section('A3', A_CHORDS, A_LEAD_2),
  ...section('turn', TURN_CHORDS, TURN_LEAD),
];

const PHRASE = { intro: 4, A: 7, A2: 7, B: 8, break: 6, A3: 7, turn: 2 };
const isFill = (b) => b.bar === PHRASE[b.part] - 1;
const bare = (b) => (b.part === 'intro' && b.bar < 2) || (b.part === 'break' && b.bar < 4);

const marked = (rows, inst) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? t.replace(/^[^/]+/, `$&:${inst}`) : t)).join(' ');
const v1 = FORM.map((b) => marked(b.lead, b.part === 'B' ? 'sing' : 'lead'));

const v2 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar === 0) return R;
  return voice(b.part === 'B' ? 'R - - - - - - - - - - - - - - -' : 'T - - - - - - - - - - - - - - -', b.c, 'hum', 12);
});

const BASS = {
  thin: 'R - - . . . . . R - - . . . . .',
  drive: 'R . R . O . R R . R O . R . F .',
  B: 'R - - . R . . R - - . R . . F -',
  fill: 'R . R . O . R . F F S S O O O O',
};
const v3 = FORM.map((b) => {
  if (bare(b) || b.part === 'intro') return voice(BASS.thin, b.c, 'bass');
  if (isFill(b)) return voice(BASS.fill, b.c, 'bass');
  return voice(b.part === 'B' ? BASS.B : BASS.drive, b.c, 'bass');
});

const v4 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar < 2) return R;
  if (b.part === 'B') return voice('R - - - T - - - F - - - T - - -', b.c, 'pad', 12);
  return voice('T . . . . . . T . . . . F . . .', b.c, 'stab', 12);
});

const KICK = {
  one: 'C4 . . . . . . . C4 . . . . . . .',
  drive: 'C4 . . . . . . C4 . . C4 . . . . .',
  B: 'C4 . . . . . . . C4 . C4 . . . . .',
};
const v5 = FORM.map((b) => {
  if (b.part === 'intro' && b.bar < 2) return R;
  return tag(bare(b) || b.part === 'intro' ? KICK.one : b.part === 'B' ? KICK.B : KICK.drive, 'kick');
});

const v6 = FORM.map((b) => {
  if (b.part === 'intro' ? b.bar < 3 : bare(b)) return R;
  if (isFill(b)) return tag('. . . . C4 . . . C4 . C4 C4 C4 C4 C4 C4', 'snare');
  return '. . . . C4:snare . . . . . . . C4:snare . . C4:snare/@40';
});

// A typist who keeps stopping: uneven bursts, never the same two bars running.
const TYPING = ['c c . c . . c c c . . c . c c o', 'c . c c c . . c . c c . c . c .'];
const v7 = FORM.map((b) => {
  if (b.part === 'intro' || bare(b)) return hats(b.bar % 2 ? 'c c c . . c c c c c . . . . . .' : R);
  return hats(TYPING[b.bar % 2]);
});

const v8 = FORM.map((b) => {
  if (b.part === 'break' && b.bar % 2 === 1) return voice('O . O . O . O . . . . . . . . .', b.c, 'bell', 24);
  if (b.bar === 0 || (b.part === 'intro' && b.bar === 2)) return voice('U - - - . . . . . . . . . . . .', b.c, 'bell', 24);
  return R;
});

export default {
  tempo: 7,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 48, room: 'room', evol: 32 },
  instruments: {
    lead: { ...INSTRUMENTS.epiano, vol: 104, vibrato: { delay: 16, period: 16, depth: 0.15 } },
    sing: { ...INSTRUMENTS.strings, adsr: [11, 4, 6, 8], vol: 86, vibrato: { delay: 14, period: 14, depth: 0.2 } },
    hum: { ...INSTRUMENTS.slowstr, vol: 42, pitch: vibrato(0.3, 40, 0) },
    bass: { ...INSTRUMENTS.synbass, adsr: [15, 5, 4, 20], vol: 96 },
    stab: { ...INSTRUMENTS.piano, vol: 58 },
    pad: { ...INSTRUMENTS.epiano, vol: 46 },
    kick: { ...INSTRUMENTS.gkick, vol: 104 },
    snare: { ...INSTRUMENTS.gsnare, vol: 84 },
    chat: { ...INSTRUMENTS.chat, vol: 26 },
    ohat: { ...INSTRUMENTS.ohat, vol: 20 },
    bell: { ...INSTRUMENTS.bell, vol: 34 },
  },
  v1: { rows: bars(v1, BAR_ROWS), pan: -20 },
  v2: { rows: bars(v2, BAR_ROWS), pan: 60 },
  v3: { rows: bars(v3, BAR_ROWS) },
  v4: { rows: bars(v4, BAR_ROWS), pan: 40 },
  v5: { rows: bars(v5, BAR_ROWS) },
  v6: { rows: bars(v6, BAR_ROWS), pan: 10 },
  v7: { rows: bars(v7, BAR_ROWS), pan: -40 },
  v8: { rows: bars(v8, BAR_ROWS), pan: -60 },
};

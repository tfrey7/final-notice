// Stage 1, the Service Floor after hours (item 2194): Tim's pick of the "Corner Office" sketch, with the
// piano taken off the tune. F# minor at about 112 bpm, sixteen rows a bar: a string lead sings a 3-3-2
// hook that climbs, holds and falls over Rhodes broken chords and a sliding fretless bass, lifts to
// the relative major, thins to a timpani breakdown, lifts again higher and comes home. 64 bars,
// about 2:17, looping to the top of the first hook.
//
// v1 string lead | v2 Rhodes broken chords | v3 slow string pad | v4 sub-bass | v5 kick | v6 snare,
// clap, toms and timpani | v7 hats and crash | v8 string shadow of the lead, bell at the edges

import { noteToMidi } from '../../../audio/apu.mjs';
import { bars, rest, triad, voice } from './chase-kit.mjs';
import { lead } from './vellum.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const R = rest(BAR_ROWS);
const hit = (pattern, map) => pattern.split(' ').map((t) => map[t] ?? t).join(' ');

const PROG = ['F#m7', 'Dmaj7', 'Bm7', 'C#7'];
const HOOK = [
  'F#5 - - C#5 - - E5 - - F#5 - - A5 - G#5 -',
  'F#5 - - - - - - - . . C#5 - E5 - F#5 -',
  'D5 - - A4 - - B4 - - D5 - - F#5 - E5 -',
  'F5 - - - - - - - G#5 - - - C#5 - - -',
];
const HOOK8 = [...HOOK, ...HOOK.slice(0, 3), 'C#5 - - - - - - - C#5/b-1 - - - . . . .'];

const LIFT = {
  chords: ['Dmaj7', 'E', 'C#m7', 'C#7', 'Dmaj7', 'E', 'F#m7', 'C#7'],
  lead: [
    'A5 - - - - - F#5 - - - - - C#6 - - -',
    'B5 - - - - - G#5 - - - - - E5 - - -',
    'G#5 - - - - - E5 - - - - - B5 - A5 -',
    'G#5 - - - - - - - F5 - - - C#5 - - -',
    'A5 - - - - - F#5 - - - - - C#6 - - -',
    'B5 - - - - - G#5 - - - - - E6 - - -',
    'C#6 - - - - - B5 - - - - - A5 - G#5 -',
    'G#5 - - - - - - - - - - - . . . .',
  ],
};

// The breakdown: the hook's first notes alone and slow over a pedal, the drums down to timpani.
const BREAK = {
  chords: ['Bm7', 'Bm7', 'Dmaj7', 'Dmaj7', 'Bm7', 'Bm7', 'C#7', 'C#7'],
  lead: [
    'F#5 - - - - - - - - - - - - - - -', R,
    'E5 - - - - - - - C#5 - - - - - - -', R,
    'D5 - - - - - - - F#5 - - - A5 - - -', 'B5 - - - - - - - - - - - - - - -',
    'G#5 - - - - - - - F5 - - - - - - -', 'C#5 - - - - - - - . . . . . . . .',
  ],
};

const OUTRO = [
  'F#5 - - - - - - - - - - - . . C#5 -',
  'A5 - - - - - - - G#5 - - - F#5 - - -',
  'D5 - - - - - - - E5 - - - F#5 - - -',
  'G#5 - - - - - - - F5 - - - C#5 - - -',
];

const section = (part, chords, tunes, pass = 0) => chords.map((s, bar) => ({ part, bar, pass, c: triad(s), tune: tunes[bar] }));

export const LOOP_BAR = 4;
export const FORM = [
  ...section('intro', PROG, [R, R, R, R]),
  ...section('A', [...PROG, ...PROG], HOOK8),
  ...section('lift', LIFT.chords, LIFT.lead),
  ...section('A', [...PROG, ...PROG], HOOK8, 1),
  ...section('break', BREAK.chords, BREAK.lead),
  ...section('lift', LIFT.chords, LIFT.lead, 1),
  ...section('A', [...PROG, ...PROG], HOOK8, 2),
  ...section('A', [...PROG, ...PROG], HOOK8, 3),
  ...section('outro', PROG, OUTRO),
];

const at = (b) => FORM.indexOf(b) * BAR_ROWS;
const last = (b) => b.bar === (b.part === 'intro' || b.part === 'outro' ? 3 : 7);

// Long notes sing with a late vibrato and a leap of a fifth or more slides in.
function ornament(rows) {
  let prev = null;
  return rows.map((row) => {
    const tokens = row.split(' ');
    return tokens.map((t, i) => {
      if (!/^[A-G]/.test(t)) return t;
      let holds = 0;
      while (tokens[i + 1 + holds] === '-') holds++;
      const midi = noteToMidi(t.split('/')[0]);
      let marked = t;
      if (prev !== null && Math.abs(midi - prev) >= 7 && !t.includes('/p')) marked += '/p3';
      if (holds >= 5 && !t.includes('/v') && !t.includes('/b')) marked += '/v14';
      prev = midi;
      return marked;
    }).join(' ');
  });
}

const tunes = ornament(FORM.map((b) => b.tune));
const v1 = tunes.map((row) => lead(row, 'lead'));

const v2 = FORM.map((b) => voice(b.part === 'break' ? 'R - - - - - - - F - - - - - - -' : 'R - F - S - T - O - F - S - T -', b.c, 'rhodes', 12));
const v3 = FORM.map((b) => voice(`${b.bar % 2 ? 'S' : 'T'} - - - - - - - - - - - - - - -`, b.c, 'pad', 12));

const BASS = {
  held: 'R - - - - - - - - - F - - - O -',
  A: 'R - - - - - R - . . F - - - S -',
  lift: 'R - - - . . F - O - - - S - F -',
  fill: 'R - . R . . O . F - . S . O - R',
};
const v4 = FORM.map((b) => {
  if (b.part === 'intro' || (b.part === 'break' && b.bar < 6)) return voice(BASS.held, b.c, 'bass');
  return voice(last(b) ? BASS.fill : BASS[b.part === 'lift' ? 'lift' : 'A'], b.c, 'bass');
});

const KICKS = {
  A: 'K . . . . . . K . . K . . . . .',
  lift: 'K . . . . . K . . . K . . . . .',
  pulse: 'K . . . K . . . K . . . K . . .',
};
const v5 = FORM.map((b) => hit(KICKS[b.part === 'lift' ? 'lift' : b.part === 'break' ? 'pulse' : 'A'], { K: 'C4:kick' }));

const SNARES = {
  back: '. . . . S . . . . . . . S . . g',
  clap: '. . . . P . . . . . . . P . . .',
  fill: '. . . . S . . . S . S . H H L L',
  boom: 'T - - - - - - - - - - - - - - -',
  roll: 'T - - - t - - - t - t - t t t t',
  none: R,
};
const DRUMS = { S: 'C4:snare', g: 'C4:ghost', P: 'C4:clap', H: 'C4:htom', L: 'C4:ltom', T: 'F#2:timp', t: 'C#2:timp' };
const v6 = FORM.map((b) => {
  let key = b.part === 'lift' ? 'clap' : 'back';
  if (b.part === 'break') key = b.bar % 4 === 0 ? 'boom' : b.bar === 7 ? 'roll' : b.bar > 4 ? 'back' : 'none';
  else if (last(b)) key = 'fill';
  return hit(SNARES[key], DRUMS);
});

const v7 = FORM.map((b) => {
  const quiet = b.part === 'intro' || b.part === 'break';
  const crash = b.bar === 0 && !quiet;
  const row = hit(quiet ? 'c . . . c . . . c . . . c . . .' : 'c . c c c . c . c . c c c . o .', { c: 'C4:chat', o: 'C4:ohat' });
  return row.split(' ').map((t, r) => (crash && r === 0 ? 'C4:crash' : t)).join(' ');
});

// The bell teases the hook in the intro and tolls into the breakdown's second half; everywhere else a
// quiet string shadow an octave down thickens the lead.
const v8 = FORM.map((b, i) => {
  if (b.part === 'intro') return b.bar % 2 ? lead('F#5 - - C#5 - - E5 - - . . . . . . .', 'bell') : R;
  if (b.part === 'break') return b.bar === 4 ? voice('O - - - - - - - - - - - - - - -', b.c, 'bell', 24) : R;
  return lead(tunes[i].replace(/\/[^ ]+/g, ''), 'shadow', -12);
});

// Whole layers leave and come back by section (docs/research/snes-composition.md, gaps 1 and 6).
const drops = [];
FORM.forEach((b) => {
  const voices = [];
  if (b.part === 'intro' && b.bar < 2) voices.push('v5', 'v6');
  if (b.part === 'A' && b.pass === 0 && b.bar > 0 && b.bar < 4) voices.push('v8');
  if (b.part === 'lift' && b.bar < 2) voices.push('v7');
  if (b.part === 'break') voices.push('v7', ...(b.bar < 4 ? ['v5'] : []));
  if (b.part === 'outro' && b.bar >= 2) voices.push('v8');
  if (voices.length) drops.push({ from: at(b), to: at(b) + BAR_ROWS, voices });
});

export default {
  tempo: 8,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { room: 'hall', mvol: 44, evol: 30, edl: 6 },
  instruments: {
    lead: { ...INSTRUMENTS.strings, adsr: [12, 3, 6, 4], vol: 108, pan: -20, vibrato: { delay: 16, period: 12, depth: 0.2 } },
    rhodes: { ...INSTRUMENTS.epiano, adsr: [15, 4, 4, 14], vol: 58, pan: 60 },
    pad: { ...INSTRUMENTS.slowstr, vol: 40, pan: -70 },
    bass: { ...INSTRUMENTS.subbass, adsr: [15, 3, 5, 12], vol: 112, glide: 4 },
    kick: { ...INSTRUMENTS.gkick, vol: 100 },
    snare: { ...INSTRUMENTS.gsnare, vol: 80, pan: 20 },
    ghost: { ...INSTRUMENTS.gsnare, vol: 34, pan: 10 },
    clap: { ...INSTRUMENTS.clap, vol: 76, pan: -30 },
    htom: { ...INSTRUMENTS.htom, vol: 76, pan: 50 },
    ltom: { ...INSTRUMENTS.ltom, vol: 84, pan: -50 },
    timp: { ...INSTRUMENTS.timpani, vol: 96, pan: -20 },
    chat: { ...INSTRUMENTS.chat, vol: 52, pan: 70 },
    ohat: { ...INSTRUMENTS.ohat, vol: 44, pan: -60 },
    crash: { ...INSTRUMENTS.crash, vol: 46, pan: 70 },
    bell: { ...INSTRUMENTS.bell, adsr: [15, 6, 2, 19], vol: 46, pan: 50 },
    shadow: { ...INSTRUMENTS.slowstr, adsr: [11, 3, 6, 4], vol: 44, pan: 80 },
  },
  drops,
  v1: { rows: bars(v1, BAR_ROWS) },
  v2: { rows: bars(v2, BAR_ROWS) },
  v3: { rows: bars(v3, BAR_ROWS) },
  v4: { rows: bars(v4, BAR_ROWS) },
  v5: { rows: bars(v5, BAR_ROWS) },
  v6: { rows: bars(v6, BAR_ROWS) },
  v7: { rows: bars(v7, BAR_ROWS) },
  v8: { rows: bars(v8, BAR_ROWS) },
};

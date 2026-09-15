// Stage 1, the ground floor: a from-scratch theme for the new engine (item 2149). D minor at about 112
// bpm, sixteen rows a bar: a deadpan sax over a lobby groove, strings answering it, brass taking the
// tune in a 3-3-2 B section, a relative-major bridge of glossy call and response, a breakdown where
// the office clock and a bell are all that is left, then A and B a tone up and a tag home. 64 bars,
// about 2:17, looping to the top of A.
//
// v1 lead (sax, brass in B) | v2 strings counter-melody, piano answers in the bridge | v3 slow string
// pad, choir under B and the breakdown | v4 fretless sub-bass, sliding | v5 kick | v6 snare, clap, tom
// fills, timpani in the breakdown | v7 hats, crash at section heads | v8 bell, stabs, a string shadow
// under the sax and the lead's echo in the lift. Effects steal v8 then v7, the two a player misses least.

import { noteToMidi } from '../../../audio/apu.mjs';
import { fold, nameOf, transpose } from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export const BAR_ROWS = 16;
const REST = Array(BAR_ROWS).fill('.').join(' ');
const UP = 2;

const QUALITY = {
  m: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], maj7: [0, 4, 7, 11], 7: [0, 4, 7, 10], '': [0, 4, 7, 10], b9: [0, 4, 7, 10, 13],
};
function chord(symbol, shift) {
  const [, name, quality] = /^([A-G][b#]?)(.*)$/.exec(symbol);
  return { root: fold(noteToMidi(`${name}2`) + shift, 38, 49), tones: QUALITY[quality] };
}

// Chord letters, each keeping any /marks: R root, T third, F fifth, S seventh, N ninth, O octave,
// H the third and U the fifth an octave up. Anything else passes through.
function voice(pattern, { root, tones }, inst, octave = 0) {
  const step = { R: 0, T: tones[1], F: tones[2], S: tones[3], N: tones[4] ?? 14, O: 12, H: 12 + tones[1], U: 12 + tones[2] };
  return pattern.split(' ').map((t) => {
    const [head, ...marks] = t.split('/');
    return head in step ? [`${nameOf(root + octave + step[head])}:${inst}`, ...marks].join('/') : t;
  }).join(' ');
}

const tag = (rows, inst) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? t.replace(/^([^/]+)/, `$1:${inst}`) : t)).join(' ');

// Long notes sing with a late vibrato and a leap of a fourth or more slides in, note by note.
function ornament(bars) {
  let last = null;
  return bars.map((bar) => {
    const tokens = bar.split(' ');
    return tokens.map((t, i) => {
      if (!/^[A-G]/.test(t)) return t;
      let holds = 0;
      while (tokens[i + 1 + holds] === '-') holds++;
      const midi = noteToMidi(t.split(/[:/]/)[0]);
      let marked = t;
      if (last !== null && Math.abs(midi - last) >= 7 && !t.includes('/p')) marked += '/p3';
      if (holds >= 5 && !t.includes('/v')) marked += '/v14';
      last = midi;
      return marked;
    }).join(' ');
  });
}

const INTRO = { chords: ['Dm9', 'Dm9', 'Bbmaj7', 'Ab7'], lead: [REST, REST, REST, REST] };

const A = {
  chords: ['Dm9', 'Bbmaj7', 'Gm9', 'A7', 'Dm9', 'Bbmaj7', 'Gm9', 'A7'],
  lead: [
    'F5 - - - - - - - E5 - D5 - C5 - D5 -',
    'A5 - - - - - - - - - - - F5 - G5 -',
    'Bb5 - - - A5 - - - G5 - - - F5 - E5 -',
    'E5 - - - - - - - C#5 - - - A4 - - -',
    'F5 - - - - - - - E5 - D5 - C5 - D5 -',
    'A5 - - - - - - - C6 - - - Bb5 - A5 -',
    'G5 - - - F5 - G5 - A5 - - - D6 - - -',
    'C#6 - - - - - - - - - - - . . . .',
  ],
};
const A2_END = ['Bb5 - - - A5 - - - G5 - F5 - E5 - - -', 'D5 - - - - - - - - - - . . A4 C5 -'];

// B turns the rhythm to 3-3-2 and hands the tune to the brass.
const B = {
  chords: ['Bbmaj7', 'C7', 'Am', 'Dm9', 'Gm9', 'C7', 'Ab7', 'A7'],
  lead: [
    'D6 - - - - - C6 - - - - - Bb5 - - -',
    'C6 - - - - - E5 - - - - - G5 - - -',
    'A5 - - - - - G5 - - - - - E5 - - -',
    'F5 - - - - - - - - - - - . . . .',
    'G5 - - - - - Bb5 - - - - - D6 - - -',
    'E6 - - - - - D6 - - - - - C6 - - -',
    'C6 - - - - - Eb6 - - - - - Gb6 - - -',
    'A6 - - - - - - - - - - - . . . .',
  ],
};

// The bridge: the relative major, glossy, the sax calling on odd bars and the strings answering.
const BRIDGE = {
  chords: ['Fmaj7', 'Dm', 'Bbmaj7', 'C7', 'Fmaj7', 'Am', 'Bbmaj7', 'A7'],
  lead: [
    'C6 - - - A5 - - - F5 - G5 - A5 - - -', REST,
    'D6 - - - C6 - - - Bb5 - A5 - G5 - - -', REST,
    'C6 - - - A5 - - - F5 - G5 - A5 - C6 -', REST,
    'D6 - - - E6 - - - F6 - - - E6 - D6 -',
    'C#6 - - - - - - - - - - - . . . .',
  ],
  answer: [
    REST, '. . . . A4 - G4 - F4 - E4 - D4 - - -',
    REST, '. . . . E4 - F4 - G4 - Bb4 - C5 - - -',
    REST, '. . . . E5 - D5 - C5 - A4 - C5 - - -',
    REST, 'A4 - - - C#5 - - - E5 - - - G5 - - -',
  ],
};

// The breakdown: the brass says the germ alone over a pedal, the strings take it an octave up, and
// the last bar turns to B7 to lift the return a tone.
const BREAK = {
  chords: ['Dm', 'Dm', 'Bbmaj7', 'A7', 'Dm', 'Dm', 'Gm9', 'B7'],
  lead: [
    'D5 - - - - - - - - - - - - - - -', REST,
    'F5 - - - - - - - E5 - - - D5 - - -', 'C#5 - - - - - - - - - - - - - . .',
    'D6 - - - - - - - - - - - - - - -', 'F6 - - - E6 - - - D6 - - - C6 - - -',
    'Bb5 - - - - - - - A5 - - - G5 - - -', 'F#5 - - - - - - - - - - - . . . .',
  ],
};

const TAG = {
  chords: ['Gm9', 'Bbmaj7', 'Gm9', 'A7'],
  lead: [
    'G5 - - - - - - - F5 - - - E5 - - -',
    'D5 - - - - - - - F5 - - - A5 - - -',
    'Bb5 - - - - - - - A5 - - - G5 - - -',
    'E5 - - - - - - - - - - - C#5/b-1 - - -',
  ],
};

const section = (part, { chords, lead, answer }, shift = 0, pass = 0) =>
  chords.map((symbol, bar) => ({
    part, bar, pass, shift, c: chord(symbol, shift),
    lead: transpose(lead[bar], shift), answer: answer && transpose(answer[bar], shift),
  }));

export const LOOP_BAR = INTRO.chords.length;
export const FORM = [
  ...section('intro', INTRO),
  ...section('A', A),
  ...section('A', { ...A, lead: [...A.lead.slice(0, 6), ...A2_END] }, 0, 1),
  ...section('B', B),
  ...section('bridge', BRIDGE),
  ...section('break', BREAK),
  ...section('A', { ...A, lead: [...A.lead.slice(0, 6), ...A2_END] }, UP, 2),
  ...section('B', B, UP, 1),
  ...section('tag', TAG),
];

const at = (b) => FORM.indexOf(b) * BAR_ROWS;
const lastBar = (b) => b.bar === (b.part === 'intro' || b.part === 'tag' ? 3 : 7);

const v1 = ornament(FORM.map((b) => tag(b.lead, b.part === 'B' || b.part === 'break' ? 'brass' : 'sax')));

// The counter-melody climbs while the lead holds and holds while the lead runs down; in B it answers
// the brass's long notes, in the bridge it is the reply itself.
const COUNTER = {
  A: '. . F - S - O - H/v - - - - - - -',
  B: '. . . . . . . . . . . . R - T -',
  tag: 'F - - - - - - - T - - - - - - -',
};
const v2 = ornament(FORM.map((b) => {
  if (b.part === 'bridge') return tag(b.answer, 'keys');
  if (b.part === 'break') return b.bar < 4 ? REST : tag(transpose(b.lead, 0), 'counter');
  if (b.part === 'intro') return REST;
  return voice(COUNTER[b.part], b.c, 'counter', 12);
}));
// The strings carry the breakdown's second half, so the brass rests there.
FORM.forEach((b, i) => { if (b.part === 'break' && b.bar >= 4) v1[i] = REST; });

const HELD = (letter) => [letter, ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const v3 = FORM.map((b) => {
  const choir = b.part === 'B' || b.part === 'break';
  const swell = (b.part === 'break' && b.bar === 0) || (b.part === 'intro' && b.bar === 0) ? '/@20>90' : '';
  return voice(HELD(`${b.bar % 2 ? 'S' : 'T'}${swell}`), b.c, choir ? 'choir' : 'pad', 12);
});

const BASS = {
  held: 'R - - - - - - - - - - - - - - -',
  A: 'R - - . . . R - F - - . O/p2 - S -',
  B: 'R - - - - . R - - - - . F - - -',
  bridge: 'R - - - . . F - O - - - S/p4 - F -',
  pulse: 'R . R . R . R . R . R . O/p2 . R .',
  fill: 'R - . R . . O . F - . S . O/p3 - R',
};
const v4 = FORM.map((b) => {
  if (b.part === 'intro') return voice(b.bar < 3 ? BASS.held : BASS.fill, b.c, 'bass');
  if (b.part === 'break') return voice(b.bar < 4 ? BASS.held : b.bar === 7 ? BASS.fill : BASS.pulse, b.c, 'bass');
  if (lastBar(b)) return voice(BASS.fill, b.c, 'bass');
  return voice(BASS[b.part === 'tag' ? 'A' : b.part], b.c, 'bass');
});

const K = 'C4:kick';
const KICKS = {
  A: 'K . . . . . . . K . . K . . . .',
  A2: 'K . . . . . . K . . K . . . . .',
  B: 'K . . . . . K . . . . . K . . .',
  bridge: 'K . . . . . . . K . . . . . . .',
  pulse: 'K . . . K . . . K . . . K . . .',
};
const v5 = FORM.map((b) => {
  const key = b.part === 'break' ? 'pulse' : b.part === 'A' ? (b.pass ? 'A2' : 'A') : b.part === 'tag' || b.part === 'intro' ? 'A' : b.part;
  return KICKS[key].split(' ').map((t) => (t === 'K' ? K : t)).join(' ');
});

const SNARES = {
  back: '. . . . S . . . . . . . S . . .',
  ghost: '. . . . S . . . . . . . S . . g',
  half: '. . . . . . . . S . . . . . . .',
  clap: '. . . . P . . . . . . . P . . .',
  fill1: '. . . . S . . . S . S . S A F D',
  fill2: '. . . . S . . g . . S S A A F F',
  roll: 'T - - - - - - - t - - - t - t t',
  boom: 'T - - - - - - - - - - - - - - -',
  none: '. . . . . . . . . . . . . . . .',
};
const v6 = FORM.map((b, i) => {
  let key = b.part === 'B' ? 'half' : b.part === 'bridge' ? 'clap' : b.part === 'A' && b.pass ? 'ghost' : 'back';
  if (b.part === 'break') key = b.bar % 4 === 0 ? 'boom' : b.bar === 3 ? 'roll' : b.bar === 7 ? 'fill1' : b.bar < 4 ? 'none' : 'half';
  else if (lastBar(b)) key = i % 2 ? 'fill1' : 'fill2';
  return SNARES[key].split(' ').map((t) => ({ S: 'C4:snare', g: 'C4:ghost', P: 'C4:clap', A: 'C4:htom', F: 'C4:ltom', D: 'A3:ltom', T: 'D2:timp', t: 'A1:timp' })[t] ?? t).join(' ');
});

const HATS = {
  clock: '. . . . c . . . . . . . c . . .',
  A: '. . c . . . c . . . c . . . c .',
  A2: 'c . c . c . c o c . c . c . c .',
  B: '. . . . c . . . . . . . c . o -',
  bridge: 'c . c c . . c . c . c c . . o -',
};
const v7 = FORM.map((b) => {
  const key = b.part === 'intro' || b.part === 'break' ? 'clock' : b.part === 'A' ? (b.pass ? 'A2' : 'A') : b.part === 'tag' ? 'A' : b.part;
  const crash = b.bar === 0 && (b.part === 'bridge' || b.part === 'tag' || (b.part === 'A' && b.pass > 0));
  return HATS[key].split(' ').map((t, r) => (crash && r === 0 ? 'C4:crash' : ({ c: 'C4:chat', o: 'C4:ohat' })[t] ?? t)).join(' ');
});

// The bell tolls only at section heads; a brass stab opens B; in the lift the lead echoes itself.
const v8 = FORM.map((b, i) => {
  if (b.part === 'A' && b.pass === 2) {
    const rows = [...Array(3).fill('.'), ...v1[i].split(' ').slice(0, BAR_ROWS - 3)];
    return rows.map((t) => (/^[A-G]/.test(t) ? `${t.split(/[:/]/)[0]}:echo` : t)).join(' ');
  }
  if (b.bar === 0 && (b.part === 'intro' || b.part === 'break' || b.part === 'tag')) return voice('R - - - - - - - - - - - - - - -', b.c, 'bell', 24);
  if (b.bar === 0 && b.part === 'B') return voice('F . . . . . . . . . . . . . . .', b.c, 'stab', 24);
  // Under the sax, a quiet string shadow an octave down softens the reed.
  if (/:sax/.test(v1[i])) return v1[i].split(' ').map((t) => (/^[A-G]/.test(t) ? `${transpose(t.split(/[:/]/)[0], -12)}:shadow` : t)).join(' ');
  return REST;
});

// Whole layers leave and come back by section (docs/research/snes-composition.md, gaps 1 and 6).
const drops = [];
FORM.forEach((b) => {
  const voices = [];
  if (b.part === 'intro') voices.push('v6', ...(b.bar < 2 ? ['v5', 'v7'] : []));
  if (b.part === 'A' && b.pass === 0) voices.push('v2', ...(b.bar < 4 ? ['v7'] : []));
  if (b.part === 'B' && b.bar < 2) voices.push('v5', 'v6', 'v7');
  if (b.part === 'break' && b.bar < 4) voices.push('v5');
  if (b.part === 'break' && b.bar >= 4) voices.push('v7');
  if (voices.length) drops.push({ from: at(b), to: at(b) + BAR_ROWS, voices });
});

export default {
  tempo: 8,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { room: 'hall', mvol: 36, evol: 26, edl: 7 },
  instruments: {
    sax: { ...INSTRUMENTS.sax, adsr: [11, 5, 6, 3], vol: 80, pan: -18, glide: 4, vibrato: { delay: 22, period: 14, depth: 0.16 } },
    shadow: { ...INSTRUMENTS.slowstr, adsr: [9, 3, 6, 2], vol: 44, pan: -52 },
    keys: { ...INSTRUMENTS.piano, vol: 70, pan: 90 },
    brass: { ...INSTRUMENTS.brass, adsr: [13, 3, 6, 8], vol: 84, pan: -18, vibrato: { delay: 16, period: 12, depth: 0.25 } },
    counter: { ...INSTRUMENTS.strings, vol: 64, pan: 96, vibrato: { delay: 16, period: 13, depth: 0.2 } },
    pad: { ...INSTRUMENTS.slowstr, vol: 42, pan: -100 },
    choir: { ...INSTRUMENTS.choir, vol: 46, pan: -100 },
    bass: { ...INSTRUMENTS.subbass, adsr: [14, 3, 6, 10], vol: 110, glide: 4, vibrato: { delay: 24, period: 16, depth: 0.12 } },
    kick: { ...INSTRUMENTS.gkick, vol: 100 },
    snare: { ...INSTRUMENTS.gsnare, vol: 84, pan: 24 },
    ghost: { ...INSTRUMENTS.gsnare, vol: 36, pan: 12 },
    clap: { ...INSTRUMENTS.clap, vol: 80, pan: -40 },
    chat: { ...INSTRUMENTS.chat, vol: 38, pan: 80 },
    ohat: { ...INSTRUMENTS.ohat, vol: 30, pan: -70 },
    bell: { ...INSTRUMENTS.bell, vol: 54, pan: -84 },
    stab: { ...INSTRUMENTS.brass, adsr: [15, 5, 2, 16], vol: 66, pan: 70 },
    timp: { ...INSTRUMENTS.timpani, vol: 96, pan: -20 },
    ltom: { ...INSTRUMENTS.ltom, vol: 80, pan: -50 },
    htom: { ...INSTRUMENTS.htom, vol: 76, pan: 50 },
    crash: { ...INSTRUMENTS.crash, vol: 46, pan: 70 },
    echo: { ...INSTRUMENTS.sax, vol: 34, pan: 100 },
  },
  drops,
  v1: { rows: v1.join(' | ') },
  v2: { rows: v2.join(' | ') },
  v3: { rows: v3.join(' | ') },
  v4: { rows: v4.join(' | ') },
  v5: { rows: v5.join(' | ') },
  v6: { rows: v6.join(' | ') },
  v7: { rows: v7.join(' | ') },
  v8: { rows: v8.join(' | ') },
};

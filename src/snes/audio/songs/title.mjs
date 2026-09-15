// The title theme on the new bank (item 2196): the theme's melody from the NES title's FORM
// (docs/THEME.md) on grand piano, brass kept an octave down and a soft top, no timpani, toms or crash.
// Two bars of piano alone, then the string arpeggios and the beat build in, so the groove is whole by
// the first A (Tim: the first take "takes way too long in the song to get there").
//
// v1 lead: piano, then sax and strings an octave down, brass an octave down in the return | v2 piano
// broken chords in the intro and bridge, string arpeggios, a string harmony in the return | v3-v4 warm
// pad on the third and seventh | v5 synth bass | v6 kick and clap | v7 snare | v8 hats

import { FORM, LOOP_BAR, SCALE } from '../../../audio/songs/title.mjs';
import * as kit from '../../../audio/songs/kit.mjs';
import { noteToMidi } from '../../../audio/apu.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

const { REST, chord, fold, nameOf, pitchClasses, play, thirdBelow, transpose } = kit;

export const BAR_ROWS = 16;
export const LEADS = FORM.map((b) => transpose(b.lead, b.shift));

// A lead line under `inst`, moved `octave` semitones, with a delayed vibrato on notes held `hold` rows
// or more and a slide into leaps of a fifth or wider.
export function lead(rows, inst, octave = 0, { hold = 6, slide = false } = {}) {
  const tokens = rows.split(' ');
  let prev = null;
  return tokens
    .map((t, i) => {
      if (!/^[A-G]/.test(t)) return t;
      const m = noteToMidi(t) + octave;
      let len = 1;
      while (tokens[i + len] === '-') len++;
      const marks = [];
      if (hold && len >= hold) marks.push('v');
      if (slide && prev !== null && Math.abs(m - prev) >= 7) marks.push('p3');
      prev = m;
      return [`${nameOf(m)}:${inst}`, ...marks].join('/');
    })
    .join(' ');
}

// Chord letters on any chord: R root, T third, F fifth, S seventh, O octave, N ninth (or the octave).
export function arp(pattern, { root, tones }, inst, octave) {
  const step = { R: 0, T: tones[1], F: tones[2], S: tones[3], O: 12, N: tones[4] ?? 12 };
  return pattern.split(' ').map((t) => (t in step ? `${nameOf(root + octave + step[t])}:${inst}` : t)).join(' ');
}

const LEAD_VOICE = {
  intro: ['piano', 0], A: ['piano', 0], "A'": ['piano', 0], B: ['sax', -12],
  bridge: ['strlead', -12], return: ['brass', -12], tag: ['piano', 0],
};
const v1 = FORM.map((b, i) => {
  const [inst, octave] = LEAD_VOICE[b.part];
  return lead(LEADS[i], inst, octave, { hold: inst === 'piano' ? 0 : 6, slide: inst === 'brass' });
});

const RISE = 'R T F S O S F T R T F S O S F T';
const B_RISE = 'R F O F N F O F T S O S N S O S';
const BROKEN = 'R - F - O - T - N - O - F - T -';
const v2 = FORM.map((b, i) => {
  const c = chord(b.symbol, b.shift);
  if ((b.part === 'intro' && i < 2) || b.part === 'bridge') return arp(BROKEN, c, 'broken', 24);
  if (b.part === 'return') {
    const scale = pitchClasses(SCALE, b.shift);
    return LEADS[i].split(' ').map((t) => (/^[A-G]/.test(t) ? `${nameOf(noteToMidi(thirdBelow(t, scale)) - 12)}:harm` : t)).join(' ');
  }
  return arp(b.part === 'B' ? B_RISE : RISE, c, 'arps', 24);
});

const HOLD = ['X', ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const pad = (tone, lo, hi, inst) =>
  FORM.map((b) => {
    const { root, tones } = chord(b.symbol, b.shift);
    return HOLD.replace('X', `${nameOf(fold(root + tones[tone], lo, hi))}:${inst}`);
  });
const v3 = pad(1, 55, 66, 'padL');
const v4 = pad(3, 60, 71, 'padR');

const BASS = {
  drive: 'R . O R . R O . R . O R . R O R',
  fill: 'R . O R . R O . F . O F S . O F',
  thin: 'R - - - - - R - - - - - O - - -',
  hold: 'R - - - - - - - R - - - O - - -',
  intro: 'R - - - - - - - - - - - . . . .',
};
const v5 = FORM.map((b, i) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'intro') return play(i < 2 ? BASS.intro : i === 3 ? BASS.fill : BASS.thin, c, 'bass');
  if (b.part === 'bridge') return play(b.last ? BASS.fill : BASS.hold, c, 'bass');
  return play(b.last ? BASS.fill : BASS.drive, c, 'bass');
});

const beat = (p) => p.split(' ').map((t) => ({ K: 'C4:kick', C: 'C4:clap', S: 'C4:snare', H: 'C4:chat', O: 'C4:ohat' })[t] ?? t).join(' ');
const FLOOR = 'K - - - K - - - K - - - K - - -';
const v6 = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? REST : beat(i === 2 ? FLOOR : 'K - - - K - - - C - C - C - C -');
  if (b.part === 'bridge') return beat(b.last ? 'K - - - K - - - K - K - K - K -' : 'K - - - - - - - - - - - C - - -');
  return beat(b.last ? 'K - - - K - - - K - - C - C C -' : FLOOR);
});

const v7 = FORM.map((b) => {
  if (b.part === 'intro') return REST;
  if (b.part === 'bridge') return b.last ? beat('. . . . S - . . S - S - S - S -') : REST;
  return beat(b.last ? '. . . . S - . . . . S - S - S S' : '. . . . S - . . . . . . S - . .');
});

const HATS = '. . O - H . O - . . O - H . O -';
const B_HATS = 'H . O - . . H H H . O - . . H .';
const v8 = FORM.map((b) =>
  b.part === 'intro' || b.part === 'bridge' ? REST : beat(b.part === 'B' ? B_HATS : HATS),
);

const join = (bars) => bars.join(' | ');

export default {
  tempo: 7,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { room: 'hall', mvol: 80, evol: 34, efb: 72, edl: 5 },
  instruments: {
    piano: { ...INSTRUMENTS.piano, vol: 96, pan: -6 },
    sax: { ...INSTRUMENTS.sax, adsr: [12, 5, 6, 6], vol: 86, pan: -6, vibrato: { delay: 14, period: 12, depth: 0.25 } },
    strlead: { ...INSTRUMENTS.strings, vol: 84, pan: -6, vibrato: { delay: 16, period: 14, depth: 0.2 } },
    brass: { ...INSTRUMENTS.brass, adsr: [12, 4, 5, 12], vol: 80, pan: -6, glide: 3, vibrato: { delay: 14, period: 11, depth: 0.25 } },
    broken: { ...INSTRUMENTS.piano, adsr: [15, 3, 3, 18], vol: 50, pan: 30 },
    arps: { ...INSTRUMENTS.strings, adsr: [14, 4, 5, 16], vol: 42, pan: 34 },
    harm: { ...INSTRUMENTS.strings, vol: 48, pan: 36 },
    padL: { ...INSTRUMENTS.pad, vol: 38, pan: -40 },
    padR: { ...INSTRUMENTS.pad, vol: 38, pan: 40 },
    bass: { ...INSTRUMENTS.synbass, vol: 96 },
    kick: { ...INSTRUMENTS.gkick, vol: 108, echo: false },
    clap: { ...INSTRUMENTS.clap, vol: 76, pan: -16 },
    snare: { ...INSTRUMENTS.gsnare, vol: 90, echo: false },
    chat: { ...INSTRUMENTS.chat, vol: 54 },
    ohat: { ...INSTRUMENTS.ohat, vol: 42 },
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

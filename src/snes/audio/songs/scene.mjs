// The story-scene cue (item 2196): the title theme's melody, slowed to about 75 bpm and kept soft
// under dialogue. The title's form without A', so the hook opens the intro, A and the return. Grand
// piano carries the hook; strings and then the sax sing the answers an octave down; no drums until B.
// The earlier from-scratch cue is scene-v1.mjs.
//
// v1 lead | v2 strings counter-line | v3 pad on the third, left | v4 pad on the seventh, right | v5
// choir on the fifth | v6 synth bass | v7 soft kick and snare | v8 hats

import { FORM as TITLE_FORM, SCALE } from '../../../audio/songs/title.mjs';
import { REST, chord, fold, nameOf, transpose } from '../../../audio/songs/kit.mjs';
import { bars } from './chase-kit.mjs';
import { arp, lead } from './title.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

export { SCALE };
export const BAR_ROWS = 16;
export const LOOP_BAR = 4;
export const FORM = TITLE_FORM.filter((b) => b.part !== "A'");
export const LEADS = FORM.map((b) => transpose(b.lead, b.shift));

const LEAD_VOICE = {
  intro: ['piano', 0], A: ['piano', 0], B: ['strlead', -12], bridge: ['piano', -12], return: ['sax', -12], tag: ['piano', 0],
};
const v1 = FORM.map((b, i) => {
  const [inst, octave] = LEAD_VOICE[b.part];
  return lead(LEADS[i], inst, octave, { hold: inst === 'piano' ? 0 : 6 });
});

const COUNTER = {
  intro: REST, A: 'F - - - - - - - - - - - - - - -', B: 'T - - - - - - - S - - - - - - -',
  bridge: 'N - - - - - - - F - - - - - - -', return: 'O - - - - - - - N - - - - - - -', tag: 'F - - - - - - - T - - - - - - -',
};
const v2 = FORM.map((b) => arp(COUNTER[b.part], chord(b.symbol, b.shift), 'strings', 12));

const HELD = ['X', ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const pad = (tone, lo, hi, inst) =>
  FORM.map((b) => {
    const { root, tones } = chord(b.symbol, b.shift);
    return HELD.replace('X', `${nameOf(fold(root + tones[tone], lo, hi))}:${inst}`);
  });
const v3 = pad(1, 55, 66, 'padL');
const v4 = pad(3, 60, 71, 'padR');
const v5 = FORM.map((b, i) =>
  b.part === 'intro' || b.part === 'A' ? REST : HELD.replace('X', `${nameOf(fold(chord(b.symbol, b.shift).root + 7, 55, 66))}:choir`),
);

const v6 = FORM.map((b) => {
  const { root } = chord(b.symbol, b.shift);
  const pattern = b.part === 'intro' ? HELD : 'X - - - - - - - - - - - Y - - -';
  return pattern.replace('X', `${nameOf(root)}:bass`).replace('Y', `${nameOf(root + 7)}:bass`);
});

const beat = (p) => p.split(' ').map((t) => ({ K: 'C4:kick', S: 'C4:snare', H: 'C4:chat', O: 'C4:ohat' })[t] ?? t).join(' ');
const v7 = FORM.map((b) =>
  b.part === 'B' || b.part === 'return' ? beat('K . . . . . . . S . . . . . K .') : b.part === 'tag' ? beat('K . . . . . . . S . . . . . . .') : REST,
);
const v8 = FORM.map((b) => (b.part === 'return' ? beat('H . H . H . H . H . H . H . O -') : REST));

export default {
  tempo: 12,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { room: 'hall', mvol: 80, evol: 44, efb: 80, edl: 6 },
  instruments: {
    piano: { ...INSTRUMENTS.piano, adsr: [14, 3, 3, 17], vol: 84, pan: -6 },
    strlead: { ...INSTRUMENTS.strings, adsr: [9, 3, 6, 2], vol: 74, pan: -6, vibrato: { delay: 18, period: 16, depth: 0.2 } },
    sax: { ...INSTRUMENTS.sax, adsr: [11, 4, 6, 5], vol: 76, pan: -6, vibrato: { delay: 18, period: 14, depth: 0.22 } },
    strings: { ...INSTRUMENTS.strings, adsr: [9, 3, 6, 2], vol: 44, pan: 30 },
    padL: { ...INSTRUMENTS.pad, adsr: [8, 2, 6, 0], vol: 42, pan: -44 },
    padR: { ...INSTRUMENTS.pad, adsr: [8, 2, 6, 0], vol: 42, pan: 44 },
    choir: { ...INSTRUMENTS.choir, adsr: [8, 3, 6, 2], vol: 34, pan: -20 },
    bass: { ...INSTRUMENTS.synbass, adsr: [12, 2, 6, 10], vol: 76 },
    kick: { ...INSTRUMENTS.gkick, vol: 64, echo: false },
    snare: { ...INSTRUMENTS.gsnare, vol: 44, pan: 8 },
    chat: { ...INSTRUMENTS.chat, vol: 28 },
    ohat: { ...INSTRUMENTS.ohat, vol: 24 },
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

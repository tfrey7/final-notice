// The ending on the S-DSP: the NES ending's form, melody and harmony (src/audio/songs/ending.mjs)
// re-voiced for eight sampled voices in the SNES arrangement style. One change: the last bar does not
// come home. It stops on the dominant with the leading tone held, and two silent bars let the echo
// carry it away.
//
// v1 alto sax lead | v2 a soft piano echo in the verse and choruses, a sax harmony once the key lifts |
// v3-v4 warm pad on the third and seventh, piano shimmer in the choruses | v5 slap bass, strings
// swelling on the ninth in the intro | v6 punch kick and snare | v7 hats | v8 choir on the fifth
// through the choruses and outro.

import { FORM, SCALE } from '../../../audio/songs/ending.mjs';
import * as kit from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

const { REST, chord, echo, fold, nameOf, pitchClasses, play, thirdBelow, transpose } = kit;

export const BAR_ROWS = 16;
export const TAIL_BARS = 2;
export const LAST = FORM.length - 1;
export const LAST_BAR = { symbol: 'A9', lead: 'C#6 - - - - - - - - - - - - - - -' };

const bars = FORM.map((b, i) => (i === LAST ? { ...b, ...LAST_BAR } : b));
export const LEADS = bars.map((b) => transpose(b.lead, b.shift));

const mapNotes = (rows, fn) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? fn(t) : t)).join(' ');
const on = (rows, inst) => mapNotes(rows, (t) => `${t}:${inst}`);
const SINGS = { intro: 'sax', verse: 'sax', chorus: 'lead', bridge: 'lead', final: 'lead', outro: 'sax' };
const v1 = bars.map((b, i) => on(LEADS[i], SINGS[b.part]));

const echoes = echo(LEADS, 4, 'echo');
const v2 = bars.map((b, i) => {
  if (b.part === 'verse' || b.part === 'chorus' || b.part === 'bridge') return echoes[i];
  if (b.part === 'intro') return REST;
  const scale = pitchClasses(SCALE, b.shift);
  return mapNotes(LEADS[i], (t) => `${thirdBelow(t, scale)}:harm`);
});

const HOLD = `X ${Array(15).fill('-').join(' ')}`;
const SHIMMER = 'X - X - X - X - X - X - X - X -';
const CHORUS = ['chorus', 'final'];
const bed = (tone, lo, hi, pad, shim) =>
  bars.map((b) => {
    const { root, tones } = chord(b.symbol, b.shift);
    const note = nameOf(fold(root + tones[tone], lo, hi));
    const [pattern, inst] = CHORUS.includes(b.part) ? [SHIMMER, shim] : [HOLD, pad];
    return pattern.split(' ').map((t) => (t === 'X' ? `${note}:${inst}` : t)).join(' ');
  });
const v3 = bed(1, 57, 69, 'padL', 'shimL');
const v4 = bed(3, 62, 74, 'padR', 'shimR');

const v5 = bars.map((b, i) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'intro') return `${nameOf(fold(c.root + c.tones[c.tones.length - 1] + 12, 62, 76))}:swell ${Array(15).fill('-').join(' ')}`;
  if (i === LAST) return play(HOLD.replace('X', 'R'), c, 'bass');
  return play(b.last ? 'R - - - - - . R F - - - O - F -' : 'R - - - - - . R F - - - O - . .', c, 'bass');
});

const TOM = { F: 'C4', E: 'Bb3', D: 'A3', C: 'G3', B: 'F3' };
const DRUMS = {
  back: 'F - - - F:snare - - - - - F - F:snare - - -',
  soft: 'F - - - - - - - F - - - - - - -',
  fill: 'F - - - F:snare - - - F:snare - F:snare - D:snare - C:snare B:snare',
  half: 'F - - - - - - - F:snare - - - - - - -',
  end: 'F - - - - - - - - - - - - - - -',
};
const drumRow = (p) => p.split(' ').map((t) => (t === 'F' ? 'C4:kick' : /^[A-F]:snare$/.test(t) ? `${TOM[t[0]]}:snare` : t)).join(' ');
const v6 = bars.map((b, i) => {
  if (b.part === 'intro') return REST;
  if (b.part === 'verse') return i < 8 ? REST : drumRow(b.last ? DRUMS.fill : DRUMS.soft);
  if (b.part === 'bridge') return drumRow(b.last ? DRUMS.fill : DRUMS.half);
  if (b.part === 'outro') return drumRow(i === LAST ? DRUMS.end : i === LAST - 1 ? DRUMS.fill : DRUMS.half);
  return drumRow(b.last ? DRUMS.fill : DRUMS.back);
});

const ROLL = { 3: 'C4', 2: 'A3', 1: 'F3', 0: 'D3' };
const noiseRow = (p) => p.split(' ').map((t) => {
  const m = /^(\d)(?::(\w+))?$/.exec(t);
  if (!m) return t;
  return m[2] === 'snr' ? `${ROLL[m[1]]}:roll` : m[2] === 'open' ? 'C4:ohat' : 'C4:chat';
}).join(' ');
const v7 = bars.map((b, i) => {
  if (b.part === 'intro' || (b.part === 'verse' && i < 8)) return REST;
  if (b.part === 'bridge') return noiseRow(b.last ? '1 1 1 1 1 1 1 1 3:snr 3:snr 2:snr 2:snr 1:snr 1:snr 0:snr 0:snr' : '1 . . . 1 . . . 1 . . . 1 . . .');
  if (i === LAST) return noiseRow('0:open - - - - - - - . . . . . . . .');
  return noiseRow('. . 1 . . . 1 . . . 1 . . . 0:open -');
});

const v8 = bars.map((b) => {
  if (!CHORUS.includes(b.part) && b.part !== 'outro') return REST;
  const { root, tones } = chord(b.symbol, b.shift);
  return HOLD.replace('X', `${nameOf(fold(root + tones[2], 57, 69))}:choir`);
});

const TAIL = Array(TAIL_BARS).fill(REST);
const join = (rows) => [...rows, ...TAIL].join(' | ');

export default {
  tempo: 10,
  loop: null,
  echo: { mvol: 60, evol: 50, efb: 110, edl: 7, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    sax: { ...INSTRUMENTS.sax, adsr: [12, 6, 6, 6], vol: 84, pan: -8 },
    lead: { ...INSTRUMENTS.sax, vol: 100, pan: -8 },
    echo: { ...INSTRUMENTS.epiano, adsr: [15, 4, 3, 18], vol: 42, pan: 40 },
    harm: { ...INSTRUMENTS.sax, vol: 56, pan: 38 },
    padL: { ...INSTRUMENTS.pad, vol: 48, pan: -40 },
    padR: { ...INSTRUMENTS.pad, vol: 48, pan: 40 },
    shimL: { ...INSTRUMENTS.epiano, adsr: [15, 5, 1, 20], vol: 46, pan: -36 },
    shimR: { ...INSTRUMENTS.epiano, adsr: [15, 5, 1, 20], vol: 40, pan: 36 },
    swell: { ...INSTRUMENTS.strings, adsr: [7, 3, 6, 2], vol: 58 },
    bass: { ...INSTRUMENTS.slap, adsr: [15, 3, 5, 16], vol: 104 },
    kick: { ...INSTRUMENTS.gkick, vol: 104 },
    snare: { ...INSTRUMENTS.gsnare, vol: 88 },
    roll: { ...INSTRUMENTS.gsnare, vol: 56, pan: 18 },
    chat: { ...INSTRUMENTS.chat, vol: 54 },
    ohat: { ...INSTRUMENTS.ohat, vol: 46 },
    choir: { ...INSTRUMENTS.choir, vol: 38, pan: 20 },
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

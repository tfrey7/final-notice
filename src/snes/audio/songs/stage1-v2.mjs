// Stage 1 on the S-DSP: the NES office-floor funk brawl's form, melody and harmony
// (src/audio/songs/stage1.mjs) re-voiced for eight sampled voices in the title's style (docs/THEME.md,
// "SNES arrangement").
//
// v1 alto sax lead (DX piano in the intro) | v2-v3 DX piano chops on the guide tones, warm pad where
// the NES held pads | v4 slap bass | v5 gated kick and clap | v6 gated snare | v7 hats | v8 a sax a
// third below in B and the turnaround. Effects steal v8 then v7, so only the hats and the harmony are
// ever lost; the NES software echo of the lead is the hardware echo here.

import { FORM, LOOP_BAR, SCALE } from '../../../audio/songs/stage1.mjs';
import * as kit from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

const { REST, chord, fold, nameOf, pitchClasses, play, thirdBelow, transpose } = kit;

export const BAR_ROWS = 16;
export const LEADS = FORM.map((b) => transpose(b.lead, b.shift));

const mapNotes = (rows, fn) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? fn(t) : t)).join(' ');
const SINGING = ['B', 'turnaround'];

const v1 = FORM.map((b, i) => mapNotes(LEADS[i], (t) => `${t}:${b.part === 'intro' ? 'keys' : 'sax'}`));

// The chord's third and seventh: piano chops in the grooves, a held pad where the NES opened into pads.
const CHOP = '. . X . . . X . . X . . X . . .';
const BREAK_CHOP = '. . . . X . . . . . . . X . X .';
const HOLD = 'X - - - - - - - - - - - - - - -';
const bed = (tone, lo, hi, chop, pad) =>
  FORM.map((b, i) => {
    const { root, tones } = chord(b.symbol, b.shift);
    const note = nameOf(fold(root + tones[tone], lo, hi));
    const [pattern, inst] =
      SINGING.includes(b.part) || (b.part === 'intro' && i < 2) ? [HOLD, pad]
        : b.part === 'breakdown' ? [BREAK_CHOP, chop]
          : [CHOP, chop];
    return pattern.split(' ').map((t) => (t === 'X' ? `${note}:${inst}` : t)).join(' ');
  });
const v2 = bed(1, 57, 69, 'chopL', 'padL');
const v3 = bed(3, 62, 74, 'chopR', 'padR');

const BASS = {
  groove: 'R - . R . . O R . . R . S . O .',
  fill: 'R - . R . . O R . F . S . O F R',
  B: 'R - - - . R . . F - - - . O . .',
  breakdown: 'R . . . . . . R O . R . . . . .',
  hold: 'R - - - - - - - - - - - . . . .',
};
const v4 = FORM.map((b, i) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'intro') return play(i < 2 ? BASS.hold : i === 3 ? BASS.fill : BASS.groove, c, 'slap');
  if (SINGING.includes(b.part)) return play(b.last ? BASS.fill : BASS.B, c, 'slap');
  if (b.part === 'breakdown') return play(b.last ? BASS.fill : BASS.breakdown, c, 'slap');
  return play(b.last ? BASS.fill : BASS.groove, c, 'slap');
});

// The NES DPCM line split in two: K kick and C clap on v5, S snare on v6, its fill stepping down like toms.
const DRUMS = {
  groove: ['K - - - . . . K - - K - . . . .', '. . . . S - . . . . . . S - . .'],
  fill: ['K - - - . . . K - - K . . . . .', '. . . . S - . . . . . S A3 S F3 S'],
  B: ['K - - - . . . . . . K - . . . .', '. . . . S - . . . . . . S - . .'],
  breakdown: ['K - - - C - - - - - K - C - C -', REST],
};
const drumBar = (b, i) => {
  if (b.part === 'intro') return i < 2 ? null : i === 3 ? DRUMS.fill : DRUMS.groove;
  if (b.last) return DRUMS.fill;
  return DRUMS[SINGING.includes(b.part) ? 'B' : b.part === 'breakdown' ? 'breakdown' : 'groove'];
};
const drums = (lane) =>
  FORM.map((b, i) => {
    const bar = drumBar(b, i);
    if (!bar) return REST;
    return bar[lane].split(' ').map((t) => ({ K: 'C4:kick', C: 'C4:clap', S: 'C4:snare', A3: 'A3:snare', F3: 'F3:snare' })[t] ?? t).join(' ');
  });
const v5 = drums(0);
const v6 = drums(1);

const HATS = '. H O H . H O H . H O H . H T -';
const v7 = FORM.map((b, i) => {
  const p = b.part === 'intro' ? (i === 0 ? REST : HATS)
    : SINGING.includes(b.part) ? '. . H . . . H . . . H . . . H .'
      : b.part === 'breakdown' ? (b.last ? '. . . . . . . . O O H H H H O O' : '. . . . . . . . . . . . . . T -')
        : HATS;
  return p.split(' ').map((t) => ({ H: 'C4:chat', O: 'D4:chat', T: 'C4:ohat' })[t] ?? t).join(' ');
});

const v8 = FORM.map((b, i) => {
  if (!SINGING.includes(b.part)) return REST;
  const scale = pitchClasses(SCALE, b.shift);
  return mapNotes(LEADS[i], (t) => `${thirdBelow(t, scale)}:harm`);
});

const join = (bars) => bars.join(' | ');

export default {
  tempo: 8,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 80, evol: 30, efb: 56, edl: 4, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    sax: { ...INSTRUMENTS.sax, vol: 94, pan: -8 },
    keys: { ...INSTRUMENTS.epiano, vol: 96, pan: -8 },
    harm: { ...INSTRUMENTS.sax, vol: 56, pan: 36 },
    chopL: { ...INSTRUMENTS.epiano, adsr: [15, 5, 1, 21], vol: 58, pan: -34 },
    chopR: { ...INSTRUMENTS.epiano, adsr: [15, 5, 1, 21], vol: 52, pan: 34 },
    padL: { ...INSTRUMENTS.pad, vol: 40, pan: -40 },
    padR: { ...INSTRUMENTS.pad, vol: 40, pan: 40 },
    slap: { ...INSTRUMENTS.slap, vol: 116 },
    kick: { ...INSTRUMENTS.gkick, vol: 118 },
    clap: { ...INSTRUMENTS.clap, vol: 92, pan: -16 },
    snare: { ...INSTRUMENTS.gsnare, vol: 104 },
    chat: { ...INSTRUMENTS.chat, vol: 66 },
    ohat: { ...INSTRUMENTS.ohat, vol: 54 },
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

// The boss fight on the S-DSP: the NES boss song's form, melody and harmony (src/audio/songs/boss.mjs)
// re-voiced for eight sampled voices in the SNES arrangement style.
//
// v1 brass lead with vibrato (strings in the half-time phase, a string siren and the sax hook nod in
// the intro) | v2 orchestra hits on the chord root | v3 piano arpeggio, v4 staccato strings on the
// fifth, both tightening through the build and holding pads in the phase | v5 synth bass in octaves |
// v6 punch kick and snare | v7 hats and snare rolls | v8 a sax three rows behind the lead in the riff
// and tag, choir on the root through the build and phase, a brass third below the lead when the riff
// comes back up. Effects steal v8 then v7.

import { FORM, HOOK, LOOP_BAR, SCALE } from '../../../audio/songs/boss.mjs';
import * as kit from '../../../audio/songs/kit.mjs';
import { INSTRUMENTS } from '../recorded.mjs';

const { REST, chord, echo, fold, nameOf, pitchClasses, play, thirdBelow, transpose, vibrato } = kit;

export const BAR_ROWS = 16;
export const LEADS = FORM.map((b) => transpose(b.lead, b.shift));

const mapNotes = (rows, fn) => rows.split(' ').map((t) => (/^[A-G]/.test(t) ? fn(t) : t)).join(' ');
const on = (rows, inst) => mapNotes(rows, (t) => `${t}:${inst}`);
const hits = (pattern, note, inst) => pattern.split(' ').map((t) => (t === 'X' ? `${note}:${inst}` : t)).join(' ');

const hookBars = HOOK.split(' | ');
const v1 = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? on(i ? 'F5 - - - - - - - - - - - - - - -' : 'E5 - - - - - - - - - - - - - - -', 'siren') : on(hookBars[i - 2], 'nod');
  return on(LEADS[i], b.part === 'phase' ? 'scream' : 'lead');
});

const HIT = {
  intro: 'X - - - . . . . . . . . . . . .',
  riff: 'X - - - . . X - - - . . . . . .',
  fill: 'X - - - . . X - - - . . X - X -',
  build: 'X - - - X - - - X - - - X - - -',
  roll: 'X - X - X - X - X X X X X X X X',
  phase: 'X - - - - - - - - - - - - - - -',
};
const v2 = FORM.map((b, i) => {
  const note = nameOf(fold(chord(b.symbol, b.shift).root, 52, 63));
  if (b.part === 'intro') return hits(i === 3 ? HIT.fill : i % 2 ? REST : HIT.intro, note, 'hit');
  if (b.part === 'build') return hits(b.last ? HIT.roll : HIT.build, note, 'hit');
  if (b.part === 'phase') return hits(HIT.phase, note, 'hit');
  return hits(b.last ? HIT.fill : HIT.riff, note, 'hit');
});

// The NES VRC6 tremolo, a step louder every two bars of the build: the third becomes a Castlevania
// sixteenth arpeggio up and down the chord on piano, the fifth stays hammered eighths on strings.
const HOLD = ['X', ...Array(BAR_ROWS - 1).fill('-')].join(' ');
const ARP = [0, 1, 2, 3, 4, 3, 2, 1];
const ostinato = (tone, lo, hi, base, pad, arp) =>
  FORM.map((b, i) => {
    const { root, tones } = chord(b.symbol, b.shift);
    const note = nameOf(fold(root + tones[tone], lo, hi));
    if (b.part === 'intro') return REST;
    if (b.part === 'phase') return HOLD.replace('X', `${note}:${pad}`);
    const inst = b.part === 'build' ? `${base}${Math.min(3, Math.floor((i - 12) / 2))}` : `${base}1`;
    if (arp) {
      const base0 = fold(root + tones[0], lo, hi);
      const ladder = [0, tones[1], tones[2], tones[3], 12].map((t) => nameOf(base0 + t));
      return Array.from({ length: BAR_ROWS }, (_, r) => `${ladder[ARP[r % 8]]}:${inst}`).join(' ');
    }
    return Array.from({ length: BAR_ROWS }, (_, r) => (r % 2 ? '.' : `${note}:${inst}`)).join(' ');
  });
const v3 = ostinato(1, 52, 63, 'ostA', 'padL', true);
const v4 = ostinato(2, 59, 71, 'ostB', 'padR');

const BASS = {
  riff: 'R R O R R R O R R R O R R O R O',
  fill: 'R R O R R R O R F F S S O O O O',
  build: 'R . R . R . R . R R R R O O O O',
  phase: 'R - - - - - - - L - - - R - O -',
};
const v5 = FORM.map((b) => {
  const c = chord(b.symbol, b.shift);
  if (b.part === 'build') return play(b.last ? BASS.fill : BASS.build, c, 'bass');
  if (b.part === 'phase') return play(BASS.phase, c, 'bass');
  return play(b.last ? BASS.fill : BASS.riff, c, 'bass');
});

// The NES DPCM lane: F the kick, <letter>:snare the snare stepping down like toms.
const TOM = { F: 'C4', E: 'Bb3', D: 'A3', C: 'G3', B: 'F3', A: 'E3' };
const DRUMS = {
  riff: 'F - - F F:snare - - - F - F - F:snare - - -',
  build: 'F - F - F:snare - F - F - F - F:snare - F -',
  roll: 'F:snare F:snare F:snare F:snare F:snare F:snare F:snare F:snare E:snare E:snare D:snare D:snare C:snare C:snare B:snare A:snare',
  phase: 'F - - - - - - - F:snare - - - - - - -',
  fill: 'F - - F F:snare - - - F:snare - F:snare - D:snare - C:snare -',
  floor: 'F - - - F - - - F - - - F - - -',
};
const drumRow = (p) => p.split(' ').map((t) => (t === 'F' ? 'C4:kick' : /^[A-F]:snare$/.test(t) ? `${TOM[t[0]]}:snare` : t)).join(' ');
const v6 = FORM.map((b, i) => {
  if (b.part === 'intro') return i < 2 ? REST : drumRow(i === 3 ? DRUMS.fill : DRUMS.floor);
  if (b.part === 'build') return drumRow(b.last ? DRUMS.roll : DRUMS.build);
  if (b.part === 'phase') return drumRow(b.last ? DRUMS.fill : DRUMS.phase);
  return drumRow(b.last ? DRUMS.fill : DRUMS.riff);
});

// The NES noise lane: n a closed hat, 0:open an open one, n:snr a snare roll stepping down.
const ROLL = { 3: 'C4', 2: 'A3', 1: 'F3', 0: 'D3' };
const noiseRow = (p) => p.split(' ').map((t) => {
  const m = /^(\d)(?::(\w+))?$/.exec(t);
  if (!m) return t;
  return m[2] === 'snr' ? `${ROLL[m[1]]}:roll` : m[2] === 'open' ? 'C4:ohat' : 'C4:chat';
}).join(' ');
const v7 = FORM.map((b, i) => {
  if (b.part === 'intro') return noiseRow(i < 3 ? '1 . 1 . 1 . 1 . 1 . 1 . 1 . 1 .' : '1 1 1 1 1 1 1 1 3:snr 3:snr 2:snr 2:snr 1:snr 1:snr 0:snr 0:snr');
  if (b.part === 'build') {
    const k = i - 12;
    return noiseRow(k < 4 ? '1 . 1 1 1 . 1 1 1 . 1 1 1 . 1 1' : k < 7 ? '1 1 1 1 3:snr . 1 1 1 1 1 1 3:snr . 3:snr .' : Array(16).fill('3:snr').join(' '));
  }
  if (b.part === 'phase') return noiseRow('. . 1 . . . 1 . . . 1 . . . 0:open -');
  return noiseRow('1 . 1 1 1 . 1 1 1 . 1 1 1 . 0:open -');
});

const delayed = echo(LEADS, 3, 'dly');
const v8 = FORM.map((b, i) => {
  if (b.part === 'build' || b.part === 'phase') return HOLD.replace('X', `${nameOf(fold(chord(b.symbol, b.shift).root, 52, 64))}:choir`);
  if (b.part === 'riff' || b.part === 'tag') return delayed[i];
  if (b.part !== 'riff up') return REST;
  const scale = pitchClasses(SCALE, b.shift);
  return mapNotes(LEADS[i], (t) => `${thirdBelow(t, scale)}:harm`);
});

const join = (bars) => bars.join(' | ');
const siren = Array.from({ length: 100 }, (_, f) => +(0.5 * Math.sin((2 * Math.PI * f) / 12)).toFixed(3));
const ost = (inst, vol, pan) => ({ ...inst, adsr: [15, 5, 1, 22], vol, pan });

export default {
  tempo: 6,
  loop: LOOP_BAR * BAR_ROWS,
  echo: { mvol: 80, evol: 34, efb: 64, edl: 3, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
  instruments: {
    lead: { ...INSTRUMENTS.brass, vol: 96, pan: -6, pitch: vibrato(0.25, 8, 12) },
    scream: { ...INSTRUMENTS.strings, adsr: [13, 3, 6, 4], vol: 100, pan: -6, pitch: vibrato(0.4, 6, 18) },
    dly: { ...INSTRUMENTS.sax, vol: 46, pan: 44 },
    siren: { ...INSTRUMENTS.strings, vol: 60, pitch: siren },
    nod: { ...INSTRUMENTS.sax, vol: 78 },
    hit: { ...INSTRUMENTS.orch, vol: 92 },
    ostA0: ost(INSTRUMENTS.epiano, 42, -36), ostA1: ost(INSTRUMENTS.epiano, 54, -36),
    ostA2: ost(INSTRUMENTS.epiano, 66, -36), ostA3: ost(INSTRUMENTS.epiano, 78, -36),
    ostB0: ost(INSTRUMENTS.strings, 38, 36), ostB1: ost(INSTRUMENTS.strings, 50, 36),
    ostB2: ost(INSTRUMENTS.strings, 62, 36), ostB3: ost(INSTRUMENTS.strings, 74, 36),
    padL: { ...INSTRUMENTS.pad, vol: 46, pan: -40 },
    padR: { ...INSTRUMENTS.pad, vol: 46, pan: 40 },
    bass: { ...INSTRUMENTS.synbass, vol: 108 },
    choir: { ...INSTRUMENTS.choir, vol: 44, pan: 20 },
    harm: { ...INSTRUMENTS.brass, vol: 56, pan: 36 },
    kick: { ...INSTRUMENTS.gkick, vol: 118 },
    snare: { ...INSTRUMENTS.gsnare, vol: 100 },
    roll: { ...INSTRUMENTS.gsnare, vol: 64, pan: 18 },
    chat: { ...INSTRUMENTS.chat, vol: 62 },
    ohat: { ...INSTRUMENTS.ohat, vol: 50 },
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

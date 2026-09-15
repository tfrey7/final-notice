// The second title arrangement: the theme (title.mjs) as slow corporate wave on the 2A03 plus VRC6,
// 24 bars at about 100 BPM. Kept on the sound test as title (v2).

import { MELODY, VOICINGS, held, nameOf, vibrato } from './title.mjs';

const PHRASE_ENDS = [3, 7, 11, 15, 19, 23];

const bars = (fn) => VOICINGS.map((parts, bar) => fn(parts, bar)).join(' | ');

const bed = (key, inst) => bars((parts) => parts.map((p) => held(p[key], inst, p.len)).join(' '));

// The pad holds the colour tone; a phrase end swaps its last two rows for a synth brass hit.
const saw = bars((parts, bar) => {
  const rows = parts.map((p) => held(p.color, 'pad', p.len)).join(' ').split(' ');
  if (PHRASE_ENDS.includes(bar)) {
    const last = parts[parts.length - 1];
    rows.splice(6, 2, `${nameOf(last.root + 24)}:brass`, '.');
  }
  return rows.join(' ');
});

// Fretless: the root, an anticipation on the and of three, sliding up to the fifth.
const triangle = bars((parts) =>
  parts.length === 2
    ? parts.map((p) => `${nameOf(p.root)} - - ${nameOf(p.root + 7)}`).join(' ')
    : `${nameOf(parts[0].root)} - - - . ${nameOf(parts[0].root)} ${nameOf(parts[0].root + 7)} -`,
);

const BEAT = 'C . 0:hat . 6:gate . 0:hat 0:hat';
const FILL = 'C . 0:hat . 6:gate . 6:gate 5:gate';
const noise = VOICINGS.map((_, bar) => (PHRASE_ENDS.includes(bar) ? FILL : BEAT)).join(' | ');

export default {
  tempo: 18,
  loop: 0,
  instruments: {
    lead: { duty: 1, env: [9, 11, 12, 12, 12, 11, 11, 11, 10, 10, 10, 10, 9], pitch: vibrato(0.15, 18, 20) },
    chorus: { duty: 2, env: [0, 0, 0, 4, 5, 6, 6, 6, 5, 5, 5, 5, 4], pitch: vibrato(0.1, 25).map((v) => +(v + 0.1).toFixed(3)) },
    bass: { env: [15], glide: 5, pitch: vibrato(0.12, 22, 24) },
    bed: { duty: 2, env: [3, 4, 5, 6, 6, 6, 6, 5], pitch: vibrato(0.06, 23) },
    bed2: { duty: 3, env: [3, 4, 5, 5, 5, 5, 5, 4], pitch: vibrato(0.06, 31) },
    pad: { env: [2, 3, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9, 8] },
    brass: { env: [14, 13, 12, 11, 10, 9, 8, 6, 4, 2, 0] },
    kick: { env: [10, 8, 5, 2, 0], pitch: [0, 1, 2] },
    gate: { env: [12, 11, 11, 10, 10, 10, 9, 9, 9, 9, 0] },
    hat: { short: true, env: [3, 2, 1, 0] },
  },
  pulse1: { inst: 'lead', rows: MELODY.join(' | ') },
  pulse2: { inst: 'chorus', rows: MELODY.join(' | ') },
  triangle: { inst: 'bass', rows: triangle },
  noise: { inst: 'kick', rows: noise },
  vrc6p1: { inst: 'bed', rows: bed('third', 'bed') },
  vrc6p2: { inst: 'bed2', rows: bed('seventh', 'bed2') },
  saw: { inst: 'pad', rows: saw },
};

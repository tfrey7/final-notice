// The six jingles on the corporate-wave bank, ported note for note from the NES arrangements: each
// NES channel becomes a voice and each NES instrument its nearest sample. Pulse leads go to the square
// lead, chimes to the bell, VRC6 saw brass to the brass stab, DPCM to the gated drums and orchestra
// hit, noise to the closed hat. The player loads songs by file name, so each has a one-line file.

import * as NES from '../../../audio/songs/jingles.mjs';

const fall = (semis, tau) => Array.from({ length: 50 }, (_, f) => semis * (1 - Math.exp(-f / tau)));
const slide = (per) => Array.from({ length: 50 }, (_, f) => -f * per);

const INSTRUMENTS = {
  lead: { sample: 'rec-sqlead', adsr: [14, 6, 6, 10], vol: 58, pan: -10, echo: true },
  chime: { sample: 'rec-bell', adsr: [15, 5, 2, 17], vol: 112, echo: true },
  harm: { sample: 'rec-epiano', adsr: [15, 4, 4, 16], vol: 70, pan: 20, echo: true },
  bell: { sample: 'rec-bell', adsr: [15, 5, 1, 19], vol: 48, pan: -35, echo: true },
  beep: { sample: 'rec-sqlead', adsr: [15, 7, 7, 0], vol: 60 },
  echo: { sample: 'rec-sqlead', adsr: [15, 7, 7, 0], vol: 26, pan: 40, echo: true },
  drop: { sample: 'rec-sqlead', adsr: [15, 6, 5, 12], vol: 62, pitch: fall(-12, 12) },
  dropEcho: { sample: 'rec-sqlead', adsr: [15, 6, 5, 12], vol: 26, pan: 40, echo: true, pitch: fall(-12, 12) },
  sad: { sample: 'rec-sax', adsr: [13, 6, 6, 8], vol: 92, echo: true },
  busy: { sample: 'rec-sqlead', adsr: [15, 7, 7, 0], vol: 48 },
  dial: { sample: 'rec-sqlead', adsr: [15, 7, 7, 0], vol: 40 },
  brass: { sample: 'rec-brass', adsr: [12, 3, 5, 12], vol: 78, echo: true },
  stab: { sample: 'rec-brass', adsr: [15, 3, 2, 18], vol: 88 },
  pad: { sample: 'rec-pad', adsr: [5, 2, 6, 0], vol: 46, echo: true },
  fall: { sample: 'rec-brass', adsr: [15, 4, 4, 14], vol: 80, pitch: slide(0.5) },
  bass: { sample: 'rec-synbass', adsr: [15, 2, 5, 14], vol: 110 },
  bassFall: { sample: 'rec-synbass', adsr: [15, 2, 5, 14], vol: 110, pitch: slide(0.3) },
  hat: { sample: 'rec-chat', adsr: [15, 7, 7, 0], vol: 90, pan: 24 },
  fax: { noise: 28, adsr: [15, 7, 7, 0], vol: 36, pan: -24 },
  kick: { sample: 'rec-gkick', adsr: [15, 7, 7, 0], vol: 120 },
  snare: { sample: 'rec-gsnare', adsr: [15, 7, 7, 0], vol: 116, echo: true },
  ks: { sample: 'rec-gkick', adsr: [15, 7, 7, 0], vol: 127 },
  orch: { sample: 'rec-orch', adsr: [15, 7, 7, 0], vol: 110, echo: true },
  hit: { sample: 'hit', adsr: [15, 7, 7, 0], vol: 120 },
};

const VOICE_OF = { pulse1: 'v1', pulse2: 'v2', vrc6p1: 'v3', saw: 'v4', triangle: 'v5', dpcm: 'v6', noise: 'v7', vrc6p2: 'v8' };

// Noise rows are period numbers and DPCM rows bare letters; both become a note the sample plays at.
function portRows(channel, rows, defaultInst) {
  return rows.split(/\s+/).map((token) => {
    if (token === '-' || token === '.' || token === '|') return token;
    const [name, inst = defaultInst] = token.split(':');
    let note = name;
    if (channel === 'noise') note = 'C4';
    else if (channel === 'dpcm') note = inst === 'orch' ? `${name}4` : 'C4';
    return `${note}:${inst}`;
  }).join(' ');
}

export function port(nes) {
  const song = {
    tempo: nes.tempo,
    loop: null,
    echo: { mvol: 84, evol: 30, efb: 50, edl: 5, fir: [12, 33, 43, 43, 19, -2, -13, -7] },
    instruments: INSTRUMENTS,
  };
  for (const [channel, voice] of Object.entries(VOICE_OF)) {
    if (nes[channel]) song[voice] = { rows: portRows(channel, nes[channel].rows, nes[channel].inst) };
  }
  return song;
}

export const stageStart = port(NES.stageStart);
export const stageClear = port(NES.stageClear);
export const lifeLost = port(NES.lifeLost);
export const gameOver = port(NES.gameOver);
export const continueJingle = port(NES.continueJingle);
export const pickup = port(NES.pickup);

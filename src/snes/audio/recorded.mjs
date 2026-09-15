// The recorded instrument bank: real instrument samples from FluidR3_GM, cut, looped and BRR-encoded
// by tools/snes-bank.mjs, the way a 1994 sound engineer squeezed a sample CD into 64 KB. The
// synthesised first bank (bank.mjs) stays on the sound test as "(v1)".

import { brrDecode } from './spc.mjs';
import { demoSong } from './bank.mjs';
import DATA from './recorded-brr.mjs';

export const BUDGET_BYTES = 64 * 1024;
export const PREFIX = 'rec-';

export function unpack(base64) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blocks = [];
  for (let b = 0; b < bytes.length; b += 9) {
    const nibbles = new Int8Array(16);
    for (let i = 0; i < 16; i++) nibbles[i] = (((bytes[b + 1 + (i >> 1)] >> (i & 1 ? 0 : 4)) & 15) << 28) >> 28;
    blocks.push({ shift: bytes[b] >> 4, filter: (bytes[b] >> 2) & 3, nibbles });
  }
  return blocks;
}

// Keyed rec-<name>, so the recorded and synthesised samples share the player's one table.
export const SAMPLES = Object.fromEntries(
  Object.entries(DATA).map(([key, d]) => {
    const brr = { blocks: unpack(d.brr), loop: d.loop === null ? null : d.loop / 16 };
    return [PREFIX + key, { brr, pcm: brrDecode(brr), loop: d.loop, rootHz: d.rootHz, rate: d.rate, source: `${d.preset} / ${d.sample}` }];
  }),
);

const inst = (key, def) => ({ sample: PREFIX + key, ...def });
const HIT = [15, 7, 7, 0];

export const INSTRUMENTS = {
  epiano: inst('epiano', {
    label: 'Rhodes electric piano', group: 'Keys', adsr: [15, 4, 4, 16], vol: 100, echo: true,
    demo: ['Eb5 - - - D5 - Bb4 - - - G4 - - - - - - - . .', 'G4 - - - - - - - - - - - - - - - - - . .', 'Bb3 - - - - - - - - - - - - - - - - - . .'],
  }),
  pad: inst('pad', {
    label: 'warm pad', group: 'Keys', adsr: [10, 2, 6, 0], vol: 60, echo: true,
    demo: ['Bb4 - - - - - - - - - - - - - - - - - . .', 'G4 - - - - - - - - - - - - - - - - - . .', 'Eb4 - - - - - - - - - - - - - - - - - . .'],
  }),
  strings: inst('strings', {
    label: 'string section', group: 'Keys', adsr: [11, 3, 6, 2], vol: 72, echo: true,
    demo: ['D5 - - - - - - - - - Eb5 - - - - - - - . .', 'Bb4 - - - - - - - - - Bb4 - - - - - - - . .', 'G4 - - - - - - - - - G4 - - - - - - - . .'],
  }),
  choir: inst('choir', {
    label: 'choir', group: 'Keys', adsr: [10, 3, 6, 2], vol: 72, echo: true,
    demo: ['G4 - - - - - - - - - F4 - - - - - - - . .', 'Eb4 - - - - - - - - - D4 - - - - - - - . .', 'Bb3 - - - - - - - - - Bb3 - - - - - - - . .'],
  }),
  bell: inst('bell', {
    label: 'tubular bell', group: 'Keys', adsr: [15, 5, 2, 19], vol: 100, pan: 30, echo: true,
    demo: ['Bb5 . G5 . Eb5 . F5 . G5 - - - Bb5 - - - - - . .'],
  }),
  slap: inst('slap', {
    label: 'slap bass', group: 'Bass', adsr: [15, 3, 4, 19], vol: 124,
    demo: ['Eb2 - . Eb3 . Eb2 . . Bb1 - . Bb2 . C#3 C3 . Eb2 - . .'],
  }),
  synbass: inst('synbass', {
    label: 'synth bass', group: 'Bass', adsr: [15, 2, 5, 14], vol: 104,
    demo: ['C2 - C2 . C3 . C2 - Ab1 - Ab1 . Ab2 . Ab1 - Bb1 - Bb2 .'],
  }),
  sax: inst('sax', {
    label: 'alto sax', group: 'Lead', adsr: [14, 6, 6, 6], vol: 100, echo: true,
    demo: ['G4 - - Bb4 - C5 - - - - Eb5 - D5 - C5 - - - . .'],
  }),
  brass: inst('brass', {
    label: 'brass section', group: 'Lead', adsr: [15, 3, 4, 14], vol: 88, echo: true,
    demo: [
      'Bb4 . . Bb4 - . . . C5 . . C5 - . . . Eb5 - . .',
      'F4 . . F4 - . . . G4 . . G4 - . . . Bb4 - . .',
      'D4 . . D4 - . . . Eb4 . . Eb4 - . . . G4 - . .',
    ],
  }),
  sqlead: inst('sqlead', {
    label: 'square lead', group: 'Lead', adsr: [14, 7, 6, 4], vol: 52, pan: -20, echo: true,
    demo: ['C5 - Eb5 - G5 - C6 - - - Bb5 - G5 - Ab5 - G5 - - .'],
  }),
  gkick: inst('gkick', { label: 'punch kick', group: 'Drums', adsr: HIT, vol: 124, demo: ['C4 - - - C4 - - - C4 - - - C4 - - - C4 - C4 -'] }),
  gsnare: inst('gsnare', { label: 'punch snare', group: 'Drums', adsr: HIT, vol: 116, demo: ['. . . . C4 - - - . . . . C4 - - - C4 - - -'] }),
  chat: inst('chat', { label: 'closed hat', group: 'Drums', adsr: HIT, vol: 96, pan: 24, demo: ['C4 - C4 - C4 - C4 - C4 - C4 - C4 - C4 - C4 C4 C4 -'] }),
  ohat: inst('ohat', { label: 'open hat', group: 'Drums', adsr: HIT, vol: 84, pan: 24, demo: ['. . C4 - . . C4 - . . C4 - . . C4 - . . C4 -'] }),
  clap: inst('clap', { label: 'clap', group: 'Drums', adsr: HIT, vol: 112, echo: true, demo: ['. . . . C4 - - - . . . . C4 - - - . . C4 -'] }),
  orch: inst('orch', { label: 'orchestra hit', group: 'Drums', adsr: HIT, vol: 104, echo: true, demo: ['C4 - - - - - . . Eb4 - - - - - . . G4 - - -'] }),
};

export const recordedSong = (keys = Object.keys(INSTRUMENTS)) => demoSong(keys, INSTRUMENTS);

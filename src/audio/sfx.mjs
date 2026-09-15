// Sound effects by name. Each takes one channel for its length and gives it back to the song.
//   channel: pulse1 | pulse2 | triangle | noise
//   duty:    0-3 for pulse effects; short: true for the noise channel's metallic mode
//   frames:  one [pitch, volume] per frame at 60 Hz; pitch is a MIDI note (fractions allowed for
//            sweeps) or, on noise, a period index 0 (highest) to 15 (lowest)
// Pulse effects take pulse 2, never the lead on pulse 1.

const sweep = (from, to, vols) =>
  vols.map((vol, i) => [from + ((to - from) * i) / Math.max(1, vols.length - 1), vol]);

// Pitches paired frame by frame with volumes; the last pitch holds.
const zip = (pitches, vols) => vols.map((vol, i) => [pitches[Math.min(i, pitches.length - 1)], vol]);

// Each [pitch, frames] note in turn, the volume envelope running across the whole effect.
const notes = (list, vols) => zip(list.flatMap(([p, n]) => Array(n).fill(p)), vols);

const fade = (from, n) => Array.from({ length: n }, (_, i) => Math.max(1, Math.round(from * (1 - i / n))));

export const SFX = {
  // Stage 1 bodies: all on noise.
  punch: {
    channel: 'noise',
    frames: zip([6, 9, 11, 12, 13, 13, 14, 14, 15], [15, 14, 11, 8, 6, 4, 3, 2, 1]),
  },
  hit: {
    channel: 'noise',
    frames: zip([3, 4, 8, 10, 11, 12, 12, 13, 13, 14, 15], [15, 15, 13, 11, 9, 7, 6, 4, 3, 2, 1]),
  },
  knockdown: {
    channel: 'noise',
    frames: zip(
      [10, 12, 13, 14, 14, 15, 15, 15, 15, 15, 15, 15, 12, 13, 14, 15, 15, 15, 15, 15],
      [15, 15, 13, 12, 10, 8, 6, 4, 2, 1, 0, 0, 11, 9, 7, 5, 4, 3, 2, 1],
    ),
  },
  land: { channel: 'noise', frames: zip([12, 13, 14, 15, 15], [11, 8, 5, 3, 1]) },
  step: { channel: 'noise', short: true, frames: zip([7, 9, 11], [6, 3, 1]) },
  throw: {
    channel: 'noise',
    frames: zip([9, 8, 7, 6, 5, 4, 4, 5, 6, 7, 8, 9], [3, 6, 8, 10, 10, 9, 8, 6, 4, 3, 2, 1]),
  },
  stamp: {
    channel: 'triangle',
    frames: zip([50, 45, 41, 38, 36, 35, 34, 34], [15, 15, 15, 15, 15, 15, 15, 15]),
  },
  waxBreak: {
    channel: 'noise',
    short: true,
    frames: zip([1, 2, 4, 7, 8, 10, 11, 12, 13, 14, 15], [15, 14, 11, 13, 10, 8, 6, 4, 3, 2, 1]),
  },
  conveyor: {
    channel: 'noise',
    short: true,
    frames: zip([10], [6, 1, 1, 3, 1, 1, 6, 1, 1, 3, 1, 1]),
  },

  // Movement and grabs: pulse sweeps.
  jump: {
    channel: 'pulse2',
    duty: 2,
    frames: sweep(62, 81, [12, 12, 11, 11, 10, 10, 9, 9, 8, 7, 6, 5, 4, 3, 2, 1]),
  },
  grab: { channel: 'pulse2', duty: 1, frames: notes([[55, 3], [62, 5]], [13, 12, 11, 12, 10, 8, 5, 2]) },

  // The Emergency Injunction: a rising fanfare stab, then the seal ring slamming down.
  injunction: {
    channel: 'pulse2',
    duty: 3,
    frames: [
      ...notes([[53, 2], [60, 2], [65, 2], [69, 2], [72, 2], [77, 4]], [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 14]),
      ...sweep(77, 29, fade(15, 34)),
    ],
  },

  // Stage 2 enchantments, each its own shape.
  cast: {
    // Seal of Notice: a bright stamp-shaped zap, down a fifth.
    channel: 'pulse2',
    duty: 1,
    frames: [...notes([[84, 2], [91, 2]], [14, 14, 13, 12]), ...sweep(84, 72, [12, 11, 9, 7, 5, 3, 2, 1])],
  },
  carbonCopy: {
    // Three papers: three quick falling zips, fanned in pitch.
    channel: 'pulse2',
    duty: 0,
    frames: [
      ...sweep(88, 76, [13, 12, 10, 6]), [0, 0],
      ...sweep(91, 79, [12, 11, 9, 5]), [0, 0],
      ...sweep(95, 83, [11, 10, 8, 4, 2, 1]),
    ],
  },
  redTape: {
    // A ribbon unspooling: a warbling trill that slides down.
    channel: 'pulse2',
    duty: 3,
    frames: Array.from({ length: 22 }, (_, i) => [67 - i * 0.4 + (i % 4 < 2 ? 0 : 3), Math.max(1, 13 - Math.floor(i / 2))]),
  },
  margin: {
    // A lobbed page arcs up and over, then bursts into the ink sigil.
    channel: 'pulse2',
    duty: 2,
    frames: [
      ...zip([60, 64, 67, 70, 72, 73, 73, 72, 70, 67], [9, 9, 10, 10, 10, 10, 9, 9, 8, 8]),
      ...notes([[79, 2], [74, 2], [79, 2], [74, 2], [70, 3]], [15, 14, 13, 12, 10, 9, 7, 6, 4, 3, 1]),
    ],
  },

  // Pickups and menus.
  pickup: { channel: 'pulse2', duty: 2, frames: notes([[83, 4], [88, 16]], [12, 12, 12, 12, ...fade(12, 16)]) },
  heal: {
    channel: 'pulse2',
    duty: 1,
    frames: notes([[65, 3], [69, 3], [72, 3], [77, 3], [81, 3], [84, 12]], [8, 9, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, ...fade(10, 12)]),
  },
  blip: { channel: 'pulse2', duty: 1, frames: [[84, 5], [84, 3], [84, 1]] },
  menu: { channel: 'pulse2', duty: 1, frames: notes([[76, 2], [81, 4]], [10, 10, 10, 8, 5, 2]) },
  pause: {
    channel: 'pulse2',
    duty: 2,
    frames: notes([[88, 4], [84, 4], [88, 4], [84, 8]], [11, 11, 11, 0, 11, 11, 11, 0, 11, 11, 11, 0, 11, 10, 9, 8, 6, 4, 2, 1]),
  },
  alarm: {
    channel: 'pulse2',
    duty: 1,
    frames: notes([[81, 8], [74, 8], [81, 8], [74, 8], [81, 8], [74, 8]], Array(48).fill(0).map((_, i) => (i % 8 === 7 ? 4 : 13))),
  },
};

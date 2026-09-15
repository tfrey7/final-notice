// Sound effects by name. Each takes one channel for its length and gives it back to the song.
//   channel: pulse1 | pulse2 | triangle | noise
//   duty:    0-3 for pulse effects; short: true for the noise channel's metallic mode
//   frames:  one [pitch, volume] per frame at 60 Hz; pitch is a MIDI note (fractions allowed for
//            sweeps) or, on noise, a period index 0 (highest) to 15 (lowest)

const sweep = (from, to, vols) =>
  vols.map((vol, i) => [from + ((to - from) * i) / Math.max(1, vols.length - 1), vol]);

export const SFX = {
  punch: {
    channel: 'noise',
    frames: [[9, 15], [11, 13], [12, 10], [13, 8], [13, 6], [14, 4], [14, 3], [15, 2], [15, 1]],
  },
  jump: {
    channel: 'pulse2',
    duty: 2,
    frames: sweep(62, 81, [12, 12, 11, 11, 10, 10, 9, 9, 8, 7, 6, 5, 4, 3, 2, 1]),
  },
  blip: {
    channel: 'pulse2',
    duty: 1,
    frames: [[84, 9], [84, 7], [84, 4]],
  },
};

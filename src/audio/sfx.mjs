// Sound effects by name, in the late-Famicom style (1990-94) with a corporate wave gloss: layered
// channels, pitch envelopes, a delayed copy on a second channel for an echo, DPCM hits and stabs, and
// the VRC6 saw for brass. The first set, one channel each, is sfx-v1.mjs.
//
// An effect is { layers: [...] }; each layer takes one channel for its length and gives it back:
//   channel: any song channel but pulse1, which keeps the lead
//   delay:   frames after the effect starts (an echo), default 0
//   duty:    pulse duty (0-3 on the 2A03, 0-7 on the VRC6); short: true for metallic noise
//   sample:  the DPCM sample, on the dpcm channel
//   frames:  one [pitch, volume] per frame at 60 Hz; pitch is a MIDI note (fractions allowed), a noise
//            period index 0-15, or on dpcm the playback rate 0-15 (read from the first frame)
// delay + frames stays under a second so effects read over the music.

// A curved sweep: fast at first, settling on `to`, the Kirby-era pitch envelope.
const bend = (from, to, vols, k = 4) =>
  vols.map((vol, i) => [to + (from - to) * Math.exp((-k * i) / Math.max(1, vols.length - 1)), vol]);

const zip = (pitches, vols) => vols.map((vol, i) => [pitches[Math.min(i, pitches.length - 1)], vol]);

const notes = (list, vols) => zip(list.flatMap(([p, n]) => Array(n).fill(p)), vols);

const fade = (from, n) => Array.from({ length: n }, (_, i) => Math.max(1, Math.round(from * (1 - i / n))));

// Held flat, then cut dead: the gated shape.
const gate = (vol, on, off = 1) => [...Array(on).fill(vol), ...Array(off).fill(0)];

const sample = (name, rate, frames, vol = 15, delay = 0) =>
  ({ channel: 'dpcm', sample: name, delay, frames: Array(frames).fill([rate, vol]) });

// The same frames `late` frames later on another channel, quieter: the echo trick.
const echo = (channel, late, frames, drop = 5, duty) =>
  ({ channel, delay: late, duty, frames: frames.map(([p, v]) => [p, Math.max(0, v - drop)]) });

const fx = (...layers) => ({ layers });

const jumpArc = bend(60, 86, [12, 12, 11, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
const castZap = [...notes([[96, 2], [91, 2]], [14, 14, 12, 11]), ...bend(91, 72, [11, 9, 7, 5, 3, 2, 1])];
const tape = Array.from({ length: 22 }, (_, i) => [70 - i * 0.6 + (i % 4 < 2 ? 0 : 4), Math.max(1, 13 - Math.floor(i / 2))]);
const arc = zip([60, 65, 69, 72, 74, 75, 74, 72, 69], [9, 10, 10, 11, 11, 11, 10, 9, 8]);
// Transaction approved: a two-tone point-of-sale chime with an octave flick on the strike.
const approved = [...notes([[100, 1], [88, 3], [95, 1]], [13, 13, 12, 11, 14]), ...zip([95], fade(12, 18))];
const healArp = notes([[65, 3], [69, 3], [72, 3], [76, 3], [79, 3], [84, 14]], [9, 10, 10, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, ...fade(12, 14)]);
const cursor = notes([[88, 2], [95, 4]], [9, 9, 10, 8, 5, 2]);
const holdChime = notes([[89, 3], [93, 3], [96, 3], [100, 12]], [11, 11, 0, 11, 11, 0, 11, 11, 0, ...fade(11, 12)]);
// A desk phone: two tones swapping every two frames, a ring, a gap, a ring.
const ring = Array.from({ length: 48 }, (_, i) => [i % 4 < 2 ? 86 : 83, i >= 20 && i < 28 ? 0 : 11]);
const faxWarble = Array.from({ length: 16 }, (_, i) => [i % 2 ? 93 : 98, i < 14 ? 4 : 0]);

export const SFX = {
  // Bodies: a sampled thump under a noise crack.
  punch: fx(sample('hit', 15, 8), { channel: 'noise', frames: zip([3, 6, 9, 12], [12, 8, 4, 1]) }),
  hit: fx(
    sample('hit', 13, 12),
    { channel: 'noise', frames: zip([2, 4, 7, 9, 11, 13], [15, 13, 10, 7, 4, 2]) },
    { channel: 'pulse2', duty: 3, frames: bend(62, 38, [10, 9, 7, 5, 3, 1]) },
  ),
  knockdown: fx(
    sample('kickSnare', 15, 14),
    { channel: 'triangle', frames: bend(45, 26, gate(15, 14)) },
    { channel: 'noise', delay: 16, frames: zip([11, 13, 14, 15], [9, 6, 3, 1]) },
    sample('kick', 12, 10, 11, 18),
  ),
  land: fx(sample('kick', 14, 8, 13), { channel: 'noise', short: true, frames: zip([12, 14], [5, 2]) }),
  step: fx({ channel: 'noise', short: true, frames: zip([6], gate(5, 2)) }),
  throw: fx(
    { channel: 'noise', frames: zip([9, 8, 7, 6, 5, 4, 4, 5, 6, 7], [3, 6, 8, 10, 10, 9, 7, 5, 3, 1]) },
    { channel: 'pulse2', duty: 0, frames: bend(70, 84, [4, 6, 7, 7, 6, 5, 4, 3, 2, 1]) },
  ),
  // Approval stamp: a gated snare and a falling thunk.
  stamp: fx(sample('snare', 15, 10), { channel: 'triangle', frames: bend(52, 33, gate(15, 9)) }),
  waxBreak: fx(
    sample('hit', 14, 10),
    { channel: 'noise', short: true, frames: zip([1, 2, 4, 7, 9, 11, 13, 15], [15, 13, 12, 10, 7, 5, 3, 1]) },
    { channel: 'pulse2', duty: 0, frames: notes([[98, 2], [93, 2], [89, 2], [86, 2], [81, 4]], [12, 12, 11, 11, 9, 9, 7, 7, 5, 4, 2, 1]) },
  ),
  conveyor: fx(
    { channel: 'noise', short: true, frames: zip([10], [...gate(6, 2, 4), ...gate(3, 2, 4)]) },
    { channel: 'vrc6p2', duty: 1, frames: zip([36, 36, 37, 36], [...gate(6, 3, 3), ...gate(6, 3, 3)]) },
  ),

  // Movement and grabs: curved sweeps with a soft echo on a VRC6 pulse.
  jump: fx({ channel: 'pulse2', duty: 1, frames: jumpArc }, echo('vrc6p2', 4, jumpArc, 6, 3)),
  grab: fx(
    { channel: 'pulse2', duty: 1, frames: notes([[67, 2], [74, 2], [79, 5]], [13, 13, 12, 12, 11, 9, 6, 3, 1]) },
    { channel: 'noise', short: true, frames: zip([2], [8, 3]) },
  ),

  // The Emergency Injunction: an orchestra stab under saw brass, then the seal ring slamming down.
  injunction: fx(
    sample('stab', 15, 16),
    { channel: 'saw', frames: notes([[65, 4], [72, 4], [77, 18]], [13, 14, 14, 13, 14, 15, 15, 14, 15, 15, 15, 15, 14, 14, 13, 13, 12, 12, 11, 10, 9, 7, 5, 3, 2, 1]) },
    { channel: 'pulse2', duty: 2, frames: [...notes([[81, 4], [84, 22]], [12, 12, 12, 12, ...fade(12, 22)]), ...bend(84, 36, fade(14, 26))] },
    sample('kickSnare', 14, 20, 15, 28),
    { channel: 'noise', delay: 30, frames: zip([4, 6, 8, 10, 12, 13, 14, 15], [15, 13, 11, 9, 7, 5, 3, 1]) },
  ),

  // Stage 2 enchantments, each its own shape.
  cast: fx({ channel: 'pulse2', duty: 1, frames: castZap }, echo('vrc6p1', 5, castZap, 6, 2)),
  carbonCopy: fx(
    // Three papers out of the fax: three falling zips over a handshake warble.
    { channel: 'pulse2', duty: 0, frames: [...bend(91, 77, [13, 12, 10, 6]), [0, 0], ...bend(94, 80, [12, 11, 9, 5]), [0, 0], ...bend(98, 84, [11, 10, 8, 4, 2, 1])] },
    { channel: 'vrc6p2', duty: 0, frames: faxWarble },
  ),
  redTape: fx({ channel: 'pulse2', duty: 3, frames: tape }, echo('vrc6p1', 6, tape, 7, 4)),
  margin: fx(
    { channel: 'pulse2', duty: 2, frames: [...arc, ...notes([[82, 2], [77, 2], [82, 2], [77, 2], [72, 3]], [15, 14, 13, 12, 10, 9, 7, 6, 4, 3, 1])] },
    sample('hit', 15, 8, 14, 9),
    { channel: 'noise', delay: 9, frames: zip([1, 3, 6, 9, 12], [11, 8, 5, 3, 1]) },
  ),

  // Pickups and menus: bright chimes with shimmer.
  pickup: fx({ channel: 'pulse2', duty: 2, frames: approved }, echo('vrc6p1', 4, approved, 6, 1)),
  heal: fx({ channel: 'pulse2', duty: 1, frames: healArp }, echo('vrc6p2', 5, healArp, 6, 3)),
  blip: fx({ channel: 'pulse2', duty: 1, frames: [[91, 5], [91, 2], [79, 1]] }),
  menu: fx({ channel: 'pulse2', duty: 1, frames: cursor }, echo('vrc6p2', 3, cursor, 6, 2)),
  pause: fx({ channel: 'pulse2', duty: 2, frames: holdChime }, echo('vrc6p1', 6, holdChime, 6, 1)),
  alarm: fx({ channel: 'pulse2', duty: 1, frames: ring }, { channel: 'vrc6p2', duty: 3, frames: ring.map(([p, v]) => [p - 12, v ? v - 4 : 0]) }),
};

export const layersOf = (def) => def.layers ?? [def];

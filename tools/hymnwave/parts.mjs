// Part builders: each turns a progression (engine.chordsOf) into [beat, dur, midi, vel, bar] notes.

const inBars = (bar, from, to) => bar >= from && bar < to;

export function held(chords, { from = 0, to = 999, octave = 0, vel = 80, bass = false, gap = 0.05 } = {}) {
  return chords.filter((c) => inBars(c.bar, from, to)).flatMap((c) =>
    (bass ? [c.bass] : c.tones).map((m) => [c.beat, c.dur - gap, m + 12 * octave, vel, c.bar]));
}

const chordAt = (chords, beat) => chords.findLast((c) => c.beat <= beat + 1e-6);

// pattern: [offset in the bar, duration, velocity?]
export function stabs(chords, pattern, { from = 0, to = 999, octave = 0, vel = 80, bars } = {}) {
  const out = [];
  for (let bar = from; bar < Math.min(to, bars); bar++) {
    for (const [off, dur, v = vel] of pattern) {
      const c = chordAt(chords, bar * 4 + off);
      for (const m of c.tones) out.push([bar * 4 + off, dur, m + 12 * octave, v, bar]);
    }
  }
  return out;
}

// pattern: [offset, duration, semitones above the bass, velocity?]
export function bassline(chords, pattern, { from = 0, to = 999, octave = 0, vel = 90, bars } = {}) {
  const out = [];
  for (let bar = from; bar < Math.min(to, bars); bar++) {
    for (const [off, dur, iv, v = vel] of pattern) {
      const c = chordAt(chords, bar * 4 + off);
      out.push([bar * 4 + off, dur, c.bass + iv + 12 * octave, v, bar]);
    }
  }
  return out;
}

// hits: { key: [offset or [offset, vel]] }
export function drums(hits, { from = 0, to = 999, vel = 90 } = {}) {
  const out = [];
  for (let bar = from; bar < to; bar++) {
    for (const [key, offs] of Object.entries(hits)) {
      for (const o of offs) {
        const [off, v = vel] = Array.isArray(o) ? o : [o];
        out.push([bar * 4 + off, 0.25, Number(key), v, bar]);
      }
    }
  }
  return out;
}

export const at = (notes, bar, beatsPerBar = 4) => notes.map(([b, d, m, v]) => [b + bar * beatsPerBar, d, m, v, bar + Math.floor(b / beatsPerBar)]);
export const eighths = (hi, lo) => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((o, i) => [o, i % 2 ? lo : hi]);
export const sixteenths = (hi, lo) => Array.from({ length: 16 }, (_, i) => [i / 4, i % 4 ? lo : hi]);

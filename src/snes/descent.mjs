// The descent, docs/SNES-DESCENT.md: corporate wave at 0, the Backrooms from 30, gothic cosmic from 75.
// Every screen of the flow and every stage area (by its checkpoint) names its descent d, 0-100, at
// entry and where it has climbed to by the area's far edge. Pure.
import { lerp15 } from './color.mjs';
import { HEIGHT } from './screen.mjs';
import { MAT, palettesAt } from './kit/palettes.mjs';

// §1, the beat map: [at entry, at the far edge]. Area 5 of each stage is its boss room.
export const BEATS = {
  title: [0, 0],
  select: [0, 0],
  scene1: [0, 0],
  'stage1-area1': [0, 5],
  'stage1-area2': [8, 18],
  'stage1-area3': [20, 28],
  'stage1-area4': [30, 30],
  'stage1-area5': [35, 35],
  scene2: [38, 38],
  'stage2-area1': [40, 48],
  'stage2-area2': [50, 62],
  'stage2-area3': [65, 75],
  'stage2-area4': [78, 84],
  'stage2-area5': [85, 95],
  scene3: [100, 100],
  ending: [100, 0],
};

export const BOSSES = { vellum: 'stage1-area5', custodian: 'stage2-area3', greatSeal: 'stage2-area5' };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// A beat's d, `along` 0 at its entry to 1 at its far edge (or, for the ending, the end of the walk out).
export function descentAt(beat, along = 0) {
  const b = BEATS[beat] ?? BEATS[BOSSES[beat]];
  if (!b) throw new RangeError(`no descent beat ${beat}`);
  return Math.round(b[0] + (b[1] - b[0]) * clamp(along, 0, 1));
}

// A flow state's d: a stage reads its checkpoint, game over the beat the player fell on.
export function descentOf(state, along = 0) {
  const beat = state.screen === 'gameover' || state.screen === 'stage1' || state.screen === 'stage2' ? state.checkpoint : state.screen;
  return descentAt(beat, along);
}

// §3.1: one slot's colour at d, lerped between the anchors either side, [[d, rgb15], ...] ascending.
export function slotAt(anchors, d) {
  if (!anchors.length) throw new RangeError('slotAt wants at least one anchor');
  if (d <= anchors[0][0]) return anchors[0][1];
  const i = anchors.findIndex(([at]) => at >= d);
  if (i < 0) return anchors[anchors.length - 1][1];
  const [d0, c0] = anchors[i - 1];
  const [d1, c1] = anchors[i];
  return lerp15(c0, c1, (d - d0) / (d1 - d0));
}

export const MAX_DRIFT_SLOTS = 4;
export const MAX_DRIFT_BANDS = 6;

// The slots that drift top-down by default: the ceiling, the cornice and the lit panel, which fill
// the top of every kit room.
export const DRIFT_SLOTS = [
  { pal: MAT.ceiling.pal, slot: MAT.ceiling.values[0] },
  { pal: MAT.ceiling.pal, slot: MAT.ceiling.values[1] },
  { pal: MAT.cornice.pal, slot: MAT.cornice.values[0] },
  { pal: MAT.panel.pal, slot: MAT.panel.values[2] },
];

// The HDMA table that rewrites those slots per band of scanlines: runs of [lines, [[pal, slot, rgb15]]]
// from line 0. The top band is `lift` points further along than the bottom one, which sits at d.
export function driftTable({ d, slots = DRIFT_SLOTS, bands = MAX_DRIFT_BANDS, lift = 4, height = HEIGHT, at = palettesAt }) {
  if (slots.length < 1 || slots.length > MAX_DRIFT_SLOTS) throw new RangeError(`drift rewrites 1-${MAX_DRIFT_SLOTS} slots, got ${slots.length}`);
  if (!Number.isInteger(bands) || bands < 2 || bands > MAX_DRIFT_BANDS) throw new RangeError(`drift runs 2-${MAX_DRIFT_BANDS} bands, got ${bands}`);
  const runs = [];
  let y = 0;
  for (let i = 0; i < bands; i++) {
    const lines = i === bands - 1 ? height - y : Math.floor(height / bands);
    const bd = clamp(d + (lift * (bands - 1 - i)) / (bands - 1), 0, 100);
    const pals = at(bd);
    runs.push([lines, slots.map(({ pal, slot }) => [pal, slot, pals[pal][slot - 1]])]);
    y += lines;
  }
  return runs;
}

// §3.1's two timed drifts, as d at `frame` of the move (60 frames a second).
export const TIMED = {
  retention: { from: 35, to: 38, frames: 60 },
  sealDefeat: { from: 95, to: 100, frames: 120 },
};

export function timedDrift(name, frame) {
  const t = TIMED[name];
  if (!t) throw new RangeError(`no timed drift ${name}`);
  return Math.round(t.from + (t.to - t.from) * clamp(frame / t.frames, 0, 1));
}

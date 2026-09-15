// Vellum's last third of health: the duel's A and climbing B, a whole tone higher at 180 bpm, with the
// kit, toms and timpani driving every bar and no slow strings to breathe on. Sixteen bars, looped.

import vellum, { A_CHORDS, A_LEAD, BAR_ROWS, B_CHORDS, B_LEAD_2, INSTRUMENTS_USED, arrange } from './vellum.mjs';
import { bars, section } from './chase-kit.mjs';

export const SHIFT = 2;
export const FORM = [...section('A', A_CHORDS, A_LEAD, SHIFT), ...section('B', B_CHORDS, B_LEAD_2, SHIFT)];

const parts = arrange(FORM, { pinch: true });

export default {
  ...vellum,
  tempo: 5,
  loop: 0,
  drops: [],
  instruments: { ...INSTRUMENTS_USED, lead: { ...INSTRUMENTS_USED.lead, vol: 110 } },
  ...Object.fromEntries(Object.entries(parts).map(([v, list]) => [v, { ...vellum[v], rows: bars(list, BAR_ROWS) }])),
};

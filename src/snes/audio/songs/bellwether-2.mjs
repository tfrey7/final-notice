// Bellwether's second phase: A and the climbing B a semitone up, every bar driven in sixteenths, with
// orchestra hits where the organ stabbed. Sixteen bars, looped.

import { A_CHORDS, A_LEAD_2, B_CHORDS, B_LEAD_2, keyed, phaseSong } from './bellwether.mjs';

export const SHIFT = 1;
export const FORM = [...keyed('A2', A_CHORDS, A_LEAD_2, SHIFT), ...keyed('B2', B_CHORDS, B_LEAD_2, SHIFT)];

export default phaseSong(FORM, 2);

// Bellwether's last phase, the epic climax: brass carrying long heroic lines over the full organ churning
// in eighths, the pedal stop, a full choir and pounding timpani at 129 bpm, climbing Ab, Bb to C minor and breaking out into C major at
// the end of each phrase. Sixteen bars, looped.

import { keyed, phaseSong } from './bellwether.mjs';

const RISE_CHORDS = ['Ab', 'Bb', 'Cm', 'Cm', 'Ab', 'Bb', 'C', 'C'];
const RISE_LEAD = [
  'C4/v - - - - - - - Eb4 - - - F4 - - -',
  'D4/v - - - - - - - F4 - - - Bb4 - - -',
  'G4/v - - - - - - - - - - - F4 - Eb4 -',
  'G4/v - - - - - - - - - - - . . . .',
  'C5/v - - - - - - - Bb4 - - - Ab4 - - -',
  'F4/v - - - - - - - D4 - - - Bb3 - - -',
  'C4/v - - - - - - - E4 - - - G4 - - -',
  'C5/v - - - - - - - - - - - - - - -',
];

const CROWN_CHORDS = ['Fm', 'Db', 'Eb', 'Bb', 'Ab', 'Bb', 'C', 'C'];
const CROWN_LEAD = [
  'Ab4/v - - - - - - - G4 - - - F4 - - -',
  'F4/v - - - - - - - Ab4 - - - Db5 - - -',
  'Bb4/v - - - - - - - G4 - - - Eb4 - - -',
  'D4/v - - - - - - - F4 - - - Bb4 - - -',
  'C5/v - - - - - - - Eb4 - - - Ab4 - - -',
  'D5/v - - - - - - - F4 - - - Bb4 - - -',
  'C5/v - - - - - - - G4 - - - E4 - - -',
  'G4/v - - - - - - - - - - - - - - -',
];

export const FORM = [...keyed('A', RISE_CHORDS, RISE_LEAD), ...keyed('B', CROWN_CHORDS, CROWN_LEAD)];

export default phaseSong(FORM, 3);

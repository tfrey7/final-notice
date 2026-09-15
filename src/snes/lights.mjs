// After Hours: the title tower's floors go dark one a beat through the title song's piano intro.
// The beat comes from the song itself: its tempo (frames a row) and four rows a beat.
import song, { BAR_ROWS } from './audio/songs/title.mjs';
import { FORM } from '../audio/songs/title.mjs';

const BEAT_ROWS = BAR_ROWS / 4;
export const TITLE_BPM = 3600 / (song.tempo * BEAT_ROWS);
export const INTRO_BEATS = FORM.filter((b) => b.part === 'intro').length * 4;
export const INTRO_FRAMES = INTRO_BEATS * BEAT_ROWS * song.tempo;

const beatAt = (frame, bpm) => Math.floor((frame * bpm) / 3600 + 1e-9);

// How many floors are dark at `frame`: none on the first beat, one more on each beat after, until
// `floors` are out. `clunk` is true on the one frame each floor goes dark.
export function lightsOut(frame, bpm, floors = INTRO_BEATS - 1) {
  const beat = frame < 0 ? -1 : beatAt(frame, bpm);
  const dark = Math.min(floors, Math.max(0, beat));
  const clunk = beat >= 1 && beat <= floors && beatAt(frame - 1, bpm) < beat;
  return { beat, dark, clunk };
}

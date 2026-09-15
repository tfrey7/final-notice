// The ending's timeline in frames: EVIDENCE stamped on the file, the credits rolling up over the night
// office, then THE END. Start skips straight to THE END (L18); Start there goes back to the title.
import { CREDITS } from './script.mjs';

export const STAMP_AT = 70;
export const CREDITS_AT = 200;
export const LINE_GAP = 16;
export const ROLL_SPEED = 0.5;
export const ROLL_FROM = 224;
export const END_HOLD = 600;

export const creditsEnd = (lines = CREDITS) => CREDITS_AT + Math.ceil((ROLL_FROM + lines.length * LINE_GAP) / ROLL_SPEED);

// Where the ending is at `frame`: its phase, whether the stamp is down, and the credits' top line y.
export function endingAt(frame, lines = CREDITS) {
  if (frame < CREDITS_AT) return { phase: 'stamp', stamped: frame >= STAMP_AT, rollY: ROLL_FROM };
  if (frame < creditsEnd(lines)) return { phase: 'credits', stamped: true, rollY: ROLL_FROM - (frame - CREDITS_AT) * ROLL_SPEED };
  return { phase: 'end', stamped: true, rollY: null };
}

// One frame of the ending: the next frame number, and 'title' once it is over.
export function endingStep(frame, pad, lines = CREDITS) {
  const end = creditsEnd(lines);
  const start = pad.pressed.has('start') || pad.pressed.has('a');
  if (frame >= end && (start || frame >= end + END_HOLD)) return { frame, event: 'title' };
  if (frame < end && pad.pressed.has('start')) return { frame: end, event: null };
  return { frame: frame + 1, event: null };
}

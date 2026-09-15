// The SNES ending, boards E1-E5 of docs/SNES-CUTSCENES.md, as a pure timeline in frames (60 a second):
// the ledger laid in a manila file on Bellwether's desk; EVIDENCE stamped by Mode 7 with a one-frame
// flash and a 2 px shake; the file closing and a mosaic out; the credits rolling over the night tower
// while its lit floors go dark one per credit; one window left lit, THE END, the clock tick alone, and a
// fade back to the title. Start skips to THE END, and Start there leaves.
import { LEVELS, MAX_MOSAIC, fadeLevel } from './fx.mjs';
import { CREDITS } from '../story/script.mjs';

export const FADE_FRAMES = 32;
export const LEDGER_AT = 90;
export const LEDGER_FRAMES = 12;
export const STAMP_AT = 360;
export const STAMP_FRAMES = 10;
export const STAMP_FROM = 3.0;
export const STAMP_TO = 1.8;
export const SHAKE_FRAMES = 6;
export const CLOSE_AT = 600;
export const CLOSE_FRAMES = 20;
export const MOSAIC_FRAMES = 16;
export const CREDITS_AT = 900;
export const LINE_GAP = 16;
export const ROLL_SPEED = 0.5;
export const ROLL_FROM = 224;
export const DOUSE_Y = 112;
export const TICK_EVERY = 60;
export const HOLD_FRAMES = 300;

const TOP = LEVELS - 1;
const LANDED = STAMP_AT + STAMP_FRAMES;

// The credit lines that put a floor out: every one with words on it, in roll order.
export const creditIndexes = (lines = CREDITS) => lines.flatMap((line, i) => (line ? [i] : []));
export const FLOORS = creditIndexes().length;

export const endAt = (lines = CREDITS) => CREDITS_AT + Math.ceil((ROLL_FROM + lines.length * LINE_GAP) / ROLL_SPEED);
export const fadeAt = (lines = CREDITS) => endAt(lines) + HOLD_FRAMES;
export const leaveAt = (lines = CREDITS) => fadeAt(lines) + 2 * TOP;

// How many floors are dark at `frame`: one per credit line whose top has scrolled up past DOUSE_Y.
export function floorsOut(frame, lines = CREDITS) {
  const rollY = ROLL_FROM - Math.max(0, frame - CREDITS_AT) * ROLL_SPEED;
  return creditIndexes(lines).filter((i) => rollY + i * LINE_GAP <= DOUSE_Y).length;
}

// The window for one lit floor's scanline band: the whole line while it is lit, nothing once it is out,
// except the bottom floor, which keeps the one window at [left, right] (the clerk working late).
export function floorWindow(floor, out, floors, keep) {
  if (floor >= out) return [{ left: 0, right: 255 }];
  return floor === floors - 1 ? [keep] : [{ left: 1, right: 0 }];
}

// Where the ending is at `frame`.
export function endingAt(frame, lines = CREDITS) {
  const f = Math.max(0, frame);
  const base = { level: TOP, mosaic: 1, ledger: 1, stamp: null, flash: false, shake: 0, closed: 0, rollY: null, out: 0 };
  if (f < CREDITS_AT) {
    const at = { ...base, board: 'E1', picture: 'file' };
    at.level = Math.min(TOP, Math.floor((f * TOP) / FADE_FRAMES));
    at.ledger = Math.min(1, Math.max(0, f - LEDGER_AT) / LEDGER_FRAMES);
    if (f >= STAMP_AT) {
      const p = Math.min(1, (f - STAMP_AT) / STAMP_FRAMES);
      at.board = 'E2';
      at.stamp = STAMP_FROM + (STAMP_TO - STAMP_FROM) * p;
      at.flash = f === LANDED;
      at.shake = f >= LANDED && f < LANDED + SHAKE_FRAMES ? (f - LANDED) % 2 ? -2 : 2 : 0;
    }
    if (f >= CLOSE_AT) {
      at.board = 'E3';
      at.closed = Math.min(1, (f - CLOSE_AT) / CLOSE_FRAMES);
      const t = f - (CREDITS_AT - MOSAIC_FRAMES);
      if (t >= 0) at.mosaic = 1 + Math.floor((t * (MAX_MOSAIC - 1)) / (MOSAIC_FRAMES - 1));
    }
    return at;
  }
  const t = f - CREDITS_AT;
  const at = { ...base, board: 'E4', picture: 'tower', mosaic: Math.max(1, MAX_MOSAIC - t), out: floorsOut(f, lines) };
  if (f < endAt(lines)) return { ...at, rollY: ROLL_FROM - t * ROLL_SPEED };
  return { ...at, board: 'E5', level: fadeLevel(f - fadeAt(lines)) };
}

// The sounds that fire on `frame`: the ledger and the closing file rustle, the stamp lands, and the
// clock ticks once a second, alone, from THE END.
export function endingCues(frame, lines = CREDITS) {
  if (frame === LEDGER_AT || frame === CLOSE_AT) return ['paper'];
  if (frame === LANDED) return ['stamp'];
  const t = frame - endAt(lines);
  return t >= 0 && frame < fadeAt(lines) && t % TICK_EVERY === 0 ? ['tick'] : [];
}

// One frame of the ending: Start before THE END jumps to it; Start on it, or the fade running out,
// goes to the title.
export function endingStep(frame, pad, lines = CREDITS) {
  const start = pad.pressed.has('start');
  if (frame < endAt(lines) && start) return { frame: endAt(lines), event: null };
  if (start || frame + 1 >= leaveAt(lines)) return { frame, event: 'title' };
  return { frame: frame + 1, event: null };
}

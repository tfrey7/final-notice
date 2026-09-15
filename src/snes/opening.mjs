// The SNES opening, boards O1-O4 of docs/SNES-CUTSCENES.md, as a pure timeline in frames (60 a second):
// fade in on the night skyline with a clock tick, tilt up the tower to its one lit floor, mosaic into
// the billing office, then the bill feeding up the screen while LIFETIMES BILLED counts to 47.
// Part 2 (card 2013) carries on from the bill. Start skips to the title from any frame.
import { LEVELS, MAX_MOSAIC } from './fx.mjs';

export const FADE_FRAMES = 32;
export const TILT_AT = 300;
export const TILT_FRAMES = 240;
export const TILT_PX = 160;
export const OFFICE_AT = 600;
export const MOSAIC_FRAMES = 32;
export const BILL_AT = 960;
export const COUNT_TO = 47;
export const COUNT_EVERY = 6;
export const END_AT = 1440;
export const TICK_EVERY = 60;

const TOP = LEVELS - 1;
const HALF = MOSAIC_FRAMES >> 1;

// Where the opening is at `frame`: which board, the camera, brightness, mosaic and the bill's count.
export function openingAt(frame) {
  const f = Math.max(0, frame);
  const level = Math.min(TOP, Math.floor((f * TOP) / FADE_FRAMES));
  if (f < OFFICE_AT + HALF) {
    const p = Math.min(1, Math.max(0, f - TILT_AT) / TILT_FRAMES);
    const camY = Math.round(TILT_PX * (1 - p));
    const t = f - OFFICE_AT;
    return {
      board: f < TILT_AT ? 'O1' : 'O2', picture: 'tower', level,
      bg1Y: camY, bg2Y: Math.round(camY / 2),
      mosaic: t < 0 ? 1 : 1 + Math.floor((t * (MAX_MOSAIC - 1)) / (HALF - 1)),
      count: 0, billY: 0,
    };
  }
  if (f < BILL_AT) {
    const t = f - OFFICE_AT - HALF;
    return { board: 'O3', picture: 'office', level, bg1Y: 0, bg2Y: 0, mosaic: Math.max(1, MAX_MOSAIC - t), count: 0, billY: 0 };
  }
  const t = f - BILL_AT;
  return {
    board: 'O4', picture: 'bill', level, bg1Y: 0, bg2Y: 0, mosaic: 1,
    count: Math.min(COUNT_TO, 1 + Math.floor(t / COUNT_EVERY)), billY: t,
  };
}

// The sound cues that fire on `frame`: the clock tick through O1-O2, a blip per count on the bill.
export function openingCues(frame) {
  if (frame < OFFICE_AT) return frame % TICK_EVERY === 0 ? ['tick'] : [];
  if (frame >= BILL_AT) {
    const t = frame - BILL_AT;
    if (t % COUNT_EVERY === 0 && t / COUNT_EVERY < COUNT_TO) return ['count'];
  }
  return [];
}

// One frame of the opening: the next frame, and 'title' on Start or when part 1 runs out.
export function openingStep(frame, pad) {
  if (pad.pressed.has('start') || frame + 1 >= END_AT) return { frame, event: 'title' };
  return { frame: frame + 1, event: null };
}

export const countText = (n) => `LIFETIMES BILLED:  ${String(n).padStart(2, '0')}`;

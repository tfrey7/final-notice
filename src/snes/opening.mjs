// The SNES opening, boards O1-O8 of docs/SNES-CUTSCENES.md, as a pure timeline in frames (60 a second):
// fade in on the night skyline with a clock tick, tilt up the tower to its one lit floor, mosaic into
// the billing office, the bill feeding up the screen while LIFETIMES BILLED counts to 47, APPROVED
// stamped by Mode 7 as the music stops dead, the lift climbing B3, B2, B1, the doors parting on two
// backlit auditors, and a fade on the title melody's downbeat into the title. Start skips at any frame.
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
export const TICK_EVERY = 60;

export const STAMP_AT = 1440;
export const STAMP_FROM = 1.5;
export const SETTLE_FRAMES = 10;
export const SHAKE_FRAMES = 6;
export const SHAKE_PX = 2;
export const FLASH_FRAMES = 3;
export const SILENCE_FRAMES = 60;

// The first chime ends the silence, one second after the stamp lands.
export const LIFT_AT = STAMP_AT + SETTLE_FRAMES + SILENCE_FRAMES;
export const FLOORS = ['B3', 'B2', 'B1'];
export const FLOOR_EVERY = 150;

export const DOORS_AT = 2040;
export const DOORS_FRAMES = 90;
export const DOOR_HALF = 68;
// The title song's bar is 16 rows of 7 frames; the fade starts on the downbeat of its fourth bar.
export const TITLE_BAR = 16 * 7;
export const FADE_OUT_AT = DOORS_AT + 3 * TITLE_BAR;
export const FADE_OUT_FRAMES = 24;
export const END_AT = FADE_OUT_AT + FADE_OUT_FRAMES;

const TOP = LEVELS - 1;
const HALF = MOSAIC_FRAMES >> 1;
const still = { bg1Y: 0, bg2Y: 0, mosaic: 1, count: 0, billY: 0 };

// Where the opening is at `frame`: which board, the camera, brightness, mosaic and each board's props.
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
  if (f < STAMP_AT) {
    const t = f - BILL_AT;
    return {
      board: 'O4', picture: 'bill', level, bg1Y: 0, bg2Y: 0, mosaic: 1,
      count: Math.min(COUNT_TO, 1 + Math.floor(t / COUNT_EVERY)), billY: t,
    };
  }
  if (f < LIFT_AT) return { board: 'O5', picture: 'stamp', level, ...still, count: COUNT_TO, billY: STAMP_AT - BILL_AT, ...stampAt(f - STAMP_AT) };
  if (f < DOORS_AT) {
    const lit = Math.min(FLOORS.length - 1, Math.floor((f - LIFT_AT) / FLOOR_EVERY));
    return { board: 'O6', picture: 'lift', level, ...still, floor: FLOORS[lit], doors: 0 };
  }
  const out = f - FADE_OUT_AT;
  return {
    board: f < FADE_OUT_AT ? 'O7' : 'O8', picture: 'lift', ...still, floor: 'L', doors: doorsAt(f - DOORS_AT),
    level: out < 0 ? TOP : Math.max(0, TOP - Math.ceil((out * TOP) / FADE_OUT_FRAMES)),
  };
}

// The stamp `t` frames after it starts down: Mode 7 scale from 150% settling to 100%, then a 2 px
// shake and a whole-screen flash (fixed-colour add) on the frames it lands.
export function stampAt(t) {
  const p = Math.min(1, Math.max(0, t) / SETTLE_FRAMES);
  const landed = t - SETTLE_FRAMES;
  return {
    scale: STAMP_FROM - (STAMP_FROM - 1) * p * p,
    shakeX: landed >= 0 && landed < SHAKE_FRAMES ? (landed % 2 ? -SHAKE_PX : SHAKE_PX) : 0,
    flash: landed >= 0 && landed < FLASH_FRAMES,
  };
}

// How far each door has slid back, 0 to DOOR_HALF px, easing out: the window on the lift widens by twice this.
export function doorsAt(t) {
  const p = Math.min(1, Math.max(0, t) / DOORS_FRAMES);
  return Math.round(DOOR_HALF * (1 - (1 - p) ** 2));
}

// The cues that fire on `frame`: the scene music, the clock tick through O1-O2, a blip per count on the
// bill, the stamp and the music cut, a chime per floor, and the title melody as the doors part.
export function openingCues(frame) {
  if (frame === 0) return ['music', 'tick'];
  if (frame < OFFICE_AT) return frame % TICK_EVERY === 0 ? ['tick'] : [];
  if (frame >= BILL_AT && frame < STAMP_AT) {
    const t = frame - BILL_AT;
    if (t % COUNT_EVERY === 0 && t / COUNT_EVERY < COUNT_TO) return ['count'];
  }
  if (frame === STAMP_AT + SETTLE_FRAMES) return ['stamp', 'cut'];
  const lift = frame - LIFT_AT;
  if (lift >= 0 && lift % FLOOR_EVERY === 0 && lift / FLOOR_EVERY < FLOORS.length) return ['chime'];
  if (frame === DOORS_AT) return ['title'];
  return [];
}

// One frame of the opening: the next frame, and 'title' on Start or when the fade runs out.
export function openingStep(frame, pad) {
  if (pad.pressed.has('start') || frame + 1 >= END_AT) return { frame, event: 'title' };
  return { frame: frame + 1, event: null };
}

export const countText = (n) => `LIFETIMES BILLED:  ${String(n).padStart(2, '0')}`;

// The opening plays once a session: on a bare ?snes boot the first time, always with ?go=opening, and
// never on a boot that names a screen or pins a frame for a screenshot.
export const SEEN_KEY = 'finalNotice.openingSeen';
export function opensWithOpening(params, session) {
  if (params.get('go') === 'opening') return true;
  if (['go', 't', 'memo', 'freeze'].some((k) => params.has(k))) return false;
  return !session?.getItem(SEEN_KEY);
}

// The three boss entrances (boards B1-B3 of docs/SNES-CUTSCENES.md) as pure frame counts: the camera
// pan into Vellum's office and him standing from the desk, the Records Custodian's short slip with its
// drawer slam, and the Great Seal's press lowered out of the dark by Mode 7. Each ends on the frame the
// title card (or the pad) takes over; Start jumps straight to that frame.
import { descentAt } from './descent.mjs';

const clamp = (p) => Math.max(0, Math.min(1, p));
const ease = (p) => 1 - (1 - p) ** 2;

export const VELLUM_IN = { panPx: 96, pan: 90, stand: 36, end: 138 };

// `pan` is how far the camera still has to travel right (96 down to 0), `stand` 0 seated to 1 upright.
export function vellumEntrance(t, times = VELLUM_IN) {
  return {
    pan: Math.round(times.panPx * (1 - ease(clamp(t / times.pan)))),
    stand: clamp((t - times.pan) / times.stand),
    done: t >= times.end,
  };
}

export const SLIP = { name: 'RECORDS CUSTODIAN', area: 'ORIGINAL COPY', drop: 10, hold: 150, leave: 162, descent: descentAt('custodian', 1) };

// The slip drops in top-left, the drawer slams as it lands, and it rises away; no voice.
export function slipFrame(t, times = SLIP) {
  let rise = 0;
  if (t < times.drop) rise = 1 - ease(clamp(t / times.drop));
  else if (t >= times.hold) rise = -ease(clamp((t - times.hold) / (times.leave - times.hold)));
  return { rise, slamNow: t === times.drop, done: t >= times.leave };
}

export const PRESS_IN = { lower: 120, end: 138, from: 0.6, to: 1.4 };

// The press's Mode 7 scale grows 0.6 to 1.4 over two seconds, its colour-subtract shadow with it
// (`shadow` 0 to 1); it lands with a thud and holds a beat before the card.
export function pressEntrance(t, times = PRESS_IN) {
  const p = clamp(t / times.lower);
  return {
    scale: times.from + (times.to - times.from) * p * p,
    shadow: p,
    landNow: t === times.lower,
    done: t >= times.end,
  };
}

// Start skips to the last frame, where the pad (or the card) takes over.
export const skipTo = (t, pad, end) => (pad?.pressed?.has('start') ? end : t);

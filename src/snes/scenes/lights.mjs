// The night office behind the SNES credits: its lit windows go dark one floor (8 px) at a time from the
// top of the picture down while the credits roll, so the skyline is black glass by THE END. The roof
// beacons stay red.
import { WIDTH, HEIGHT } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { CREDITS_AT, creditsEnd } from '../../story/ending.mjs';

export const FLOOR = 8;
const DARK_GLASS = rgb15(2, 3, 7);
const FAR_WALL = rgb15(5, 4, 11);

// Every window colour of the skyline's palettes (src/snes/bg/ui.mjs) and what it becomes unlit.
export const LIT = new Map([
  [rgb15(31, 26, 13), DARK_GLASS], [rgb15(23, 16, 8), DARK_GLASS],
  [rgb15(22, 28, 25), DARK_GLASS], [rgb15(12, 18, 18), DARK_GLASS],
  [rgb15(17, 13, 7), FAR_WALL], [rgb15(10, 12, 17), FAR_WALL],
]);

// How far down the lights are out at `frame`: whole floors, none before the credits, all after them.
export function darkTo(frame, lines) {
  const p = Math.min(1, Math.max(0, (frame - CREDITS_AT) / (creditsEnd(lines) - CREDITS_AT)));
  return Math.floor((p * HEIGHT) / FLOOR) * FLOOR;
}

export function douse(buf, to) {
  const end = Math.min(buf.length, to * WIDTH);
  for (let i = 0; i < end; i++) {
    const dark = LIT.get(buf[i]);
    if (dark !== undefined) buf[i] = dark;
  }
  return buf;
}

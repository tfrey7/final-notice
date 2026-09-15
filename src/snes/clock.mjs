// The title's real-clock touches: the sky by the player's hour, the clerk's desk, and PAST DUE when
// the player's clock passes midnight with the title open.
import { rgb15 } from './color.mjs';

// Each sky is the backdrop at the top and the colour the gradient reaches by the horizon.
export const SKIES = {
  dusk: { name: 'dusk', top: rgb15(4, 3, 10), bottom: rgb15(16, 7, 11) },
  night: { name: 'night', top: rgb15(2, 2, 7), bottom: rgb15(10, 4, 13) },
  predawn: { name: 'predawn', top: rgb15(1, 2, 6), bottom: rgb15(5, 10, 16) },
};

// Night from 21:00, pre-dawn from 04:00, dusk from noon.
export function skyFor(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return h >= 21 || h < 4 ? SKIES.night : h < 12 ? SKIES.predawn : SKIES.dusk;
}

// True once the local date has moved on since `opened`.
export const pastDue = (opened, now = new Date()) => now > opened && now.toDateString() !== opened.toDateString();

export const CLERK_FRAMES = 600;

// Which of `desks` windows the clerk sits in at `frame`: a new desk every ten seconds, never the same twice running.
export const clerkDesk = (frame, desks) => (Math.floor(Math.max(0, frame) / CLERK_FRAMES) * 5 + 7) % desks;

// The NES picture: 256x240, with the top and bottom 8 rows lost to overscan.

export const WIDTH = 256;
export const HEIGHT = 240;
export const SAFE = 8;
export const PLAY_TOP = SAFE;
export const PLAY_HEIGHT = HEIGHT - 2 * SAFE;

// The largest whole-number zoom that fits the window, never below 1.
export function integerZoom(windowWidth, windowHeight) {
  const fit = Math.floor(Math.min(windowWidth / WIDTH, windowHeight / HEIGHT));
  return Math.max(1, fit);
}

// The SNES picture: 256x224, no overscan strip to leave empty.

export const WIDTH = 256;
export const HEIGHT = 224;

// The largest whole-number zoom that fits the window, never below 1.
export function integerZoom(windowWidth, windowHeight) {
  const fit = Math.floor(Math.min(windowWidth / WIDTH, windowHeight / HEIGHT));
  return Math.max(1, fit);
}

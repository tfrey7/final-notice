// The game's native composition: 224 pixels high at 4:3, drawn at a whole-number
// zoom so every logical pixel stays a crisp square on any window.

export const HEIGHT = 224;
export const WIDTH = 298; // 224 * 4/3 = 298.67, kept even so the centre is a whole pixel

// The largest whole-number zoom that fits the window, never below 1.
export function integerZoom(windowWidth, windowHeight) {
  const fit = Math.floor(Math.min(windowWidth / WIDTH, windowHeight / HEIGHT));
  return Math.max(1, fit);
}

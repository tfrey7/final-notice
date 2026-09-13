// The game's native composition: 224 pixels high at 4:3, drawn at a whole-number
// zoom so every logical pixel stays a crisp square on any window.

export const HEIGHT = 224;
export const WIDTH = 298; // 224 * 4/3 = 298.67, kept even so the centre is a whole pixel

// The largest whole-number zoom that fits the window, never below 1.
export function integerZoom(windowWidth, windowHeight) {
  const fit = Math.floor(Math.min(windowWidth / WIDTH, windowHeight / HEIGHT));
  return Math.max(1, fit);
}

// PRESS START blinks: shown for `on` ms, hidden for `off` ms, repeating.
export function blinkVisible(elapsedMs, on = 640, off = 400) {
  return elapsedMs % (on + off) < on;
}

// A small deterministic generator, so the skyline is the same on every load.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Distant office towers along the bottom of the title screen: each has an x, a width,
// a height and a list of lit window cells. Towers run edge to edge with no gaps.
export function skyline(seed, width = WIDTH, maxHeight = 96) {
  const r = rng(seed);
  const towers = [];
  let x = 0;
  while (x < width) {
    const w = 14 + Math.floor(r() * 22);
    const h = 28 + Math.floor(r() * (maxHeight - 28));
    const lit = [];
    for (let wy = 6; wy < h - 4; wy += 5) {
      for (let wx = 3; wx < w - 3; wx += 4) {
        if (r() < 0.22) lit.push([wx, wy]);
      }
    }
    towers.push({ x, w, h, lit });
    x += w;
  }
  return towers;
}

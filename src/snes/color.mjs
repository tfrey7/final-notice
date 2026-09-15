// 15-bit BGR555 colour: each channel one of 32 steps, packed as the SNES stores it.

const isStep = (v) => Number.isInteger(v) && v >= 0 && v <= 31;

export const isRgb15 = (c) => Number.isInteger(c) && c >= 0 && c <= 0x7fff;

export function rgb15(r, g, b) {
  if (![r, g, b].every(isStep)) throw new RangeError(`rgb15 channels are 0-31, got ${r},${g},${b}`);
  return (b << 10) | (g << 5) | r;
}

export function channels(c) {
  if (!isRgb15(c)) throw new RangeError(`not a 15-bit colour: ${c}`);
  return [c & 31, (c >> 5) & 31, (c >> 10) & 31];
}

// 5 bits to 8, repeating the top bits so 31 reaches 255.
const eight = (v) => (v << 3) | (v >> 2);

export const rgb = (c) => channels(c).map(eight);

// Part way t (0-1) from a to b, each channel rounded to its nearest 5-bit step.
export function lerp15(a, b, t) {
  const ca = channels(a);
  const cb = channels(b);
  const [r, g, bl] = ca.map((x, i) => Math.round(x + (cb[i] - x) * t));
  return rgb15(r, g, bl);
}

// 0xRRGGBB, as Phaser takes a colour.
export function hex(c) {
  const [r, g, b] = rgb(c);
  return (r << 16) | (g << 8) | b;
}

export const css = (c) => `#${hex(c).toString(16).padStart(6, '0')}`;

// How the picture reaches the player: through a CRT television, as crisp pixels, or over a
// composite cable into the same TV. Pure logic; src/crt/display.mjs draws it.

export const MODES = ['crt', 'sharp', 'composite'];
export const LABELS = { crt: 'CRT', sharp: 'Sharp pixels', composite: 'Composite cable' };
export const STORAGE_KEY = 'finalNotice.display';

const ALIASES = { off: 'sharp', none: 'sharp', on: 'crt', tv: 'crt', rf: 'composite' };

function known(name) {
  const mode = ALIASES[name] ?? name;
  return MODES.includes(mode) ? mode : null;
}

// ?crt= wins over the remembered choice, which wins over the default CRT.
export function pickMode(query, stored) {
  return known(query) ?? known(stored) ?? 'crt';
}

export function nextMode(mode) {
  return MODES[(MODES.indexOf(mode) + 1) % MODES.length];
}

// Shader settings per TV mode; 0 turns a layer off.
export const LOOKS = {
  crt: { curve: 0.03, scan: 0.5, glow: 0.3, bleed: 0.35, crawl: 0.04, vignette: 0.22, mask: 0.1, sharp: 3.0 },
  composite: { curve: 0.04, scan: 0.42, glow: 0.4, bleed: 1.0, crawl: 0.16, vignette: 0.28, mask: 0.16, sharp: 1.4 },
};

// The tube's face: the largest 4:3 box that leaves a bezel around it, centred, in whole pixels.
export function screenBox(width, height, margin = 0.06) {
  const w = Math.min(width * (1 - 2 * margin), height * (1 - 2 * margin) * 4 / 3);
  const h = w * 3 / 4;
  return {
    x: Math.round((width - w) / 2),
    y: Math.round((height - h) / 2),
    w: Math.round(w),
    h: Math.round(h),
  };
}

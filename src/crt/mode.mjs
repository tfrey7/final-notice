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

// The SNES in late 1995 on a good TV over S-video or RGB: no bleed or dot crawl, faint scanlines, a
// nearly flat face and a light glow, so the pixel art stays crisp. Composite keeps the blur and crawl.
export const SNES_LOOKS = {
  crt: { curve: 0.008, scan: 0.14, glow: 0.1, bleed: 0, crawl: 0, vignette: 0.04, mask: 0.03, sharp: 6.0 },
  composite: { curve: 0.04, scan: 0.36, glow: 0.34, bleed: 0.9, crawl: 0.11, vignette: 0.26, mask: 0.14, sharp: 1.6 },
};

// What each machine's signal does on the tube. `pixelAspect` null stretches the frame over the whole
// 4:3 face; the SNES's 256x224 at 8:7 is a little narrower. The colour subcarrier moves 120 degrees a
// line over a 3-frame cycle on the NES and 180 degrees over 2 frames on the SNES.
export const MACHINES = {
  nes: { looks: LOOKS, pixelAspect: null, linePhase: 2.0944, frames: 3 },
  snes: { looks: SNES_LOOKS, pixelAspect: 8 / 7, linePhase: 3.1416, frames: 2 },
};

export const machineFor = (crtLook) => MACHINES[crtLook] ?? MACHINES.nes;

// How much of the 4:3 face's width the picture fills: 1 unless the machine names a pixel aspect.
export function pictureWidth(machine, srcWidth, srcHeight) {
  if (!machine.pixelAspect) return 1;
  return Math.min(1, (srcWidth * machine.pixelAspect / srcHeight) / (4 / 3));
}

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

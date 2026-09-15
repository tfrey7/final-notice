// Architecture per descent band: ceiling, cornice, wall, windows, chair rail, wainscot, base and
// floor, painted onto a BG1 painter, plus the skyline behind the windows on BG2. Every period is
// 8, 16, 24, 48 or 96 px so the tiles dedupe. Key light: upper left. Anything a prop can stand in
// front of (wall, rail, wainscot, base) uses only the COMMON slots, so a prop of any palette may
// cover it; ceiling and floor use their own palettes.
import { noise } from '../bg/claims.mjs';
import { MAT } from './palettes.mjs';

const MAT_GROUT = MAT.grout.values[0];

export const ROOM = { ceiling: 16, cornice: 24, rail: 112, wainscot: 120, base: 146, floor: 152 };
const W_TOP = 28;
const W_BOTTOM = 108;
export const WINDOW = { w: 64, top: W_TOP, bottom: W_BOTTOM };

function corporate(p, { windows }) {
  const { floor } = ROOM;
  // Dropped coffer ceiling: 24 px coffers, lit lip on the left.
  p.rect(0, 0, p.w, 16, 'ceiling', 0);
  for (let x = 0; x < p.w; x += 24) {
    p.rect(x + 2, 2, 20, 10, 'ceiling', 1);
    p.rect(x + 2, 2, 20, 1, 'glow', 0);
    p.rect(x + 21, 3, 1, 9, 'panel', 1);
    p.checker(x + 3, 11, 18, 1, 'panel', 2);
  }
  p.rect(0, 13, p.w, 3, 'panel', 0);
  // Cornice: a lit bead over a shadow line.
  p.rect(0, 16, p.w, 8, 'panel', 1);
  p.rect(0, 16, p.w, 1, 'cornice', 0);
  p.rect(0, 19, p.w, 2, 'panel', 2);
  p.rect(0, 23, p.w, 1, 'outline', 0);
  // Upper wall: salmon marble slabs, 48 x 44, one diagonal vein each, light falling off downward.
  for (let y = 24; y < ROOM.rail; y++) {
    for (let x = 0; x < p.w; x++) {
      const sx = x % 48;
      const sy = (y - 24) % 44;
      // Flat bands, not a gradient: a lit lip, the slab face, a shadowed foot.
      let step = sy < 4 ? 2 : sy < 38 ? 1 : 0;
      if (sx === (sy + 6 + ((y - 24) >= 44 ? 21 : 0)) % 48 && sy > 5 && sy < 36) step = 0;
      p.set(x, y, 'wall', Math.min(2, step));
      if (sx === 0 || sy === 0) p.set(x, y, 'shadow');
      else if (sx === 1 || sy === 1) p.set(x, y, 'wall', 2);
    }
  }
  // Chair rail, wainscot panels (32 px), base.
  p.rect(0, ROOM.rail, p.w, 8, 'wall', 1);
  p.rect(0, ROOM.rail, p.w, 1, 'wall', 2);
  p.rect(0, ROOM.rail + 6, p.w, 2, 'outline');
  p.rect(0, ROOM.wainscot, p.w, ROOM.base - ROOM.wainscot, 'wall', 0);
  for (let x = 0; x < p.w; x += 32) {
    p.rect(x + 4, 125, 24, 16, 'shadow');
    p.rect(x + 5, 126, 22, 14, 'wall', 0);
    p.rect(x + 5, 126, 22, 1, 'wall', 1);
    p.rect(x + 5, 126, 1, 14, 'wall', 1);
    p.checker(x + 6, 127, 20, 12, 'shadow', 0, 1);
  }
  p.rect(0, ROOM.base, p.w, floor - ROOM.base, 'outline');
  p.rect(0, ROOM.base, p.w, 1, 'wall', 1);
  for (const wx of windows) window(p, wx, 'corporate');
  marble(p, windows);
}

function window(p, wx, band) {
  const { w, top, bottom } = WINDOW;
  // Frame (common slots), then the opening; glass is colour math on BG2, one spec stroke on BG1.
  p.rect(wx - 3, top - 3, w + 6, bottom - top + 6, 'outline');
  p.rect(wx - 2, top - 2, w + 4, bottom - top + 4, 'wall', 2);
  p.rect(wx + w, top - 1, 2, bottom - top + 2, 'wall', 0);
  p.rect(wx - 2, bottom, w + 4, 2, 'wall', 0);
  if (band === 'backrooms') {
    // Walled up where the glass was: plaster patch, a seam lifting at one corner.
    p.rect(wx, top, w, bottom - top, 'wall', 1);
    p.checker(wx, top, w, 6, 'wall', 2);
    p.rect(wx + w - 12, top + 2, 10, 1, 'shadow');
    p.rect(wx + w - 3, top + 2, 1, 9, 'shadow');
    for (let y = top + 16; y < bottom; y += 16) p.checker(wx, y, w, 1, 'wall', 0);
    return;
  }
  p.hole(wx, top, w, bottom - top);
  if (band === 'gothic') {
    // Lancet: the head of the opening closes into a point.
    for (let y = 0; y < 22; y++) {
      const inset = Math.round(w / 2 - Math.sqrt(Math.max(0, (w / 2) ** 2 - (22 - y) ** 2 * 1.4)));
      p.rect(wx, top + y, inset, 1, 'wall', 2);
      p.rect(wx + w - inset, top + y, inset, 1, 'wall', 0);
    }
  }
  // Mullion and transom.
  p.rect(wx + 30, top, 4, bottom - top, 'wall', 1);
  p.rect(wx + 30, top, 1, bottom - top, 'wall', 2);
  p.rect(wx + 33, top, 1, bottom - top, 'outline');
  p.rect(wx, top + 34, w, 3, 'wall', 1);
  p.rect(wx, top + 34, w, 1, 'wall', 2);
}

// Marble floor: 32 x 16 slabs in a running bond, flat faces in alternating steps, a lit top edge,
// a crisp dark grout, a vein on every other slab, reflection streaks straight under each window.
function marble(p, windows) {
  const { floor } = ROOM;
  for (let y = floor; y < p.h; y++) {
    const row = Math.floor((y - floor) / 16);
    const shift = row & 1 ? 16 : 0;
    for (let x = 0; x < p.w; x++) {
      const sx = (x + shift) % 32;
      const sy = (y - floor) % 16;
      const slab = ((((x + shift) / 32) | 0) + row) & 1;
      // One face colour for every slab, so the floor recedes; the joints and a lit lip do the work.
      p.set(x, y, 'slab', 1);
      if (sy === 1 || sx === 1) p.set(x, y, 'slab', 2);
      else if (sy === 15 || sx === 31) p.set(x, y, 'slab', 0);
      if (!slab && sy > 3 && sy < 14 && sx === 8 + sy) p.set(x, y, 'vein');
      if (sx === 0 || sy === 0) p.set(x, y, 'grout');
    }
  }
  // The window's reflection: two soft vertical streaks, solid near the wall, dithered out below.
  for (const wx of windows) {
    for (let y = floor + 3; y < floor + 32; y++) {
      for (const dx of [10, 42]) {
        for (let i = 0; i < 12; i++) {
          if (p.get(wx + dx + i, y) === MAT_GROUT) continue;
          const core = i > 3 && i < 8 && y < floor + 14;
          if (core ? (i + y) & 1 && y > floor + 8 : ((i + y) & 1) || (y > floor + 18 && y & 2) || i === 0 || i === 11) continue;
          p.set(wx + dx + i, y, core ? 'polish' : 'slab', 2);
        }
      }
    }
  }
  p.rect(0, floor, p.w, 1, 'outline');
  p.checker(0, floor + 1, p.w, 2, 'shadow');
}

function backrooms(p, { windows }) {
  const { floor } = ROOM;
  // Yellowed dropped ceiling, 24 px tiles with a water stain every 96.
  p.rect(0, 0, p.w, 24, 'ceiling', 1);
  for (let x = 0; x < p.w; x += 24) {
    p.rect(x, 0, 1, 23, 'panel', 1);
    p.checker(x + 1, 0, 23, 23, 'ceiling', 0, (x / 24) & 1);
    if (x % 96 === 48) { p.rect(x + 6, 6, 12, 8, 'panel', 0); p.checker(x + 4, 4, 16, 12, 'panel', 1); }
  }
  p.rect(0, 22, p.w, 2, 'panel', 0);
  p.rect(0, 23, p.w, 1, 'outline');
  // Wallpaper: 16 px stripes, a seam every 48 px, a lifted seam every 96.
  for (let y = 24; y < ROOM.rail; y++) {
    for (let x = 0; x < p.w; x++) {
      const sx = x % 16;
      p.set(x, y, 'wall', sx < 2 ? 1 : sx === 8 && (y & 1) ? 1 : 2);
      if (x % 48 === 0) p.set(x, y, 'wall', 0);
    }
  }
  for (let x = 0; x < p.w; x += 96) {
    p.rect(x + 1, 24, 3, 20, 'shadow');
    p.rect(x + 1, 24, 1, 20, 'outline');
    p.checker(x + 4, 24, 3, 20, 'wall', 0);
  }
  p.rect(0, ROOM.rail, p.w, 4, 'wall', 0);
  p.rect(0, ROOM.rail, p.w, 1, 'wall', 1);
  p.rect(0, ROOM.rail + 4, p.w, ROOM.base - ROOM.rail - 4, 'wall', 1);
  for (let x = 0; x < p.w; x += 16) p.checker(x + 3, ROOM.rail + 6, 2, ROOM.base - ROOM.rail - 8, 'wall', 0);
  p.rect(0, ROOM.base, p.w, floor - ROOM.base, 'shadow');
  p.rect(0, ROOM.base, p.w, 1, 'outline');
  for (const wx of windows) window(p, wx, 'backrooms');
  // Damp carpet: a 24 px diamond motif, wet patches on a 96 px rhythm.
  for (let y = floor; y < p.h; y++) {
    const ly = (y - floor) % 24;
    for (let x = 0; x < p.w; x++) {
      const dx = Math.abs((x % 24) - 12);
      let step = 1;
      if (Math.abs(ly - 12) + dx === 8 && !(x & 1)) step = 2;
      else if (ly > 18 && (x + y) & 1) step = 0;
      p.set(x, y, 'slab', step);
      const wx = (x % 96) - 60;
      const wy = y - floor - 40;
      if (wx * wx / 4 + wy * wy < 90) p.set(x, y, ((x + y) & 1) || wx * wx / 4 + wy * wy < 50 ? 'grout' : 'slab', 0);
    }
  }
  p.rect(0, floor, p.w, 1, 'outline');
}

function gothic(p, { windows }) {
  const { floor } = ROOM;
  // No ceiling left: ribs of a vault springing every 96 px out of the dark.
  p.rect(0, 0, p.w, 24, 'ceiling', 0);
  for (let x = 0; x < p.w; x += 96) {
    for (let i = 0; i < 96; i++) {
      const y = Math.round(20 - 18 * Math.sin((i / 96) * Math.PI));
      p.rect(x + i, y, 1, 2, 'panel', 1);
      p.set(x + i, y, 'cornice');
    }
    p.rect(x, 0, 3, 24, 'panel', 2);
  }
  p.rect(0, 22, p.w, 2, 'cornice');
  p.rect(0, 23, p.w, 1, 'outline');
  // Black marble, veined in red: veins are wall light on dark slabs, 96 px wide slabs.
  for (let y = 24; y < ROOM.rail; y++) {
    for (let x = 0; x < p.w; x++) {
      const sx = x % 96;
      const sy = (y - 24) % 44;
      p.set(x, y, 'wall', sy < 6 ? 1 : 0);
      if (sy >= 4 && sy < 6 && (x + y) & 1) p.set(x, y, 'wall', 0);
      const vein = Math.round(sy * 1.3 + 10 + Math.sin(sy / 5) * 4) % 96;
      if (sx === vein) p.set(x, y, 'wall', 2);
      if (sx === 0 || sy === 0) p.set(x, y, 'outline');
    }
  }
  p.rect(0, ROOM.rail, p.w, 8, 'wall', 1);
  p.rect(0, ROOM.rail, p.w, 1, 'wall', 2);
  p.rect(0, ROOM.wainscot, p.w, ROOM.base - ROOM.wainscot, 'shadow');
  for (let x = 0; x < p.w; x += 24) {
    p.rect(x + 8, 124, 8, 18, 'outline');
    p.rect(x + 9, 125, 6, 1, 'wall', 1);
    p.rect(x + 11, 122, 2, 2, 'wall', 2);
  }
  p.rect(0, ROOM.base, p.w, floor - ROOM.base, 'outline');
  for (const wx of windows) window(p, wx, 'gothic');
  for (let y = floor; y < p.h; y++) {
    const row = Math.floor((y - floor) / 24);
    for (let x = 0; x < p.w; x++) {
      const sx = (x + (row & 1 ? 48 : 0)) % 96;
      const sy = (y - floor) % 24;
      p.set(x, y, 'slab', sy < 3 ? 1 : 0);
      if (sx === (sy * 3 + 20) % 96) p.set(x, y, 'vein');
      if (sx === 0 || sy === 0) p.set(x, y, 'grout');
    }
  }
  p.rect(0, floor, p.w, 1, 'outline');
}

export const TILESETS = { corporate, backrooms, gothic };

// The skyline on BG2: sky and far towers (band scrolled at a quarter), near towers with lit
// windows (half). One 256 px repeat, drawn once for every band; the palette makes the band.
export const SKY_SPLIT = 88;

export function skyline(p) {
  for (let y = 0; y < ROOM.floor; y++) p.rect(0, y, p.w, 1, 'sky', y < 40 ? 0 : y < 80 ? 1 : 2);
  p.checker(0, 36, p.w, 4, 'sky', 1);
  p.checker(0, 76, p.w, 4, 'sky', 2);
  p.rect(0, 84, p.w, 4, 'haze');
  p.checker(0, 80, p.w, 4, 'haze', 0);
  for (let i = 0; i < 8; i++) for (const ox of [0, 128]) p.set(ox + noise(i, 1) % 128, 4 + noise(i, 2) % 48, 'star');
  for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
    const d = x * x + y * y;
    if (d <= 64) p.set(200 + x, 22 + y, 'moon', (x + 3) ** 2 + (y + 3) ** 2 > 50 ? 0 : 1);
  }
  let x = 0;
  for (let n = 0; x < 256; n++) {
    const bw = 16 + (noise(n, 3) % 4) * 8;
    const top = 50 + (noise(n, 4) % 5) * 6;
    p.rect(x, top, bw, SKY_SPLIT - top, 'far', 0);
    p.rect(x, top, 2, SKY_SPLIT - top, 'far', 1);
    x += bw + 4;
  }
  x = 0;
  for (let n = 0; x < 256; n++) {
    const bw = 32 + (noise(n, 5) % 3) * 16;
    const top = 70 + (noise(n, 6) % 4) * 10;
    p.rect(x, top, bw, ROOM.floor - top, 'near', 0);
    p.rect(x, top, bw, 1, 'near', 1);
    p.rect(x, top, 1, ROOM.floor - top, 'near', 1);
    if (n % 3 === 0) { p.rect(x + (bw >> 1), top - 12, 1, 12, 'near', 1); p.set(x + (bw >> 1), top - 13, 'beacon'); }
    // Lit windows sit on the 8 px grid so the tower faces dedupe.
    for (let wy = (Math.ceil((top + 4) / 8)) * 8 + 2; wy < ROOM.floor - 4; wy += 8) {
      for (let wx = (Math.ceil((x + 2) / 8)) * 8 + 2; wx < x + bw - 4; wx += 8) {
        const k = noise(wx >> 3, wy >> 3) % 5;
        if (k < 2) p.rect(wx, wy, 3, 3, 'lit', k);
      }
    }
    x += bw + 8;
  }
}

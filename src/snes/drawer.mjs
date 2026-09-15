// The file drawer: the title memo hands over to select as a vertical wipe by window edge. Every
// scanline above the drawer shows select, every one below it the title; the steel drawer front rides
// the edge down and casts a colour-math shadow (subtract, fading line by line) onto the title under
// it. On the hardware the edge is one HDMA table entry a line (WH0/WH1 and COLDATA per scanline);
// here it is a row index a frame. A second press skips any transition to its end.
import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb15 } from './color.mjs';
import { colorMath, screen } from './fx.mjs';
import { measure, drawString } from './text.mjs';

export const WIPE_FRAMES = 20;
export const FRONT_H = 22;
export const SHADOW_H = 8;
const LABEL = 'PERSONNEL';

// A transition's next frame: a press jumps straight to `end`.
export const skip = (frame, end, press) => (press ? end : Math.min(end, frame + 1));

// The drawer front's bottom scanline at `frame`: 0 before, HEIGHT + FRONT_H once the front has left
// the screen, heavy to start and easing into its stop.
export function wipeEdge(frame) {
  const p = Math.min(1, Math.max(0, frame) / WIPE_FRAMES);
  return Math.round((HEIGHT + FRONT_H) * p * p * (3 - 2 * p));
}

export function wipeStep(frame, press = false) {
  const f = skip(frame, WIPE_FRAMES, press);
  return { frame: f, edge: wipeEdge(f), done: f >= WIPE_FRAMES };
}

const ramp = (a, b, n) => Array.from({ length: n }, (_, i) => rgb15(...a.map((v, k) => Math.round(v + ((b[k] - v) * i) / (n - 1)))));

function paintFront() {
  const buf = screen().subarray(0, WIDTH * FRONT_H);
  const fill = (x, y, w, h, c) => {
    for (let yy = Math.max(0, y); yy < Math.min(FRONT_H, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(WIDTH, x + w); xx++) buf[yy * WIDTH + xx] = c;
    }
  };
  // Brushed steel by a per-line gradient, bevelled top and a dark lip where it meets the cabinet.
  ramp([17, 18, 21], [7, 8, 11], FRONT_H).forEach((c, y) => fill(0, y, WIDTH, 1, c));
  fill(0, 0, WIDTH, 1, rgb15(27, 28, 30));
  fill(0, 1, WIDTH, 1, rgb15(21, 22, 25));
  fill(0, FRONT_H - 2, WIDTH, 1, rgb15(4, 4, 6));
  fill(0, FRONT_H - 1, WIDTH, 1, rgb15(1, 1, 2));
  for (let y = 3; y < FRONT_H - 3; y += 4) fill(6, y, WIDTH - 12, 1, rgb15(14, 15, 18));
  fill(0, 1, 3, FRONT_H - 3, rgb15(5, 5, 8));
  fill(WIDTH - 3, 1, 3, FRONT_H - 3, rgb15(5, 5, 8));

  // The brass label holder and its typed card.
  const lw = measure(LABEL) + 8;
  const lx = 20;
  fill(lx - 2, 5, lw + 4, 13, rgb15(12, 8, 2));
  fill(lx - 2, 5, lw + 3, 1, rgb15(27, 22, 9));
  fill(lx - 2, 5, 1, 12, rgb15(24, 18, 6));
  ramp([30, 29, 24], [24, 22, 16], 11).forEach((c, i) => fill(lx, 6 + i, lw, 1, c));
  drawString(fill, LABEL, lx + 4, 7, rgb15(5, 4, 8), rgb15(20, 18, 13));

  // The pull handle: a dark recess with a chrome bar across it.
  const hx = (WIDTH >> 1) - 26;
  fill(hx, 7, 52, 10, rgb15(2, 2, 4));
  fill(hx + 1, 16, 50, 1, rgb15(14, 15, 18));
  [rgb15(30, 30, 31), rgb15(22, 23, 26), rgb15(13, 14, 17), rgb15(7, 7, 9)].forEach((c, i) => fill(hx + 4, 9 + i, 44, 1, c));
  fill(hx + 3, 8, 2, 7, rgb15(18, 19, 22));
  fill(hx + 47, 8, 2, 7, rgb15(10, 10, 13));

  // The lock.
  const kx = WIDTH - 52;
  fill(kx, 7, 9, 9, rgb15(22, 17, 6));
  fill(kx + 1, 8, 7, 7, rgb15(14, 10, 3));
  fill(kx + 4, 9, 1, 5, rgb15(1, 1, 1));
  return buf;
}

let front = null;

// One frame of the wipe: `fresh` above the drawer, the front, then `old` darkened under its shadow.
export function drawerPass(old, fresh, edge, out = screen()) {
  front ??= paintFront();
  const top = edge - FRONT_H;
  for (let y = 0; y < HEIGHT; y++) {
    const row = y * WIDTH;
    if (y < top) {
      out.set(fresh.subarray(row, row + WIDTH), row);
    } else if (y < edge) {
      out.set(front.subarray((y - top) * WIDTH, (y - top + 1) * WIDTH), row);
    } else if (edge > 0 && y < edge + SHADOW_H) {
      const v = Math.round((14 * (SHADOW_H - (y - edge))) / SHADOW_H);
      const sub = rgb15(v, v, Math.round(v * 0.8));
      for (let x = 0; x < WIDTH; x++) out[row + x] = colorMath(old[row + x], sub, 'sub');
    } else {
      out.set(old.subarray(row, row + WIDTH), row);
    }
  }
  return out;
}

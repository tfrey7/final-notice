// The Great Seal on the SNES as pure numbers: how far the press has dropped and how large its Mode 7
// layer is drawn at each frame of a stamp, the mosaic burst of a broken binding, the boss title card,
// and the press head's texture. ./scene.mjs draws what these answer.
import { WIDTH, HEIGHT } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { mosaicSize } from '../fx.mjs';
import { SEAL } from '../../stage2/greatseal.mjs';

export const RAIL = 48;
export const HANG = 20;
// Hanging at the rail the head is far from the camera and small; at the floor it is full size.
export const REST_SCALE = 0.55;
export const PRESS_W = 40;
export const PRESS_H = 24;

// 0 hanging at the rail, 1 on the floor: a last-8-frames plunge at the end of the shadow, held
// through the slam, then lifted back over one slam's length. No stamp is 0.
export function pressDrop(stamp) {
  if (!stamp) return 0;
  const { t, shadow } = stamp;
  if (t < shadow - 8) return 0;
  if (t < shadow) return (t - shadow + 8) / 8;
  if (t < shadow + SEAL.slam * 2) return 1;
  return Math.max(0, 1 - (t - shadow - SEAL.slam * 2) / SEAL.slam);
}

// The Mode 7 scale of the head: eased in, so it swells fastest just before it lands.
export const stampScale = (stamp) => REST_SCALE + (1 - REST_SCALE) * pressDrop(stamp) ** 2;

// The head's bottom edge in world units: under the rail at rest, on the stamp's floor when dropped.
export const headY = (stamp) => RAIL + HANG + pressDrop(stamp) * ((stamp?.y ?? RAIL + HANG) - RAIL - HANG);

// The shadow's half width in world units, growing over the warning; 0 once the head has landed.
export function shadowHalf(stamp) {
  if (!stamp || stamp.t >= stamp.shadow) return 0;
  return 8 + Math.min(1, stamp.t / stamp.shadow) * 14;
}

// A broken binding bursts into mosaic blocks that grow to 16 px and settle back.
export const BURST_FRAMES = 28;
export const burstSize = (age) => (age < 0 || age >= BURST_FRAMES ? 0 : mosaicSize(age, BURST_FRAMES));

// Mosaic inside one rectangle of a screen buffer, blocks anchored at its top-left.
export function mosaicRect(buf, x0, y0, w, h, size) {
  if (size <= 1) return buf;
  const left = Math.max(0, Math.round(x0));
  const top = Math.max(0, Math.round(y0));
  const right = Math.min(WIDTH, Math.round(x0 + w));
  const bottom = Math.min(HEIGHT, Math.round(y0 + h));
  for (let y = top; y < bottom; y += size) {
    for (let x = left; x < right; x += size) {
      const c = buf[y * WIDTH + x];
      for (let yy = y; yy < Math.min(bottom, y + size); yy++) buf.fill(c, yy * WIDTH + x, yy * WIDTH + Math.min(right, x + size));
    }
  }
  return buf;
}

// The boss title card, Sunset Riders style: slides down, holds while the Director speaks, slides up.
export const CARD = { in: 12, hold: 150, out: 12, voiceAt: 18, subtitle: 90 };
export function titleCard(frame) {
  const end = CARD.in + CARD.hold + CARD.out;
  if (frame < 0 || frame >= end) return null;
  const slide = frame < CARD.in ? 1 - frame / CARD.in : frame >= CARD.in + CARD.hold ? (frame - CARD.in - CARD.hold) / CARD.out : 0;
  return { slide, voice: frame === CARD.voiceAt, subtitle: frame >= CARD.voiceAt && frame < CARD.voiceAt + CARD.subtitle };
}

// The press head: a brass block with a lit top edge, rivets and the red wax die on its face.
export function pressTexture() {
  const brass = rgb15(22, 16, 5);
  const dark = rgb15(12, 8, 3);
  const lit = rgb15(31, 26, 12);
  const wax = rgb15(24, 4, 3);
  const px = new Uint16Array(PRESS_W * PRESS_H).fill(0xffff);
  for (let y = 0; y < PRESS_H; y++) {
    for (let x = 0; x < PRESS_W; x++) {
      const inset = y < 2 ? 2 - y : 0;
      if (x < inset || x >= PRESS_W - inset) continue;
      let c = y < 4 ? lit : x < 3 || x >= PRESS_W - 3 || y >= PRESS_H - 8 ? dark : brass;
      if ((y === 8 || y === 12) && (x === 6 || x === PRESS_W - 7)) c = lit;
      if (y >= PRESS_H - 6 && x >= 10 && x < PRESS_W - 10) c = wax;
      px[y * PRESS_W + x] = c;
    }
  }
  return { w: PRESS_W, h: PRESS_H, px };
}

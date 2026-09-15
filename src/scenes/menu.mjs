// The title and select screens' rules, kept pure so they can be tested without Phaser.
import { AUDITORS } from '../flow.mjs';

export const BLINK_ON = 32;
export const BLINK_OFF = 16;
export const ATTRACT_AFTER = 20 * 60;
export const ATTRACT_LENGTH = 8 * 60;

export const blinkOn = (frame) => frame % (BLINK_ON + BLINK_OFF) < BLINK_ON;

// One title frame. `t` is { idle, demo }; the answer adds `event`: 'start', 'attract', 'back' or null.
export function titleStep(t, pad) {
  const any = pad.pressed.size > 0;
  if (t.demo) {
    if (any || t.idle + 1 >= ATTRACT_LENGTH) return { idle: 0, demo: false, event: 'back' };
    return { idle: t.idle + 1, demo: true, event: null };
  }
  if (pad.pressed.has('start')) return { idle: 0, demo: false, event: 'start' };
  if (any) return { idle: 0, demo: false, event: null };
  if (t.idle + 1 >= ATTRACT_AFTER) return { idle: 0, demo: true, event: 'attract' };
  return { idle: t.idle + 1, demo: false, event: null };
}

// One select frame: left and right move the cursor, A (or Start) confirms.
export function selectStep(choice, pad) {
  let at = choice;
  if (pad.pressed.has('left')) at = Math.max(0, at - 1);
  if (pad.pressed.has('right')) at = Math.min(AUDITORS.length - 1, at + 1);
  return { choice: at, moved: at !== choice, confirm: pad.pressed.has('a') || pad.pressed.has('start') };
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Office towers edge to edge along the bottom of the title, each with its lit windows.
export function skyline(seed, width, maxHeight = 88) {
  const r = rng(seed);
  const towers = [];
  for (let x = 0; x < width;) {
    const w = 16 + Math.floor(r() * 4) * 4;
    const h = 32 + Math.floor(r() * (maxHeight - 32));
    const lit = [];
    for (let wy = 6; wy < h - 4; wy += 6) {
      for (let wx = 3; wx < w - 3; wx += 4) if (r() < 0.25) lit.push([wx, wy]);
    }
    towers.push({ x, w, h, lit });
    x += w;
  }
  return towers;
}

// The SNES title's rules, pure: when PUSH START shows and how bright it is, Start skipping the reveal,
// the confirm hold, and the idle fade into the attract loop.
import { INTRO_FRAMES } from './lights.mjs';

export const SETTLED = INTRO_FRAMES;
export const PROMPT_AT = SETTLED + 60;
export const PULSE_FRAMES = 60;
export const PULSE_HIGH = 15;
export const PULSE_LOW = 9;
export const CONFIRM_HOLD = 6;
export const ATTRACT_AFTER = 20 * 60;
export const ATTRACT_FADE = 24;

// PUSH START's brightness at title frame `f`: null before it shows, then 15 down to 9 and back each second.
export function promptLevel(f) {
  if (f < PROMPT_AT) return null;
  const p = (f - PROMPT_AT) % PULSE_FRAMES;
  const half = PULSE_FRAMES / 2;
  return PULSE_HIGH - Math.round((PULSE_HIGH - PULSE_LOW) * (1 - Math.abs(half - p) / half));
}

export const newTitle = (frame = 0) => ({ frame, idle: 0, confirm: null, fade: null });

// One title frame. The answer adds `event`: 'skip', 'confirm', 'enter' (open the menu), 'fading',
// 'attract' (hand to the attract loop) or null.
export function titleTick(t, pad) {
  const frame = t.frame + 1;
  const any = pad.pressed.size > 0;
  if (t.confirm != null) {
    const confirm = t.confirm + 1;
    return { ...t, frame, confirm, event: confirm >= CONFIRM_HOLD ? 'enter' : null };
  }
  if (t.fade != null) {
    if (any) return { ...t, frame, idle: 0, fade: null, event: null };
    const fade = t.fade + 1;
    return { ...t, frame, fade, event: fade >= ATTRACT_FADE ? 'attract' : null };
  }
  if (t.frame < SETTLED) {
    if (pad.pressed.has('start')) return { ...t, frame: SETTLED, idle: 0, event: 'skip' };
    return { ...t, frame, event: null };
  }
  if (pad.pressed.has('start')) return { ...t, frame, idle: 0, confirm: 0, event: 'confirm' };
  if (any) return { ...t, frame, idle: 0, event: null };
  const idle = t.idle + 1;
  if (idle >= ATTRACT_AFTER) return { ...t, frame, idle, fade: 0, event: 'fading' };
  return { ...t, frame, idle, event: null };
}

// The screen brightness while fading to the attract loop: 15 down to 0.
export const fadeLevel = (fade) => (fade == null ? 15 : Math.max(0, 15 - Math.ceil((fade * 15) / ATTRACT_FADE)));

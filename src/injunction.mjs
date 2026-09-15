// The Emergency Injunction (docs/NES-PLAN.md section 4): landed hits fill a 4-segment meter; full,
// A+B together flashes a wax-seal ring that knocks back every ordinary foe on screen and clears their
// projectiles. Bosses shrug it off. A checkpoint gives back at least one segment. Pure.

export const SEGMENTS = 4;
export const HITS_PER_SEGMENT = 4;
export const MAX_HITS = SEGMENTS * HITS_PER_SEGMENT;
// Frames: the white flash, the freeze everyone holds, and the ring's whole life.
export const RING = { flash: 4, freeze: 14, frames: 36, from: 8, to: 150 };

export const segments = (hits) => Math.min(SEGMENTS, Math.floor(hits / HITS_PER_SEGMENT));
export const isFull = (hits) => segments(hits) >= SEGMENTS;
export const addHits = (hits, n = 1) => Math.min(MAX_HITS, hits + n);
export const restoreAtCheckpoint = (hits) => Math.max(hits, HITS_PER_SEGMENT);

// Pressing A and B together (the second of the two this frame) with a full meter.
export const wantsInjunction = (pad, hits) => !!pad.chord && isFull(hits);

// The foes the ring pushes: on screen ([x0, x1)), still standing, never a boss.
export function ringVictims(foes, view, standing = () => true) {
  return foes.filter((f) => !f.boss && f.x >= view.x0 && f.x < view.x1 && standing(f));
}

export const pushDir = (foe, x) => Math.sign(foe.x - x) || 1;

// The pad the rest of the frame sees once the injunction has used A and B.
export function withoutAB(pad) {
  const drop = (set) => new Set([...set].filter((b) => b !== 'a' && b !== 'b'));
  return { ...pad, held: drop(pad.held), pressed: drop(pad.pressed), chord: false };
}

export const startRing = (x, y) => ({ x, y, t: 0 });

// Advances a ring one frame; answers null once it has faded.
export const stepRing = (ring) => (ring && ++ring.t < RING.frames ? ring : null);

// What to draw this frame: the flash, then the ring swelling out fast and easing off.
export function ringShape(ring) {
  const k = Math.min(1, ring.t / RING.frames);
  const ease = 1 - (1 - k) ** 3;
  return { flash: ring.t < RING.flash, radius: RING.from + (RING.to - RING.from) * ease, blink: ring.t % 4 < 2 };
}

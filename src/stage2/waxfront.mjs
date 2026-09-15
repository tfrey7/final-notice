// Retention Order's red wax front: asleep until the alarm, a gentle creep, then a steady advance from the left.
// Touching it costs a life. Pure.

// Speeds in px a frame; a running auditor (1.375) always outpaces it. `lead` keeps it close behind the view.
export const FRONT = { grace: 120, creep: 0.4, speed: 0.9, lead: 40 };

export function createFront(x) {
  return { x, startX: x, age: 0, active: false };
}

export const wake = (f) => Object.assign(f, { active: true, age: 0 });

export const resetFront = (f) => Object.assign(f, { x: f.startX, age: 0, active: false });

export const speedOf = (f, t = FRONT) => (f.age < t.grace ? t.creep : t.speed);

// The wax has reached the auditor's back edge.
export const caught = (f, p) => p.x - p.w / 2 <= f.x;

// One frame. Answers true when it caught the auditor.
export function stepFront(f, player, camX, t = FRONT) {
  if (!f.active) return false;
  f.x = Math.max(f.x + speedOf(f, t), camX - t.lead);
  f.age += 1;
  return caught(f, player);
}

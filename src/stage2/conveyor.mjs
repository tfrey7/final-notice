// The Disposal Line's conveyor belts and disposal seals. Belts are floor tiles that carry whatever stands on
// them; a seal is a wax gate up to the ceiling band that any cast wears down. Pure.
import { TILE, moveBody } from './physics.mjs';

// A walking auditor (1.375) still makes way against a belt, slower than the wax front's advance.
export const BELT = { speed: 0.5 };
export const SEAL = { hp: 3 };
export const BELT_MARKS = { '>': 1, '<': -1 };

export function createBelts(map) {
  const belts = new Map();
  map.forEach((line, row) => [...line].forEach((ch, col) => {
    if (BELT_MARKS[ch]) belts.set(`${col},${row}`, BELT_MARKS[ch]);
  }));
  return belts;
}

// The belt direction under a standing body's feet: the one under its centre, else either edge. 0 for none.
export function beltUnder(belts, b) {
  if (b.y % TILE !== 0) return 0;
  const row = b.y / TILE;
  for (const x of [b.x, b.x - b.w / 2, b.x + b.w / 2 - 0.001]) {
    const dir = belts.get(`${Math.floor(x / TILE)},${row}`);
    if (dir) return dir;
  }
  return 0;
}

// Carries a grounded body one frame along the belt it stands on, stopping at walls. Answers the direction.
export function carry(belts, b, area, t = BELT) {
  if (!b.grounded) return 0;
  const dir = beltUnder(belts, b);
  if (!dir) return 0;
  const ride = { x: b.x, y: b.y, w: b.w, h: b.h, vx: dir * t.speed, vy: 0 };
  moveBody(ride, area);
  b.x = ride.x;
  return dir;
}

// A seal gate at a tile column, standing on `row` and reaching up to `top`; it goes in the run's locks list
// but is no wax lock, so every cast chips it.
export const createSeal = (col, row, top) => ({
  x: col * TILE + TILE / 2, y: (row + 1) * TILE, w: TILE, h: (row - top + 1) * TILE,
  hp: SEAL.hp, flash: 0, lock: false, seal: true, door: true, col, row,
});

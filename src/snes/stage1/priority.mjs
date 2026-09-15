// Stage 1's OAM priorities (limits.mjs oamOrder): when a line is full, effects and pickups drop
// before any fighter, and the player, the boss and a foe mid-swing never drop at all.
export const PRIORITY = { lead: 3, fighter: 2, pickup: 0 };
const ATTACKING = ['windup', 'punch'];

export function thingPriority({ f }) {
  if (!f) return PRIORITY.pickup;
  if (f.team === 'player' || f.kind === 'vellum' || ATTACKING.includes(f.state)) return PRIORITY.lead;
  return PRIORITY.fighter;
}

export const withPriority = (entries, prio) => entries.map((e) => ({ ...e, prio }));

// The brawl lab's dials, the pure half: which feel numbers the panel shows, their ranges, stepping
// one by pad, the attack-turn gate and the settings text Tim copies into the room.
// Dials change the lab's live tables only; nothing here writes the game's defaults.
import { TUNING } from '../stage1/moves.mjs';
import { CROWD, moveOf } from '../stage1/staff.mjs';
import { KINDS } from '../snes/fight.mjs';
import { WEAPONS } from '../stage1/weapons.mjs';
import { COOLDOWN_FRAMES } from '../injunction.mjs';

// Dials the brawl design will want but the fighting does not have yet; shown and copied, not wired.
export const PLANNED = {};

// Lab-only dials on top of TUNING: enemy speed and wind-up across every kind, attack turns, and the
// frames the free Emergency Injunction cools down for.
export const LAB = {
  foeWalkScale: [1, 0.25, 3, 0.125],
  foeWindupAdd: [0, -20, 40, 1],
  maxAttackers: [3, 1, 4, 1],
  meterFull: [0, 0, 1, 1],
  injunctionCooldown: [COOLDOWN_FRAMES, 60, 1800, 30],
};

// The crowd's dials (staff.mjs CROWD): how hard waiting foes press, how wide they circle, how often
// they taunt and how many frames pass before the next one closes in.
export const CROWD_DIALS = {
  aggression: [CROWD.aggression, 0.25, 3, 0.25],
  circleRadius: [CROWD.circleRadius, 16, 96, 4],
  tauntChance: [CROWD.tauntChance, 0, 1, 0.02],
  closeIn: [CROWD.closeIn, 0, 300, 10],
};

// Each enemy kind's own dials: health, walking speed, the Supervisor's blocks before a counter, and
// every attack's wind-up and damage. Keys are `kind.field` or `kind.move.field`.
export function kindDials(kinds = KINDS) {
  const out = {};
  for (const [kind, k] of Object.entries(kinds)) {
    out[`${kind}.hp`] = [k.hp, 1, 30, 1];
    out[`${kind}.speed`] = [k.speed, 0.125, 3, 0.125];
    if (k.counterAfter) out[`${kind}.counterAfter`] = [k.counterAfter, 1, 6, 1];
    for (const name of Object.keys(k.moves ?? {})) {
      const m = moveOf(k, name);
      out[`${kind}.${name}.windup`] = [m.windup, 1, 90, 1];
      out[`${kind}.${name}.damage`] = [m.damage, 0, 8, 1];
    }
  }
  return out;
}

// A copy of the kinds with the enemy dials written in.
export function withKindDials(kinds, dials) {
  const out = structuredClone(kinds);
  for (const d of dials.filter((x) => x.group === 'foes')) {
    const [kind, a, b] = d.key.split('.');
    if (b) out[kind].moves[a][b] = d.value;
    else out[kind][a] = d.value;
  }
  return out;
}

export const MAX_OF_KIND = 6;

// Every dial in panel order, grouped. `value` is the lab's starting point for that dial.
export function buildDials(base) {
  const group = (name, table, values) => Object.entries(table).map(([key, [value, min, max, step]]) => {
    const v = values?.[key] ?? value;
    return { group: name, key, value: v, start: v, min: Math.min(min, v), max: Math.max(max, v), step };
  });
  return [
    ...group('lab', LAB),
    ...group('crowd', CROWD_DIALS),
    ...group('foes', kindDials()),
    ...group('moves', TUNING, base),
    ...group('weapons', WEAPONS),
    ...group('planned', PLANNED),
  ];
}

const decimals = (step) => (String(step).split('.')[1] ?? '').length;

// Nudges a dial by `dir` steps, clamped to its range and snapped to its step.
export function nudge(dial, dir) {
  const raw = dial.value + dir * dial.step;
  const snapped = Number((Math.round(raw / dial.step) * dial.step).toFixed(decimals(dial.step)));
  dial.value = Math.min(dial.max, Math.max(dial.min, snapped));
  return dial.value;
}

// The spawn order for a wave: each kind as many times as its count, interleaved so kinds mix.
export function waveKinds(counts) {
  const out = [];
  const kinds = Object.keys(KINDS);
  for (let i = 0; i < MAX_OF_KIND; i++) for (const k of kinds) if ((counts[k] ?? 0) > i) out.push(k);
  return out;
}

// KINDS with the lab's speed scale and wind-up offset applied to each kind's own numbers.
export function labKinds(original, { foeWalkScale, foeWindupAdd }) {
  return Object.fromEntries(Object.entries(original).map(([k, v]) => [k, {
    ...v, speed: v.speed * foeWalkScale, windup: Math.max(1, v.windup + foeWindupAdd),
    moves: v.moves && Object.fromEntries(Object.entries(v.moves).map(([name, m]) => [name, 'windup' in m ? { ...m, windup: Math.max(1, m.windup + foeWindupAdd) } : m])),
  }]));
}

const ATTACKING = ['windup', 'punch'];

// After a foe's think: one that has just started a wind-up while `max` others are already swinging
// steps back and waits its turn.
export function takeTurns(world, f, max, wait = 20) {
  if (f.state !== 'windup' || f.t !== 0) return false;
  const busy = world.fighters.filter((o) => o !== f && o.team === 'foe' && ATTACKING.includes(o.state)).length;
  if (busy < max) return false;
  f.state = 'idle';
  f.cooldown = Math.max(f.cooldown, wait);
  return true;
}

// The text "copy settings" puts on the clipboard: changed dials first, then everything.
export function settingsText(dials, counts, who) {
  const line = (d) => `${d.key}: ${d.value}`;
  const changed = dials.filter((d) => d.value !== d.start);
  const byGroup = (g) => dials.filter((d) => d.group === g).map(line).join('\n');
  return [
    `Brawl lab settings (${who})`,
    `wave: ${Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${k} x${n}`).join(', ') || 'none'}`,
    `changed: ${changed.length ? changed.map((d) => `${d.key} ${d.start} -> ${d.value}`).join(', ') : 'none'}`,
    '',
    '[lab]', byGroup('lab'),
    '',
    '[crowd] (circleRadius before the SNES 1.5x pixel scale)', byGroup('crowd'),
    '',
    '[foes] (speed before the SNES 1.5x pixel scale)', byGroup('foes'),
    '',
    '[moves] (before the SNES 1.5x pixel scale)', byGroup('moves'),
    '',
    '[weapons] (before the SNES 1.5x pixel scale)', byGroup('weapons'),
    '',
    '[planned, not wired yet]', byGroup('planned'),
  ].join('\n');
}

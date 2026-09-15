// The SNES plays heavier than the NES, at Final Fight's pace (Tim, 2026-09-15): a slower stride, a jab
// about 5 frames out and 11 back, a 7-12 frame hit-stop, a knockdown of about a second and foes that wind
// up for about half a second. Each table lists `scale`, a multiplier on speeds and distances, and `frames`,
// whole frames added to a time. Only the SNES scenes read it, so the NES keeps its numbers. Estimates from
// memory, unverified.
import { BOSS, FOES } from '../stage1/tuning.mjs';
import { TUNING as ESCAPE } from '../stage2/escape.mjs';
import { ASSOCIATE } from '../stage2/foes.mjs';
import { RITUAL } from './stage5/chapel.mjs';

export const BRAWL_WEIGHT = {
  scale: { walkX: 0.6, walkY: 0.65, runX: 0.7, knockback: 1.25, launchX: 1.25, foeSpeed: 0.65 },
  frames: {
    landFrames: 2, punchStartup: 2, punchActive: 1, punchRecovery: 4,
    finisherStartup: 3, finisherActive: 1, finisherRecovery: 10, heavyStartup: 3, heavyRecovery: 6,
    bufferFrames: 7, comboWindow: 10, hitStop: 4, hitStopHeavy: 5, hitStopFinish: 8, hitstun: 8,
    hitFlashFrames: 12, heavyShakeFrames: 4,
    downFrames: 24, getUpFrames: 10, throwFrames: 8, shakeFrames: 3, foeWindup: 10, foeCooldown: 30,
  },
};

// Stage 1's staff foes (staff.mjs KINDS) close in and swing at the pace BRAWL_WEIGHT sets for foes.
export const STAFF_WEIGHT = {
  scale: { speed: BRAWL_WEIGHT.scale.foeSpeed },
  frames: { windup: BRAWL_WEIGHT.frames.foeWindup, cooldown: BRAWL_WEIGHT.frames.foeCooldown },
};

// Vellum's parry duel (vellum.mjs VELLUM): he paces and rushes at the foes' pace, recovers a little
// slower, and guards only about half a second between attacks, so the fight is his tells and your parries.
// Pairs are [normal, fangs]; `guard` replaces his NES guard outright.
export const VELLUM_WEIGHT = {
  scale: { speed: BRAWL_WEIGHT.scale.foeSpeed, rushSpeed: 0.75 },
  frames: { recover: 8, sweepFrames: 6 },
  guard: [30, 22],
};

export const FOES_WEIGHT = {
  scale: { walkX: 0.65, walkY: 0.65, circleSpeed: 0.65, dodgeSpeed: 0.7, knockback: 1.25 },
  frames: { tokenCooldown: 30, windupFrames: 10, recoverFrames: 10, staggerFrames: 6, knockdownFrames: 24 },
};

export const BOSS_WEIGHT = {
  scale: { walk: 0.65, chargeSpeed: 0.75 },
  frames: { restFrames: 20, enragedRest: 12, windupFrames: 10, enragedWindup: 6, heavyStagger: 6 },
};

// Stage 2 keeps its top walk speed and jump, so every pit stays clearable; the ramp, the casts and the
// foes slow instead.
export const ESCAPE_WEIGHT = {
  scale: { accel: 0.75, chaseSpeed: 0.9 },
  frames: { castDelay: 2, cooldown: 4, spawnFrames: 20 },
};

export const ASSOCIATE_WEIGHT = {
  scale: { walk: 0.85, glyphSpeed: 0.9 },
  frames: { windUp: 6, rest: 20, down: 10 },
};

// The chapel's ritual counts absolute frames, so at the slower pace it mends and hastens more slowly too.
export const RITUAL_WEIGHT = {
  scale: { mendFrames: 1.6, haste: 0.65 },
};

export function weighed(table, { scale = {}, frames = {} }) {
  const out = { ...table };
  for (const [k, m] of Object.entries(scale)) if (k in out) out[k] = table[k] * m;
  for (const [k, n] of Object.entries(frames)) if (k in out) out[k] = table[k] + n;
  return out;
}

let shared = false;

// The shared foe, Stage 2 and chapel tables, weighed in place once per page; the SNES stage scenes call it.
export function weighShared() {
  if (shared) return;
  shared = true;
  for (const [table, weight] of [[FOES, FOES_WEIGHT], [BOSS, BOSS_WEIGHT], [ESCAPE, ESCAPE_WEIGHT], [ASSOCIATE, ASSOCIATE_WEIGHT], [RITUAL, RITUAL_WEIGHT]]) {
    Object.assign(table, weighed(table, weight));
  }
}
